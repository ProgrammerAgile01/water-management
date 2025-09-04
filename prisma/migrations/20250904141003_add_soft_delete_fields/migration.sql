-- AlterTable
ALTER TABLE `CatatMeter` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Pelanggan` ADD COLUMN `deletedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Pembayaran` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Tagihan` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedBy` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `CatatMeter_deletedAt_idx` ON `CatatMeter`(`deletedAt`);

-- CreateIndex
CREATE INDEX `CatatMeter_deletedBy_idx` ON `CatatMeter`(`deletedBy`);

-- CreateIndex
CREATE INDEX `Pelanggan_deletedBy_idx` ON `Pelanggan`(`deletedBy`);

-- CreateIndex
CREATE INDEX `Pembayaran_deletedAt_idx` ON `Pembayaran`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Pembayaran_deletedBy_idx` ON `Pembayaran`(`deletedBy`);

-- CreateIndex
CREATE INDEX `Tagihan_deletedAt_idx` ON `Tagihan`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Tagihan_deletedBy_idx` ON `Tagihan`(`deletedBy`);

-- AddForeignKey
ALTER TABLE `Pelanggan` ADD CONSTRAINT `Pelanggan_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatMeter` ADD CONSTRAINT `CatatMeter_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tagihan` ADD CONSTRAINT `Tagihan_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pembayaran` ADD CONSTRAINT `Pembayaran_deletedBy_fkey` FOREIGN KEY (`deletedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
