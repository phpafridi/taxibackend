-- Widen fileUrl, car.avatar, and user.avatar columns from TEXT (65,535 byte
-- limit) to LONGTEXT. A base64-encoded photo, even after client-side
-- resizing, can occasionally exceed the plain TEXT limit. This was causing:
--   "The provided value for the column is too long for the column's type.
--    Column: fileUrl" (Prisma error code P2000)
-- on maintenance request photo uploads, and risked the same failure for
-- vehicle/user avatar uploads.

ALTER TABLE `document` MODIFY `fileUrl` LONGTEXT NOT NULL;
ALTER TABLE `car` MODIFY `avatar` LONGTEXT NULL;
ALTER TABLE `user` MODIFY `avatar` LONGTEXT NULL;
