/*
  Warnings:

  - You are about to drop the `ZonaPetugas` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ZonaPetugas` DROP FOREIGN KEY `ZonaPetugas_userId_fkey`;

-- DropForeignKey
ALTER TABLE `ZonaPetugas` DROP FOREIGN KEY `ZonaPetugas_zonaId_fkey`;

-- AlterTable
ALTER TABLE `Zona` ADD COLUMN `petugasId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `ZonaPetugas`;

-- AddForeignKey
ALTER TABLE `Zona` ADD CONSTRAINT `Zona_petugasId_fkey` FOREIGN KEY (`petugasId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
