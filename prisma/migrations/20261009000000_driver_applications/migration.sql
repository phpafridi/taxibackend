-- Driver self-registration: application state on the driver profile.
-- applicationStatus: NULL (existing drivers), PENDING, APPROVED or REJECTED.
ALTER TABLE `driverprofile`
  ADD COLUMN `applicationStatus` VARCHAR(20) NULL,
  ADD COLUMN `rejectionReason` TEXT NULL;
