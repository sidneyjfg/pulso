-- CreateTable
CREATE TABLE `Alert` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `type` ENUM('LOW_STOCK', 'OUT_OF_STOCK', 'FISCAL_PENDING', 'IMPORT_ERROR', 'INTEGRATION_ERROR', 'SECURITY', 'OTHER') NOT NULL,
    `severity` ENUM('INFO', 'WARNING', 'CRITICAL') NOT NULL DEFAULT 'INFO',
    `status` ENUM('OPEN', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Alert_companyId_branchId_status_createdAt_idx`(`companyId`, `branchId`, `status`, `createdAt`),
    INDEX `Alert_companyId_type_status_idx`(`companyId`, `type`, `status`),
    INDEX `Alert_companyId_entityType_entityId_idx`(`companyId`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertRule` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `type` ENUM('LOW_STOCK', 'OUT_OF_STOCK', 'FISCAL_PENDING', 'IMPORT_ERROR', 'INTEGRATION_ERROR', 'SECURITY', 'OTHER') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `threshold` JSON NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AlertRule_companyId_branchId_active_idx`(`companyId`, `branchId`, `active`),
    INDEX `AlertRule_companyId_type_active_idx`(`companyId`, `type`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportJob` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `source` ENUM('CSV', 'XLSX', 'BLING', 'TINY', 'OMIE', 'CONTA_AZUL', 'OTHER') NOT NULL DEFAULT 'CSV',
    `status` ENUM('DRAFT', 'MAPPING', 'VALIDATING', 'READY_TO_IMPORT', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `fileName` VARCHAR(191) NULL,
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `validRows` INTEGER NOT NULL DEFAULT 0,
    `invalidRows` INTEGER NOT NULL DEFAULT 0,
    `summary` JSON NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ImportJob_companyId_branchId_status_createdAt_idx`(`companyId`, `branchId`, `status`, `createdAt`),
    INDEX `ImportJob_companyId_source_createdAt_idx`(`companyId`, `source`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IntegrationConnection` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `channel` ENUM('IFOOD', 'FOOD99', 'MARKETPLACE', 'ECOMMERCE', 'POS', 'API', 'OTHER') NOT NULL,
    `status` ENUM('DISCONNECTED', 'CONNECTED', 'ERROR', 'PAUSED') NOT NULL DEFAULT 'DISCONNECTED',
    `externalAccountId` VARCHAR(191) NULL,
    `connectedAt` DATETIME(3) NULL,
    `lastSyncAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `IntegrationConnection_companyId_branchId_status_idx`(`companyId`, `branchId`, `status`),
    INDEX `IntegrationConnection_companyId_channel_status_idx`(`companyId`, `channel`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportJob` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NULL,
    `type` ENUM('SALES', 'INVENTORY', 'PURCHASES', 'FISCAL', 'CUSTOM') NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `filters` JSON NULL,
    `resultSummary` JSON NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ReportJob_companyId_branchId_status_createdAt_idx`(`companyId`, `branchId`, `status`, `createdAt`),
    INDEX `ReportJob_companyId_type_createdAt_idx`(`companyId`, `type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutboxEvent` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `aggregateType` VARCHAR(191) NOT NULL,
    `aggregateId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NULL,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OutboxEvent_companyId_status_createdAt_idx`(`companyId`, `status`, `createdAt`),
    INDEX `OutboxEvent_aggregateType_aggregateId_idx`(`aggregateType`, `aggregateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WebhookEvent` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `channel` ENUM('IFOOD', 'FOOD99', 'MARKETPLACE', 'ECOMMERCE', 'POS', 'API', 'OTHER') NOT NULL,
    `externalEventId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED', 'DUPLICATE') NOT NULL DEFAULT 'RECEIVED',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `processedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `WebhookEvent_channel_externalEventId_key`(`channel`, `externalEventId`),
    INDEX `WebhookEvent_companyId_status_createdAt_idx`(`companyId`, `status`, `createdAt`),
    INDEX `WebhookEvent_channel_status_createdAt_idx`(`channel`, `status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AlertRule` ADD CONSTRAINT `AlertRule_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `AlertRule` ADD CONSTRAINT `AlertRule_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ImportJob` ADD CONSTRAINT `ImportJob_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `IntegrationConnection` ADD CONSTRAINT `IntegrationConnection_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `IntegrationConnection` ADD CONSTRAINT `IntegrationConnection_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReportJob` ADD CONSTRAINT `ReportJob_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `ReportJob` ADD CONSTRAINT `ReportJob_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OutboxEvent` ADD CONSTRAINT `OutboxEvent_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `WebhookEvent` ADD CONSTRAINT `WebhookEvent_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
