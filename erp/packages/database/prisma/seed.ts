import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import argon2 from "argon2";
import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  ImportJobStatus,
  ImportSource,
  IntegrationStatus,
  InventoryCountStatus,
  OutboxStatus,
  PaymentMethod,
  PermissionScope,
  PersonType,
  Prisma,
  PrismaClient,
  ProductFiscalOrigin,
  PurchaseStatus,
  RefreshTokenStatus,
  ReportJobStatus,
  ReportType,
  SaleSource,
  SaleStatus,
  SalesChannel,
  SessionStatus,
  StockMovementType,
  StockTransferStatus,
  TaxRegime,
  TaxRuleConditionOperator,
  TaxType,
  WebhookStatus
} from "@prisma/client";

function loadRootEnv() {
  const envPath = resolve(import.meta.dirname, "../../..", ".env");
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadRootEnv();

const permissionKeys = [
  "product.read",
  "product.create",
  "product.update",
  "product.delete",
  "inventory.read",
  "inventory.adjust",
  "inventory.transfer",
  "sale.read",
  "sale.create",
  "sale.cancel",
  "purchase.read",
  "purchase.create",
  "purchase.receive",
  "customer.read",
  "customer.manage",
  "supplier.read",
  "supplier.manage",
  "company.read",
  "company.manage",
  "branch.read",
  "branch.manage",
  "user.read",
  "user.manage",
  "integration.read",
  "integration.manage",
  "fiscal.read",
  "fiscal.manage",
  "platform.admin"
] as const;

const companyPermissionKeys = permissionKeys.filter((key) => key !== "platform.admin");

type SeedOptions = {
  organizationName?: string;
  companyName?: string;
  adminEmail?: string;
  adminPassword?: string;
};

export async function seedDatabase(prisma: PrismaClient, options: SeedOptions = {}) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed refused in production.");
  }

  const organizationName = options.organizationName ?? process.env.DEV_ORGANIZATION_NAME ?? "Empresa Demonstração";
  const companyName = options.companyName ?? process.env.DEV_COMPANY_NAME ?? "Empresa Teste LTDA";
  const adminEmail = options.adminEmail ?? process.env.DEV_ADMIN_EMAIL ?? "admin@local.test";
  const adminPassword = options.adminPassword ?? process.env.DEV_ADMIN_PASSWORD ?? "ChangeMe123!";

  await prisma.permission.createMany({
    data: permissionKeys.map((key) => ({
      key,
      description: key
    })),
    skipDuplicates: true
  });

  const organization = await prisma.organization.upsert({
    where: { id: "dev_org" },
    create: { id: "dev_org", name: organizationName },
    update: { name: organizationName, active: true }
  });

  const company = await prisma.company.upsert({
    where: { id: "dev_company" },
    create: {
      id: "dev_company",
      organizationId: organization.id,
      legalName: companyName,
      tradeName: "Empresa Teste"
    },
    update: {
      legalName: companyName,
      tradeName: "Empresa Teste",
      active: true
    }
  });

  const centro = await prisma.branch.upsert({
    where: { id: "dev_branch_centro" },
    create: { id: "dev_branch_centro", companyId: company.id, name: "Loja Centro" },
    update: { name: "Loja Centro", active: true }
  });

  const shopping = await prisma.branch.upsert({
    where: { id: "dev_branch_shopping" },
    create: { id: "dev_branch_shopping", companyId: company.id, name: "Loja Shopping" },
    update: { name: "Loja Shopping", active: true }
  });

  for (const branch of [centro, shopping]) {
    await prisma.warehouse.upsert({
      where: { id: `dev_warehouse_${branch.id}` },
      create: {
        id: `dev_warehouse_${branch.id}`,
        companyId: company.id,
        branchId: branch.id,
        name: "Estoque Principal"
      },
      update: { name: "Estoque Principal", active: true }
    });
  }

  const centroWarehouse = await prisma.warehouse.findFirstOrThrow({
    where: { branchId: centro.id, name: "Estoque Principal" },
    select: { id: true }
  });

  const shoppingWarehouse = await prisma.warehouse.findFirstOrThrow({
    where: { branchId: shopping.id, name: "Estoque Principal" },
    select: { id: true }
  });

  const adminRole = await prisma.role.upsert({
    where: {
      companyId_name_scope: {
        companyId: company.id,
        name: "Admin",
        scope: PermissionScope.COMPANY
      }
    },
    create: {
      companyId: company.id,
      name: "Admin",
      scope: PermissionScope.COMPANY,
      system: true
    },
    update: { system: true }
  });

  const existingPlatformAdminRole = await prisma.role.findFirst({
    where: {
      companyId: null,
      name: "Platform Admin",
      scope: PermissionScope.PLATFORM
    }
  });

  const platformAdminRole = existingPlatformAdminRole
    ? await prisma.role.update({
        where: { id: existingPlatformAdminRole.id },
        data: { system: true }
      })
    : await prisma.role.create({
        data: {
          companyId: null,
          name: "Platform Admin",
          scope: PermissionScope.PLATFORM,
          system: true
        }
      });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...permissionKeys] } }
  });

  await prisma.rolePermission.createMany({
    data: permissions
      .filter((permission) => companyPermissionKeys.includes(permission.key as (typeof companyPermissionKeys)[number]))
      .map((permission) => ({
      roleId: adminRole.id,
      permissionId: permission.id
    })),
    skipDuplicates: true
  });

  const platformAdminPermission = permissions.find((permission) => permission.key === "platform.admin");
  if (!platformAdminPermission) {
    throw new Error("platform.admin permission not found.");
  }

  await prisma.rolePermission.createMany({
    data: [
      {
        roleId: platformAdminRole.id,
        permissionId: platformAdminPermission.id
      }
    ],
    skipDuplicates: true
  });

  const passwordHash = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash
    },
    update: {
      name: "Admin",
      active: true
    }
  });

  const operatorPasswordHash = await argon2.hash(`${adminPassword}-operator`, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });

  const operator = await prisma.user.upsert({
    where: { email: "operador@local.test" },
    create: {
      id: "dev_user_operator",
      name: "Operador",
      email: "operador@local.test",
      passwordHash: operatorPasswordHash
    },
    update: {
      name: "Operador",
      active: true
    }
  });

  await prisma.userOrganizationAccess.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: organization.id } },
    create: { userId: admin.id, organizationId: organization.id, roleId: adminRole.id },
    update: { roleId: adminRole.id, active: true }
  });

  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    create: { userId: admin.id, companyId: company.id, roleId: adminRole.id },
    update: { roleId: adminRole.id, active: true }
  });

  for (const branch of [centro, shopping]) {
    await prisma.userBranchAccess.upsert({
      where: { userId_branchId: { userId: admin.id, branchId: branch.id } },
      create: { userId: admin.id, branchId: branch.id, roleId: adminRole.id },
      update: { roleId: adminRole.id, active: true }
    });
  }

  await prisma.platformUserAccess.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: platformAdminRole.id } },
    create: { userId: admin.id, roleId: platformAdminRole.id },
    update: { active: true }
  });

  await prisma.userCompanyAccess.upsert({
    where: { userId_companyId: { userId: operator.id, companyId: company.id } },
    create: { userId: operator.id, companyId: company.id, roleId: adminRole.id },
    update: { roleId: adminRole.id, active: true }
  });

  await prisma.userBranchAccess.upsert({
    where: { userId_branchId: { userId: operator.id, branchId: centro.id } },
    create: { userId: operator.id, branchId: centro.id, roleId: adminRole.id },
    update: { roleId: adminRole.id, active: true }
  });

  const bebidas = await prisma.category.upsert({
    where: { companyId_name: { companyId: company.id, name: "Bebidas" } },
    create: { companyId: company.id, name: "Bebidas" },
    update: { active: true }
  });

  const alimentos = await prisma.category.upsert({
    where: { companyId_name: { companyId: company.id, name: "Alimentos" } },
    create: { companyId: company.id, name: "Alimentos" },
    update: { active: true }
  });

  const higiene = await prisma.category.upsert({
    where: { companyId_name: { companyId: company.id, name: "Higiene" } },
    create: { companyId: company.id, name: "Higiene" },
    update: { active: true }
  });

  const sampleProducts = [
    {
      sku: "COCA-2L",
      name: "Coca-Cola 2L",
      salePrice: "12.00",
      costPrice: "8.50",
      barcode: "7894900011517",
      categoryId: bebidas.id,
      quantity: "3.000"
    },
    {
      sku: "HEIN-600",
      name: "Heineken 600ml",
      salePrice: "9.90",
      costPrice: "6.20",
      barcode: "7896045501935",
      categoryId: bebidas.id,
      quantity: "0.000"
    },
    {
      sku: "PAO-FRANCES",
      name: "Pão Francês",
      salePrice: "0.80",
      costPrice: "0.42",
      barcode: "2000000000010",
      categoryId: alimentos.id,
      quantity: "120.000"
    },
    {
      sku: "SABONETE-90G",
      name: "Sabonete 90g",
      salePrice: "3.99",
      costPrice: "2.15",
      barcode: "7891000059301",
      categoryId: higiene.id,
      quantity: "25.000"
    }
  ];

  const productsBySku = new Map<string, { id: string; salePrice: Prisma.Decimal; costPrice: Prisma.Decimal }>();
  for (const item of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: item.sku } },
      create: {
        companyId: company.id,
        sku: item.sku,
        name: item.name,
        categoryId: item.categoryId,
        unit: "UN",
        costPrice: new Prisma.Decimal(item.costPrice),
        salePrice: new Prisma.Decimal(item.salePrice)
      },
      update: {
        name: item.name,
        categoryId: item.categoryId,
        active: true
      }
    });

    productsBySku.set(product.sku, {
      id: product.id,
      salePrice: new Prisma.Decimal(item.salePrice),
      costPrice: new Prisma.Decimal(item.costPrice)
    });

    await prisma.productBarcode.upsert({
      where: { companyId_barcode: { companyId: company.id, barcode: item.barcode } },
      create: {
        companyId: company.id,
        productId: product.id,
        barcode: item.barcode
      },
      update: {
        productId: product.id
      }
    });

    const quantity = new Prisma.Decimal(item.quantity);
    await prisma.stockBalance.upsert({
      where: {
        companyId_branchId_warehouseId_productId: {
          companyId: company.id,
          branchId: centro.id,
          warehouseId: centroWarehouse.id,
          productId: product.id
        }
      },
      create: {
        companyId: company.id,
        branchId: centro.id,
        warehouseId: centroWarehouse.id,
        productId: product.id,
        quantity
      },
      update: {
        quantity
      }
    });

    await prisma.stockMovement.upsert({
      where: {
        companyId_idempotencyKey: {
          companyId: company.id,
          idempotencyKey: `seed:${product.id}:initial`
        }
      },
      create: {
        companyId: company.id,
        branchId: centro.id,
        warehouseId: centroWarehouse.id,
        productId: product.id,
        type: StockMovementType.INITIAL,
        quantity,
        previousQuantity: new Prisma.Decimal(0),
        currentQuantity: quantity,
        reason: "Estoque inicial do seed",
        userId: admin.id,
        idempotencyKey: `seed:${product.id}:initial`
      },
      update: {}
    });

    await prisma.productFiscalProfile.upsert({
      where: { productId: product.id },
      create: {
        id: `dev_product_fiscal_${product.id}`,
        companyId: company.id,
        productId: product.id,
        origin: ProductFiscalOrigin.NATIONAL,
        fiscalUnit: "UN",
        ncm: "22021000",
        icmsCsosn: "102",
        pisCst: "01",
        cofinsCst: "01"
      },
      update: {
        origin: ProductFiscalOrigin.NATIONAL,
        fiscalUnit: "UN",
        ncm: "22021000",
        icmsCsosn: "102",
        pisCst: "01",
        cofinsCst: "01"
      }
    });
  }

  const coca = productsBySku.get("COCA-2L");
  const pao = productsBySku.get("PAO-FRANCES");
  const heineken = productsBySku.get("HEIN-600");
  if (!coca || !pao || !heineken) {
    throw new Error("Seed products not found.");
  }

  const customer = await prisma.customer.upsert({
    where: { id: "dev_customer_1" },
    create: {
      id: "dev_customer_1",
      companyId: company.id,
      type: PersonType.INDIVIDUAL,
      name: "Cliente Exemplo",
      document: "12345678909",
      email: "cliente@local.test",
      phone: "+55 11 90000-0001"
    },
    update: {
      name: "Cliente Exemplo",
      active: true
    }
  });

  const supplier = await prisma.supplier.upsert({
    where: { id: "dev_supplier_1" },
    create: {
      id: "dev_supplier_1",
      companyId: company.id,
      type: PersonType.COMPANY,
      name: "Fornecedor Exemplo LTDA",
      document: "12345678000190",
      email: "fornecedor@local.test",
      phone: "+55 11 90000-0002"
    },
    update: {
      name: "Fornecedor Exemplo LTDA",
      active: true
    }
  });

  await prisma.companyFiscalProfile.upsert({
    where: { companyId: company.id },
    create: {
      id: "dev_company_fiscal_profile",
      companyId: company.id,
      cnpj: "12345678000190",
      stateRegistration: "110042490114",
      municipalRegistration: "123456",
      taxRegime: TaxRegime.SIMPLES_NACIONAL,
      uf: "SP",
      municipality: "São Paulo",
      cnae: "4711302"
    },
    update: {
      cnpj: "12345678000190",
      taxRegime: TaxRegime.SIMPLES_NACIONAL,
      uf: "SP",
      municipality: "São Paulo"
    }
  });

  await prisma.companyPricingSetting.upsert({
    where: { companyId: company.id },
    create: {
      id: "dev_company_pricing_setting",
      companyId: company.id,
      taxPercent: new Prisma.Decimal("6.00"),
      feePercent: new Prisma.Decimal("3.00")
    },
    update: {
      taxPercent: new Prisma.Decimal("6.00"),
      feePercent: new Prisma.Decimal("3.00")
    }
  });

  const taxRule = await prisma.taxRule.upsert({
    where: { id: "dev_tax_rule_icms" },
    create: {
      id: "dev_tax_rule_icms",
      companyId: company.id,
      name: "ICMS Básico Varejo",
      description: "Regra padrão para operações internas no varejo.",
      taxType: TaxType.ICMS
    },
    update: {
      name: "ICMS Básico Varejo",
      description: "Regra padrão para operações internas no varejo.",
      active: true
    }
  });

  await prisma.taxRuleCondition.upsert({
    where: { id: "dev_tax_rule_condition_uf" },
    create: {
      id: "dev_tax_rule_condition_uf",
      taxRuleId: taxRule.id,
      field: "uf",
      operator: TaxRuleConditionOperator.EQUALS,
      value: "SP"
    },
    update: {
      field: "uf",
      operator: TaxRuleConditionOperator.EQUALS,
      value: "SP"
    }
  });

  await prisma.taxRuleVersion.upsert({
    where: {
      taxRuleId_version: {
        taxRuleId: taxRule.id,
        version: 1
      }
    },
    create: {
      id: "dev_tax_rule_version_1",
      taxRuleId: taxRule.id,
      version: 1,
      validFrom: new Date("2025-01-01T00:00:00.000Z"),
      cst: "00",
      icmsRate: new Prisma.Decimal("18.0000"),
      createdBy: admin.id
    },
    update: {
      validFrom: new Date("2025-01-01T00:00:00.000Z"),
      cst: "00",
      icmsRate: new Prisma.Decimal("18.0000"),
      createdBy: admin.id
    }
  });

  const sale = await prisma.sale.upsert({
    where: { id: "dev_sale_1" },
    create: {
      id: "dev_sale_1",
      companyId: company.id,
      branchId: centro.id,
      warehouseId: centroWarehouse.id,
      customerId: customer.id,
      status: SaleStatus.COMPLETED,
      subtotal: new Prisma.Decimal("24.00"),
      discount: new Prisma.Decimal("1.00"),
      total: new Prisma.Decimal("23.00"),
      source: SaleSource.POS,
      createdBy: admin.id,
      idempotencyKey: "seed:sale:1"
    },
    update: {
      status: SaleStatus.COMPLETED,
      subtotal: new Prisma.Decimal("24.00"),
      discount: new Prisma.Decimal("1.00"),
      total: new Prisma.Decimal("23.00"),
      source: SaleSource.POS,
      createdBy: admin.id
    }
  });

  await prisma.saleItem.upsert({
    where: { id: "dev_sale_item_1" },
    create: {
      id: "dev_sale_item_1",
      saleId: sale.id,
      productId: coca.id,
      quantity: new Prisma.Decimal("2.000"),
      unitPrice: new Prisma.Decimal("12.00"),
      discount: new Prisma.Decimal("1.00"),
      total: new Prisma.Decimal("23.00")
    },
    update: {
      quantity: new Prisma.Decimal("2.000"),
      unitPrice: new Prisma.Decimal("12.00"),
      discount: new Prisma.Decimal("1.00"),
      total: new Prisma.Decimal("23.00")
    }
  });

  await prisma.payment.upsert({
    where: { id: "dev_payment_1" },
    create: {
      id: "dev_payment_1",
      saleId: sale.id,
      method: PaymentMethod.PIX,
      amount: new Prisma.Decimal("23.00")
    },
    update: {
      method: PaymentMethod.PIX,
      amount: new Prisma.Decimal("23.00")
    }
  });

  await prisma.sale.upsert({
    where: { id: "dev_sale_2" },
    create: {
      id: "dev_sale_2",
      companyId: company.id,
      branchId: shopping.id,
      warehouseId: shoppingWarehouse.id,
      status: SaleStatus.CANCELLED,
      subtotal: new Prisma.Decimal("9.90"),
      total: new Prisma.Decimal("9.90"),
      source: SaleSource.MARKETPLACE,
      createdBy: operator.id,
      cancelledBy: operator.id,
      cancelReason: "Cancelamento de teste",
      cancelledAt: new Date("2025-02-01T10:00:00.000Z"),
      idempotencyKey: "seed:sale:2"
    },
    update: {
      status: SaleStatus.CANCELLED,
      source: SaleSource.MARKETPLACE,
      cancelledBy: operator.id,
      cancelReason: "Cancelamento de teste",
      cancelledAt: new Date("2025-02-01T10:00:00.000Z")
    }
  });

  const purchase = await prisma.purchase.upsert({
    where: { id: "dev_purchase_1" },
    create: {
      id: "dev_purchase_1",
      companyId: company.id,
      branchId: centro.id,
      warehouseId: centroWarehouse.id,
      supplierId: supplier.id,
      status: PurchaseStatus.RECEIVED,
      subtotal: new Prisma.Decimal("60.00"),
      discount: new Prisma.Decimal("0.00"),
      total: new Prisma.Decimal("60.00"),
      createdBy: admin.id,
      receivedBy: admin.id,
      receivedAt: new Date("2025-02-01T14:00:00.000Z"),
      idempotencyKey: "seed:purchase:1"
    },
    update: {
      status: PurchaseStatus.RECEIVED,
      subtotal: new Prisma.Decimal("60.00"),
      total: new Prisma.Decimal("60.00"),
      receivedBy: admin.id,
      receivedAt: new Date("2025-02-01T14:00:00.000Z")
    }
  });

  await prisma.purchaseItem.upsert({
    where: { id: "dev_purchase_item_1" },
    create: {
      id: "dev_purchase_item_1",
      purchaseId: purchase.id,
      productId: heineken.id,
      quantity: new Prisma.Decimal("10.000"),
      unitCost: new Prisma.Decimal("6.00"),
      total: new Prisma.Decimal("60.00"),
      receivedAt: new Date("2025-02-01T14:00:00.000Z")
    },
    update: {
      quantity: new Prisma.Decimal("10.000"),
      unitCost: new Prisma.Decimal("6.00"),
      total: new Prisma.Decimal("60.00"),
      receivedAt: new Date("2025-02-01T14:00:00.000Z")
    }
  });

  const transfer = await prisma.stockTransfer.upsert({
    where: { id: "dev_transfer_1" },
    create: {
      id: "dev_transfer_1",
      companyId: company.id,
      sourceBranchId: centro.id,
      sourceWarehouseId: centroWarehouse.id,
      destinationBranchId: shopping.id,
      destinationWarehouseId: shoppingWarehouse.id,
      status: StockTransferStatus.RECEIVED,
      reason: "Reposição entre lojas",
      createdBy: admin.id,
      sentBy: admin.id,
      receivedBy: operator.id,
      sentAt: new Date("2025-02-02T09:00:00.000Z"),
      receivedAt: new Date("2025-02-02T11:00:00.000Z"),
      idempotencyKey: "seed:transfer:1"
    },
    update: {
      status: StockTransferStatus.RECEIVED,
      reason: "Reposição entre lojas",
      sentBy: admin.id,
      receivedBy: operator.id,
      sentAt: new Date("2025-02-02T09:00:00.000Z"),
      receivedAt: new Date("2025-02-02T11:00:00.000Z")
    }
  });

  await prisma.stockTransferItem.upsert({
    where: { id: "dev_transfer_item_1" },
    create: {
      id: "dev_transfer_item_1",
      transferId: transfer.id,
      productId: pao.id,
      quantity: new Prisma.Decimal("20.000")
    },
    update: {
      quantity: new Prisma.Decimal("20.000")
    }
  });

  const inventoryCount = await prisma.inventoryCount.upsert({
    where: { id: "dev_inventory_count_1" },
    create: {
      id: "dev_inventory_count_1",
      companyId: company.id,
      branchId: centro.id,
      warehouseId: centroWarehouse.id,
      status: InventoryCountStatus.CONFIRMED,
      notes: "Conferência mensal",
      createdBy: admin.id,
      confirmedBy: operator.id,
      confirmedAt: new Date("2025-02-05T12:00:00.000Z"),
      idempotencyKey: "seed:inventory-count:1"
    },
    update: {
      status: InventoryCountStatus.CONFIRMED,
      notes: "Conferência mensal",
      confirmedBy: operator.id,
      confirmedAt: new Date("2025-02-05T12:00:00.000Z")
    }
  });

  await prisma.inventoryCountItem.upsert({
    where: { id: "dev_inventory_count_item_1" },
    create: {
      id: "dev_inventory_count_item_1",
      inventoryCountId: inventoryCount.id,
      productId: pao.id,
      countedQuantity: new Prisma.Decimal("118.000"),
      expectedQuantity: new Prisma.Decimal("120.000"),
      differenceQuantity: new Prisma.Decimal("-2.000")
    },
    update: {
      countedQuantity: new Prisma.Decimal("118.000"),
      expectedQuantity: new Prisma.Decimal("120.000"),
      differenceQuantity: new Prisma.Decimal("-2.000")
    }
  });

  await prisma.alert.upsert({
    where: { id: "dev_alert_1" },
    create: {
      id: "dev_alert_1",
      companyId: company.id,
      branchId: centro.id,
      type: AlertType.LOW_STOCK,
      severity: AlertSeverity.WARNING,
      status: AlertStatus.OPEN,
      title: "Produto com estoque baixo",
      message: "Heineken 600ml está abaixo do limite configurado.",
      entityType: "product",
      entityId: heineken.id,
      createdBy: admin.id
    },
    update: {
      status: AlertStatus.OPEN,
      title: "Produto com estoque baixo",
      message: "Heineken 600ml está abaixo do limite configurado."
    }
  });

  await prisma.alertRule.upsert({
    where: { id: "dev_alert_rule_1" },
    create: {
      id: "dev_alert_rule_1",
      companyId: company.id,
      branchId: centro.id,
      type: AlertType.LOW_STOCK,
      name: "Regra padrão de estoque baixo",
      threshold: { minimumQuantity: 5 },
      createdBy: admin.id
    },
    update: {
      active: true,
      threshold: { minimumQuantity: 5 }
    }
  });

  await prisma.importJob.upsert({
    where: { id: "dev_import_job_1" },
    create: {
      id: "dev_import_job_1",
      companyId: company.id,
      branchId: centro.id,
      source: ImportSource.CSV,
      status: ImportJobStatus.COMPLETED,
      fileName: "produtos.csv",
      totalRows: 100,
      validRows: 96,
      invalidRows: 4,
      summary: { importedProducts: 96, skippedRows: 4 },
      createdBy: admin.id
    },
    update: {
      source: ImportSource.CSV,
      status: ImportJobStatus.COMPLETED,
      totalRows: 100,
      validRows: 96,
      invalidRows: 4,
      summary: { importedProducts: 96, skippedRows: 4 }
    }
  });

  await prisma.integrationConnection.upsert({
    where: { id: "dev_integration_connection_marketplace" },
    create: {
      id: "dev_integration_connection_marketplace",
      companyId: company.id,
      branchId: centro.id,
      channel: SalesChannel.MARKETPLACE,
      status: IntegrationStatus.CONNECTED,
      externalAccountId: "marketplace-account-001",
      connectedAt: new Date("2025-02-04T08:00:00.000Z"),
      lastSyncAt: new Date("2025-02-04T09:00:00.000Z"),
      createdBy: admin.id
    },
    update: {
      channel: SalesChannel.MARKETPLACE,
      status: IntegrationStatus.CONNECTED,
      externalAccountId: "marketplace-account-001",
      connectedAt: new Date("2025-02-04T08:00:00.000Z"),
      lastSyncAt: new Date("2025-02-04T09:00:00.000Z")
    }
  });

  await prisma.integrationConnection.upsert({
    where: { id: "dev_integration_connection_ecommerce" },
    create: {
      id: "dev_integration_connection_ecommerce",
      companyId: company.id,
      branchId: shopping.id,
      channel: SalesChannel.ECOMMERCE,
      status: IntegrationStatus.ERROR,
      externalAccountId: "shop-account-001",
      connectedAt: new Date("2025-02-03T08:00:00.000Z"),
      lastSyncAt: new Date("2025-02-03T08:30:00.000Z"),
      createdBy: operator.id
    },
    update: {
      channel: SalesChannel.ECOMMERCE,
      status: IntegrationStatus.ERROR,
      externalAccountId: "shop-account-001",
      connectedAt: new Date("2025-02-03T08:00:00.000Z"),
      lastSyncAt: new Date("2025-02-03T08:30:00.000Z")
    }
  });

  await prisma.reportJob.upsert({
    where: { id: "dev_report_job_1" },
    create: {
      id: "dev_report_job_1",
      companyId: company.id,
      branchId: centro.id,
      type: ReportType.SALES,
      status: ReportJobStatus.COMPLETED,
      filters: {
        startDate: "2025-02-01",
        endDate: "2025-02-05"
      },
      resultSummary: {
        totalSales: 2,
        grossAmount: "33.90"
      },
      createdBy: admin.id
    },
    update: {
      type: ReportType.SALES,
      status: ReportJobStatus.COMPLETED,
      filters: {
        startDate: "2025-02-01",
        endDate: "2025-02-05"
      },
      resultSummary: {
        totalSales: 2,
        grossAmount: "33.90"
      }
    }
  });

  await prisma.outboxEvent.upsert({
    where: { id: "dev_outbox_event_1" },
    create: {
      id: "dev_outbox_event_1",
      companyId: company.id,
      aggregateType: "sale",
      aggregateId: sale.id,
      eventType: "sale.created",
      payload: {
        saleId: sale.id,
        source: SaleSource.POS
      },
      status: OutboxStatus.PENDING,
      attempts: 0
    },
    update: {
      status: OutboxStatus.PENDING,
      attempts: 0,
      nextAttemptAt: null
    }
  });

  await prisma.webhookEvent.upsert({
    where: { id: "dev_webhook_event_1" },
    create: {
      id: "dev_webhook_event_1",
      companyId: company.id,
      channel: SalesChannel.MARKETPLACE,
      externalEventId: "external-marketplace-event-1",
      eventType: "order.created",
      payload: {
        externalOrderId: "ext-1000",
        status: "created"
      },
      status: WebhookStatus.RECEIVED,
      attempts: 0
    },
    update: {
      status: WebhookStatus.RECEIVED,
      attempts: 0,
      processedAt: null
    }
  });

  await prisma.userPreference.upsert({
    where: {
      userId_companyId_branchId: {
        userId: admin.id,
        companyId: company.id,
        branchId: centro.id
      }
    },
    create: {
      id: "dev_user_preference_1",
      userId: admin.id,
      companyId: company.id,
      branchId: centro.id,
      darkMode: true,
      compactMenu: false
    },
    update: {
      darkMode: true,
      compactMenu: false
    }
  });

  await prisma.session.upsert({
    where: { id: "dev_session_1" },
    create: {
      id: "dev_session_1",
      userId: admin.id,
      status: SessionStatus.ACTIVE,
      activeOrganizationId: organization.id,
      activeCompanyId: company.id,
      activeBranchId: centro.id,
      ip: "127.0.0.1",
      userAgent: "seed-script"
    },
    update: {
      status: SessionStatus.ACTIVE,
      activeOrganizationId: organization.id,
      activeCompanyId: company.id,
      activeBranchId: centro.id,
      revokedAt: null
    }
  });

  await prisma.refreshToken.upsert({
    where: { tokenHash: "dev_refresh_token_hash_1" },
    create: {
      id: "dev_refresh_token_1",
      userId: admin.id,
      sessionId: "dev_session_1",
      tokenHash: "dev_refresh_token_hash_1",
      expiresAt: new Date("2030-01-01T00:00:00.000Z")
    },
    update: {
      status: RefreshTokenStatus.ACTIVE,
      expiresAt: new Date("2030-01-01T00:00:00.000Z")
    }
  });

  await prisma.auditLog.upsert({
    where: { id: "dev_audit_log_1" },
    create: {
      id: "dev_audit_log_1",
      companyId: company.id,
      branchId: centro.id,
      userId: admin.id,
      action: "seed.create",
      entityType: "seed",
      entityId: "dev_seed",
      before: Prisma.JsonNull,
      after: {
        seededAt: new Date("2025-02-01T00:00:00.000Z").toISOString()
      },
      ip: "127.0.0.1",
      userAgent: "seed-script",
      correlationId: "seed-correlation-1"
    },
    update: {
      action: "seed.create",
      entityType: "seed",
      entityId: "dev_seed",
      correlationId: "seed-correlation-1"
    }
  });
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
