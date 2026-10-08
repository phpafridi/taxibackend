-- AlterTable
ALTER TABLE `agreement` ADD COLUMN `damageInChip` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageInDent` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageInMajorDamage` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageInMissing` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageInNotes` TEXT NULL,
    ADD COLUMN `damageInScratch` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageOutChip` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageOutDent` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageOutMajorDamage` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageOutMissing` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `damageOutNotes` TEXT NULL,
    ADD COLUMN `damageOutScratch` BOOLEAN NULL DEFAULT false;
