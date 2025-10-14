export function normalizeWa(num?: string | null) {
  if (!num) return null;
  let d = num.replace(/\D/g, "");
  if (!d) return null;

  // Standarisasi Indonesia:
  // 0xxxx -> 62xxxx ; +62xxxxx / 62xxxxx tetap ; 8xxxxx -> 628xxxxx
  if (d.startsWith("0")) d = "62" + d.slice(1);
  if (d.startsWith("620")) d = "62" + d.slice(2);
  if (d.startsWith("8")) d = "62" + d;

  return d;
}

export function getWaTargets(raws: Array<string | null | undefined>) {
  const set = new Set<string>();
  for (const r of raws) {
    const n = normalizeWa(r);
    if (n) set.add(n);
  }
  return Array.from(set);
}