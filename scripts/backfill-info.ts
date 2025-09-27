/* scripts/backfill-info.ts
   Backfill Tagihan.info (idempotent, aman diulang):
   - [PREV_CLEARED:YYYY-MM,...] di bulan “penutup/carry ditutup”
   - [CLOSED_BY:YYYY-MM] di bulan asal tagihan yang tertutup oleh bulan lain
   - [PAID_AT:ISO_DATETIME] tanggal pembayaran yang MENUTUP carry tsb
     • origin month (asal): ambil tanggal pembayaran PERTAMA yang menutup (keep earliest)
     • anchor/penutup: ambil tanggal pembayaran TERAKHIR bulan itu (override)
   - [CREDIT:n] saat sisaKurang < 0 (lebih bayar)
   Selain token di atas, backfill ini juga MENYAMAKAN STATUS untuk bulan asal
   yang tertutup: statusBayar=PAID, statusVerif=VERIFIED (tanpa mengubah sisaKurang).
*/

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ log: ["warn", "error"] });

type TPayment = { jumlahBayar: number; tanggalBayar: Date };
type TRow = {
  id: string;
  pelangganId: string;
  periode: string;               // "YYYY-MM"
  totalTagihan: number;
  tagihanLalu: number;
  sisaKurang: number;
  info: string | null;
  dibayar: number;                // total pembayaran bulan ini
  payments: TPayment[];           // pembayaran bulan ini (ordered asc)
};

function parseInfo(info?: string | null) {
  const s = (info || "").trim();

  const prevCleared = (() => {
    const m = s.match(/\[PREV_CLEARED:([0-9,\-\s]+)\]/);
    return m
      ? new Set(m[1].split(",").map(x => x.trim()).filter(Boolean))
      : new Set<string>();
  })();

  // Baca CLOSED_BY baru, fallback ke PAID_BY lama (kompatibel mundur)
  const closedBy = (() => {
    const m1 = s.match(/\[CLOSED_BY:(\d{4}-\d{2})\]/);
    if (m1) return m1[1];
    const m2 = s.match(/\[PAID_BY:(\d{4}-\d{2})\]/); // legacy
    return m2 ? m2[1] : null;
  })();

  const credit = (() => {
    const m = s.match(/\[CREDIT:(\d+)\]/);
    return m ? Number(m[1]) : 0;
  })();

  const paidAt = (() => {
    const m = s.match(/\[PAID_AT:([^\]]+)\]/);
    return m ? m[1] : null; // ISO string
  })();

  return { prevCleared, closedBy, credit, paidAt };
}

type Patch = {
  addPrevCleared?: string[];                 // months to add on anchor (the closer)
  setClosedBy?: string | null;               // set once per origin month
  setCredit?: number | null;                 // replace with latest computed
  setPaidAt?: string | null;                 // ISO; see preferPaidAt
  preferPaidAt?: "keepExisting" | "override";
  setPaidVerified?: boolean;                 // set statusBayar/Verif for origin
};

function buildInfo(existing: string | null, patch: Patch) {
  const cur = parseInfo(existing);
  // merge PREV_CLEARED
  const prevSet = new Set(cur.prevCleared);
  (patch.addPrevCleared || []).forEach(m => prevSet.add(m));

  // CLOSED_BY: sekali saja (pertahankan yang ada bila sudah ada)
  const closedBy = cur.closedBy || patch.setClosedBy || null;

  // CREDIT: jika disediakan, tulis angka terbaru; jika 0 → hapus token; jika undefined, pertahankan lama
  const credit = (typeof patch.setCredit === "number")
    ? Math.max(0, Math.round(patch.setCredit))
    : (cur.credit > 0 ? Math.round(cur.credit) : 0);

  // PAID_AT:
  // - origin: keepExisting (tanggal yang pertama kali menutup)
  // - anchor: override (tanggal pembayaran terakhir bulan itu)
  let paidAt = cur.paidAt;
  if (patch.setPaidAt) {
    if (patch.preferPaidAt === "override") {
      paidAt = patch.setPaidAt;
    } else if (!paidAt) {
      paidAt = patch.setPaidAt; // keep earliest
    }
  }

  const tokens: string[] = [];
  if (prevSet.size > 0) tokens.push(`[PREV_CLEARED:${Array.from(prevSet).join(",")}]`);
  if (closedBy) tokens.push(`[CLOSED_BY:${closedBy}]`);
  if (credit > 0) tokens.push(`[CREDIT:${credit}]`);
  if (paidAt) tokens.push(`[PAID_AT:${paidAt}]`);

  // buang token lama yang dikelola & sisipkan yang baru (hapus juga legacy PAID_BY)
  const base = (existing || "")
    .replace(/\[(PREV_CLEARED|CLOSED_BY|PAID_BY|CREDIT|PAID_AT):[^\]]+\]/g, "")
    .trim();

  return [base, tokens.join(" ")].filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim() || null;
}

function ymCmp(a: string, b: string) {
  // ascending (numeric-aware)
  return a.localeCompare(b, undefined, { numeric: true });
}

