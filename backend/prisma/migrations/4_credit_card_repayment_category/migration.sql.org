-- Optional category assigned to automatic repayments for each credit card.
ALTER TABLE `accounts`
  ADD COLUMN `autorepaymentgroupid` INTEGER NULL,
  ADD COLUMN `autorepaymentsubgroupid` INTEGER NULL;

CREATE INDEX `accountsautorepaymentgroupididx`
  ON `accounts`(`autorepaymentgroupid`);

CREATE INDEX `accountsautorepaymentsubgroupididx`
  ON `accounts`(`autorepaymentsubgroupid`);

ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_autorepaymentgroupid_fkey`
  FOREIGN KEY (`autorepaymentgroupid`) REFERENCES `transactiongroups`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `accounts`
  ADD CONSTRAINT `accounts_autorepaymentsubgroupid_fkey`
  FOREIGN KEY (`autorepaymentsubgroupid`) REFERENCES `transactionsubgroups`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
