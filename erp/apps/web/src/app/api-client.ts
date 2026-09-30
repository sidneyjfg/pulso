const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export type LoginBody = {
  email: string;
  password: string;
};

export type RegisterBody = {
  name: string;
  email: string;
  password: string;
  companyName: string;
  branchName: string;
};

export type LoginResponse = {
  accessToken: string;
  tenant: {
    organizationId: string;
    companyId: string;
    branchId: string;
    role: string;
    permissions: string[];
  };
};

export type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    organizationAccesses: Array<{ organization: { id: string; name: string } }>;
    companyAccesses: Array<{ company: { id: string; legalName: string; tradeName: string | null; organizationId: string } }>;
    branchAccesses: Array<{ branch: { id: string; name: string; companyId: string } }>;
  };
  tenant: LoginResponse["tenant"];
};

export type ProductListResponse = {
  data: Array<{
    id: string;
    sku: string;
    name: string;
    unit: string;
    costPrice: string | null;
    salePrice: string;
    active: boolean;
    imageDataUrl: string | null;
    imageMimeType: string | null;
    imageFileName: string | null;
    imageSizeBytes: number | null;
    imageUpdatedAt: string | null;
    ifoodImagePath: string | null;
    category: { id: string; name: string } | null;
    barcodes: Array<{ id: string; barcode: string }>;
    branchPrices: Array<{ salePrice: string }>;
    ifoodCatalogItems: Array<{ status: string; lastSyncedAt: string | null; lastError: string | null; ifoodItemId: string }>;
  }>;
  nextCursor: string | null;
};

export type CategoryListResponse = {
  data: Array<{
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
  }>;
  nextCursor: string | null;
};

export type PersonListResponse = {
  data: Array<{
    id: string;
    type: "INDIVIDUAL" | "COMPANY";
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    active: boolean;
    createdAt: string;
  }>;
  nextCursor: string | null;
};

export type StockBalanceListResponse = {
  data: Array<{
    id: string;
    quantity?: string;
    reservedQuantity: string;
    updatedAt: string;
    warehouse: { id: string; name: string };
    product: { id: string; sku: string; name: string; unit: string };
  }>;
  nextCursor: string | null;
};

export type UserPreferences = {
  darkMode: boolean;
  compactMenu: boolean;
  showSavings: boolean;
  confirmCriticalActions: boolean;
  sessionWarnings: boolean;
  hideSensitiveData: boolean;
  blockNegativeStock: boolean;
  lowStockAlerts: boolean;
  currentBranchOnly: boolean;
  showFiscalPending: boolean;
  prepareChannelSync: boolean;
  updatedAt?: string;
};

export type BranchListResponse = {
  data: Array<{
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
  }>;
  nextCursor: string | null;
};

export type RoleListResponse = {
  data: Array<{
    id: string;
    name: string;
    scope: "ORGANIZATION" | "COMPANY" | "BRANCH";
    system: boolean;
    permissions: Array<{ permission: { key: string } }>;
  }>;
  nextCursor: string | null;
};

export type UserListResponse = {
  data: Array<{
    id: string;
    name: string;
    email: string;
    active: boolean;
    companyAccesses: Array<{ role: { id: string; name: string } }>;
    branchAccesses: Array<{ branch: { id: string; name: string }; active: boolean }>;
  }>;
  nextCursor: string | null;
};

export type GenericListItem = Record<string, unknown> & { id: string };

export type GenericListResponse = {
  data: GenericListItem[];
  nextCursor: string | null;
  summary?: Record<string, unknown>;
};

export type PricingSettingsResponse = {
  id: string | null;
  companyId: string;
  taxPercent: string;
  feePercent: string;
  updatedAt: string | null;
};

