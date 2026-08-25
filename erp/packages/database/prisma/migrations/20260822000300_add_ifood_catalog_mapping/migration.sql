CREATE TABLE `IfoodCatalogCategory` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `integrationConnectionId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `ifoodCategoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SYNCED',
    `lastSyncedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IfoodCatalogCategory_integrationConnectionId_categoryId_key`(`integrationConnectionId`, `categoryId`),
    INDEX `IfoodCatalogCategory_companyId_integrationConnectionId_idx`(`companyId`, `integrationConnectionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `IfoodCatalogItem` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `integrationConnectionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `ifoodCategoryId` VARCHAR(191) NOT NULL,
    `ifoodItemId` VARCHAR(191) NOT NULL,
    `ifoodProductId` VARCHAR(191) NOT NULL,
    `externalCode` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SYNCED',
    `lastSyncedAt` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `IfoodCatalogItem_integrationConnectionId_productId_key`(`integrationConnectionId`, `productId`),
    UNIQUE INDEX `IfoodCatalogItem_integrationConnectionId_ifoodItemId_key`(`integrationConnectionId`, `ifoodItemId`),
    INDEX `IfoodCatalogItem_companyId_branchId_status_idx`(`companyId`, `branchId`, `status`),
    INDEX `IfoodCatalogItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `IfoodCatalogCategory`
  ADD CONSTRAINT `IfoodCatalogCategory_integrationConnectionId_fkey`
  FOREIGN KEY (`integrationConnectionId`) REFERENCES `IntegrationConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `IfoodCatalogCategory`
  ADD CONSTRAINT `IfoodCatalogCategory_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `IfoodCatalogItem`
  ADD CONSTRAINT `IfoodCatalogItem_integrationConnectionId_fkey`
  FOREIGN KEY (`integrationConnectionId`) REFERENCES `IntegrationConnection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `IfoodCatalogItem`
  ADD CONSTRAINT `IfoodCatalogItem_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
