import { z } from "zod";

export const idSchema = z.string().trim().min(3).max(120).regex(/^[A-Za-z0-9_-]+$/, "Informe um ID válido.");

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional()
});

export const loginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256),
  organizationId: idSchema.optional(),
  companyId: idSchema.optional(),
  branchId: idSchema.optional()
});

export const registerBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(256),
  companyName: z.string().trim().min(2).max(160),
  branchName: z.string().trim().min(2).max(120).default("Loja Principal")
});

export const switchContextBodySchema = z.object({
  organizationId: idSchema,
  companyId: idSchema,
  branchId: idSchema
});

export const listQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(120).optional()
});

export const financialEntryListQuerySchema = listQuerySchema.extend({
  status: z.enum(["ALL", "OPEN", "PAID", "CANCELLED", "OVERDUE"]).default("ALL")
});

export const adminLoginBodySchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(256)
});

export const createCompanyBodySchema = z.object({
  legalName: z.string().trim().min(2).max(160),
  tradeName: z.string().trim().min(2).max(120).optional(),
  cnpj: z.string().trim().min(14).max(18).optional()
});

export const updateCompanyBodySchema = createCompanyBodySchema.partial().extend({
  active: z.boolean().optional()
});

export const createBranchBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  defaultWarehouseName: z.string().trim().min(2).max(120).optional()
});

export const updateBranchBodySchema = createBranchBodySchema.partial().extend({
  active: z.boolean().optional()
});

export const createWarehouseBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  branchId: idSchema.optional()
});

export const updateWarehouseBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  active: z.boolean().optional()
});

export const updateUserPreferencesBodySchema = z.object({
  darkMode: z.boolean().optional(),
  compactMenu: z.boolean().optional(),
  showSavings: z.boolean().optional(),
  confirmCriticalActions: z.boolean().optional(),
  sessionWarnings: z.boolean().optional(),
  hideSensitiveData: z.boolean().optional(),
  blockNegativeStock: z.boolean().optional(),
  lowStockAlerts: z.boolean().optional(),
  currentBranchOnly: z.boolean().optional(),
  showFiscalPending: z.boolean().optional(),
  prepareChannelSync: z.boolean().optional()
}).strict();

export const createRoleBodySchema = z.object({
  name: z.string().trim().min(2).max(80),
  scope: z.enum(["ORGANIZATION", "COMPANY", "BRANCH"]),
  permissionKeys: z.array(z.string().min(3).max(80)).min(1).max(100)
});

export const createUserBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  password: z.string().min(10).max(256),
  roleId: idSchema,
  branchIds: z.array(idSchema).min(1).max(100)
});

export const updateUserStatusBodySchema = z.object({
  active: z.boolean()
});

export const updateUserAccessBodySchema = z.object({
  roleId: idSchema,
  branchIds: z.array(idSchema).min(1).max(100)
}).strict();

export const adminCreateOrganizationBodySchema = z.object({
  name: z.string().trim().min(2).max(160)
});

export const adminUpdateOrganizationBodySchema = adminCreateOrganizationBodySchema.partial().extend({
  active: z.boolean().optional()
});

const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^-?\d{1,12}(\.\d{1,3})?$/, "Informe um número válido.");

const moneyStringSchema = z
  .string()
  .trim()
  .regex(/^\d{1,12}(\.\d{1,2})?$/, "Informe um valor válido.");

const productImageDataUrlSchema = z
  .string()
  .max(7_000_000)
  .regex(/^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/]+={0,2}$/, "Informe uma imagem PNG ou JPG válida.");

export const createCategoryBodySchema = z.object({
  name: z.string().trim().min(2).max(120)
});

export const updateCategoryBodySchema = createCategoryBodySchema.partial().extend({
  active: z.boolean().optional()
});

