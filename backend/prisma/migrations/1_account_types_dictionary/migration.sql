CREATE TABLE `account_types` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `key` VARCHAR(191) NOT NULL,
  `label` VARCHAR(191) NOT NULL,
  `description` VARCHAR(191) NULL,
  `sortorder` INTEGER NOT NULL DEFAULT 0,
  `isactive` BOOLEAN NOT NULL DEFAULT true,

  UNIQUE INDEX `account_types_key_key`(`key`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `account_types` (`key`, `label`, `description`, `sortorder`, `isactive`) VALUES
('checking', 'Rachunek bieżący', 'Podstawowe konto osobiste', 10, true),
('savings', 'Oszczędnościowe', 'Konto oszczędnościowe', 20, true),
('credit_card', 'Karta kredytowa', 'Karta kredytowa / limit odnawialny', 30, true);

ALTER TABLE `accounts`
  ADD COLUMN `accounttypeid` INTEGER NULL;

UPDATE `accounts` a
LEFT JOIN `account_types` t ON t.`key` = CASE a.`type`
  WHEN 'CHECKING' THEN 'checking'
  WHEN 'SAVINGS' THEN 'savings'
  WHEN 'CREDIT_CARD' THEN 'credit_card'
END
SET a.`accounttypeid` = t.`id`;

ALTER TABLE `accounts`
  MODIFY `accounttypeid` INTEGER NOT NULL;

ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_accounttypeid_fkey`
  FOREIGN KEY (`accounttypeid`) REFERENCES `account_types`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `accounts`
  ADD INDEX `accounts_accounttypeid_idx`(`accounttypeid`);

ALTER TABLE `accounts`
  DROP COLUMN `type`;
