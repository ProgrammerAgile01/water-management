-- AlterTable
ALTER TABLE `Pelanggan` ADD COLUMN `zonaId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Zona` (
    `id` VARCHAR(191) NOT NULL,
    `kode` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Zona_kode_key`(`kode`),
    INDEX `Zona_nama_idx`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ZonaPetugas` (
    `userId` VARCHAR(191) NOT NULL,
    `zonaId` VARCHAR(191) NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ZonaPetugas_zonaId_idx`(`zonaId`),
    INDEX `ZonaPetugas_userId_idx`(`userId`),
    PRIMARY KEY (`userId`, `zonaId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `CatatPeriode_tanggalCatat_idx` ON `CatatPeriode`(`tanggalCatat`);

-- CreateIndex
CREATE INDEX `Pelanggan_zonaId_idx` ON `Pelanggan`(`zonaId`);

-- AddForeignKey
ALTER TABLE `Pelanggan` ADD CONSTRAINT `Pelanggan_zonaId_fkey` FOREIGN KEY (`zonaId`) REFERENCES `Zona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZonaPetugas` ADD CONSTRAINT `ZonaPetugas_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ZonaPetugas` ADD CONSTRAINT `ZonaPetugas_zonaId_fkey` FOREIGN KEY (`zonaId`) REFERENCES `Zona`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `CatatPeriode`
  DROP INDEX `CatatPeriode_petugasId_fkey`,
  ADD INDEX `CatatPeriode_petugasId_idx` (`petugasId`);

-- ALTER TABLE `CatatPeriode`
--   RENAME INDEX `CatatPeriode_petugasId_fkey` TO `CatatPeriode_petugasId_idx`;