export const createProductBodySchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional(),
  categoryId: idSchema.optional(),
  brandId: z.string().trim().max(80).optional(),
  unit: z.string().trim().min(1).max(12).default("UN"),
  costPrice: moneyStringSchema.optional(),
  salePrice: moneyStringSchema,
  imageDataUrl: productImageDataUrlSchema.optional(),
  imageFileName: z.string().trim().max(180).optional(),
  barcodes: z.array(z.string().trim().min(4).max(32)).max(20).default([]),
  branchPrices: z
    .array(
      z.object({
        branchId: idSchema,
        salePrice: moneyStringSchema
      })
    )
    .max(100)
    .default([]),
  initialStock: z
    .object({
      warehouseId: idSchema,
      quantity: decimalStringSchema.refine((value) => !value.startsWith("-"), "Quantidade inicial não pode ser negativa.")
    })
    .optional()
});

export const updateProductBodySchema = z.object({
  sku: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(2000).optional(),
  categoryId: idSchema.nullable().optional(),
  brandId: z.string().trim().max(80).nullable().optional(),
  unit: z.string().trim().min(1).max(12).optional(),
  costPrice: moneyStringSchema.nullable().optional(),
  salePrice: moneyStringSchema.optional(),
  imageDataUrl: productImageDataUrlSchema.nullable().optional(),
  imageFileName: z.string().trim().max(180).nullable().optional(),
  active: z.boolean().optional()
});

export const upsertProductBarcodeBodySchema = z.object({
  barcode: z.string().trim().min(4).max(32)
});

export const upsertBranchPriceBodySchema = z.object({
  branchId: idSchema,
  salePrice: moneyStringSchema
});

const personTypeSchema = z.enum(["INDIVIDUAL", "COMPANY"]);

const optionalDocumentSchema = z
  .string()
  .trim()
  .regex(/^\d{11}$|^\d{14}$/, "Informe CPF ou CNPJ somente com números.")
  .optional();

const contactBodySchema = z.object({
  type: personTypeSchema.default("INDIVIDUAL"),
  name: z.string().trim().min(2).max(180),
  document: optionalDocumentSchema,
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().min(8).max(20).optional(),
  notes: z.string().trim().max(1000).optional()
});

export const createCustomerBodySchema = contactBodySchema;

export const updateCustomerBodySchema = contactBodySchema.partial().extend({
  active: z.boolean().optional()
});

export const createSupplierBodySchema = contactBodySchema;

export const updateSupplierBodySchema = contactBodySchema.partial().extend({
  active: z.boolean().optional()
});

export const stockAdjustmentBodySchema = z.object({
  productId: idSchema,
  warehouseId: idSchema,
  quantityDelta: decimalStringSchema.refine((value) => value !== "0" && value !== "0.0" && value !== "0.00" && value !== "0.000", "A diferença não pode ser zero."),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(8).max(120)
});

export const stockBalanceQuerySchema = listQuerySchema.extend({
  warehouseId: idSchema.optional(),
  productId: idSchema.optional()
});

const positiveDecimalStringSchema = decimalStringSchema.refine(
  (value) => !value.startsWith("-") && !["0", "0.0", "0.00", "0.000"].includes(value),
  "Informe uma quantidade maior que zero."
);

export const createStockTransferBodySchema = z.object({
  sourceWarehouseId: idSchema,
  destinationBranchId: idSchema,
  destinationWarehouseId: idSchema,
  reason: z.string().trim().min(3).max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
  items: z
    .array(
      z.object({
        productId: idSchema,
        quantity: positiveDecimalStringSchema
      })
    )
    .min(1)
    .max(200)
});

export const transitionStockTransferBodySchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120)
});

export const createInventoryCountBodySchema = z.object({
  warehouseId: idSchema,
  notes: z.string().trim().max(1000).optional(),
  idempotencyKey: z.string().trim().min(8).max(120),
  items: z
    .array(
      z.object({
        productId: idSchema,
        countedQuantity: decimalStringSchema.refine((value) => !value.startsWith("-"), "Quantidade contada não pode ser negativa.")
      })
    )
    .min(1)
    .max(1000)
});

export const confirmInventoryCountBodySchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120)
});

const operationItemSchema = z.object({
  productId: idSchema,
  quantity: positiveDecimalStringSchema,
  unitPrice: moneyStringSchema,
  discount: moneyStringSchema.default("0")
});

export const createSaleBodySchema = z.object({
  customerId: idSchema.optional(),
  warehouseId: idSchema,
  source: z.enum(["MANUAL", "POS", "IFOOD", "FOOD99", "MARKETPLACE", "ECOMMERCE", "API", "IMPORT", "OTHER"]).default("MANUAL"),
  discount: moneyStringSchema.default("0"),
  idempotencyKey: z.string().trim().min(8).max(120),
  items: z.array(operationItemSchema).min(1).max(200),
  payments: z
    .array(
      z.object({
        method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "BANK_TRANSFER", "VOUCHER", "OTHER"]),
        amount: moneyStringSchema
      })
    )
    .max(20)
    .default([])
});

export const cancelSaleBodySchema = z.object({
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(8).max(120)
});

export const createPurchaseBodySchema = z.object({
  supplierId: idSchema.optional(),
  warehouseId: idSchema,
  status: z.enum(["DRAFT", "ORDERED"]).default("DRAFT"),
  discount: moneyStringSchema.default("0"),
  idempotencyKey: z.string().trim().min(8).max(120),
  items: z
    .array(
      z.object({
        productId: idSchema,
        quantity: positiveDecimalStringSchema,
        unitCost: moneyStringSchema,
        discount: moneyStringSchema.default("0")
      })
    )
    .min(1)
    .max(200)
});

export const receivePurchaseBodySchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120)
});

export const cancelPurchaseBodySchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

export const settleFinancialEntryBodySchema = z.object({
  paidAmount: moneyStringSchema.optional(),
  interestAmount: moneyStringSchema.default("0"),
  discountAmount: moneyStringSchema.default("0"),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "PIX", "BANK_TRANSFER", "VOUCHER", "OTHER"]).optional(),
  proofUrl: z.string().trim().url().max(2000).optional(),
  proofFileName: z.string().trim().min(1).max(180).optional()
});

export const cancelFinancialEntryBodySchema = z.object({
  reason: z.string().trim().min(3).max(500)
});

const ufSchema = z.enum([
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
]);

const rateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}(\.\d{1,4})?$/, "Informe uma alíquota válida.");

export const upsertCompanyFiscalProfileBodySchema = z.object({
  cnpj: z.string().trim().regex(/^\d{14}$/, "Informe CNPJ somente com números."),
  stateRegistration: z.string().trim().min(2).max(20).optional(),
  municipalRegistration: z.string().trim().min(2).max(20).optional(),
  taxRegime: z.enum(["MEI", "SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL"]),
  uf: ufSchema,
  municipality: z.string().trim().min(2).max(120),
  cnae: z.string().trim().regex(/^\d{7}$/, "Informe CNAE somente com números.").optional()
});

export const upsertProductFiscalProfileBodySchema = z.object({
  ncm: z.string().trim().regex(/^\d{8}$/, "Informe NCM com 8 números.").optional(),
  cest: z.string().trim().regex(/^\d{7}$/, "Informe CEST com 7 números.").optional(),
  origin: z.enum(["NATIONAL", "FOREIGN_DIRECT", "FOREIGN_INTERNAL"]).default("NATIONAL"),
  fiscalUnit: z.string().trim().min(1).max(12).default("UN"),
  productType: z.enum(["MERCHANDISE", "SERVICE", "RAW_MATERIAL", "PACKAGING", "FIXED_ASSET", "CONSUMPTION", "OTHER"]).default("MERCHANDISE"),
  icmsCst: z.string().trim().regex(/^\d{2,3}$/, "Informe CST ICMS com 2 ou 3 números.").optional(),
  icmsCsosn: z.string().trim().regex(/^\d{3,4}$/, "Informe CSOSN com 3 ou 4 números.").optional(),
  pisCst: z.string().trim().regex(/^\d{2}$/, "Informe CST PIS com 2 números.").optional(),
  cofinsCst: z.string().trim().regex(/^\d{2}$/, "Informe CST COFINS com 2 números.").optional()
});

