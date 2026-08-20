ALTER TABLE `accounts`
  ADD COLUMN `includeindailybudget` BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE `transactions`
  ADD COLUMN `issalaryincome` BOOLEAN NOT NULL DEFAULT false;
