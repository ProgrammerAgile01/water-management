// lib/jadwal-api.ts
export async function fetchJadwal(params: {
  month?: string; // "YYYY-MM"
  zonaId?: string;
  petugasId?: string;
  status?: string; // "all" | "waiting" | ...
  q?: string;
}) {
  const sp = new URLSearchParams();
  if (params.month) {
    const [y, m] = params.month.split("-");
    sp.set("year", y);
    sp.set("month", String(Number(m)));
  }
  if (params.zonaId) sp.set("zonaId", params.zonaId);
  if (params.petugasId) sp.set("petugasId", params.petugasId);
  if (params.q) sp.set("q", params.q);
  if (params.status && params.status !== "all") sp.set("status", params.status);

  const res = await fetch(`/api/jadwal?${sp.toString()}`, {
    cache: "no-store",
  });
  const j = await res.json();
  if (!res.ok || !j?.ok) throw new Error(j?.message ?? "Fetch jadwal gagal");
  return j.data as any[];
}

export async function fetchPetugasOptions() {
  const r = await fetch("/api/jadwal/options/petugas", { cache: "no-store" });
  const j = await r.json();
  if (!r.ok || !j?.ok) throw new Error(j?.message ?? "Gagal load petugas");
  return j.data as { id: string; nama: string; avatar?: string }[];
}

export async function fetchZonaOptions() {
  const r = await fetch("/api/jadwal/options/zona", { cache: "no-store" });
  const j = await r.json();
  if (!r.ok || !j?.ok) throw new Error(j?.message ?? "Gagal load zona");
  return j.data as { id: string; nama: string }[];
}
