-- CreateTable
CREATE TABLE `globalsettings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `globalsettings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('CHECKING', 'CREDIT_CARD', 'SAVINGS') NOT NULL DEFAULT 'CHECKING',
    `initialbalance` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATETIME(3) NOT NULL,
    `info` VARCHAR(191) NOT NULL,
    `income` DECIMAL(10, 2) NULL,
    `expense` DECIMAL(10, 2) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'transaction',
    `isCleared` BOOLEAN NOT NULL DEFAULT false,
    `accountId` INTEGER NULL,
    `sourceAccountId` INTEGER NULL,
    `destinationAccountId` INTEGER NULL,
    `recurringTemplateId` INTEGER NULL,
    `recurrenceDate` DATETIME(3) NULL,
    `isGenerated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transactions_date_idx`(`date`),
    INDEX `transactions_accountId_idx`(`accountId`),
    INDEX `transactions_sourceAccountId_idx`(`sourceAccountId`),
    INDEX `transactions_destinationAccountId_idx`(`destinationAccountId`),
    INDEX `transactions_recurringTemplateId_idx`(`recurringTemplateId`),
    INDEX `transactions_recurrenceDate_idx`(`recurrenceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accountId` INTEGER NOT NULL,
    `info` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NULL,
    `multiplier` INTEGER NOT NULL DEFAULT 1,
    `period` VARCHAR(191) NOT NULL,
    `dayOfMonth` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_sourceAccountId_fkey` FOREIGN KEY (`sourceAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_destinationAccountId_fkey` FOREIGN KEY (`destinationAccountId`) REFERENCES `accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_recurringTemplateId_fkey` FOREIGN KEY (`recurringTemplateId`) REFERENCES `recurring_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `recurring_templates` ADD CONSTRAINT `recurring_templates_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

