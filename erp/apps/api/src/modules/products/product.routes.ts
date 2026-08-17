import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  createCategoryBodySchema,
  createProductBodySchema,
  listQuerySchema,
  updateCategoryBodySchema,
  updateProductBodySchema,
  upsertBranchPriceBodySchema,
  upsertProductBarcodeBodySchema
} from "@erp/contracts";
import { Prisma, prisma } from "@erp/database";
import { assertPermission, errors } from "@erp/security";
import { parseBody, parseParams, parseQuery } from "../../lib/zod.js";

const idParamsSchema = z.object({ id: z.string().cuid() });

function pagination(query: { limit: number; cursor?: string | undefined }) {
  return {
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
  };
}

function paginated<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return { data, nextCursor: hasMore ? data.at(-1)?.id : null };
}

async function audit(request: FastifyRequest, input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  const tenant = request.tenant!;
  await prisma.auditLog.create({
    data: {
      companyId: tenant.companyId,
      branchId: tenant.branchId,
      userId: tenant.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      before: input.before === undefined ? undefined : JSON.parse(JSON.stringify(input.before)),
      after: input.after === undefined ? undefined : JSON.parse(JSON.stringify(input.after)),
      ip: request.ip,
      userAgent: request.headers["user-agent"]?.toString() ?? null,
      correlationId: request.correlationId
    }
  });
}

async function assertCategory(companyId: string, categoryId: string | undefined) {
  if (!categoryId) {
    return;
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, companyId, active: true },
    select: { id: true }
  });

  if (!category) {
    throw errors.notFound("CATEGORY_NOT_FOUND", "Categoria não encontrada.");
  }
}

async function assertBranch(companyId: string, branchId: string) {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, companyId, active: true },
    select: { id: true }
  });

  if (!branch) {
    throw errors.notFound("BRANCH_NOT_FOUND", "Loja não encontrada.");
  }
}

async function assertWarehouse(companyId: string, branchId: string, warehouseId: string) {
  const warehouse = await prisma.warehouse.findFirst({
    where: { id: warehouseId, companyId, branchId, active: true },
    select: { id: true }
  });

  if (!warehouse) {
    throw errors.notFound("WAREHOUSE_NOT_FOUND", "Depósito não encontrado.");
  }
}

export async function productRoutes(app: FastifyInstance) {
  app.get("/api/v1/categories", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "product.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.category.findMany({
      where: {
        companyId: request.tenant!.companyId,
        ...(query.search ? { name: { contains: query.search } } : {})
      },
      select: { id: true, name: true, active: true, createdAt: true },
      orderBy: { name: "asc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/categories", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "product.create");
    const body = parseBody(createCategoryBodySchema, request);
    const category = await prisma.category.create({
      data: { companyId: request.tenant!.companyId, name: body.name },
      select: { id: true, name: true, active: true }
    });

    await audit(request, { action: "category.create", entityType: "Category", entityId: category.id, after: category });
    return reply.status(201).send(category);
  });

  app.patch("/api/v1/categories/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "product.update");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateCategoryBodySchema, request);
    const existing = await prisma.category.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, name: true, active: true }
    });

    if (!existing) {
      throw errors.notFound("CATEGORY_NOT_FOUND", "Categoria não encontrada.");
    }

    const updated = await prisma.category.update({
      where: { id: existing.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: { id: true, name: true, active: true }
    });

    await audit(request, { action: "category.update", entityType: "Category", entityId: updated.id, before: existing, after: updated });
    return updated;
  });

  app.get("/api/v1/products", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "product.read");
    const query = parseQuery(listQuerySchema, request);
    const items = await prisma.product.findMany({
      where: {
        companyId: request.tenant!.companyId,
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search } },
                { sku: { contains: query.search } },
                { barcodes: { some: { barcode: { contains: query.search } } } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        costPrice: true,
        salePrice: true,
        active: true,
        category: { select: { id: true, name: true } },
        barcodes: { select: { id: true, barcode: true }, take: 3 },
        branchPrices: {
          where: { branchId: request.tenant!.branchId },
          select: { salePrice: true }
        }
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });
    return paginated(items, query.limit);
  });

  app.post("/api/v1/products", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "product.create");
    const body = parseBody(createProductBodySchema, request);
    await assertCategory(request.tenant!.companyId, body.categoryId);

    for (const branchPrice of body.branchPrices) {
      await assertBranch(request.tenant!.companyId, branchPrice.branchId);
    }

    if (body.initialStock) {
      await assertWarehouse(request.tenant!.companyId, request.tenant!.branchId, body.initialStock.warehouseId);
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          companyId: request.tenant!.companyId,
          sku: body.sku,
          name: body.name,
          description: body.description ?? null,
          categoryId: body.categoryId ?? null,
          brandId: body.brandId ?? null,
          unit: body.unit,
          costPrice: body.costPrice ? new Prisma.Decimal(body.costPrice) : null,
          salePrice: new Prisma.Decimal(body.salePrice),
          barcodes: {
            create: body.barcodes.map((barcode) => ({
              companyId: request.tenant!.companyId,
              barcode
            }))
          },
          branchPrices: {
            create: body.branchPrices.map((branchPrice) => ({
              companyId: request.tenant!.companyId,
              branchId: branchPrice.branchId,
              salePrice: new Prisma.Decimal(branchPrice.salePrice)
            }))
          }
        },
        select: { id: true, sku: true, name: true, salePrice: true, active: true }
      });

      if (body.initialStock) {
        const quantity = new Prisma.Decimal(body.initialStock.quantity);
        await tx.stockBalance.create({
          data: {
            companyId: request.tenant!.companyId,
            branchId: request.tenant!.branchId,
            warehouseId: body.initialStock.warehouseId,
            productId: created.id,
            quantity
          }
        });
        await tx.stockMovement.create({
          data: {
            companyId: request.tenant!.companyId,
            branchId: request.tenant!.branchId,
            warehouseId: body.initialStock.warehouseId,
            productId: created.id,
            type: "INITIAL",
            quantity,
            previousQuantity: new Prisma.Decimal(0),
            currentQuantity: quantity,
            reason: "Estoque inicial",
            userId: request.tenant!.userId,
            idempotencyKey: `product:${created.id}:initial`
          }
        });
      }

      return created;
    });

    await audit(request, { action: "product.create", entityType: "Product", entityId: product.id, after: product });
    return reply.status(201).send(product);
  });

  app.patch("/api/v1/products/:id", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "product.update");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(updateProductBodySchema, request);
    if (body.categoryId) {
      await assertCategory(request.tenant!.companyId, body.categoryId);
    }

    const existing = await prisma.product.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true, sku: true, name: true, salePrice: true, active: true }
    });

    if (!existing) {
      throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado.");
    }

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...(body.sku !== undefined ? { sku: body.sku } : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.brandId !== undefined ? { brandId: body.brandId } : {}),
        ...(body.unit !== undefined ? { unit: body.unit } : {}),
        ...(body.costPrice !== undefined ? { costPrice: body.costPrice === null ? null : new Prisma.Decimal(body.costPrice) } : {}),
        ...(body.salePrice !== undefined ? { salePrice: new Prisma.Decimal(body.salePrice) } : {}),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: { id: true, sku: true, name: true, salePrice: true, active: true }
    });

    await audit(request, { action: "product.update", entityType: "Product", entityId: updated.id, before: existing, after: updated });
    return updated;
  });

  app.post("/api/v1/products/:id/barcodes", { preHandler: [app.authenticateUser] }, async (request, reply) => {
    assertPermission(request.tenant!, "product.update");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(upsertProductBarcodeBodySchema, request);
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true }
    });

    if (!product) {
      throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado.");
    }

    const barcode = await prisma.productBarcode.create({
      data: {
        companyId: request.tenant!.companyId,
        productId: product.id,
        barcode: body.barcode
      },
      select: { id: true, barcode: true }
    });

    await audit(request, { action: "product_barcode.create", entityType: "ProductBarcode", entityId: barcode.id, after: barcode });
    return reply.status(201).send(barcode);
  });

  app.put("/api/v1/products/:id/branch-price", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "product.update");
    const params = parseParams(idParamsSchema, request);
    const body = parseBody(upsertBranchPriceBodySchema, request);
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: request.tenant!.companyId },
      select: { id: true }
    });

    if (!product) {
      throw errors.notFound("PRODUCT_NOT_FOUND", "Produto não encontrado.");
    }

    await assertBranch(request.tenant!.companyId, body.branchId);

    const price = await prisma.productBranchPrice.upsert({
      where: { branchId_productId: { branchId: body.branchId, productId: product.id } },
      create: {
        companyId: request.tenant!.companyId,
        branchId: body.branchId,
        productId: product.id,
        salePrice: new Prisma.Decimal(body.salePrice)
      },
      update: {
        salePrice: new Prisma.Decimal(body.salePrice)
      },
      select: { id: true, branchId: true, productId: true, salePrice: true }
    });

    await audit(request, { action: "product_branch_price.upsert", entityType: "ProductBranchPrice", entityId: price.id, after: price });
    return price;
  });
}
