-- CreateTable
CREATE TABLE `ledgerproof` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ledgerId` INTEGER NOT NULL,
    `image` MEDIUMTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ledgerproof_ledgerId_key`(`ledgerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
