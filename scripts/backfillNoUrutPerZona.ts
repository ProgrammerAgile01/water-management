// scripts/backfillNoUrutPerZona.ts (contoh pseudo)
import { prisma } from "@/lib/prisma"

async function run() {
  const zonas = await prisma.zona.findMany({ select: { id: true } })
  for (const z of zonas) {
    const pel = await prisma.pelanggan.findMany({
      where: { zonaId: z.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })
    let i = 1
    for (const p of pel) {
      await prisma.pelanggan.update({ where: { id: p.id }, data: { noUrutRumah: i++ } })
    }
  }
  // Untuk pelanggan tanpa zona, biarkan null
  console.log("Backfill selesai")
}
run().finally(() => process.exit())