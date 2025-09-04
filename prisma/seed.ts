// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // 1) Seed user admin
  const adminPass = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPass,
      name: 'Administrator',
      role: Role.ADMIN,
      phone: '6280000000000',
      isActive: true,
    },
  })

  // 2) Seed Setting (tarif aktif) — id = 1 (sesuai schema)
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {
      tarifPerM3: 3000,
      abonemen: 10000,
      tglJatuhTempo: 15,
    },
    create: {
      id: 1,
      tarifPerM3: 3000,
      abonemen: 10000,
      tglJatuhTempo: 15,
    },
  })

  // 3) (Opsional) Pelanggan sample biar UI kebaca
  await prisma.pelanggan.upsert({
    where: { kode: 'TB240001' },
    update: {},
    create: {
      kode: 'TB240001',
      nama: 'Budi Santoso',
      wa: '628111111111',
      alamat: 'Jl. Merdeka No. 12',
      meterAwal: 1000,
      statusAktif: true,
    },
  })

  await prisma.pelanggan.upsert({
    where: { kode: 'TB240002' },
    update: {},
    create: {
      kode: 'TB240002',
      nama: 'Siti Aminah',
      wa: '628222222222',
      alamat: 'Jl. Sudirman No. 8',
      meterAwal: 900,
      statusAktif: true,
    },
  })
}

main()
  .then(async () => {
    console.log('✅ Seed selesai')
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed gagal', e)
    await prisma.$disconnect()
    process.exit(1)
  })