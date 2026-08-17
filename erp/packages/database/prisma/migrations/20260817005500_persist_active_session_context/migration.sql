ALTER TABLE `Session`
  ADD COLUMN `activeOrganizationId` VARCHAR(191) NULL,
  ADD COLUMN `activeCompanyId` VARCHAR(191) NULL,
  ADD COLUMN `activeBranchId` VARCHAR(191) NULL;

CREATE INDEX `Session_activeOrganizationId_activeCompanyId_activeBranchId_idx`
  ON `Session`(`activeOrganizationId`, `activeCompanyId`, `activeBranchId`);
