import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/* ---------- helpers ---------- */
const int = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const genRef = (prefix = "BYR") => {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  const hh = String(n.getHours()).padStart(2, "0");
  const mm = String(n.getMinutes()).padStart(2, "0");
  return `${prefix}-${y}${m}${d}-${hh}${mm}`;
};

// set jam “real time” untuk tanggal input (YYYY-MM-DD)
const withNowTime = (yyyyMmDd: string) => {
  const now = new Date();
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(
    y,
    (m ?? 1) - 1,
    d ?? 1,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
};

async function compose(giver: string) {
  const headers = await prisma.hutang.findMany({
    where: { pemberi: giver },
    orderBy: { tanggalHutang: "asc" },
    include: {
      details: { orderBy: { no: "asc" } },
    },
  });

  // ambil semua detailId → sum pembayaran per detail
  const allDetailIds = headers.flatMap((h) =>
    (h.details ?? []).map((d) => d.id)
  );
  const paid = allDetailIds.length
    ? await prisma.hutangPaymentDetail.groupBy({
        by: ["hutangDetailId"],
        where: { hutangDetailId: { in: allDetailIds } },
        _sum: { amount: true },
      })
    : [];
  const paidMap: Record<string, number> = {};
  for (const p of paid) paidMap[p.hutangDetailId] = Number(p._sum.amount || 0);

  return headers.map((h) => {
    const details = (h.details ?? []).map((d, idx) => {
      const sudah = paidMap[d.id] ?? 0;
      const sisa = Math.max(0, Number(d.nominal || 0) - sudah);
      return {
        id: d.id,
        no: d.no ?? idx + 1,
        keterangan: d.keterangan || "",
        nominal: Number(d.nominal || 0),
        sudahBayar: sudah,
        sisa,
      };
    });

    const total = details.reduce((a, b) => a + b.nominal, 0);
    const sudahBayar = details.reduce((a, b) => a + b.sudahBayar, 0);
    const sisa = Math.max(0, total - sudahBayar);

    return {
      id: h.id,
      noBukti: h.noBukti,
      tanggalHutang: h.tanggalHutang,
      keterangan: h.keterangan,
      status: h.status as "Draft" | "Close",
      total,
      sudahBayar,
      sisa,
      details,
    };
  });
}

/* ---------- GET ---------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode");
    const giver = url.searchParams.get("giver")?.trim();

    // dropdown pemberi
    if (mode === "givers") {
      const rows = await prisma.hutang.findMany({
        select: { pemberi: true },
      });

      const uniq = Array.from(
        new Set(
          rows.map((r) => (r.pemberi ?? "").trim()).filter((s) => s.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b, "id"));

      return NextResponse.json({
        ok: true,
        items: uniq.map((name) => ({ name })),
      });
    }

    // list hutang per pemberi
    if (giver) {
      const items = await compose(giver);
      return NextResponse.json({ ok: true, items });
    }

    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ---------- POST (Create Payment; status = DRAFT) ---------- */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const giver: string = String(body?.giver || "").trim();
    const dateOnly: string = String(body?.date || "").trim(); // YYYY-MM-DD
    const note: string = String(body?.note || "");
    const refNoRaw: string = String(body?.refNo || "").trim();
    const rawLines: Array<{ detailId: string; amount: number }> = Array.isArray(
      body?.lines
    )
      ? body.lines
      : [];

    if (!giver) {
      return NextResponse.json(
        { ok: false, error: "Pemberi hutang wajib dipilih." },
        { status: 400 }
      );
    }

    // normalisasi lines
    const lines = rawLines
      .map((l) => ({ detailId: String(l.detailId), amount: int(l.amount) }))
      .filter((l) => l.detailId && l.amount > 0);
    if (!lines.length) {
      return NextResponse.json(
        { ok: false, error: "Tidak ada nominal yang dibayarkan." },
        { status: 400 }
      );
    }

    // tanggal bayar (jam real)
    const tanggalBayar = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly)
      ? withNowTime(dateOnly)
      : new Date();

    // meta detail (hutangId untuk setiap detail)
    const ids = lines.map((l) => l.detailId);
    const meta = await prisma.hutangDetail.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        nominal: true,
        hutangId: true,
        hutang: { select: { pemberi: true } },
      },
    });
    if (!meta.length) {
      return NextResponse.json(
        { ok: false, error: "Detail hutang tidak ditemukan." },
        { status: 400 }
      );
    }

    // validasi pemberi
    for (const m of meta) {
      if ((m.hutang?.pemberi ?? "").trim() !== giver) {
        return NextResponse.json(
          { ok: false, error: "Detail tidak sesuai pemberi hutang." },
          { status: 400 }
        );
      }
    }

    // sisa per detail
    const paid = await prisma.hutangPaymentDetail.groupBy({
      by: ["hutangDetailId"],
      where: { hutangDetailId: { in: ids } },
      _sum: { amount: true },
    });
    const paidMap: Record<string, number> = {};
    for (const p of paid)
      paidMap[p.hutangDetailId] = Number(p._sum.amount || 0);

    const metaMap = Object.fromEntries(meta.map((m) => [m.id, m]));

    // clamp supaya tidak melebihi sisa
    const finalLines = lines
      .map((l) => {
        const m = metaMap[l.detailId];
        if (!m) return null;
        const sisa = Math.max(0, Number(m.nominal || 0) - (paidMap[m.id] ?? 0));
        if (sisa <= 0) return null;
        return {
          detailId: m.id,
          hutangId: m.hutangId,
          amount: Math.min(l.amount, sisa),
        };
      })
      .filter(Boolean) as {
      detailId: string;
      hutangId: string;
      amount: number;
    }[];

    if (!finalLines.length) {
      return NextResponse.json(
        { ok: false, error: "Semua detail sudah lunas / nominal 0." },
        { status: 400 }
      );
    }

    // refNo unik (kalau kosong → generate)
    let refNo = refNoRaw || genRef("BYR");
    const dup = await prisma.hutangPayment.findFirst({
      where: { refNo },
      select: { id: true },
    });
    if (dup) refNo = `${refNo}-${Math.floor(Math.random() * 900 + 100)}`;

    const total = finalLines.reduce((a, b) => a + b.amount, 0);

    // simpan (header: status DRAFT)
    const payment = await prisma.$transaction(async (tx) => {
      const header = await tx.hutangPayment.create({
        data: {
          refNo,
          note,
          total,
          pemberi: giver,
          tanggalBayar,
          status: "DRAFT", // ← penting
        },
      });

      await tx.hutangPaymentDetail.createMany({
        data: finalLines.map((l) => ({
          paymentId: header.id,
          hutangId: l.hutangId,
          hutangDetailId: l.detailId,
          amount: l.amount,
        })),
      });

      return header;
    });

    // kirim daftar terbaru (biar sisa langsung update)
    const items = await compose(giver);
    return NextResponse.json({ ok: true, payment, items });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

