import { prisma } from "@/lib/prisma";

async function run() {
  const pelanggans = await prisma.pelanggan.findMany({ select: { id: true } });

  for (const p of pelanggans) {
    const ts = await prisma.tagihan.findMany({
      where: { pelangganId: p.id, deletedAt: null },
      orderBy: { periode: "asc" }, // "YYYY-MM" aman diurutkan lexicographically
      select: { id: true, periode: true, totalTagihan: true, tagihanLalu: true, sisaKurang: true },
    });

    let carry = 0; // saldo berjalan dari bulan ke bulan

    for (const t of ts) {
      const paidAgg = await prisma.pembayaran.aggregate({
        where: { tagihanId: t.id, deletedAt: null },
        _sum: { jumlahBayar: true },
      });

      const totalDue = (t.totalTagihan ?? 0) + carry;
      const sisa = totalDue - (paidAgg._sum.jumlahBayar ?? 0);

      await prisma.tagihan.update({
        where: { id: t.id },
        data: {
          tagihanLalu: carry,
          sisaKurang: sisa,
          statusBayar: sisa <= 0 ? "PAID" : "UNPAID",
        },
      });

      carry = sisa;
    }
  }
}

run()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
