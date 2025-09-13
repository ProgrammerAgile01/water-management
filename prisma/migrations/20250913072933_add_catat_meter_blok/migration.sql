-- CreateTable
CREATE TABLE `CatatMeterBlok` (
    `id` VARCHAR(191) NOT NULL,
    `periodeId` VARCHAR(191) NOT NULL,
    `pelangganId` VARCHAR(191) NOT NULL,
    `meterAwal` INTEGER NOT NULL DEFAULT 0,
    `meterAkhir` INTEGER NULL,
    `pemakaianM3` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('PENDING', 'DONE') NOT NULL DEFAULT 'PENDING',
    `kendala` VARCHAR(191) NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `lockedAt` DATETIME(3) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CatatMeterBlok_periodeId_idx`(`periodeId`),
    INDEX `CatatMeterBlok_pelangganId_idx`(`pelangganId`),
    UNIQUE INDEX `CatatMeterBlok_periodeId_pelangganId_key`(`periodeId`, `pelangganId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CatatMeterBlok` ADD CONSTRAINT `CatatMeterBlok_periodeId_fkey` FOREIGN KEY (`periodeId`) REFERENCES `CatatPeriode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CatatMeterBlok` ADD CONSTRAINT `CatatMeterBlok_pelangganId_fkey` FOREIGN KEY (`pelangganId`) REFERENCES `Pelanggan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
