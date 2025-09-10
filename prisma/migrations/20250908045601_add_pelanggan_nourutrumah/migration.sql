/*
  Warnings:

  - A unique constraint covering the columns `[zonaId,noUrutRumah]` on the table `Pelanggan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Pelanggan` ADD COLUMN `noUrutRumah` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Pelanggan_zonaId_noUrutRumah_idx` ON `Pelanggan`(`zonaId`, `noUrutRumah`);

-- CreateIndex
CREATE UNIQUE INDEX `Pelanggan_zonaId_noUrutRumah_key` ON `Pelanggan`(`zonaId`, `noUrutRumah`);
