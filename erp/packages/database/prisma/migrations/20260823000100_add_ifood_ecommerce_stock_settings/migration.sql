ALTER TABLE `IntegrationConnection`
  ADD COLUMN `ecommerceStockMode` VARCHAR(191) NOT NULL DEFAULT 'FULL',
  ADD COLUMN `ecommerceStockPercent` DECIMAL(5, 2) NULL,
  ADD COLUMN `ecommerceStockFixedQuantity` DECIMAL(15, 3) NULL;
