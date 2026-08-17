-- Add product-level tax classifications used by Brazilian fiscal setup.
-- Rates and validity remain versioned in TaxRuleVersion.
ALTER TABLE `ProductFiscalProfile`
  ADD COLUMN `icmsCst` VARCHAR(191) NULL,
  ADD COLUMN `icmsCsosn` VARCHAR(191) NULL,
  ADD COLUMN `pisCst` VARCHAR(191) NULL,
  ADD COLUMN `cofinsCst` VARCHAR(191) NULL;

CREATE INDEX `ProductFiscalProfile_companyId_icmsCst_idx` ON `ProductFiscalProfile`(`companyId`, `icmsCst`);
CREATE INDEX `ProductFiscalProfile_companyId_pisCst_idx` ON `ProductFiscalProfile`(`companyId`, `pisCst`);
CREATE INDEX `ProductFiscalProfile_companyId_cofinsCst_idx` ON `ProductFiscalProfile`(`companyId`, `cofinsCst`);
