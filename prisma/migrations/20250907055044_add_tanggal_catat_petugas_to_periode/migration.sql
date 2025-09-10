-- AlterTable
ALTER TABLE `CatatPeriode` ADD COLUMN `petugasId` VARCHAR(191) NULL,
    ADD COLUMN `petugasNama` VARCHAR(191) NULL,
    ADD COLUMN `tanggalCatat` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `CatatPeriode` ADD CONSTRAINT `CatatPeriode_petugasId_fkey` FOREIGN KEY (`petugasId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