export const fiscalPendingQuerySchema = listQuerySchema.extend({
  reason: z.enum(["MISSING_PROFILE", "MISSING_NCM", "MISSING_TAX_RULE"]).optional()
});

export const createAlertRuleBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["LOW_STOCK", "OUT_OF_STOCK", "IFOOD_ORDER", "FINANCIAL_DUE", "FISCAL_PENDING", "IMPORT_ERROR", "INTEGRATION_ERROR", "SECURITY", "OTHER"]),
  branchId: idSchema.optional(),
  threshold: z.record(z.unknown()).optional()
});

export const updateAlertRuleBodySchema = createAlertRuleBodySchema.partial().extend({
  active: z.boolean().optional()
});

export const createImportJobBodySchema = z.object({
  source: z.enum(["CSV", "XLSX", "BLING", "TINY", "OMIE", "CONTA_AZUL", "OTHER"]).default("CSV"),
  branchId: idSchema.optional(),
  fileName: z.string().trim().min(1).max(180).optional()
});

export const createIntegrationConnectionBodySchema = z.object({
  channel: z.literal("IFOOD"),
  branchId: idSchema.optional(),
  externalAccountId: z.string().trim().min(1).max(180).optional()
});

export const updateIntegrationConnectionBodySchema = z.object({
  status: z.enum(["DISCONNECTED", "CONNECTED", "ERROR", "PAUSED"]).optional(),
  externalAccountId: z.string().trim().min(1).max(180).nullable().optional(),
  ecommerceStockMode: z.enum(["FULL", "PERCENT", "FIXED"]).optional(),
  ecommerceStockPercent: moneyStringSchema.nullable().optional(),
  ecommerceStockFixedQuantity: decimalStringSchema.nullable().optional()
});

export const connectIfoodIntegrationBodySchema = z.object({
  merchantId: z.string().uuid(),
  mode: z.enum(["GROCERIES", "RESTAURANT_PDV"]).default("GROCERIES")
});

export const startIfoodOauthBodySchema = z.object({
  mode: z.enum(["GROCERIES", "RESTAURANT_PDV"]).default("GROCERIES")
});

export const completeIfoodOauthBodySchema = z.object({
  authorizationCode: z.string().trim().min(4).max(80),
  authorizationCodeVerifier: z.string().trim().min(16).max(512),
  merchantId: z.string().uuid().optional(),
  mode: z.enum(["GROCERIES", "RESTAURANT_PDV"]).default("GROCERIES")
});

export const ifoodCatalogItemsQuerySchema = listQuerySchema.extend({
  status: z.enum(["all", "linked", "unlinked"]).default("all")
});

export const linkIfoodCatalogItemBodySchema = z.object({
  productId: idSchema
});

export const createProductFromIfoodItemBodySchema = z.object({
  categoryId: idSchema.optional(),
  sku: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(2000).optional(),
  unit: z.string().trim().min(1).max(12).default("UN"),
  costPrice: moneyStringSchema.optional(),
  salePrice: moneyStringSchema.optional(),
  barcode: z.string().trim().min(4).max(32).optional()
});

export const ifoodOrderActionBodySchema = z.object({
  action: z.enum(["START_PREPARATION", "READY_TO_PICKUP", "DISPATCH"])
});

const ifoodOrderItemSchema = z.object({
  productId: idSchema,
  quantity: positiveDecimalStringSchema,
  unitPrice: moneyStringSchema,
  discount: moneyStringSchema.default("0")
});

