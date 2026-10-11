-- Records which version of the Terms / Privacy Policy a person accepted, and when.
ALTER TABLE `user`
  ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL,
  ADD COLUMN `termsVersion` VARCHAR(20) NULL;
