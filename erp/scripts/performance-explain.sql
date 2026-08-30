EXPLAIN SELECT id, sku, name, salePrice, active, createdAt
FROM Product
WHERE companyId = 'dev_company'
  AND active = TRUE
ORDER BY createdAt DESC
LIMIT 26;

EXPLAIN SELECT id, status, total, source, createdAt
FROM Sale
WHERE companyId = 'dev_company'
  AND branchId = 'dev_branch_centro'
ORDER BY createdAt DESC
LIMIT 26;

EXPLAIN SELECT id, externalEventId, eventType, status, createdAt
FROM WebhookEvent
WHERE companyId = 'dev_company'
  AND integrationConnectionId = 'cmt4hf04u000lzdei434c6vwm'
  AND channel = 'IFOOD'
ORDER BY createdAt DESC
LIMIT 26;

EXPLAIN SELECT id, status, ifoodOrderId, ifoodItemId, createdAt
FROM IfoodOrderPendingItem
WHERE companyId = 'dev_company'
  AND branchId = 'dev_branch_centro'
  AND integrationConnectionId = 'cmt4hf04u000lzdei434c6vwm'
  AND status = 'PENDING_LINK'
ORDER BY createdAt DESC
LIMIT 26;

EXPLAIN SELECT id, warehouseId, productId, quantity, reservedQuantity
FROM StockBalance
WHERE companyId = 'dev_company'
  AND branchId = 'dev_branch_centro'
ORDER BY updatedAt DESC
LIMIT 26;

EXPLAIN SELECT id, sku, name
FROM Product
WHERE companyId = 'dev_company'
  AND (sku LIKE '%teste%' OR name LIKE '%teste%')
LIMIT 25;