/* ---------- PATCH (Posting / Unposting) ----------
   Body:
   { action: "post" | "unpost", id: string, userId?: string }
--------------------------------------------------- */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const action = String(body?.action || "").toLowerCase();
    const id = String(body?.id || "");
    const userId = body?.userId ? String(body.userId) : undefined;

    if (!id || (action !== "post" && action !== "unpost")) {
      return NextResponse.json(
        { ok: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const payment = await prisma.hutangPayment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { ok: false, error: "Payment tidak ditemukan." },
        { status: 404 }
      );
    }

    if (action === "post") {
      if (payment.status === "CLOSE") {
        return NextResponse.json(
          { ok: false, error: "Payment sudah di-posting." },
          { status: 400 }
        );
      }
      const updated = await prisma.hutangPayment.update({
        where: { id },
        data: {
          status: "CLOSE",
          postedAt: new Date(),
          postedBy: userId ?? null,
        },
      });
      return NextResponse.json({ ok: true, payment: updated });
    } else {
      // unpost
      if (payment.status !== "CLOSE") {
        return NextResponse.json(
          { ok: false, error: "Payment belum di-posting." },
          { status: 400 }
        );
      }
      const updated = await prisma.hutangPayment.update({
        where: { id },
        data: {
          status: "DRAFT",
          postedAt: null,
          postedBy: null,
        },
      });
      return NextResponse.json({ ok: true, payment: updated });
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
