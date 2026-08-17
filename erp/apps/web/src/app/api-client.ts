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
    category: { id: string; name: string } | null;
    barcodes: Array<{ id: string; barcode: string }>;
    branchPrices: Array<{ salePrice: string }>;
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
    quantity: string;
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

export type DashboardResponse = {
  today: {
    salesTotal: string;
    orders: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    pendingPurchases: number;
  };
  attention: Array<{
    type: "LOW_STOCK" | "OUT_OF_STOCK";
    title: string;
    detail: string;
    quantity: string;
    product: { id: string; sku: string; name: string; unit: string };
    warehouse: { id: string; name: string };
  }>;
  recentSales: Array<{
    id: string;
    total: string;
    status: "COMPLETED" | "CANCELLED";
    source: string;
    createdAt: string;
    customer: { id: string; name: string } | null;
  }>;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? "Não foi possível concluir a ação.");
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

export async function getProducts(accessToken: string, input: { limit?: number; cursor?: string | null } = {}) {
  const search = new URLSearchParams();
  search.set("limit", String(input.limit ?? 10));
  if (input.cursor) {
    search.set("cursor", input.cursor);
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

function paginatedSearchParams(input: { limit?: number; cursor?: string | null; search?: string }) {
  const search = new URLSearchParams();
  search.set("limit", String(input.limit ?? 10));
  if (input.cursor) {
    search.set("cursor", input.cursor);
  }
  if (input.search?.trim()) {
    search.set("search", input.search.trim());
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

export async function getDashboard(accessToken: string) {
  const response = await fetch(`${API_URL}/api/v1/dashboard`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  return parseResponse<DashboardResponse>(response);
}
