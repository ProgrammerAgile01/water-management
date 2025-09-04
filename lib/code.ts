import { prisma } from "./prisma";

export async function genCustomerCode(prefix = "TB") {
  // ambil nomor urut 6 digit per tahun (misal TB240001)
  const year = new Date().getFullYear().toString().slice(-2);
  const last = await prisma.pelanggan.findFirst({
    where: { kode: { startsWith: `${prefix}${year}` } },
    orderBy: { kode: "desc" },
    select: { kode: true },
  });

  const lastNum = last ? Number(last.kode.slice(prefix.length + 2)) : 0;
  const next = String(lastNum + 1).padStart(4, "0");
  return `${prefix}${year}${next}`;
}