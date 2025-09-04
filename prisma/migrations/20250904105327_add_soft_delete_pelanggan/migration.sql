-- AlterTable
ALTER TABLE `Pelanggan` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Pelanggan_deletedAt_idx` ON `Pelanggan`(`deletedAt`);
