UPDATE `IntegrationConnection`
SET `status` = 'CONNECTED'
WHERE
  `channel` = 'IFOOD'
  AND `status` = 'ERROR'
  AND `externalAccountId` IS NOT NULL
  AND `accessToken` IS NOT NULL;