export type DashboardResponse = {
  today: {
    salesTotal: string;
    orders: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    pendingPurchases: number;
  };
  attention: Array<{
    type: "LOW_STOCK" | "OUT_OF_STOCK" | "IFOOD_ORDER" | "FINANCIAL_DUE";
    title: string;
    detail: string;
    quantity: string;
    product?: { id: string; sku: string; name: string; unit: string };
    warehouse?: { id: string; name: string };
    targetTab?: string;
    targetId?: string;
  }>;
  recentSales: Array<{
    id: string;
    total: string;
    status: "PENDING" | "RESERVED" | "COMPLETED" | "CANCELLED";
    source: string;
    createdAt: string;
    customer: { id: string; name: string } | null;
  }>;
};

export type IfoodEventReprocessResponse = {
  received?: number;
  processed: number;
  duplicates?: number;
  failed: number;
  createdSales?: number;
  cancelledSales?: number;
  ackedEventIds?: string[];
  errors?: Array<{ externalEventId: string; message: string }>;
  message?: string;
};

export type IfoodCatalogSyncResponse = {
  summary: {
    total: number;
    synced: number;
    errors: number;
    dryRun: boolean;
  };
  items: Array<{
    productId: string;
    sku: string;
    name: string;
    barcode: string | null;
    salePrice: string;
    stock: string;
    status: "READY" | "SYNCED" | "ERROR";
    ifoodItemId: string | null;
    issues: string[];
  }>;
};

export type IfoodOauthStartResponse = {
  userCode: string;
  authorizationCodeVerifier: string;
  verificationUrl: string;
  verificationUrlComplete: string;
  mode: "GROCERIES" | "RESTAURANT_PDV";
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string; issues?: Array<{ path?: string; message?: string }> } | null;
    const issueMessage = error?.issues
      ?.map((issue) => [issue.path, issue.message].filter(Boolean).join(": "))
      .filter(Boolean)
      .join(" ");
    throw new Error(issueMessage || error?.message || "Não foi possível concluir a ação.");
  }

  return response.json() as Promise<T>;
}

export async function login(body: LoginBody) {
  const response = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });

  return parseResponse<LoginResponse>(response);
}

export async function register(body: RegisterBody) {
  const response = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body)
  });

  return parseResponse<LoginResponse>(response);
}

export async function refreshSession() {
  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include"
  });

  return parseResponse<LoginResponse>(response);
}

export async function logoutSession(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` },
    credentials: "include"
  });

  if (!response.ok && response.status !== 401) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? "Não foi possível sair da conta.");
  }
}

export async function switchContext(accessToken: string, body: { organizationId: string; companyId: string; branchId: string }) {
  const response = await fetch(`${API_URL}/api/v1/auth/context`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify(body)
  });

  return parseResponse<LoginResponse>(response);
}

export async function getMe(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/me`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<MeResponse>(response);
}

export async function getProducts(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const search = new URLSearchParams();
  search.set("limit", String(input.limit ?? 10));
  if (input.cursor) {
    search.set("cursor", input.cursor);
  }
  if (input.search?.trim()) {
    search.set("search", input.search.trim());
  }

  const response = await fetch(`${API_URL}/api/v1/products?${search.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<ProductListResponse>(response);
}

export async function updateProductActive(accessToken: string, productId: string, active: boolean) {
  const response = await fetch(`${API_URL}/api/v1/products/${productId}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ active })
  });

  return parseResponse<{ id: string; active: boolean }>(response);
}

export async function updateProduct(
  accessToken: string,
  productId: string,
  body: {
    sku?: string;
    name?: string;
    unit?: string;
    salePrice?: string;
    costPrice?: string | null;
    categoryId?: string | null;
    imageDataUrl?: string | null;
    imageFileName?: string | null;
    active?: boolean;
  }
) {
  const response = await fetch(`${API_URL}/api/v1/products/${productId}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<GenericListItem>(response);
}

export async function getCategories(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/categories?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<CategoryListResponse>(response);
}

export async function createCategory(accessToken: string, body: { name: string }) {
  const response = await fetch(`${API_URL}/api/v1/categories`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<{ id: string; name: string; active: boolean }>(response);
}

export async function createProduct(
  accessToken: string,
  body: {
    sku: string;
    name: string;
    unit?: string;
    salePrice: string;
    costPrice?: string;
    categoryId?: string;
    imageDataUrl?: string;
    imageFileName?: string;
    barcodes?: string[];
    initialStock?: {
      warehouseId: string;
      quantity: string;
    };
  }
) {
  const response = await fetch(`${API_URL}/api/v1/products`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<GenericListItem>(response);
}

export async function updateCategoryActive(accessToken: string, categoryId: string, active: boolean) {
  const response = await fetch(`${API_URL}/api/v1/categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ active })
  });

  return parseResponse<{ id: string; name: string; active: boolean }>(response);
}

