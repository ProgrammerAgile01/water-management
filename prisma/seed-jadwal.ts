// prisma/seed-jadwal.ts
// Standalone seed: tidak pakai alias @/lib, langsung PrismaClient supaya ts-node aman.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bulan = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // pastikan ada minimal 1 zona
  const zona = await prisma.zona.findFirst();
  if (!zona) {
    console.log("⚠️ Belum ada Zona. Buat minimal 1 Zona dulu (tabel Zona).");
    return;
  }

  // cari 1 petugas (opsional)
  const petugas = await prisma.user.findFirst({ where: { role: "PETUGAS" } });

  const data = [
    {
      bulan,
      tanggalRencana: new Date(`${bulan}-10`),
      target: 40,
      progress: 22,
      status: "IN_PROGRESS" as const,
      zonaId: zona.id,
      petugasId: petugas?.id ?? null,
      alamat: "Jl. Merdeka No. 123",
    },
    {
      bulan,
      tanggalRencana: new Date(`${bulan}-15`),
      target: 35,
      progress: 35,
      status: "DONE" as const,
      zonaId: zona.id,
      petugasId: petugas?.id ?? null,
      alamat: "Jl. Sudirman No. 456",
    },
    {
      bulan,
      tanggalRencana: new Date(`${bulan}-20`),
      target: 50,
      progress: 0,
      status: "WAITING" as const,
      zonaId: zona.id,
      petugasId: petugas?.id ?? null,
      alamat: "Jl. Gatot Subroto No. 789",
    },
    {
      bulan,
      tanggalRencana: new Date(`${bulan}-05`),
      target: 30,
      progress: 15,
      status: "OVERDUE" as const,
      zonaId: zona.id,
      petugasId: petugas?.id ?? null,
      alamat: "Jl. Ahmad Yani No. 321",
    },
  ];

  await prisma.jadwalPencatatan.createMany({
    data,
    skipDuplicates: true,
  });

  console.log("✅ Seed JadwalPencatatan selesai.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