// Core: alokasi pembayaran per-pembayaran (tanggal ASC) ke carry lama dulu (FIFO), lalu ke tagihan bulan ini.
async function processPelanggan(pelangganId: string, dryRun = true) {
  // Ambil semua tagihan pelanggan ini (ASC periode) + pembayaran (tanggal ASC)
  const rowsRaw = await prisma.tagihan.findMany({
    where: { pelangganId, deletedAt: null },
    orderBy: { periode: "asc" },
    select: {
      id: true, pelangganId: true, periode: true,
      totalTagihan: true, tagihanLalu: true, sisaKurang: true, info: true,
      pembayarans: {
        where: { deletedAt: null },
        orderBy: { tanggalBayar: "asc" },
        select: { jumlahBayar: true, tanggalBayar: true },
      },
    },
  });

  const rows: TRow[] = rowsRaw.map(t => {
    const payments = t.pembayarans.map(p => ({
      jumlahBayar: p.jumlahBayar || 0,
      tanggalBayar: new Date(p.tanggalBayar as any),
    }));
    return {
      id: t.id,
      pelangganId: t.pelangganId,
      periode: t.periode,
      totalTagihan: t.totalTagihan || 0,
      tagihanLalu: t.tagihanLalu || 0,
      sisaKurang: t.sisaKurang || 0,
      info: t.info || null,
      dibayar: payments.reduce((a, p) => a + (p.jumlahBayar || 0), 0),
      payments,
    };
  });

  // FIFO carry terbuka dari bulan-bulan lalu
  type CarryItem = { periode: string; left: number; tagihanId: string };
  const openCarries: CarryItem[] = [];

  // patch per tagihan
  const patches: Record<string, Patch> = {};

  for (const r of rows) {
    patches[r.id] = patches[r.id] || { addPrevCleared: [] };

    // 1) alokasikan per pembayaran (ASC)
    const clearedThisMonth: string[] = [];
    for (const pay of r.payments) {
      let amount = pay.jumlahBayar;
      if (amount <= 0) continue;

      // bayar carry lama dulu
      for (let i = 0; i < openCarries.length && amount > 0; ) {
        const c = openCarries[i];
        const take = Math.min(amount, c.left);
        c.left -= take;
        amount -= take;

        if (c.left <= 0) {
          // carry bulan c.periode lunas DI bulan r.periode, pada tanggal pay.tanggalBayar
          clearedThisMonth.push(c.periode);

          // bulan asal (c.tagihanId): CLOSED_BY & PAID_AT (keep earliest if already set) + status
          const prevPatch = patches[c.tagihanId] || { addPrevCleared: [] };
          prevPatch.setClosedBy = prevPatch.setClosedBy ?? r.periode;
          prevPatch.setPaidAt   = prevPatch.setPaidAt   ?? pay.tanggalBayar.toISOString();
          prevPatch.preferPaidAt = prevPatch.preferPaidAt || "keepExisting";
          prevPatch.setPaidVerified = true; // tandai untuk update status origin month
          patches[c.tagihanId] = prevPatch;

          openCarries.splice(i, 1);
        } else {
          i++;
        }
      }

      // sisa amount (kalau masih ada) membayar bulan ini (anchor) — kita set PAID_AT anchor setelah loop payments
    }

    // 2) catat di bulan ini kalau ada carry yang tertutup
    if (clearedThisMonth.length) {
      clearedThisMonth.sort(ymCmp);
      patches[r.id].addPrevCleared = [
        ...(patches[r.id].addPrevCleared || []),
        ...clearedThisMonth,
      ];
    }

    // 3) kredit di bulan ini berdasar sisaKurang snapshot
    patches[r.id].setCredit = r.sisaKurang < 0 ? Math.abs(r.sisaKurang) : 0;

    // 4) PAID_AT untuk bulan ini (anchor): pakai tanggal pembayaran TERAKHIR pada bulan ini
    if (r.payments.length) {
      const lastPay = r.payments[r.payments.length - 1];
      patches[r.id].setPaidAt = lastPay.tanggalBayar.toISOString();
      patches[r.id].preferPaidAt = "override"; // anchor: override ke last payment
    }

    // 5) akhir bulan ini, kalau masih kurang (>0) → jadi carry terbuka
    const residualThisMonth = Math.max(r.sisaKurang, 0);
    if (residualThisMonth > 0) {
      openCarries.push({ periode: r.periode, left: residualThisMonth, tagihanId: r.id });
    }
  }

  // Tulis patch ke DB
  const ops = Object.entries(patches).map(([tagihanId, p]) => {
    const existing = rows.find(x => x.id === tagihanId)?.info ?? null;
    const data: any = { info: buildInfo(existing, p) };

    // Sinkron status historis untuk origin month yang tertutup
    if (p.setPaidVerified) {
      data.statusBayar = "PAID";
      data.statusVerif = "VERIFIED";
      // sisaKurang TIDAK diubah
    }

    return prisma.tagihan.update({
      where: { id: tagihanId },
      data,
    });
  });

  if (dryRun) {
    return { pelangganId, updated: ops.length, dryRun: true };
  } else {
    await prisma.$transaction(ops);
    return { pelangganId, updated: ops.length, dryRun: false };
  }
}

async function main() {
  const DRY = process.env.DRY_RUN !== "0"; // default DRY_RUN=1
  console.log(`[backfill-info] start. dryRun=${DRY ? "YES" : "NO"}`);

  // Ambil semua pelanggan yg punya tagihan
  const pids = await prisma.tagihan.findMany({
    where: { deletedAt: null },
    select: { pelangganId: true },
    distinct: ["pelangganId"],
  }).then(rs => rs.map(r => r.pelangganId));

  let ok = 0;
  for (const pid of pids) {
    const res = await processPelanggan(pid, DRY);
    ok += 1;
    console.log(`- pelanggan ${pid}: planned updates=${res.updated} dry=${res.dryRun}`);
  }

  console.log(`[backfill-info] done. processed pelanggan=${ok}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
