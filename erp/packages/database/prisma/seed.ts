import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import argon2 from "argon2";
import { Prisma, PrismaClient, PermissionScope } from "@prisma/client";

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

const prisma = new PrismaClient();

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

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed refused in production.");
  }

  const organizationName = process.env.DEV_ORGANIZATION_NAME ?? "Empresa Demonstração";
  const companyName = process.env.DEV_COMPANY_NAME ?? "Empresa Teste LTDA";
  const adminEmail = process.env.DEV_ADMIN_EMAIL ?? "admin@local.test";
  const adminPassword = process.env.DEV_ADMIN_PASSWORD ?? "ChangeMe123!";

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
    }
  ];

  const centroWarehouse = await prisma.warehouse.findFirstOrThrow({
    where: { branchId: centro.id, name: "Estoque Principal" },
    select: { id: true }
  });

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
        type: "INITIAL",
        quantity,
        previousQuantity: new Prisma.Decimal(0),
        currentQuantity: quantity,
        reason: "Estoque inicial do seed",
        userId: admin.id,
        idempotencyKey: `seed:${product.id}:initial`
      },
      update: {}
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
