-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `role` ENUM('ADMIN', 'PETUGAS', 'WARGA') NOT NULL DEFAULT 'WARGA',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pelanggan` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `wa` VARCHAR(20) NULL,
    `alamat` VARCHAR(191) NOT NULL,
    `meterAwal` INTEGER NOT NULL DEFAULT 0,
    `statusAktif` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` VARCHAR(191) NULL,

    UNIQUE INDEX `Pelanggan_kode_key`(`kode`),
    UNIQUE INDEX `Pelanggan_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatatMeter` (
    `id` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `tanggalCatat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `standAwal` INTEGER NOT NULL,
    `standAkhir` INTEGER NOT NULL,
    `pemakaianM3` INTEGER NOT NULL,
    `pelangganId` VARCHAR(191) NOT NULL,

    INDEX `CatatMeter_periode_idx`(`periode`),
    UNIQUE INDEX `CatatMeter_pelangganId_periode_key`(`pelangganId`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tagihan` (
    `id` VARCHAR(191) NOT NULL,
    `periode` VARCHAR(191) NOT NULL,
    `tarifPerM3` INTEGER NOT NULL,
    `abonemen` INTEGER NOT NULL DEFAULT 0,
    `denda` INTEGER NOT NULL DEFAULT 0,
    `totalTagihan` INTEGER NOT NULL,
    `statusBayar` VARCHAR(191) NOT NULL DEFAULT 'UNPAID',
    `statusVerif` VARCHAR(191) NOT NULL DEFAULT 'UNVERIFIED',
    `tglJatuhTempo` DATETIME(3) NOT NULL,
    `info` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `pelangganId` VARCHAR(191) NOT NULL,

    INDEX `Tagihan_periode_idx`(`periode`),
    INDEX `Tagihan_statusBayar_statusVerif_idx`(`statusBayar`, `statusVerif`),
    UNIQUE INDEX `Tagihan_pelangganId_periode_key`(`pelangganId`, `periode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pembayaran` (
    `id` VARCHAR(191) NOT NULL,
    `tanggalBayar` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `jumlahBayar` INTEGER NOT NULL,
    `buktiUrl` VARCHAR(191) NULL,
    `adminBayar` VARCHAR(191) NULL,
    `tagihanId` VARCHAR(191) NOT NULL,

    INDEX `Pembayaran_tanggalBayar_idx`(`tanggalBayar`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `tarifPerM3` INTEGER NOT NULL DEFAULT 3000,
    `abonemen` INTEGER NOT NULL DEFAULT 10000,
    `tglJatuhTempo` INTEGER NOT NULL DEFAULT 15,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WaLog` (
    `id` VARCHAR(191) NOT NULL,
    `tujuan` VARCHAR(191) NOT NULL,
    `tipe` VARCHAR(191) NOT NULL,
    `payload` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Pelanggan` ADD CONSTRAINT `Pelanggan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatMeter` ADD CONSTRAINT `CatatMeter_pelangganId_fkey` FOREIGN KEY (`pelangganId`) REFERENCES `Pelanggan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tagihan` ADD CONSTRAINT `Tagihan_pelangganId_fkey` FOREIGN KEY (`pelangganId`) REFERENCES `Pelanggan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_tagihanId_fkey` FOREIGN KEY (`tagihanId`) REFERENCES `Tagihan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
