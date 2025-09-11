-- AlterTable
ALTER TABLE `catatmeter` ADD COLUMN `zonaIdSnapshot` VARCHAR(191) NULL,
    ADD COLUMN `zonaNamaSnapshot` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `CatatMeter_zonaIdSnapshot_idx` ON `CatatMeter`(`zonaIdSnapshot`);

-- CreateIndex
CREATE INDEX `CatatMeter_zonaNamaSnapshot_idx` ON `CatatMeter`(`zonaNamaSnapshot`);
