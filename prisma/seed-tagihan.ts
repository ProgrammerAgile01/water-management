import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Pastikan ada minimal 1 pelanggan
  const pelanggan1 = await prisma.pelanggan.upsert({
    where: { kode: "A010" },
    update: {},
    create: {
      kode: "A010",
      nama: "Dewi Putri",
      alamat: "Jl. Melati No.10",
      meterAwal: 1000,
      statusAktif: true,
    },
  });

  const pelanggan2 = await prisma.pelanggan.upsert({
    where: { kode: "B015" },
    update: {},
    create: {
      kode: "B015",
      nama: "Ahmad Rizki",
      alamat: "Jl. Kenanga No.15",
      meterAwal: 850,
      statusAktif: true,
    },
  });

  // Seed Tagihan Juli 2025
  const tagihan1 = await prisma.tagihan.create({
    data: {
      periode: "2025-07",
      tarifPerM3: 5000,
      abonemen: 10000,
      totalTagihan: 260000,
      statusBayar: "UNPAID",
      statusVerif: "UNVERIFIED",
      tglJatuhTempo: new Date("2025-07-20"),
      pelangganId: pelanggan1.id,
    },
  });

  const tagihan2 = await prisma.tagihan.create({
    data: {
      periode: "2025-07",
      tarifPerM3: 5000,
      abonemen: 10000,
      totalTagihan: 360000,
      statusBayar: "PAID",
      statusVerif: "VERIFIED",
      tglJatuhTempo: new Date("2025-07-20"),
      pelangganId: pelanggan2.id,
      pembayarans: {
        create: {
          jumlahBayar: 360000,
          buktiUrl: "/bank-transfer-receipt.png",
          adminBayar: "Admin Keuangan",
          tanggalBayar: new Date("2025-07-15"),
        },
      },
    },
  });

  console.log("✅ Seed selesai:", { tagihan1, tagihan2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
