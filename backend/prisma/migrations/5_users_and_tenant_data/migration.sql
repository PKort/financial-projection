CREATE TABLE `users` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(191) NOT NULL,
  `passwordhash` VARCHAR(191) NOT NULL,
  `role` VARCHAR(32) NOT NULL DEFAULT 'USER',
  `isactive` BOOLEAN NOT NULL DEFAULT true,
  `createdat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedat` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_username_key`(`username`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_sessions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userid` INTEGER NOT NULL,
  `tokenhash` VARCHAR(191) NOT NULL,
  `expiresat` DATETIME(3) NOT NULL,
  `createdat` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `user_sessions_tokenhash_key`(`tokenhash`),
  INDEX `user_sessions_userid_idx`(`userid`),
  INDEX `user_sessions_expiresat_idx`(`expiresat`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `users` (`username`, `passwordhash`, `role`, `isactive`, `updatedat`)
VALUES
  ('admin', '$2b$12$ZCsEt5vnecc8GsHI69GpNuFSfuCidMacQwY89ZDoruyIxSWQInJI.', 'ADMIN', true, CURRENT_TIMESTAMP(3)),
  ('piotr.kortyka', '$2b$12$ZCsEt5vnecc8GsHI69GpNuFSfuCidMacQwY89ZDoruyIxSWQInJI.', 'USER', true, CURRENT_TIMESTAMP(3));

SET @piotr_user_id = (SELECT `id` FROM `users` WHERE `username` = 'piotr.kortyka');

ALTER TABLE `globalsettings` ADD COLUMN `userid` INTEGER NULL;
ALTER TABLE `accounts` ADD COLUMN `userid` INTEGER NULL;
ALTER TABLE `transactiongroups` ADD COLUMN `userid` INTEGER NULL;
ALTER TABLE `transactionsubgroups` ADD COLUMN `userid` INTEGER NULL;
ALTER TABLE `transactions` ADD COLUMN `userid` INTEGER NULL;
ALTER TABLE `recurring_templates` ADD COLUMN `userid` INTEGER NULL;

UPDATE `globalsettings` SET `userid` = @piotr_user_id;
UPDATE `accounts` SET `userid` = @piotr_user_id;
UPDATE `transactiongroups` SET `userid` = @piotr_user_id;
UPDATE `transactionsubgroups` SET `userid` = @piotr_user_id;
UPDATE `transactions` SET `userid` = @piotr_user_id;
UPDATE `recurring_templates` SET `userid` = @piotr_user_id;

ALTER TABLE `globalsettings` MODIFY `userid` INTEGER NOT NULL;
ALTER TABLE `accounts` MODIFY `userid` INTEGER NOT NULL;
ALTER TABLE `transactiongroups` MODIFY `userid` INTEGER NOT NULL;
ALTER TABLE `transactionsubgroups` MODIFY `userid` INTEGER NOT NULL;
ALTER TABLE `transactions` MODIFY `userid` INTEGER NOT NULL;
ALTER TABLE `recurring_templates` MODIFY `userid` INTEGER NOT NULL;

ALTER TABLE `globalsettings` DROP INDEX `globalsettings_key_key`;
ALTER TABLE `transactiongroups` DROP INDEX `transactiongroups_code_key`;
ALTER TABLE `transactionsubgroups` DROP INDEX `transactionsubgroups_code_key`;

CREATE UNIQUE INDEX `globalsettings_userid_key_key` ON `globalsettings`(`userid`, `key`);
CREATE UNIQUE INDEX `transactiongroups_userid_code_key` ON `transactiongroups`(`userid`, `code`);
CREATE UNIQUE INDEX `transactionsubgroups_userid_code_key` ON `transactionsubgroups`(`userid`, `code`);

CREATE INDEX `globalsettings_userid_idx` ON `globalsettings`(`userid`);
CREATE INDEX `accounts_userid_idx` ON `accounts`(`userid`);
CREATE INDEX `transactiongroups_userid_idx` ON `transactiongroups`(`userid`);
CREATE INDEX `transactionsubgroups_userid_idx` ON `transactionsubgroups`(`userid`);
CREATE INDEX `transactions_userid_idx` ON `transactions`(`userid`);
CREATE INDEX `recurring_templates_userid_idx` ON `recurring_templates`(`userid`);

ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_userid_fkey`
  FOREIGN KEY (`userid`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `globalsettings` ADD CONSTRAINT `globalsettings_userid_fkey`
  FOREIGN KEY (`userid`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userid_fkey`
  FOREIGN KEY (`userid`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactiongroups` ADD CONSTRAINT `transactiongroups_userid_fkey`
  FOREIGN KEY (`userid`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactionsubgroups` ADD CONSTRAINT `transactionsubgroups_userid_fkey`
  FOREIGN KEY (`userid`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userid_fkey`
  FOREIGN KEY (`userid`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `recurring_templates` ADD CONSTRAINT `recurring_templates_userid_fkey`
  FOREIGN KEY (`userid`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
