-- Optional category assigned to automatic repayments for each credit card.
CREATE INDEX `accountsautorepaymentgroupididx`
  ON `accounts`(`autorepaymentgroupid`);

CREATE INDEX `accountsautorepaymentsubgroupididx`
  ON `accounts`(`autorepaymentsubgroupid`);
