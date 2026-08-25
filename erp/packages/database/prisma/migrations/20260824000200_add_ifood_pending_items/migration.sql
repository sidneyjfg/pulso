ALTER TABLE `Sale`
  MODIFY `status` ENUM('PENDING', 'RESERVED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED';

CREATE TABLE `IfoodOrderPendingItem` (
  `id` VARCHAR(191) NOT NULL,
  `companyId` VARCHAR(191) NOT NULL,
  `branchId` VARCHAR(191) NOT NULL,
  `integrationConnectionId` VARCHAR(191) NOT NULL,
  `saleId` VARCHAR(191) NOT NULL,
  `saleItemId` VARCHAR(191) NOT NULL,
  `ifoodOrderId` VARCHAR(191) NOT NULL,
  `ifoodItemId` VARCHAR(191) NOT NULL,
  `externalCode` VARCHAR(191) NULL,
  `ean` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `quantity` DECIMAL(15, 3) NOT NULL,
  `unitPrice` DECIMAL(15, 2) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_LINK',
  `resolvedProductId` VARCHAR(191) NULL,
  `resolvedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `IfoodOrderPendingItem_saleItemId_key`(`saleItemId`),
  INDEX `ifood_pending_company_branch_status_idx`(`companyId`, `branchId`, `status`, `createdAt`),
  INDEX `ifood_pending_connection_status_idx`(`integrationConnectionId`, `status`, `createdAt`),
  INDEX `ifood_pending_order_idx`(`ifoodOrderId`),
  INDEX `ifood_pending_item_idx`(`ifoodItemId`),

  CONSTRAINT `IfoodOrderPendingItem_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `IfoodOrderPendingItem_saleId_fkey`
    FOREIGN KEY (`saleId`) REFERENCES `Sale`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `IfoodOrderPendingItem_saleItemId_fkey`
    FOREIGN KEY (`saleItemId`) REFERENCES `SaleItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
