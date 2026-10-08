-- AlterTable
ALTER TABLE `agreement` ADD COLUMN `signatureOutData` TEXT NULL;

-- AlterTable
ALTER TABLE `car` ADD COLUMN `bodyType` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `maintenancerequest` ADD COLUMN `mileage` INTEGER NULL;
