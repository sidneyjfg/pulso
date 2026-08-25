UPDATE `IntegrationConnection`
SET
  `status` = 'DISCONNECTED',
  `connectedAt` = NULL,
  `lastSyncAt` = NULL
WHERE
  `channel` = 'IFOOD'
  AND `status` = 'CONNECTED'
  AND `accessToken` IS NULL;
