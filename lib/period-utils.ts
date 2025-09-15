// lib/period-utils.ts
export const isPeriodStr = (p: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(p);

export const formatPeriodID = (p: string) => {
  if (!isPeriodStr(p)) return p;
  const y = Number(p.slice(0, 4));
  const m = Number(p.slice(5));
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
};
