import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { join } from "path";
// import prisma from "../app/lib/prisma";

async function main() {
  const filePath = join(__dirname, "/seed/pelanggan.json");
  const raw = readFileSync(filePath, "utf-8");
  const rows = JSON.parse(raw);

  console.log(`🚀 Menyisipkan ${rows.length} pelanggan...`);

  for (const r of rows) {
    await prisma.pelanggan.upsert({
      where: { kode: r.kode }, // kalau ada kode sama → update
      update: {
        nama: r.nama,
        wa: r.wa,
        alamat: r.alamat,
        meterAwal: r.meterAwal,
        statusAktif: r.statusAktif,
      },
      create: {
        kode: r.kode,
        nama: r.nama,
        wa: r.wa,
        alamat: r.alamat,
        meterAwal: r.meterAwal,
        statusAktif: r.statusAktif,
      },
    });
  }

  console.log("✅ Selesai seeding pelanggan.");
}

main()
  .catch((e) => {
    console.error("❌ Error seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
