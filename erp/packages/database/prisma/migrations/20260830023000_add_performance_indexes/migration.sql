CREATE INDEX `stock_balance_company_branch_updated_idx`
  ON `StockBalance`(`companyId`, `branchId`, `updatedAt`);

CREATE INDEX `sale_company_branch_created_idx`
  ON `Sale`(`companyId`, `branchId`, `createdAt`);

CREATE INDEX `ifood_pending_company_branch_connection_status_idx`
  ON `IfoodOrderPendingItem`(`companyId`, `branchId`, `integrationConnectionId`, `status`, `createdAt`);

CREATE INDEX `webhook_company_connection_channel_created_idx`
  ON `WebhookEvent`(`companyId`, `integrationConnectionId`, `channel`, `createdAt`);
