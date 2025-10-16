// lib/wa-send.ts
import { prisma } from "@/lib/prisma";

/** Kirim WA TEKS + catat log detail respon */
export async function sendWaAndLog(tujuanRaw: string, text: string) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";

  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "PEMBAYARAN APPROVED",
      payload: JSON.stringify({ to, text }),
      status: "PENDING",
    },
  });

  try {
    if (!base) throw new Error("WA_SENDER_URL empty");

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 10000);

    const r = await fetch(`${base}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({ to, text }),
      signal: ac.signal,
    });

    const bodyText = await r.text().catch(() => "");
    clearTimeout(t);

    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: r.ok ? "SENT" : "FAILED",
        payload: JSON.stringify({
          to,
          res: { ok: r.ok, status: r.status, body: bodyText.slice(0, 2000) },
        }),
      },
    });
  } catch (e: any) {
    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        payload: JSON.stringify({ to, error: String(e?.message || e) }),
      },
    });
  }
}

/** Kirim WA GAMBAR dalam base64 (tanpa simpan file) + log detail */
export async function sendWaImageAndLog(
  tujuanRaw: string,
  payload: { base64: string; filename: string; caption?: string }
) {
  const to = tujuanRaw.replace(/\D/g, "").replace(/^0/, "62");
  const base = (process.env.WA_SENDER_URL || "").replace(/\/$/, "");
  const apiKey = process.env.WA_SENDER_API_KEY || "";

  const log = await prisma.waLog.create({
    data: {
      tujuan: to,
      tipe: "PEMBAYARAN_IMG APPROVED",
      payload: JSON.stringify({
        to,
        meta: { filename: payload.filename, caption: payload.caption },
        mode: "inline-b64",
      }),
      status: "PENDING",
    },
  });

  try {
    if (!base) throw new Error("WA_SENDER_URL empty");

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15000);

    const r = await fetch(`${base}/send-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        to,
        base64: payload.base64, // base64 murni TANPA "data:image/jpeg;base64,"
        filename: payload.filename,
        caption: payload.caption,
        mimeType: "image/jpeg",
      }),
      signal: ac.signal,
    });

    const bodyText = await r.text().catch(() => "");
    clearTimeout(t);

    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: r.ok ? "SENT" : "FAILED",
        payload: JSON.stringify({
          to,
          req: { bytes: payload.base64.length },
          res: { ok: r.ok, status: r.status, body: bodyText.slice(0, 2000) },
        }),
      },
    });
  } catch (e: any) {
    await prisma.waLog.update({
      where: { id: log.id },
      data: {
        status: "FAILED",
        payload: JSON.stringify({ to, error: String(e?.message || e) }),
      },
    });
  }
}
