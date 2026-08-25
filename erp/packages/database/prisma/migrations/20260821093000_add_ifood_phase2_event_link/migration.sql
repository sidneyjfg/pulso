ALTER TABLE `WebhookEvent`
  ADD COLUMN `integrationConnectionId` VARCHAR(191) NULL;

CREATE INDEX `WebhookEvent_integrationConnectionId_status_createdAt_idx`
  ON `WebhookEvent`(`integrationConnectionId`, `status`, `createdAt`);

ALTER TABLE `WebhookEvent`
  ADD CONSTRAINT `WebhookEvent_integrationConnectionId_fkey`
  FOREIGN KEY (`integrationConnectionId`) REFERENCES `IntegrationConnection`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
