export const runtime = "nodejs";

const BASE = process.env.WA_SENDER_URL || "";
const KEY  = process.env.WA_SENDER_API_KEY || "";

export async function callWaSender(path: string, init?: RequestInit) {
  if (!BASE) {
    return new Response(JSON.stringify({ ok:false, message:"WA_SENDER_URL not set" }), { status: 500 });
  }
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...(KEY ? { "x-api-key": KEY } : {}),
      "content-type": init?.headers && (init.headers as any)["content-type"] ? (init.headers as any)["content-type"] : "application/json",
    },
    cache: "no-store",
  });

  if (r.status === 204) {
    return new Response(JSON.stringify({ ok: true, noContent: true }), { status: 200 });
  }

  const text = await r.text();
  // coba parse json, kalau gagal kirim mentah
  try {
    const json = JSON.parse(text);
    return new Response(JSON.stringify(json), { status: r.status });
  } catch {
    return new Response(text, { status: r.status });
  }
}