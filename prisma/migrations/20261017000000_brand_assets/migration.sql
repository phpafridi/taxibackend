-- CreateTable
CREATE TABLE `brandasset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(30) NOT NULL,
    `image` MEDIUMTEXT NOT NULL,
    `meta` TEXT NULL,
    `shareToken` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `brandasset_kind_key`(`kind`),
    UNIQUE INDEX `brandasset_shareToken_key`(`shareToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
