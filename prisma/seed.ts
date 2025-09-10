// prisma/seed.ts
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  // admin
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

  // setting (id=1)
  await prisma.setting.upsert({
    where: { id: 1 },
    update: {
      tarifPerM3: 3000,
      abonemen: 10000,
      biayaAdmin: 2500,
      tglJatuhTempo: 15,
      dendaTelatBulanSama: 5000,
      dendaTelatBulanBerbeda: 10000,
      namaPerusahaan: 'Tirta Bening',
      alamat: 'Jl. Air Bersih No. 123',
      telepon: '(021) 123-4567',
      email: 'info@tirtabening.com',
      logoUrl: null,
    },
    create: {
      id: 1,
      tarifPerM3: 3000,
      abonemen: 10000,
      biayaAdmin: 2500,
      tglJatuhTempo: 15,
      dendaTelatBulanSama: 5000,
      dendaTelatBulanBerbeda: 10000,
      namaPerusahaan: 'Tirta Bening',
      alamat: 'Jl. Air Bersih No. 123',
      telepon: '(021) 123-4567',
      email: 'info@tirtabening.com',
      logoUrl: null,
    },
  })

  // contoh pelanggan (opsional)
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

main().finally(() => prisma.$disconnect())