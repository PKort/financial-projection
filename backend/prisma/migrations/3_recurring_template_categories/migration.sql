-- Add categories to recurring templates so every generated expense carries the template's classification.
ALTER TABLE `recurring_templates`
    ADD COLUMN `transactiongroupid` INTEGER NULL,
    ADD COLUMN `transactionsubgroupid` INTEGER NULL;

CREATE INDEX `recurringtemplatestransactiongroupididx`
    ON `recurring_templates`(`transactiongroupid`);

CREATE INDEX `recurringtemplatestransactionsubgroupididx`
    ON `recurring_templates`(`transactionsubgroupid`);

ALTER TABLE `recurring_templates`
    ADD CONSTRAINT `recurring_templates_transactiongroupid_fkey`
    FOREIGN KEY (`transactiongroupid`) REFERENCES `transactiongroups`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `recurring_templates`
    ADD CONSTRAINT `recurring_templates_transactionsubgroupid_fkey`
    FOREIGN KEY (`transactionsubgroupid`) REFERENCES `transactionsubgroups`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
