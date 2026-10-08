-- Live GPS location tracking for drivers — one row per driver, upserted on
-- each location report from the mobile app. Only drivers with an active
-- (SIGNED) HIRE_AGREEMENT are tracked/shown to admin.

CREATE TABLE `driverlocation` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `driverId` INT NOT NULL,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `accuracy` DOUBLE NULL,
  `gpsEnabled` BOOLEAN NOT NULL DEFAULT true,
  `recordedAt` DATETIME(3) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `driverlocation_driverId_key`(`driverId`),
  INDEX `driverlocation_driverId_idx`(`driverId`)
) DEFAULT CHARACTER SET utf8mb4;

ALTER TABLE `driverlocation` ADD CONSTRAINT `DriverLocation_driverId_fkey`
  FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
