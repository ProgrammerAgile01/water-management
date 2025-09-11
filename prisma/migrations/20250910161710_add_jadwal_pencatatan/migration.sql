-- CreateTable
CREATE TABLE `JadwalPencatatan` (
    `id` VARCHAR(191) NOT NULL,
    `bulan` VARCHAR(7) NOT NULL,
    `tanggalRencana` DATETIME(3) NOT NULL,
    `target` INTEGER NOT NULL DEFAULT 0,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('WAITING', 'IN_PROGRESS', 'NON_PROGRESS', 'DONE', 'OVERDUE') NOT NULL DEFAULT 'WAITING',
    `zonaId` VARCHAR(191) NULL,
    `petugasId` VARCHAR(191) NULL,
    `alamat` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JadwalPencatatan_bulan_idx`(`bulan`),
    INDEX `JadwalPencatatan_status_idx`(`status`),
    INDEX `JadwalPencatatan_zonaId_idx`(`zonaId`),
    INDEX `JadwalPencatatan_petugasId_idx`(`petugasId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `JadwalPencatatan` ADD CONSTRAINT `JadwalPencatatan_zonaId_fkey` FOREIGN KEY (`zonaId`) REFERENCES `Zona`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalPencatatan` ADD CONSTRAINT `JadwalPencatatan_petugasId_fkey` FOREIGN KEY (`petugasId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
