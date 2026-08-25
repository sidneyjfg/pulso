ALTER TABLE `Alert` MODIFY `type` ENUM('LOW_STOCK', 'OUT_OF_STOCK', 'IFOOD_ORDER', 'FINANCIAL_DUE', 'FISCAL_PENDING', 'IMPORT_ERROR', 'INTEGRATION_ERROR', 'SECURITY', 'OTHER') NOT NULL;

CREATE TABLE `FinancialEntry` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `branchId` VARCHAR(191) NOT NULL,
  `direction` ENUM('RECEIVABLE', 'PAYABLE') NOT NULL,
  `status` ENUM('OPEN', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
  `sourceType` ENUM('SALE', 'PURCHASE', 'MANUAL') NOT NULL,
  `sourceId` VARCHAR(191) NULL,
  `installmentNumber` INTEGER NOT NULL DEFAULT 1,
  `installmentTotal` INTEGER NOT NULL DEFAULT 1,
  `description` VARCHAR(191) NOT NULL,
  `partyName` VARCHAR(191) NULL,
  `dueDate` DATETIME(3) NOT NULL,
  `amount` DECIMAL(15, 2) NOT NULL,
  `paidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `interestAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
  `paymentMethod` ENUM('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BANK_TRANSFER', 'VOUCHER', 'OTHER') NULL,
  `proofUrl` TEXT NULL,
  `proofFileName` VARCHAR(191) NULL,
  `paidAt` DATETIME(3) NULL,
  `cancelledAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `financial_entry_source_installment_uq`(`companyId`, `sourceType`, `sourceId`, `installmentNumber`),
  INDEX `financial_entry_direction_status_due_idx`(`companyId`, `branchId`, `direction`, `status`, `dueDate`),
  INDEX `financial_entry_source_idx`(`companyId`, `branchId`, `sourceType`, `sourceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FinancialEntry` ADD CONSTRAINT `FinancialEntry_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FinancialEntry` ADD CONSTRAINT `FinancialEntry_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
