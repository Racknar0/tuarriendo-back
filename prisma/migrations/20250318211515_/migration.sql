-- AlterTable
ALTER TABLE `user` ADD COLUMN `tokenExpiration` DATETIME(3) NULL,
    ADD COLUMN `verificationToken` VARCHAR(191) NULL;
