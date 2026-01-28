export function formatPeriod(label: string) {
  if (/^\d{4}-\d{2}$/.test(label)) {
    const [y, m] = label.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1, 1));
    return d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return label;
}
