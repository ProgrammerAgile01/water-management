-- CreateIndex
CREATE INDEX `User_deletedAt_idx` ON `User`(`deletedAt`);

-- RenameIndex
ALTER TABLE `User` RENAME INDEX `User_deletedBy_fkey` TO `User_deletedBy_idx`;