function paginatedSearchParams(input: { limit?: number; cursor?: string | null; search?: string } & Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  search.set("limit", String(input.limit ?? 10));
  if (input.cursor) {
    search.set("cursor", input.cursor);
  }
  if (input.search?.trim()) {
    search.set("search", input.search.trim());
  }
  for (const [key, value] of Object.entries(input)) {
    if (key === "limit" || key === "cursor" || key === "search" || value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  return search;
}

export async function getCustomers(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/customers?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<PersonListResponse>(response);
}

export async function getSuppliers(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/suppliers?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<PersonListResponse>(response);
}

export async function getStockBalances(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/inventory/balances?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<StockBalanceListResponse>(response);
}

export async function getUserPreferences(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/settings/preferences`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<UserPreferences>(response);
}

export async function updateUserPreferences(accessToken: string, body: Partial<UserPreferences>) {
  const response = await fetch(`${API_URL}/api/v1/settings/preferences`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<UserPreferences>(response);
}

export async function getBranches(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/branches?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<BranchListResponse>(response);
}

export async function getRoles(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/roles?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<RoleListResponse>(response);
}

export async function getUsers(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/users?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<UserListResponse>(response);
}

export async function updateUserAccess(accessToken: string, userId: string, body: { roleId: string; branchIds: string[] }) {
  const response = await fetch(`${API_URL}/api/v1/users/${userId}/access`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<UserListResponse["data"][number]>(response);
}

export async function createRole(
  accessToken: string,
  body: {
    name: string;
    scope: "ORGANIZATION" | "COMPANY" | "BRANCH";
    permissionKeys: string[];
  }
) {
  return requestWithBody<{ id: string; name: string; scope: string }, typeof body>(accessToken, "POST", "/api/v1/roles", body);
}

export async function createBranch(accessToken: string, body: { name: string; defaultWarehouseName?: string }) {
  const response = await fetch(`${API_URL}/api/v1/branches`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<{ id: string; name: string; active: boolean; defaultWarehouse: { id: string; name: string; active: boolean } }>(response);
}

export async function getPaginatedResource(accessToken: string, path: `/api/v1/${string}`, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const response = await fetch(`${API_URL}${path}?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<GenericListResponse>(response);
}

export async function getIfoodOrders(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const salesResponse = await fetch(`${API_URL}/api/v1/sales?${paginatedSearchParams({ ...input, source: "IFOOD" }).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const sales = await parseResponse<GenericListResponse>(salesResponse);

  const connectionsResponse = await fetch(`${API_URL}/api/v1/integrations/connections?${paginatedSearchParams({ limit: 10 }).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const connections = await parseResponse<GenericListResponse>(connectionsResponse);
  const connection = connections.data.find((item) => item.channel === "IFOOD" && item.status === "CONNECTED") ?? connections.data.find((item) => item.channel === "IFOOD");
  const connectionId = typeof connection?.id === "string" ? connection.id : "";

  if (!connectionId) {
    return sales;
  }

  const eventsResponse = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/events?${paginatedSearchParams({ limit: Math.max(input.limit ?? 25, 100), ...(input.search ? { search: input.search } : {}) }).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const events = await parseResponse<GenericListResponse>(eventsResponse);
  const orderStatusEvents = new Set(["PLACED", "CONFIRMED", "PREPARATION_STARTED", "READY_TO_PICKUP", "DISPATCHED", "CONCLUDED", "CANCELLED", "DELIVERED"]);
  const latestEventByOrderId = new Map<string, GenericListItem>();
  const latestStatusEventByOrderId = new Map<string, GenericListItem>();
  for (const event of events.data) {
    const payload = event.payload && typeof event.payload === "object" ? (event.payload as Record<string, unknown>) : {};
    const metadata = payload.metadata && typeof payload.metadata === "object" ? (payload.metadata as Record<string, unknown>) : {};
    const orderId = typeof payload.orderId === "string" ? payload.orderId : typeof metadata.id === "string" ? metadata.id : "";
    if (orderId && !latestEventByOrderId.has(orderId)) {
      latestEventByOrderId.set(orderId, event);
    }
    if (orderId && !latestStatusEventByOrderId.has(orderId) && typeof event.eventType === "string" && orderStatusEvents.has(event.eventType)) {
      latestStatusEventByOrderId.set(orderId, event);
    }
  }
  const saleData = sales.data.map((sale) => {
    const idempotencyKey = typeof sale.idempotencyKey === "string" ? sale.idempotencyKey : "";
    const orderId = idempotencyKey.startsWith("ifood:order:") ? idempotencyKey.split(":").at(-1) ?? "" : "";
    const event = orderId ? latestStatusEventByOrderId.get(orderId) : undefined;
    const lastEvent = orderId ? latestEventByOrderId.get(orderId) : undefined;
    const eventType = typeof event?.eventType === "string" ? event.eventType : "";
    const lastPayload = lastEvent?.payload && typeof lastEvent.payload === "object" ? (lastEvent.payload as Record<string, unknown>) : {};
    return {
      ...sale,
      ifoodOrderId: orderId,
      ifoodDisplayId: typeof lastPayload.orderDisplayId === "string" ? lastPayload.orderDisplayId : "",
      ifoodOrderItems: Array.isArray(lastPayload.orderItems) ? lastPayload.orderItems : [],
      ifoodPaymentMethods: Array.isArray(lastPayload.paymentMethods) ? lastPayload.paymentMethods : [],
      ifoodOrderStatus: eventType || sale.status,
      ifoodLastNotification: typeof lastEvent?.eventType === "string" ? lastEvent.eventType : ""
    };
  });
  const enrichedSaleData = await Promise.all(
    saleData.map(async (sale) => {
      if (typeof sale.ifoodDisplayId === "string" && sale.ifoodDisplayId) {
        return sale;
      }
      if (typeof sale.id !== "string") {
        return sale;
      }
      try {
        const details = await getIfoodSaleExternalDetails(accessToken, sale.id);
        return {
          ...sale,
          ifoodDisplayId: typeof details.displayId === "string" ? details.displayId : sale.ifoodDisplayId,
          ifoodOrderItems: Array.isArray(details.orderItems) ? details.orderItems : sale.ifoodOrderItems,
          ifoodPaymentMethods: Array.isArray(details.paymentMethods) ? details.paymentMethods : sale.ifoodPaymentMethods
        };
      } catch {
        return sale;
      }
    })
  );
  const visibleEvents = events.data
    .filter((event) => event.status !== "PROCESSED" && event.status !== "DUPLICATE")
    .map((event) => ({ ...event, kind: "IFOOD_EVENT" }));

  return {
    ...sales,
    data: [...visibleEvents, ...enrichedSaleData],
    nextCursor: sales.nextCursor
  };
}

async function getConnectedIfoodConnectionId(accessToken: string) {
  const connectionsResponse = await fetch(`${API_URL}/api/v1/integrations/connections?${paginatedSearchParams({ limit: 10 }).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const connections = await parseResponse<GenericListResponse>(connectionsResponse);
  const connection = connections.data.find((item) => item.channel === "IFOOD" && item.status === "CONNECTED") ?? connections.data.find((item) => item.channel === "IFOOD");
  return typeof connection?.id === "string" ? connection.id : "";
}

export async function getIfoodCatalogItems(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string; status?: "all" | "linked" | "unlinked" } = {}) {
  const connectionId = await getConnectedIfoodConnectionId(accessToken);
  if (!connectionId) {
    return { data: [], nextCursor: null, summary: { total: 0, linked: 0, unlinked: 0 } };
  }

  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/catalog/items?${paginatedSearchParams({ limit: input.limit ?? 25, ...(input.search ? { search: input.search } : {}), status: input.status ?? "all" }).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<GenericListResponse>(response);
}

export async function getIfoodPendingItems(accessToken: string, input: { limit?: number; cursor?: string | null; search?: string } = {}) {
  const connectionId = await getConnectedIfoodConnectionId(accessToken);
  if (!connectionId) {
    return { data: [], nextCursor: null };
  }
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/pending-items?${paginatedSearchParams(input).toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  return parseResponse<GenericListResponse>(response);
}

export async function resolveIfoodPendingItem(accessToken: string, connectionId: string, pendingItemId: string, body: { productId: string; saveCatalogMapping?: boolean }) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/pending-items/${pendingItemId}/resolve`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return parseResponse<GenericListItem>(response);
}

export type IfoodOrderActionBody =
  | { action: "START_PREPARATION" | "READY_TO_PICKUP" | "DISPATCH" }
  | { action: "REQUEST_CANCELLATION"; reasonCode: string };

export async function getIfoodCancellationReasons(accessToken: string, saleId: string) {
  const response = await fetch(`${API_URL}/api/v1/sales/${saleId}/ifood/cancellation-reasons`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  return parseResponse<{ orderId: string; reasons: Array<{ code: string; description: string }> }>(response);
}

export async function runIfoodOrderAction(accessToken: string, saleId: string, body: IfoodOrderActionBody) {
  const response = await fetch(`${API_URL}/api/v1/sales/${saleId}/ifood/action`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return parseResponse<GenericListItem>(response);
}

export async function getIfoodSaleExternalDetails(accessToken: string, saleId: string) {
  const response = await fetch(`${API_URL}/api/v1/sales/${saleId}/ifood/details`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  return parseResponse<GenericListItem>(response);
}

export async function linkIfoodCatalogItem(accessToken: string, connectionId: string, ifoodItemId: string, body: { productId: string }) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/catalog/items/${encodeURIComponent(ifoodItemId)}/link`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<GenericListItem>(response);
}

export async function createProductFromIfoodItem(
  accessToken: string,
  connectionId: string,
  ifoodItemId: string,
  body: { categoryId?: string; sku?: string; name?: string; description?: string; unit?: string; costPrice?: string; salePrice?: string; barcode?: string }
) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/catalog/items/${encodeURIComponent(ifoodItemId)}/create-product`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<{ product: GenericListItem; mapping: GenericListItem }>(response);
}

export async function getDashboard(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/dashboard`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<DashboardResponse>(response);
}

export async function getPricingSettings(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/fiscal/pricing-settings`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<PricingSettingsResponse>(response);
}

export async function updatePricingSettings(accessToken: string, body: { taxPercent: number; feePercent: number }) {
  const response = await fetch(`${API_URL}/api/v1/fiscal/pricing-settings`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<PricingSettingsResponse>(response);
}

async function requestWithBody<TResponse, TBody extends Record<string, unknown>>(
  accessToken: string,
  method: "POST" | "PATCH" | "PUT",
  path: `/api/v1/${string}`,
  body: TBody
) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<TResponse>(response);
}

export async function createSale(
  accessToken: string,
  body: {
    customerId?: string;
    warehouseId: string;
    source?: "MANUAL" | "POS" | "IFOOD" | "FOOD99" | "MARKETPLACE" | "ECOMMERCE" | "API" | "IMPORT" | "OTHER";
    discount?: string;
    idempotencyKey: string;
    items: Array<{ productId: string; quantity: string; unitPrice: string; discount?: string }>;
    payments?: Array<{ method: "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BANK_TRANSFER" | "VOUCHER" | "OTHER"; amount: string }>;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/sales", body);
}

export async function createPurchase(
  accessToken: string,
  body: {
    supplierId?: string;
    warehouseId: string;
    status?: "DRAFT" | "ORDERED";
    discount?: string;
    idempotencyKey: string;
    items: Array<{ productId: string; quantity: string; unitCost: string; discount?: string }>;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/purchases", body);
}

export async function cancelSale(accessToken: string, saleId: string, body: { reason: string; idempotencyKey: string }) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", `/api/v1/sales/${saleId}/cancel`, body);
}

export async function receivePurchase(accessToken: string, purchaseId: string, body: { idempotencyKey: string }) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", `/api/v1/purchases/${purchaseId}/receive`, body);
}

export async function cancelPurchase(accessToken: string, purchaseId: string, body: { reason: string }) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", `/api/v1/purchases/${purchaseId}/cancel`, body);
}

export async function settleFinancialEntry(
  accessToken: string,
  entryId: string,
  body: {
    paidAmount?: string;
    interestAmount?: string;
    discountAmount?: string;
    paymentMethod?: "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BANK_TRANSFER" | "VOUCHER" | "OTHER";
    proofUrl?: string;
    proofFileName?: string;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", `/api/v1/finance/entries/${entryId}/settle`, body);
}

export async function cancelFinancialEntry(accessToken: string, entryId: string, body: { reason: string }) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", `/api/v1/finance/entries/${entryId}/cancel`, body);
}

export async function createStockTransfer(
  accessToken: string,
  body: {
    sourceWarehouseId: string;
    destinationBranchId: string;
    destinationWarehouseId: string;
    reason?: string;
    idempotencyKey: string;
    items: Array<{ productId: string; quantity: string }>;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/inventory/transfers", body);
}

export async function createInventoryCount(
  accessToken: string,
  body: {
    warehouseId: string;
    notes?: string;
    idempotencyKey: string;
    items: Array<{ productId: string; countedQuantity: string }>;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/inventory/counts", body);
}

export async function createAlertRule(
  accessToken: string,
  body: {
    name: string;
    type: "LOW_STOCK" | "OUT_OF_STOCK" | "FISCAL_PENDING" | "IMPORT_ERROR" | "INTEGRATION_ERROR" | "SECURITY" | "OTHER";
    branchId?: string;
    threshold?: Record<string, unknown>;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/alerts/rules", body);
}

export async function createImportJob(
  accessToken: string,
  body: {
    source?: "CSV" | "XLSX" | "BLING" | "TINY" | "OMIE" | "CONTA_AZUL" | "OTHER";
    branchId?: string;
    fileName?: string;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/imports/jobs", body);
}

export async function createIntegrationConnection(
  accessToken: string,
  body: {
    channel: "IFOOD";
    branchId?: string;
    externalAccountId?: string;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/integrations/connections", body);
}

export async function updateIntegrationConnection(
  accessToken: string,
  connectionId: string,
  body: {
    status?: "DISCONNECTED" | "CONNECTED" | "ERROR" | "PAUSED";
    externalAccountId?: string | null;
    ecommerceStockMode?: "FULL" | "PERCENT" | "FIXED";
    ecommerceStockPercent?: string | null;
    ecommerceStockFixedQuantity?: string | null;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "PATCH", `/api/v1/integrations/connections/${connectionId}`, body);
}

export async function connectIfoodIntegration(
  accessToken: string,
  connectionId: string,
  body: { merchantId: string; mode?: "GROCERIES" | "RESTAURANT_PDV" }
) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/connect`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      merchantId: body.merchantId,
      mode: body.mode ?? "GROCERIES"
    })
  });

  return parseResponse<GenericListItem>(response);
}

export async function startIfoodOauth(accessToken: string, connectionId: string, body: { mode?: "GROCERIES" | "RESTAURANT_PDV" } = {}) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/oauth/start`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ mode: body.mode ?? "GROCERIES" })
  });

  return parseResponse<IfoodOauthStartResponse>(response);
}

export async function completeIfoodOauth(
  accessToken: string,
  connectionId: string,
  body: {
    authorizationCode: string;
    authorizationCodeVerifier: string;
    merchantId?: string;
    mode?: "GROCERIES" | "RESTAURANT_PDV";
  }
) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/oauth/complete`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      authorizationCode: body.authorizationCode,
      authorizationCodeVerifier: body.authorizationCodeVerifier,
      ...(body.merchantId ? { merchantId: body.merchantId } : {}),
      mode: body.mode ?? "GROCERIES"
    })
  });

  return parseResponse<GenericListItem>(response);
}

export async function getIfoodIntegrationHealth(accessToken: string, connectionId: string) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/health`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  return parseResponse<GenericListItem>(response);
}

export async function syncIfoodCatalog(accessToken: string, connectionId: string, body: { dryRun?: boolean; limit?: number; productId?: string } = {}) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/catalog/sync`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      dryRun: body.dryRun ?? false,
      limit: body.limit ?? 1000,
      ...(body.productId ? { productId: body.productId } : {})
    })
  });

  return parseResponse<IfoodCatalogSyncResponse>(response);
}

export async function reprocessIfoodEvents(accessToken: string, connectionId: string, body: { limit?: number } = {}) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/events/reprocess`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ limit: body.limit ?? 25 })
  });

  return parseResponse<IfoodEventReprocessResponse>(response);
}

export async function pollIfoodEvents(accessToken: string, connectionId: string) {
  const response = await fetch(`${API_URL}/api/v1/integrations/connections/${connectionId}/ifood/events/poll`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<IfoodEventReprocessResponse>(response);
}

export async function createReportJob(
  accessToken: string,
  body: {
    type: "SALES" | "INVENTORY" | "PURCHASES" | "FISCAL" | "CUSTOM";
    branchId?: string;
    filters?: Record<string, unknown>;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/reports/jobs", body);
}

export async function createTaxRule(
  accessToken: string,
  body: {
    name: string;
    description?: string;
    taxType: "ICMS" | "PIS" | "COFINS" | "IBS" | "CBS" | "ISS" | "IPI" | "OTHER";
    conditions?: Array<{
      field: string;
      operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "STARTS_WITH";
      value: string;
    }>;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/fiscal/tax-rules", body);
}

export async function createUser(
  accessToken: string,
  body: {
    name: string;
    email: string;
    password: string;
    roleId: string;
    branchIds: string[];
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/users", body);
}

export async function createWarehouse(
  accessToken: string,
  body: {
    name: string;
    branchId?: string;
  }
) {
  return requestWithBody<GenericListItem, typeof body>(accessToken, "POST", "/api/v1/warehouses", body);
}

export async function upsertProductFiscalProfile(
  accessToken: string,
  productId: string,
  body: {
    ncm?: string;
    cest?: string;
    origin?: "NATIONAL" | "FOREIGN_DIRECT" | "FOREIGN_INTERNAL";
    fiscalUnit?: string;
    productType?: "MERCHANDISE" | "SERVICE" | "RAW_MATERIAL" | "PACKAGING" | "FIXED_ASSET" | "CONSUMPTION" | "OTHER";
    icmsCst?: string;
    icmsCsosn?: string;
    pisCst?: string;
    cofinsCst?: string;
  }
) {
  const response = await fetch(`${API_URL}/api/v1/fiscal/products/${productId}/profile`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      origin: body.origin ?? "NATIONAL",
      fiscalUnit: body.fiscalUnit ?? "UN",
      productType: body.productType ?? "MERCHANDISE",
      ...(body.ncm ? { ncm: body.ncm } : {}),
      ...(body.cest ? { cest: body.cest } : {}),
      ...(body.icmsCst ? { icmsCst: body.icmsCst } : {}),
      ...(body.icmsCsosn ? { icmsCsosn: body.icmsCsosn } : {}),
      ...(body.pisCst ? { pisCst: body.pisCst } : {}),
      ...(body.cofinsCst ? { cofinsCst: body.cofinsCst } : {})
    })
  });

  return parseResponse<GenericListItem>(response);
}