const ifoodOrderEventSchema = z.object({
  externalEventId: z.string().trim().min(1).max(180),
  eventType: z.string().trim().min(1).max(120),
  occurredAt: z.coerce.date().optional(),
  order: z.object({
    externalOrderId: z.string().trim().min(1).max(180),
    status: z.enum(["PLACED", "CONFIRMED", "CANCELLED"]).default("CONFIRMED"),
    warehouseId: idSchema.optional(),
    cancelReason: z.string().trim().min(3).max(500).optional(),
    customer: z
      .object({
        name: z.string().trim().min(2).max(180).optional(),
        document: z.string().trim().regex(/^\d{11}$|^\d{14}$/).optional(),
        email: z.string().trim().email().max(254).optional()
      })
      .optional(),
    items: z.array(ifoodOrderItemSchema).min(1).max(200)
  })
});

const officialIfoodOrderEventSchema = z
  .object({
    id: z.string().trim().min(1).max(180),
    code: z.string().trim().min(1).max(120),
    fullCode: z.string().trim().min(1).max(180).optional(),
    orderId: z.string().trim().min(1).max(180),
    merchantId: z.string().trim().min(1).max(180).optional(),
    createdAt: z.coerce.date().optional(),
    metadata: z.unknown().optional()
  })
  .passthrough();

export const ingestIfoodOrderEventsBodySchema = z.object({
  events: z.array(z.union([officialIfoodOrderEventSchema, ifoodOrderEventSchema])).min(1).max(100),
  acknowledge: z.boolean().default(true)
});

export const reprocessIfoodOrderEventsBodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export const createReportJobBodySchema = z.object({
  type: z.enum(["SALES", "INVENTORY", "PURCHASES", "FISCAL", "CUSTOM"]),
  branchId: idSchema.optional(),
  filters: z.record(z.unknown()).optional()
});

export const createTaxRuleBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).optional(),
  taxType: z.enum(["ICMS", "PIS", "COFINS", "IBS", "CBS", "ISS", "IPI", "OTHER"]),
  conditions: z
    .array(
      z.object({
        field: z.string().trim().min(2).max(80),
        operator: z.enum(["EQUALS", "NOT_EQUALS", "IN", "NOT_IN", "STARTS_WITH"]),
        value: z.string().trim().min(1).max(160)
      })
    )
    .max(20)
    .default([])
});

export const updateTaxRuleBodySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  active: z.boolean().optional()
});

export const createTaxRuleVersionBodySchema = z.object({
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  cfop: z.string().trim().regex(/^\d{4}$/, "Informe CFOP com 4 números.").optional(),
  cst: z.string().trim().max(3).optional(),
  csosn: z.string().trim().max(4).optional(),
  icmsRate: rateStringSchema.optional(),
  pisRate: rateStringSchema.optional(),
  cofinsRate: rateStringSchema.optional(),
  ibsRate: rateStringSchema.optional(),
  cbsRate: rateStringSchema.optional(),
  additionalData: z.record(z.string(), z.unknown()).optional()
}).refine(
  (value) => !value.validUntil || value.validUntil > value.validFrom,
  "A data final precisa ser posterior à data inicial."
);

export const upsertPricingSettingsBodySchema = z.object({
  taxPercent: z.coerce.number().min(0).max(100),
  feePercent: z.coerce.number().min(0).max(100)
});

