import type { FastifyInstance } from "fastify";
import { Prisma, prisma } from "@erp/database";
import { assertPermission } from "@erp/security";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function decimalString(value: Prisma.Decimal | number | null | undefined) {
  return new Prisma.Decimal(value ?? 0).toString();
}

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/v1/dashboard", { preHandler: [app.authenticateUser] }, async (request) => {
    assertPermission(request.tenant!, "sale.read");
    assertPermission(request.tenant!, "inventory.read");

    const tenant = request.tenant!;
    const today = startOfToday();
    const lowStockLimit = new Prisma.Decimal(5);

    const [salesToday, lowStockProducts, outOfStockProducts, pendingPurchases, lowStockItems, recentSales] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          companyId: tenant.companyId,
          branchId: tenant.branchId,
          status: "COMPLETED",
          createdAt: { gte: today }
        },
        _sum: { total: true },
        _count: { id: true }
      }),
      prisma.stockBalance.count({
        where: {
          companyId: tenant.companyId,
          branchId: tenant.branchId,
          quantity: { gt: new Prisma.Decimal(0), lte: lowStockLimit }
        }
      }),
      prisma.stockBalance.count({
        where: {
          companyId: tenant.companyId,
          branchId: tenant.branchId,
          quantity: { lte: new Prisma.Decimal(0) }
        }
      }),
      prisma.purchase.count({
        where: {
          companyId: tenant.companyId,
          branchId: tenant.branchId,
          status: { in: ["DRAFT", "ORDERED"] }
        }
      }),
      prisma.stockBalance.findMany({
        where: {
          companyId: tenant.companyId,
          branchId: tenant.branchId,
          quantity: { lte: lowStockLimit }
        },
        select: {
          id: true,
          quantity: true,
          product: { select: { id: true, sku: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true } }
        },
        orderBy: { quantity: "asc" },
        take: 5
      }),
      prisma.sale.findMany({
        where: {
          companyId: tenant.companyId,
          branchId: tenant.branchId
        },
        select: {
          id: true,
          total: true,
          status: true,
          source: true,
          createdAt: true,
          customer: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

    return {
      today: {
        salesTotal: decimalString(salesToday._sum.total),
        orders: salesToday._count.id,
        lowStockProducts,
        outOfStockProducts,
        pendingPurchases
      },
      attention: lowStockItems.map((item) => ({
        type: new Prisma.Decimal(item.quantity).lessThanOrEqualTo(0) ? "OUT_OF_STOCK" : "LOW_STOCK",
        title: new Prisma.Decimal(item.quantity).lessThanOrEqualTo(0)
          ? `${item.product.name} está sem estoque`
          : `${item.product.name} está acabando`,
        detail: `Restam ${decimalString(item.quantity)} ${item.product.unit} em ${item.warehouse.name}.`,
        product: item.product,
        warehouse: item.warehouse,
        quantity: decimalString(item.quantity)
      })),
      recentSales: recentSales.map((sale) => ({
        ...sale,
        total: decimalString(sale.total)
      }))
    };
  });
}
