-- Brute-force login protection: track consecutive failed attempts per
-- account and a temporary lockout window once a threshold is hit.

ALTER TABLE `user` ADD COLUMN `failedLoginAttempts` INT NOT NULL DEFAULT 0;
ALTER TABLE `user` ADD COLUMN `lockedUntil` DATETIME(3) NULL;
