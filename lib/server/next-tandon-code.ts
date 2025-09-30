// lib/server/next-tandon-code.ts
import { PrismaClient } from "@prisma/client";

const PREFIX = "TDN-";
const PAD = 3; // hasil: TDN-001, TDN-002, ...

export async function getNextTandonCode(prisma: PrismaClient) {
  // Cari kode terakhir yang mulai dengan TDN-
  const last = await prisma.tandon.findFirst({
    where: { kode: { startsWith: PREFIX } },
    orderBy: { kode: "desc" }, // karena sudah zero-pad, urutan string aman
    select: { kode: true },
  });

  const lastNum = Number(last?.kode.match(/\d+$/)?.[0] || "0");
  const nextNum = lastNum + 1;
  return `${PREFIX}${String(nextNum).padStart(PAD, "0")}`;
}
