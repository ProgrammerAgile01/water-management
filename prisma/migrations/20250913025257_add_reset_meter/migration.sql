-- AlterTable
ALTER TABLE `pelanggan` ADD COLUMN `isResetMeter` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `ResetMeter` (
    `id` VARCHAR(191) NOT NULL,
    `pelangganId` VARCHAR(191) NOT NULL,
    `tanggalReset` DATETIME(3) NOT NULL,
    `alasan` TEXT NULL,
    `meterAwalBaru` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SELESAI') NOT NULL DEFAULT 'DRAFT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ResetMeter_pelangganId_idx`(`pelangganId`),
    INDEX `ResetMeter_tanggalReset_idx`(`tanggalReset`),
    INDEX `ResetMeter_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ResetMeter` ADD CONSTRAINT `ResetMeter_pelangganId_fkey` FOREIGN KEY (`pelangganId`) REFERENCES `Pelanggan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