export type LoginBody = z.infer<typeof loginBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type SwitchContextBody = z.infer<typeof switchContextBodySchema>;
export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateCompanyBody = z.infer<typeof createCompanyBodySchema>;
export type UpdateCompanyBody = z.infer<typeof updateCompanyBodySchema>;
export type CreateBranchBody = z.infer<typeof createBranchBodySchema>;
export type UpdateBranchBody = z.infer<typeof updateBranchBodySchema>;
export type CreateWarehouseBody = z.infer<typeof createWarehouseBodySchema>;
export type UpdateWarehouseBody = z.infer<typeof updateWarehouseBodySchema>;
export type UpdateUserPreferencesBody = z.infer<typeof updateUserPreferencesBodySchema>;
export type CreateRoleBody = z.infer<typeof createRoleBodySchema>;
export type CreateUserBody = z.infer<typeof createUserBodySchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusBodySchema>;
export type UpdateUserAccessBody = z.infer<typeof updateUserAccessBodySchema>;
export type AdminCreateOrganizationBody = z.infer<typeof adminCreateOrganizationBodySchema>;
export type AdminUpdateOrganizationBody = z.infer<typeof adminUpdateOrganizationBodySchema>;
export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;
export type CreateProductBody = z.infer<typeof createProductBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type UpsertProductBarcodeBody = z.infer<typeof upsertProductBarcodeBodySchema>;
export type UpsertBranchPriceBody = z.infer<typeof upsertBranchPriceBodySchema>;
export type CreateCustomerBody = z.infer<typeof createCustomerBodySchema>;
export type UpdateCustomerBody = z.infer<typeof updateCustomerBodySchema>;
export type CreateSupplierBody = z.infer<typeof createSupplierBodySchema>;
export type UpdateSupplierBody = z.infer<typeof updateSupplierBodySchema>;
export type StockAdjustmentBody = z.infer<typeof stockAdjustmentBodySchema>;
export type CreateStockTransferBody = z.infer<typeof createStockTransferBodySchema>;
export type TransitionStockTransferBody = z.infer<typeof transitionStockTransferBodySchema>;
export type CreateInventoryCountBody = z.infer<typeof createInventoryCountBodySchema>;
export type ConfirmInventoryCountBody = z.infer<typeof confirmInventoryCountBodySchema>;
export type CreateSaleBody = z.infer<typeof createSaleBodySchema>;
export type CancelSaleBody = z.infer<typeof cancelSaleBodySchema>;
export type CreatePurchaseBody = z.infer<typeof createPurchaseBodySchema>;
export type ReceivePurchaseBody = z.infer<typeof receivePurchaseBodySchema>;
export type CancelPurchaseBody = z.infer<typeof cancelPurchaseBodySchema>;
export type SettleFinancialEntryBody = z.infer<typeof settleFinancialEntryBodySchema>;
export type CancelFinancialEntryBody = z.infer<typeof cancelFinancialEntryBodySchema>;
export type UpsertCompanyFiscalProfileBody = z.infer<typeof upsertCompanyFiscalProfileBodySchema>;
export type UpsertProductFiscalProfileBody = z.infer<typeof upsertProductFiscalProfileBodySchema>;
export type FiscalPendingQuery = z.infer<typeof fiscalPendingQuerySchema>;
export type CreateAlertRuleBody = z.infer<typeof createAlertRuleBodySchema>;
export type UpdateAlertRuleBody = z.infer<typeof updateAlertRuleBodySchema>;
export type CreateImportJobBody = z.infer<typeof createImportJobBodySchema>;
export type CreateIntegrationConnectionBody = z.infer<typeof createIntegrationConnectionBodySchema>;
export type UpdateIntegrationConnectionBody = z.infer<typeof updateIntegrationConnectionBodySchema>;
export type ConnectIfoodIntegrationBody = z.infer<typeof connectIfoodIntegrationBodySchema>;
export type StartIfoodOauthBody = z.infer<typeof startIfoodOauthBodySchema>;
export type CompleteIfoodOauthBody = z.infer<typeof completeIfoodOauthBodySchema>;
export type IngestIfoodOrderEventsBody = z.infer<typeof ingestIfoodOrderEventsBodySchema>;
export type ReprocessIfoodOrderEventsBody = z.infer<typeof reprocessIfoodOrderEventsBodySchema>;
export type CreateReportJobBody = z.infer<typeof createReportJobBodySchema>;
export type CreateTaxRuleBody = z.infer<typeof createTaxRuleBodySchema>;
export type UpdateTaxRuleBody = z.infer<typeof updateTaxRuleBodySchema>;
export type CreateTaxRuleVersionBody = z.infer<typeof createTaxRuleVersionBodySchema>;
export type UpsertPricingSettingsBody = z.infer<typeof upsertPricingSettingsBodySchema>;
