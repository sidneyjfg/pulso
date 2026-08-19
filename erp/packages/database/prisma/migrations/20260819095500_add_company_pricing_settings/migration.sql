CREATE TABLE `CompanyPricingSetting` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `taxPercent` DECIMAL(5, 2) NOT NULL DEFAULT 6.00,
  `feePercent` DECIMAL(5, 2) NOT NULL DEFAULT 3.00,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `CompanyPricingSetting_companyId_key` (`companyId`),
  INDEX `CompanyPricingSetting_companyId_idx` (`companyId`),
  CONSTRAINT `CompanyPricingSetting_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
