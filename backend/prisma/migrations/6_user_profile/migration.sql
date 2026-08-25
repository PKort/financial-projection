ALTER TABLE `users`
  ADD COLUMN `firstname` VARCHAR(191) NULL,
  ADD COLUMN `lastname` VARCHAR(191) NULL,
  ADD COLUMN `email` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);
