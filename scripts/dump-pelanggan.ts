// scripts/dump-pelanggan.ts
import { writeFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
// ⬇️ sesuaikan import prisma client sesuai struktur project-mu
import { prisma } from "../lib/prisma"

async function main() {
  // Ambil pelanggan yang BELUM soft-delete
  const rows = await prisma.pelanggan.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: {
      // ⚠️ Tidak ikutkan id agar aman saat nantinya di-seed pakai upsert by `kode`
      kode: true,
      nama: true,
      wa: true,
      alamat: true,
      meterAwal: true,
      statusAktif: true,
      createdAt: true,
      // ikutkan userId kalau kamu ingin mempertahankan keterkaitan user-pelanggan
      userId: true,
      // updatedAt/deleted* tidak diperlukan untuk seed
    },
  })

  // serialisasi: pastikan Date -> ISO string
  const serializable = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }))

  const outPath = join(process.cwd(), "prisma/seed/pelanggan.json")
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(serializable, null, 2), "utf-8")
  console.log(`✅ Dumped ${serializable.length} pelanggan → ${outPath}`)
}

main()
  .catch((e) => {
    console.error("❌ dump-pelanggan error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })