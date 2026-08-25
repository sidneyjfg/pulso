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
import { createIfoodCategory, publishSimpleIfoodItem, resolveIfoodAccessToken } from "../growth/ifood.service.js";

const idParamsSchema = z.object({ id: z.string().cuid() });
const maxProductImageBytes = 5 * 1024 * 1024;

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

function productImageData(input: { imageDataUrl?: string | null | undefined; imageFileName?: string | null | undefined }) {
  if (input.imageDataUrl === undefined) {
    return {};
  }

  if (input.imageDataUrl === null) {
    return {
      imageDataUrl: null,
      imageMimeType: null,
      imageFileName: null,
      imageSizeBytes: null,
      imageUpdatedAt: null,
      ifoodImagePath: null
    };
  }

  const match = /^data:(image\/(?:png|jpe?g));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.imageDataUrl);
  if (!match) {
    throw errors.conflict("PRODUCT_IMAGE_INVALID", "Envie uma imagem PNG ou JPG válida.");
  }

  const mimeType = match[1]!;
  const buffer = Buffer.from(match[2]!, "base64");
  if (buffer.length === 0 || buffer.length > maxProductImageBytes) {
    throw errors.conflict("PRODUCT_IMAGE_TOO_LARGE", "A imagem do produto deve ter no máximo 5 MB.");
  }

  const isPng = mimeType === "image/png" && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = (mimeType === "image/jpeg" || mimeType === "image/jpg") && buffer[0] === 0xff && buffer[1] === 0xd8;
  if (!isPng && !isJpeg) {
    throw errors.conflict("PRODUCT_IMAGE_INVALID", "O conteúdo da imagem não confere com o formato informado.");
  }

  return {
    imageDataUrl: input.imageDataUrl,
    imageMimeType: mimeType === "image/jpg" ? "image/jpeg" : mimeType,
    imageFileName: input.imageFileName?.trim() || null,
    imageSizeBytes: buffer.length,
    imageUpdatedAt: new Date(),
    ifoodImagePath: null
  };
}

function shouldSyncIfoodCommercialData(body: z.infer<typeof updateProductBodySchema>) {
  return (
    body.sku !== undefined ||
    body.name !== undefined ||
    body.description !== undefined ||
    body.categoryId !== undefined ||
    body.salePrice !== undefined ||
    body.active !== undefined
  );
}

async function syncIfoodCommercialData(input: { companyId: string; productId: string; branchId?: string }) {
  const mappings = await prisma.ifoodCatalogItem.findMany({
    where: {
      companyId: input.companyId,
      productId: input.productId,
      status: "SYNCED",
      ...(input.branchId ? { OR: [{ branchId: input.branchId }, { integrationConnection: { branchId: input.branchId } }] } : {}),
      integrationConnection: {
        channel: "IFOOD",
        status: { notIn: ["DISCONNECTED", "PAUSED"] },
        externalAccountId: { not: null }
      }
    },
    select: {
      id: true,
      branchId: true,
      ifoodItemId: true,
      ifoodProductId: true,
      integrationConnection: {
        select: {
          id: true,
          companyId: true,
          branchId: true,
          externalAccountId: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true
        }
      }
    }
  });

  if (mappings.length === 0) {
    return;
  }

  const product = await prisma.product.findFirst({
    where: { id: input.productId, companyId: input.companyId },
    select: {
      id: true,
      sku: true,
      name: true,
      description: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
      salePrice: true,
      active: true,
      ifoodImagePath: true,
      barcodes: { select: { barcode: true }, take: 1 },
      branchPrices: {
        select: { branchId: true, salePrice: true }
      }
    }
  });

  if (!product) {
    return;
  }

  const tokenByConnectionId = new Map<string, string>();

  for (const mapping of mappings) {
    const connection = mapping.integrationConnection;
    const merchantId = connection.externalAccountId;
    const branchId = mapping.branchId ?? connection.branchId ?? input.branchId;
    const salePrice = product.branchPrices.find((price) => price.branchId === branchId)?.salePrice ?? product.salePrice;

    try {
      if (!merchantId) {
        continue;
      }
      if (product.barcodes.length === 0) {
        throw errors.conflict("PRODUCT_BARCODE_REQUIRED", "Produto sem código de barras.");
      }
      if (!product.categoryId || !product.category) {
        throw errors.conflict("PRODUCT_CATEGORY_REQUIRED", "Produto sem categoria.");
      }
      if (new Prisma.Decimal(salePrice).lessThanOrEqualTo(0)) {
        throw errors.conflict("PRODUCT_PRICE_INVALID", "Preço de venda inválido.");
      }

      let accessToken = tokenByConnectionId.get(connection.id);
      if (!accessToken) {
        const token = await resolveIfoodAccessToken({
          accessToken: connection.accessToken,
          refreshToken: connection.refreshToken,
          tokenExpiresAt: connection.tokenExpiresAt
        });
        accessToken = token.accessToken;
        tokenByConnectionId.set(connection.id, accessToken);

        if (token.refreshed) {
          await prisma.integrationConnection.update({
            where: { id: connection.id },
            data: {
              accessToken: token.refreshed.accessToken,
              ...(token.refreshed.refreshToken ? { refreshToken: token.refreshed.refreshToken } : {}),
              tokenExpiresAt: token.refreshed.tokenExpiresAt
            }
          });
        }
      }

      let categoryMap = await prisma.ifoodCatalogCategory.findUnique({
        where: {
          integrationConnectionId_categoryId: {
            integrationConnectionId: connection.id,
            categoryId: product.categoryId
          }
        },
        select: { ifoodCategoryId: true }
      });

      if (!categoryMap) {
        const category = await createIfoodCategory({
          accessToken,
          merchantId,
          name: product.category.name
        });
        categoryMap = await prisma.ifoodCatalogCategory.create({
          data: {
            companyId: input.companyId,
            integrationConnectionId: connection.id,
            categoryId: product.categoryId,
            ifoodCategoryId: category.id,
            name: product.category.name,
            lastSyncedAt: new Date()
          },
          select: { ifoodCategoryId: true }
        });
      }

      await publishSimpleIfoodItem({
        accessToken,
        merchantId,
        item: {
          id: mapping.ifoodItemId,
          productId: mapping.ifoodProductId,
          categoryId: categoryMap.ifoodCategoryId,
          externalCode: product.sku,
          name: product.name,
          description: product.description,
          imagePath: product.ifoodImagePath,
          price: Number(new Prisma.Decimal(salePrice).toFixed(2)),
          status: product.active ? "AVAILABLE" : "UNAVAILABLE"
        }
      });

      await prisma.ifoodCatalogItem.update({
        where: { id: mapping.id },
        data: {
          ifoodCategoryId: categoryMap.ifoodCategoryId,
          externalCode: product.sku,
          status: "SYNCED",
          lastSyncedAt: new Date(),
          lastError: null
        }
      });
      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: { lastSyncAt: new Date(), status: "CONNECTED" }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar produto no iFood.";
      await prisma.ifoodCatalogItem.update({
        where: { id: mapping.id },
        data: { status: "ERROR", lastError: message }
      });
    }
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
        imageDataUrl: true,
        imageMimeType: true,
        imageFileName: true,
        imageSizeBytes: true,
        imageUpdatedAt: true,
        ifoodImagePath: true,
        category: { select: { id: true, name: true } },
        barcodes: { select: { id: true, barcode: true }, take: 3 },
        branchPrices: {
          where: { branchId: request.tenant!.branchId },
          select: { salePrice: true }
        },
        ifoodCatalogItems: {
          where: {
            integrationConnection: {
              companyId: request.tenant!.companyId,
              channel: "IFOOD",
              OR: [{ branchId: request.tenant!.branchId }, { branchId: null }]
            }
          },
          select: { status: true, lastSyncedAt: true, lastError: true, ifoodItemId: true },
          take: 1
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
          ...productImageData({ imageDataUrl: body.imageDataUrl, imageFileName: body.imageFileName }),
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
        select: { id: true, sku: true, name: true, salePrice: true, active: true, imageDataUrl: true, imageMimeType: true, imageFileName: true, imageSizeBytes: true, imageUpdatedAt: true }
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
        ...productImageData({ imageDataUrl: body.imageDataUrl, imageFileName: body.imageFileName }),
        ...(body.active !== undefined ? { active: body.active } : {})
      },
      select: { id: true, sku: true, name: true, salePrice: true, active: true, imageDataUrl: true, imageMimeType: true, imageFileName: true, imageSizeBytes: true, imageUpdatedAt: true }
    });

    if (shouldSyncIfoodCommercialData(body)) {
      await syncIfoodCommercialData({
        companyId: request.tenant!.companyId,
        productId: updated.id
      });
    }

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

    await syncIfoodCommercialData({
      companyId: request.tenant!.companyId,
      productId: product.id,
      branchId: body.branchId
    });

    await audit(request, { action: "product_branch_price.upsert", entityType: "ProductBranchPrice", entityId: price.id, after: price });
    return price;
  });
}
