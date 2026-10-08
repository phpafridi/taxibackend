-- CreateTable
CREATE TABLE `agreement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('HIRE_AGREEMENT', 'INSURANCE_CERTIFICATE') NOT NULL,
    `driverId` INTEGER NULL,
    `carId` INTEGER NULL,
    `insuranceId` INTEGER NULL,
    `insuranceNumber` VARCHAR(50) NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT NOT NULL,
    `terms` TEXT NULL,
    `weeklyRate` DECIMAL(10, 2) NULL,
    `depositAmount` DECIMAL(10, 2) NULL,
    `depositPaid` BOOLEAN NOT NULL DEFAULT false,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `signedAt` DATETIME(3) NULL,
    `terminatedAt` DATETIME(3) NULL,
    `signedByName` VARCHAR(255) NULL,
    `signatureData` TEXT NULL,
    `signedByUserId` INTEGER NULL,
    `createdBy` INTEGER NULL,
    `status` ENUM('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'TERMINATED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_SIGNATURE',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Agreement_carId_idx`(`carId`),
    INDEX `Agreement_createdBy_fkey`(`createdBy`),
    INDEX `Agreement_driverId_idx`(`driverId`),
    INDEX `Agreement_endDate_idx`(`endDate`),
    INDEX `Agreement_insuranceId_fkey`(`insuranceId`),
    INDEX `Agreement_isActive_idx`(`isActive`),
    INDEX `Agreement_signedByUserId_fkey`(`signedByUserId`),
    INDEX `Agreement_startDate_idx`(`startDate`),
    INDEX `Agreement_status_idx`(`status`),
    INDEX `Agreement_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `driverId` INTEGER NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity` VARCHAR(100) NOT NULL,
    `entityId` INTEGER NULL,
    `oldValues` TEXT NULL,
    `newValues` TEXT NULL,
    `changes` TEXT NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `location` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_driverId_idx`(`driverId`),
    INDEX `AuditLog_entity_entityId_idx`(`entity`, `entityId`),
    INDEX `AuditLog_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `car` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `registration` VARCHAR(20) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `make` VARCHAR(100) NOT NULL,
    `year` INTEGER NULL,
    `color` VARCHAR(50) NULL,
    `avatar` VARCHAR(500) NULL,
    `purchasePrice` DECIMAL(12, 2) NOT NULL,
    `purchaseDate` DATETIME(3) NULL,
    `currentValue` DECIMAL(12, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    `driverProfileId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `HIRE` BOOLEAN NOT NULL DEFAULT false,
    `INSURANCE_C` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Car_registration_key`(`registration`),
    INDEX `Car_createdAt_idx`(`createdAt`),
    INDEX `Car_driverProfileId_idx`(`driverProfileId`),
    INDEX `Car_isActive_idx`(`isActive`),
    INDEX `Car_registration_idx`(`registration`),
    INDEX `Car_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `document` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('AGREEMENT', 'INVOICE', 'RECEIPT', 'INSURANCE_CERTIFICATE', 'MAINTENANCE_INVOICE', 'LICENSE', 'OTHER') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `fileName` VARCHAR(500) NOT NULL,
    `fileUrl` VARCHAR(1000) NOT NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(100) NULL,
    `driverId` INTEGER NULL,
    `carId` INTEGER NULL,
    `insuranceId` INTEGER NULL,
    `maintenanceId` INTEGER NULL,
    `agreementId` INTEGER NULL,
    `description` TEXT NULL,
    `uploadedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Document_agreementId_fkey`(`agreementId`),
    INDEX `Document_carId_idx`(`carId`),
    INDEX `Document_createdAt_idx`(`createdAt`),
    INDEX `Document_driverId_idx`(`driverId`),
    INDEX `Document_insuranceId_fkey`(`insuranceId`),
    INDEX `Document_maintenanceId_fkey`(`maintenanceId`),
    INDEX `Document_type_idx`(`type`),
    INDEX `Document_uploadedBy_fkey`(`uploadedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driverinsurancepayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `insuranceId` INTEGER NOT NULL,
    `driverId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `month` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `reference` VARCHAR(100) NULL,
    `method` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DriverInsurancePayment_driverId_idx`(`driverId`),
    INDEX `DriverInsurancePayment_dueDate_idx`(`dueDate`),
    INDEX `DriverInsurancePayment_month_idx`(`month`),
    INDEX `DriverInsurancePayment_status_idx`(`status`),
    UNIQUE INDEX `DriverInsurancePayment_insuranceId_month_key`(`insuranceId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driverprofile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `driverNumber_licenseNumber` VARCHAR(50) NULL,
    `licenseNumber` VARCHAR(50) NULL,
    `licenseExpiry` DATETIME(3) NULL,
    `address` TEXT NULL,
    `postcode` VARCHAR(20) NULL,
    `emergencyContact` VARCHAR(100) NULL,
    `emergencyPhone` VARCHAR(20) NULL,
    `weeklyAmount` DECIMAL(10, 2) NOT NULL,
    `depositPaid` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedBy` INTEGER NULL,
    `agreementSigned` BOOLEAN NOT NULL DEFAULT false,
    `agreementSignedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `DriverProfile_userId_key`(`userId`),
    INDEX `DriverProfile_createdAt_idx`(`createdAt`),
    INDEX `DriverProfile_isActive_idx`(`isActive`),
    INDEX `DriverProfile_isVerified_idx`(`isVerified`),
    INDEX `DriverProfile_licenseNumber_idx`(`licenseNumber`),
    INDEX `DriverProfile_userId_idx`(`userId`),
    INDEX `DriverProfile_verifiedBy_fkey`(`verifiedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `insurance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `carId` INTEGER NOT NULL,
    `driverId` INTEGER NULL,
    `provider` VARCHAR(255) NOT NULL,
    `policyNo` VARCHAR(100) NULL,
    `certificateNo` VARCHAR(100) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `renewalDate` DATETIME(3) NULL,
    `yearlyCost` DECIMAL(10, 2) NULL,
    `monthlyCharge` DECIMAL(10, 2) NULL,
    `excessAmount` DECIMAL(10, 2) NULL,
    `coverageType` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isExpired` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Insurance_policyNo_key`(`policyNo`),
    INDEX `Insurance_carId_idx`(`carId`),
    INDEX `Insurance_driverId_idx`(`driverId`),
    INDEX `Insurance_endDate_idx`(`endDate`),
    INDEX `Insurance_isActive_idx`(`isActive`),
    INDEX `Insurance_renewalDate_idx`(`renewalDate`),
    UNIQUE INDEX `Insurance_carId_startDate_key`(`carId`, `startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ownerType` ENUM('OWNER', 'DRIVER', 'COMPANY') NOT NULL,
    `status` VARCHAR(50) NULL DEFAULT 'ACCEPT',
    `ownerId` INTEGER NOT NULL,
    `carId` INTEGER NULL,
    `driverId` INTEGER NULL,
    `agreementId` INTEGER NULL,
    `maintenanceId` INTEGER NULL,
    `insurancePaymentId` INTEGER NULL,
    `weeklyPaymentId` INTEGER NULL,
    `category` ENUM('CAR_PURCHASE', 'INSURANCE', 'INSURANCE_DRIVER_PAYMENT', 'WEEKLY_INCOME', 'MAINTENANCE_EXPENSE', 'MAINTENANCE_REIMBURSEMENT', 'ADJUSTMENT', 'REFUND', 'DEPOSIT', 'FINE', 'OTHER') NOT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `referenceId` INTEGER NULL,
    `referenceType` VARCHAR(100) NULL,
    `description` TEXT NULL,
    `balanceBefore` DECIMAL(12, 2) NULL,
    `balanceAfter` DECIMAL(12, 2) NULL,
    `paymentMethod` VARCHAR(50) NULL,
    `paymentDate` DATETIME(3) NULL,
    `isReconciled` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Ledger_agreementId_fkey`(`agreementId`),
    INDEX `Ledger_carId_idx`(`carId`),
    INDEX `Ledger_category_idx`(`category`),
    INDEX `Ledger_createdAt_idx`(`createdAt`),
    INDEX `Ledger_createdBy_fkey`(`createdBy`),
    INDEX `Ledger_direction_idx`(`direction`),
    INDEX `Ledger_driverId_idx`(`driverId`),
    INDEX `Ledger_insurancePaymentId_fkey`(`insurancePaymentId`),
    INDEX `Ledger_isReconciled_idx`(`isReconciled`),
    INDEX `Ledger_maintenanceId_fkey`(`maintenanceId`),
    INDEX `Ledger_ownerType_ownerId_idx`(`ownerType`, `ownerId`),
    INDEX `Ledger_paymentDate_idx`(`paymentDate`),
    INDEX `Ledger_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `Ledger_weeklyPaymentId_fkey`(`weeklyPaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `maintenancerequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `carId` INTEGER NOT NULL,
    `driverId` INTEGER NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `estimatedAmount` DECIMAL(10, 2) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `approvedBy` INTEGER NULL,
    `approvedAt` DATETIME(3) NULL,
    `approvedAmount` DECIMAL(10, 2) NULL,
    `rejectionReason` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `garageName` VARCHAR(255) NULL,
    `garageContact` VARCHAR(100) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MaintenanceRequest_approvedBy_fkey`(`approvedBy`),
    INDEX `MaintenanceRequest_carId_idx`(`carId`),
    INDEX `MaintenanceRequest_createdAt_idx`(`createdAt`),
    INDEX `MaintenanceRequest_driverId_idx`(`driverId`),
    INDEX `MaintenanceRequest_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `MaintenanceRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `driverId` INTEGER NULL,
    `type` ENUM('INSURANCE_EXPIRY', 'MAINTENANCE_REQUEST', 'MAINTENANCE_APPROVED', 'MAINTENANCE_REJECTED', 'WEEKLY_PAYMENT_DUE', 'WEEKLY_PAYMENT_MISSED', 'WEEKLY_PAYMENT_PAID', 'SYSTEM', 'LEDGER_UPDATE', 'AGREEMENT_SIGNED', 'AGREEMENT_EXPIRING', 'AGREEMENT_EXPIRED') NOT NULL,
    `priority` VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `actionUrl` VARCHAR(500) NULL,
    `referenceType` VARCHAR(100) NULL,
    `referenceId` INTEGER NULL,
    `isForAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `metadata` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_createdAt_idx`(`createdAt`),
    INDEX `Notification_driverId_isRead_idx`(`driverId`, `isRead`),
    INDEX `Notification_priority_idx`(`priority`),
    INDEX `Notification_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `Notification_type_idx`(`type`),
    INDEX `Notification_userId_isRead_idx`(`userId`, `isRead`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcmToken` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(500) NOT NULL,
    `userId` INTEGER NULL,
    `driverId` INTEGER NULL,
    `platform` VARCHAR(50) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `fcmToken_token_key`(`token`),
    INDEX `fcmToken_userId_idx`(`userId`),
    INDEX `fcmToken_driverId_idx`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `otp` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `driverId` INTEGER NULL,
    `email` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NULL,
    `code` VARCHAR(10) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `OTP_code_idx`(`code`),
    INDEX `OTP_driverId_idx`(`driverId`),
    INDEX `OTP_email_idx`(`email`),
    INDEX `OTP_expiresAt_idx`(`expiresAt`),
    INDEX `OTP_phone_idx`(`phone`),
    INDEX `OTP_type_idx`(`type`),
    INDEX `OTP_used_idx`(`used`),
    INDEX `OTP_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ownerinsurancepayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `insuranceId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reference` VARCHAR(100) NULL,
    `method` VARCHAR(50) NULL,
    `description` TEXT NULL,
    `createdBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OwnerInsurancePayment_createdAt_idx`(`createdAt`),
    INDEX `OwnerInsurancePayment_createdBy_fkey`(`createdBy`),
    INDEX `OwnerInsurancePayment_insuranceId_idx`(`insuranceId`),
    INDEX `OwnerInsurancePayment_paymentDate_idx`(`paymentDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `passwordreset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `token` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordReset_token_key`(`token`),
    INDEX `PasswordReset_email_idx`(`email`),
    INDEX `PasswordReset_expiresAt_idx`(`expiresAt`),
    INDEX `PasswordReset_token_idx`(`token`),
    INDEX `PasswordReset_used_idx`(`used`),
    INDEX `PasswordReset_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `systemsetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `group` VARCHAR(50) NOT NULL,
    `type` VARCHAR(20) NOT NULL DEFAULT 'STRING',
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `createdBy` INTEGER NULL,
    `updatedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemSetting_key_key`(`key`),
    INDEX `SystemSetting_createdBy_fkey`(`createdBy`),
    INDEX `SystemSetting_group_idx`(`group`),
    INDEX `SystemSetting_key_idx`(`key`),
    INDEX `SystemSetting_updatedBy_fkey`(`updatedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `avatar` VARCHAR(500) NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'DRIVER') NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLogin` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `HIRE` BOOLEAN NOT NULL DEFAULT false,
    `INSURANCE_C` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_createdAt_idx`(`createdAt`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_isActive_idx`(`isActive`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `weeklypayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `carId` INTEGER NOT NULL,
    `driverId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `weekStart` DATETIME(3) NOT NULL,
    `weekEnd` DATETIME(3) NOT NULL,
    `dueDate` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `reference` VARCHAR(100) NULL,
    `method` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WeeklyPayment_carId_idx`(`carId`),
    INDEX `WeeklyPayment_driverId_idx`(`driverId`),
    INDEX `WeeklyPayment_dueDate_idx`(`dueDate`),
    INDEX `WeeklyPayment_status_idx`(`status`),
    INDEX `WeeklyPayment_status_weekStart_idx`(`status`, `weekStart`),
    INDEX `WeeklyPayment_weekStart_idx`(`weekStart`),
    UNIQUE INDEX `WeeklyPayment_driverId_weekStart_key`(`driverId`, `weekStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `agreement` ADD CONSTRAINT `Agreement_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `car`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreement` ADD CONSTRAINT `Agreement_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreement` ADD CONSTRAINT `Agreement_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreement` ADD CONSTRAINT `Agreement_insuranceId_fkey` FOREIGN KEY (`insuranceId`) REFERENCES `insurance`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `agreement` ADD CONSTRAINT `Agreement_signedByUserId_fkey` FOREIGN KEY (`signedByUserId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditlog` ADD CONSTRAINT `AuditLog_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditlog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `car` ADD CONSTRAINT `Car_driverProfileId_fkey` FOREIGN KEY (`driverProfileId`) REFERENCES `driverprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document` ADD CONSTRAINT `Document_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `agreement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document` ADD CONSTRAINT `Document_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `car`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document` ADD CONSTRAINT `Document_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document` ADD CONSTRAINT `Document_insuranceId_fkey` FOREIGN KEY (`insuranceId`) REFERENCES `insurance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document` ADD CONSTRAINT `Document_maintenanceId_fkey` FOREIGN KEY (`maintenanceId`) REFERENCES `maintenancerequest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `document` ADD CONSTRAINT `Document_uploadedBy_fkey` FOREIGN KEY (`uploadedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driverinsurancepayment` ADD CONSTRAINT `DriverInsurancePayment_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driverinsurancepayment` ADD CONSTRAINT `DriverInsurancePayment_insuranceId_fkey` FOREIGN KEY (`insuranceId`) REFERENCES `insurance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driverprofile` ADD CONSTRAINT `DriverProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driverprofile` ADD CONSTRAINT `DriverProfile_verifiedBy_fkey` FOREIGN KEY (`verifiedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insurance` ADD CONSTRAINT `Insurance_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `car`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `insurance` ADD CONSTRAINT `Insurance_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `Ledger_agreementId_fkey` FOREIGN KEY (`agreementId`) REFERENCES `agreement`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `Ledger_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `car`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `Ledger_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `Ledger_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `Ledger_insurancePaymentId_fkey` FOREIGN KEY (`insurancePaymentId`) REFERENCES `driverinsurancepayment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `Ledger_maintenanceId_fkey` FOREIGN KEY (`maintenanceId`) REFERENCES `maintenancerequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger` ADD CONSTRAINT `Ledger_weeklyPaymentId_fkey` FOREIGN KEY (`weeklyPaymentId`) REFERENCES `weeklypayment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenancerequest` ADD CONSTRAINT `MaintenanceRequest_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenancerequest` ADD CONSTRAINT `MaintenanceRequest_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `car`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `maintenancerequest` ADD CONSTRAINT `MaintenanceRequest_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `Notification_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcmToken` ADD CONSTRAINT `FcmToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `fcmToken` ADD CONSTRAINT `FcmToken_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp` ADD CONSTRAINT `OTP_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `otp` ADD CONSTRAINT `OTP_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ownerinsurancepayment` ADD CONSTRAINT `OwnerInsurancePayment_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ownerinsurancepayment` ADD CONSTRAINT `OwnerInsurancePayment_insuranceId_fkey` FOREIGN KEY (`insuranceId`) REFERENCES `insurance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `passwordreset` ADD CONSTRAINT `PasswordReset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `systemsetting` ADD CONSTRAINT `SystemSetting_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `systemsetting` ADD CONSTRAINT `SystemSetting_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weeklypayment` ADD CONSTRAINT `WeeklyPayment_carId_fkey` FOREIGN KEY (`carId`) REFERENCES `car`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weeklypayment` ADD CONSTRAINT `WeeklyPayment_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `driverprofile`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
