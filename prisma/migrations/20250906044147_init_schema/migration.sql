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
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_deletedAt_idx`(`deletedAt`),
    INDEX `User_deletedBy_idx`(`deletedBy`),
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
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `Pelanggan_kode_key`(`kode`),
    UNIQUE INDEX `Pelanggan_userId_key`(`userId`),
    INDEX `Pelanggan_deletedAt_idx`(`deletedAt`),
    INDEX `Pelanggan_deletedBy_idx`(`deletedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatatPeriode` (
    `id` VARCHAR(191) NOT NULL,
    `kodePeriode` VARCHAR(191) NOT NULL,
    `bulan` INTEGER NOT NULL,
    `tahun` INTEGER NOT NULL,
    `tarifPerM3` INTEGER NOT NULL DEFAULT 0,
    `abonemen` INTEGER NOT NULL DEFAULT 0,
    `totalPelanggan` INTEGER NOT NULL DEFAULT 0,
    `selesai` INTEGER NOT NULL DEFAULT 0,
    `pending` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('DRAFT', 'FINAL') NOT NULL DEFAULT 'DRAFT',
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedAt` DATETIME(3) NULL,
    `lockedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `CatatPeriode_kodePeriode_key`(`kodePeriode`),
    INDEX `CatatPeriode_kodePeriode_idx`(`kodePeriode`),
    INDEX `CatatPeriode_status_idx`(`status`),
    INDEX `CatatPeriode_isLocked_lockedAt_idx`(`isLocked`, `lockedAt`),
    INDEX `CatatPeriode_deletedAt_idx`(`deletedAt`),
    INDEX `CatatPeriode_deletedBy_idx`(`deletedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CatatMeter` (
    `id` VARCHAR(191) NOT NULL,
    `periodeId` VARCHAR(191) NOT NULL,
    `pelangganId` VARCHAR(191) NOT NULL,
    `meterAwal` INTEGER NOT NULL DEFAULT 0,
    `meterAkhir` INTEGER NOT NULL DEFAULT 0,
    `pemakaianM3` INTEGER NOT NULL DEFAULT 0,
    `tarifPerM3` INTEGER NOT NULL DEFAULT 0,
    `abonemen` INTEGER NOT NULL DEFAULT 0,
    `total` INTEGER NOT NULL DEFAULT 0,
    `kendala` TEXT NULL,
    `status` ENUM('PENDING', 'DONE') NOT NULL DEFAULT 'PENDING',
    `waTerkirim` BOOLEAN NOT NULL DEFAULT false,
    `waSentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `CatatMeter_status_idx`(`status`),
    INDEX `CatatMeter_deletedAt_idx`(`deletedAt`),
    INDEX `CatatMeter_deletedBy_idx`(`deletedBy`),
    UNIQUE INDEX `CatatMeter_periodeId_pelangganId_key`(`periodeId`, `pelangganId`),
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
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `Tagihan_periode_idx`(`periode`),
    INDEX `Tagihan_statusBayar_statusVerif_idx`(`statusBayar`, `statusVerif`),
    INDEX `Tagihan_deletedAt_idx`(`deletedAt`),
    INDEX `Tagihan_deletedBy_idx`(`deletedBy`),
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
    `deletedAt` DATETIME(3) NULL,
    `deletedBy` VARCHAR(191) NULL,

    INDEX `Pembayaran_tanggalBayar_idx`(`tanggalBayar`),
    INDEX `Pembayaran_tagihanId_fkey`(`tagihanId`),
    INDEX `Pembayaran_deletedAt_idx`(`deletedAt`),
    INDEX `Pembayaran_deletedBy_idx`(`deletedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `tarifPerM3` INTEGER NOT NULL DEFAULT 3000,
    `abonemen` INTEGER NOT NULL DEFAULT 10000,
    `biayaAdmin` INTEGER NOT NULL DEFAULT 2500,
    `tglJatuhTempo` INTEGER NOT NULL DEFAULT 15,
    `dendaTelatBulanSama` INTEGER NOT NULL DEFAULT 5000,
    `dendaTelatBulanBerbeda` INTEGER NOT NULL DEFAULT 10000,
    `namaPerusahaan` VARCHAR(120) NULL,
    `alamat` VARCHAR(255) NULL,
    `telepon` VARCHAR(30) NULL,
    `email` VARCHAR(120) NULL,
    `logoUrl` VARCHAR(255) NULL,
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
ALTER TABLE `User` ADD CONSTRAINT `User_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pelanggan` ADD CONSTRAINT `Pelanggan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pelanggan` ADD CONSTRAINT `Pelanggan_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatPeriode` ADD CONSTRAINT `CatatPeriode_lockedBy_fkey` FOREIGN KEY (`lockedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatPeriode` ADD CONSTRAINT `CatatPeriode_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatMeter` ADD CONSTRAINT `CatatMeter_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `CatatPeriode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatMeter` ADD CONSTRAINT `CatatMeter_pelangganId_fkey` FOREIGN KEY (`pelangganId`) REFERENCES `Pelanggan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatMeter` ADD CONSTRAINT `CatatMeter_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tagihan` ADD CONSTRAINT `Tagihan_pelangganId_fkey` FOREIGN KEY (`pelangganId`) REFERENCES `Pelanggan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tagihan` ADD CONSTRAINT `Tagihan_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_tagihanId_fkey` FOREIGN KEY (`tagihanId`) REFERENCES `Tagihan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
