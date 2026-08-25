import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AppError } from "@erp/security";
import { config } from "@erp/config";

type IfoodMerchantSummary = {
  id: string;
  name: string;
  corporateName?: string;
};

type IfoodMerchantDetail = {
  id: string;
  name: string;
  corporateName?: string;
  [key: string]: unknown;
};

type IfoodCategoryResponse = {
  id: string;
  name: string;
  status?: string;
};

type IfoodCatalogResponse = {
  catalogId: string;
  context?: string[];
  status?: string;
};

export type IfoodSellableItem = {
  itemId: string;
  categoryId?: string;
  itemEan?: string;
  itemExternalCode?: string;
  categoryName?: string;
  itemName?: string;
  itemDescription?: string;
  itemPrice?: { value?: number; originalValue?: number };
  itemUnit?: string;
  itemOptionGroups?: unknown[];
  [key: string]: unknown;
};

type IfoodOAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
};

export type IfoodOrderApiEvent = {
  id: string;
  code: string;
  fullCode?: string;
  orderId: string;
  merchantId?: string;
  createdAt?: string | Date;
  metadata?: unknown;
  [key: string]: unknown;
};

export type IfoodOrderDetails = {
  id: string;
  displayId?: string;
  status?: string;
  orderType?: string;
  orderTiming?: string;
  category?: string;
  createdAt?: string;
  preparationStartDateTime?: string;
  customer?: unknown;
  items?: unknown[];
  total?: unknown;
  [key: string]: unknown;
};

type StoredIfoodCredentials = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

export type IfoodEcommerceStockSettings = {
  ecommerceStockMode?: string | null;
  ecommerceStockPercent?: { toString(): string } | string | number | null;
  ecommerceStockFixedQuantity?: { toString(): string } | string | number | null;
};

function ifoodConfigOrThrow() {
  if (!config.IFOOD_CLIENT_ID || !config.IFOOD_CLIENT_SECRET) {
    throw new AppError(
      "IFOOD_CONFIG_MISSING",
      "Configure IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET para usar a integração iFood.",
      409
    );
  }

  return {
    baseUrl: (config.IFOOD_API_URL ?? "https://merchant-api.ifood.com.br").replace(/\/+$/, ""),
    clientId: config.IFOOD_CLIENT_ID,
    clientSecret: config.IFOOD_CLIENT_SECRET
  };
}

function encryptionKey() {
  return createHash("sha256").update(config.DATA_ENCRYPTION_KEY).digest();
}

export function encryptIfoodToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptIfoodToken(value: string) {
  const [version, iv, authTag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !authTag || !encrypted) {
    throw new AppError("IFOOD_TOKEN_INVALID", "Token iFood armazenado em formato inválido. Reconecte o iFood.", 409);
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(authTag, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new AppError("IFOOD_TOKEN_INVALID", "Não foi possível ler o token iFood armazenado. Reconecte o iFood.", 409);
  }
}

export function ifoodTokenExpiresAt(expiresIn?: number) {
  const safetyWindowSeconds = 60;
  const ttlSeconds = Math.max((expiresIn ?? 21600) - safetyWindowSeconds, 300);
  return new Date(Date.now() + ttlSeconds * 1000);
}

function numericSetting(value: IfoodEcommerceStockSettings["ecommerceStockPercent"]) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateIfoodInventoryAmount(stockQuantity: { toString(): string } | string | number, settings: IfoodEcommerceStockSettings = {}) {
  const stock = Math.max(0, Number(stockQuantity.toString()));
  if (!Number.isFinite(stock) || stock <= 0) {
    return 0;
  }

  if (settings.ecommerceStockMode === "PERCENT") {
    const percent = Math.min(Math.max(numericSetting(settings.ecommerceStockPercent) ?? 0, 0), 100);
    return Math.floor(stock * (percent / 100));
  }

  if (settings.ecommerceStockMode === "FIXED") {
    const fixed = Math.max(numericSetting(settings.ecommerceStockFixedQuantity) ?? 0, 0);
    return Math.floor(Math.min(stock, fixed));
  }

  return Math.floor(stock);
}

async function parseJsonSafe(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function ifoodErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  const error = record.error;
  if (error && typeof error === "object") {
    const errorRecord = error as Record<string, unknown>;
    if (typeof errorRecord.message === "string" && errorRecord.message.trim()) {
      return errorRecord.message;
    }
  }

  return fallback;
}

function isIfoodRouteNotMatched(payload: unknown) {
  return ifoodErrorMessage(payload, "").toLowerCase().includes("no route matched");
}

function ifoodUserCodeErrorMessage(payload: unknown) {
  const message = ifoodErrorMessage(payload, "Não foi possível iniciar a autorização do iFood.");
  if (message.toLowerCase().includes("grant type not authorized")) {
    return "O clientId iFood configurado não está autorizado para o fluxo de autorização por código. Habilite o fluxo de aplicativo distribuído no portal do iFood ou use credenciais de um app distribuído.";
  }

  return message;
}

async function requestAccessTokenByRefreshToken(refreshToken: string) {
  const cfg = ifoodConfigOrThrow();
  const body = new URLSearchParams({
    grantType: "refresh_token",
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    refreshToken
  });

  const response = await fetch(`${cfg.baseUrl}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const payload = (await parseJsonSafe(response)) as { accessToken?: string; refreshToken?: string; expiresIn?: number; message?: string } | null;
  if (!response.ok || !payload?.accessToken) {
    throw new AppError(
      "IFOOD_AUTH_FAILED",
      ifoodErrorMessage(payload, "Não foi possível renovar o token iFood. Reconecte a loja."),
      response.status === 400 || response.status === 401 || response.status === 403 ? 409 : 502
    );
  }

  return {
    accessToken: payload.accessToken,
    ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
    ...(payload.expiresIn ? { expiresIn: payload.expiresIn } : {})
  } satisfies IfoodOAuthTokenResponse;
}

async function requestAccessTokenByAuthorizationCode(input: { authorizationCode: string; authorizationCodeVerifier: string }) {
  const cfg = ifoodConfigOrThrow();
  const body = new URLSearchParams({
    grantType: "authorization_code",
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    authorizationCode: input.authorizationCode,
    authorizationCodeVerifier: input.authorizationCodeVerifier
  });

  const response = await fetch(`${cfg.baseUrl}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const payload = (await parseJsonSafe(response)) as { accessToken?: string; refreshToken?: string; expiresIn?: number; message?: string } | null;
  if (!response.ok || !payload?.accessToken) {
    throw new AppError(
      "IFOOD_AUTHORIZATION_CODE_FAILED",
      ifoodErrorMessage(payload, "Não foi possível trocar o authorizationCode por token no iFood."),
      response.status === 401 || response.status === 403 ? 401 : 502
    );
  }

  return {
    accessToken: payload.accessToken,
    ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
    ...(payload.expiresIn ? { expiresIn: payload.expiresIn } : {})
  } satisfies IfoodOAuthTokenResponse;
}

export async function startIfoodDeviceAuthorization() {
  const cfg = ifoodConfigOrThrow();
  const body = new URLSearchParams({
    clientId: cfg.clientId
  });

  const response = await fetch(`${cfg.baseUrl}/authentication/v1.0/oauth/userCode`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const payload = (await parseJsonSafe(response)) as {
    userCode?: string;
    authorizationCodeVerifier?: string;
    verificationUrl?: string;
    verificationUrlComplete?: string;
    message?: string;
  } | null;

  if (!response.ok || !payload?.userCode || !payload?.authorizationCodeVerifier || !payload?.verificationUrlComplete) {
    throw new AppError(
      "IFOOD_USER_CODE_FAILED",
      ifoodUserCodeErrorMessage(payload),
      response.status === 400 || response.status === 401 || response.status === 403 ? 409 : 502
    );
  }

  return {
    userCode: payload.userCode,
    authorizationCodeVerifier: payload.authorizationCodeVerifier,
    verificationUrl: payload.verificationUrl ?? payload.verificationUrlComplete,
    verificationUrlComplete: payload.verificationUrlComplete
  };
}

async function listMerchants(accessToken: string) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/merchant/v1.0/merchants?page=1&size=100`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || !Array.isArray(payload)) {
    throw new AppError("IFOOD_MERCHANT_LIST_FAILED", "Não foi possível listar merchants no iFood.", 502);
  }

  return payload as IfoodMerchantSummary[];
}

async function getMerchantDetail(accessToken: string, merchantId: string) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/merchant/v1.0/merchants/${merchantId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = (await parseJsonSafe(response)) as IfoodMerchantDetail | null;
  if (response.status === 404) {
    throw new AppError("IFOOD_MERCHANT_NOT_FOUND", "Merchant não encontrado no iFood.", 404);
  }

  if (!response.ok || !payload?.id) {
    throw new AppError("IFOOD_MERCHANT_DETAILS_FAILED", "Não foi possível consultar detalhes do merchant no iFood.", 502);
  }

  return payload;
}

export async function createIfoodCategory(input: { accessToken: string; merchantId: string; name: string }) {
  const cfg = ifoodConfigOrThrow();
  const body = JSON.stringify({
    name: input.name,
    status: "AVAILABLE",
    template: "DEFAULT",
    sequence: 0
  });
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${input.accessToken}`,
    "Content-Type": "application/json"
  };
  const response = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${input.merchantId}/categories`, {
    method: "POST",
    headers,
    body
  });

  const payload = (await parseJsonSafe(response)) as IfoodCategoryResponse | null;
  if (!response.ok && isIfoodRouteNotMatched(payload)) {
    const catalog = await getDefaultIfoodCatalog(input.accessToken, input.merchantId);
    const catalogResponse = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${input.merchantId}/catalogs/${catalog.catalogId}/categories`, {
      method: "POST",
      headers,
      body
    });
    const catalogPayload = (await parseJsonSafe(catalogResponse)) as IfoodCategoryResponse | null;
    if (!catalogResponse.ok || !catalogPayload?.id) {
      throw new AppError("IFOOD_CATEGORY_CREATE_FAILED", ifoodErrorMessage(catalogPayload, "Não foi possível criar categoria no iFood."), 502);
    }

    return catalogPayload;
  }

  if (!response.ok || !payload?.id) {
    throw new AppError("IFOOD_CATEGORY_CREATE_FAILED", ifoodErrorMessage(payload, "Não foi possível criar categoria no iFood."), 502);
  }

  return payload;
}

async function getDefaultIfoodCatalog(accessToken: string, merchantId: string) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${merchantId}/catalogs`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`
    }
  });

  const payload = (await parseJsonSafe(response)) as IfoodCatalogResponse[] | null;
  if (!response.ok || !Array.isArray(payload)) {
    throw new AppError("IFOOD_CATALOG_LIST_FAILED", ifoodErrorMessage(payload, "Não foi possível listar catálogos no iFood."), 502);
  }

  const catalog = payload.find((item) => item.status !== "UNAVAILABLE" && item.context?.includes("DEFAULT")) ?? payload[0];
  if (!catalog?.catalogId) {
    throw new AppError("IFOOD_CATALOG_NOT_FOUND", "Nenhum catálogo iFood disponível foi encontrado para esta loja.", 409);
  }

  return catalog;
}

export async function publishSimpleIfoodItem(input: {
  accessToken: string;
  merchantId: string;
  item: {
    id: string;
    productId: string;
    categoryId: string;
    externalCode: string;
    name: string;
    description?: string | null;
    imagePath?: string | null;
    price: number;
    status: "AVAILABLE" | "UNAVAILABLE";
  };
}) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${input.merchantId}/items`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      item: {
        id: input.item.id,
        type: "DEFAULT",
        categoryId: input.item.categoryId,
        status: input.item.status,
        price: { value: input.item.price },
        externalCode: input.item.externalCode,
        productId: input.item.productId
      },
      products: [
        {
          id: input.item.productId,
          name: input.item.name,
          ...(input.item.description ? { description: input.item.description } : {}),
          ...(input.item.imagePath ? { imagePath: input.item.imagePath } : {}),
          externalCode: input.item.externalCode
        }
      ],
      optionGroups: [],
      options: []
    })
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new AppError("IFOOD_ITEM_PUBLISH_FAILED", ifoodErrorMessage(payload, "Não foi possível publicar produto no iFood."), 502);
  }

  return payload;
}

export async function updateIfoodInventory(input: { accessToken: string; merchantId: string; productId: string; amount: number }) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${input.merchantId}/inventory`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      productId: input.productId,
      amount: input.amount
    })
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new AppError("IFOOD_INVENTORY_UPDATE_FAILED", ifoodErrorMessage(payload, "Não foi possível atualizar estoque no iFood."), 502);
  }

  return payload;
}

export async function listIfoodSellableItems(input: { accessToken: string; merchantId: string }) {
  const cfg = ifoodConfigOrThrow();
  const catalogsResponse = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${input.merchantId}/catalogs`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`
    }
  });
  const catalogsPayload = (await parseJsonSafe(catalogsResponse)) as IfoodCatalogResponse[] | null;
  if (!catalogsResponse.ok || !Array.isArray(catalogsPayload)) {
    throw new AppError("IFOOD_CATALOG_LIST_FAILED", ifoodErrorMessage(catalogsPayload, "Não foi possível listar catálogos do iFood."), catalogsResponse.status === 401 || catalogsResponse.status === 403 ? 409 : 502);
  }

  const catalogs = catalogsPayload.filter((catalog) => catalog.catalogId && catalog.status !== "UNAVAILABLE");
  const selectedCatalogs = catalogs.filter((catalog) => catalog.context?.includes("DEFAULT"));
  const catalogsToRead = selectedCatalogs.length > 0 ? selectedCatalogs : catalogs.slice(0, 1);
  const items: IfoodSellableItem[] = [];

  for (const catalog of catalogsToRead) {
    const response = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${input.merchantId}/catalogs/${catalog.catalogId}/sellableItems`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`
      }
    });
    const payload = (await parseJsonSafe(response)) as IfoodSellableItem[] | null;
    if (!response.ok || !Array.isArray(payload)) {
      throw new AppError("IFOOD_SELLABLE_ITEMS_FAILED", ifoodErrorMessage(payload, "Não foi possível listar itens do catálogo iFood."), response.status === 401 || response.status === 403 ? 409 : 502);
    }
    items.push(...payload);
  }

  return items;
}

export async function getIfoodOrderDetails(input: { accessToken: string; orderId: string }) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/order/v1.0/orders/${input.orderId}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    }
  });

  const payload = (await parseJsonSafe(response)) as IfoodOrderDetails | null;
  if (response.status === 404) {
    throw new AppError("IFOOD_ORDER_DETAILS_NOT_AVAILABLE", "Detalhes do pedido iFood ainda não estão disponíveis.", 409);
  }
  if (!response.ok || !payload?.id) {
    throw new AppError("IFOOD_ORDER_DETAILS_FAILED", ifoodErrorMessage(payload, "Não foi possível obter detalhes do pedido iFood."), 502);
  }

  return payload;
}

export async function pollIfoodOrderEvents(input: { accessToken: string; merchantId?: string | null }) {
  const cfg = ifoodConfigOrThrow();
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${input.accessToken}`,
    "Content-Type": "application/json"
  };

  if (input.merchantId) {
    headers["x-polling-merchants"] = input.merchantId;
  }

  const response = await fetch(`${cfg.baseUrl}/events/v1.0/events:polling`, { headers });
  const payload = (await parseJsonSafe(response)) as IfoodOrderApiEvent[] | { events?: IfoodOrderApiEvent[] } | null;
  if (!response.ok) {
    throw new AppError("IFOOD_ORDER_POLLING_FAILED", ifoodErrorMessage(payload, "Não foi possível buscar eventos de pedido no iFood."), response.status === 401 || response.status === 403 ? 409 : 502);
  }

  return { events: Array.isArray(payload) ? payload : Array.isArray(payload?.events) ? payload.events : [] };
}

export async function confirmIfoodOrder(input: { accessToken: string; orderId: string }) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/order/v1.0/orders/${input.orderId}/confirm`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    }
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok && response.status !== 409) {
    throw new AppError("IFOOD_ORDER_CONFIRM_FAILED", ifoodErrorMessage(payload, "Não foi possível confirmar o pedido no iFood."), response.status === 401 || response.status === 403 ? 409 : 502);
  }

  return payload;
}

export async function transitionIfoodOrder(input: { accessToken: string; orderId: string; action: "START_PREPARATION" | "READY_TO_PICKUP" | "DISPATCH" }) {
  const cfg = ifoodConfigOrThrow();
  const pathByAction = {
    START_PREPARATION: "startPreparation",
    READY_TO_PICKUP: "readyToPickup",
    DISPATCH: "dispatch"
  } as const;
  const response = await fetch(`${cfg.baseUrl}/order/v1.0/orders/${input.orderId}/${pathByAction[input.action]}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    }
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok && response.status !== 409) {
    throw new AppError("IFOOD_ORDER_TRANSITION_FAILED", ifoodErrorMessage(payload, "Não foi possível atualizar status do pedido no iFood."), response.status === 401 || response.status === 403 ? 409 : 502);
  }

  return payload;
}

export async function acknowledgeIfoodOrderEvents(input: { accessToken: string; eventIds: string[] }) {
  if (input.eventIds.length === 0) {
    return null;
  }

  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/events/v1.0/events/acknowledgment`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([...new Set(input.eventIds)].map((id) => ({ id })))
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new AppError("IFOOD_ORDER_ACK_FAILED", ifoodErrorMessage(payload, "Não foi possível confirmar leitura dos eventos iFood."), response.status === 401 || response.status === 403 ? 409 : 502);
  }

  return payload;
}

export async function uploadIfoodImage(input: { accessToken: string; merchantId: string; imageDataUrl: string }) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/catalog/v2.0/merchants/${input.merchantId}/image/upload`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ image: input.imageDataUrl })
  });

  const payload = (await parseJsonSafe(response)) as { imagePath?: string } | null;
  if (!response.ok || !payload?.imagePath) {
    throw new AppError("IFOOD_IMAGE_UPLOAD_FAILED", ifoodErrorMessage(payload, "Não foi possível enviar imagem para o iFood."), 502);
  }

  return { imagePath: payload.imagePath };
}

export async function healthCheckIfoodMerchant(merchantId: string, accessToken: string) {
  const merchants = await listMerchants(accessToken);
  const found = merchants.find((merchant) => merchant.id === merchantId);

  if (!found) {
    throw new AppError(
      "IFOOD_MERCHANT_NOT_AUTHORIZED",
      "O aplicativo iFood não possui autorização para este merchant.",
      403
    );
  }

  const detail = await getMerchantDetail(accessToken, merchantId);
  return {
    merchant: {
      id: detail.id,
      name: detail.name ?? found.name,
      corporateName: detail.corporateName ?? found.corporateName ?? null
    }
  };
}

export async function resolveIfoodAccessToken(credentials: StoredIfoodCredentials) {
  if (!credentials.accessToken) {
    throw new AppError("IFOOD_TOKEN_MISSING", "Token iFood não encontrado. Reconecte a loja para continuar.", 409);
  }

  if (!credentials.tokenExpiresAt || credentials.tokenExpiresAt.getTime() > Date.now()) {
    return { accessToken: decryptIfoodToken(credentials.accessToken), refreshed: null };
  }

  if (!credentials.refreshToken) {
    throw new AppError("IFOOD_REFRESH_TOKEN_MISSING", "Refresh token iFood não encontrado. Reconecte a loja para continuar.", 409);
  }

  const refreshed = await requestAccessTokenByRefreshToken(decryptIfoodToken(credentials.refreshToken));
  return {
    accessToken: refreshed.accessToken,
    refreshed: {
      accessToken: encryptIfoodToken(refreshed.accessToken),
      ...(refreshed.refreshToken ? { refreshToken: encryptIfoodToken(refreshed.refreshToken) } : {}),
      tokenExpiresAt: ifoodTokenExpiresAt(refreshed.expiresIn)
    }
  };
}

export async function connectIfoodByAuthorizationCode(input: {
  authorizationCode: string;
  authorizationCodeVerifier: string;
  merchantId?: string;
}) {
  const oauth = await requestAccessTokenByAuthorizationCode({
    authorizationCode: input.authorizationCode,
    authorizationCodeVerifier: input.authorizationCodeVerifier
  });
  const merchants = await listMerchants(oauth.accessToken);
  const selectedMerchant = input.merchantId
    ? merchants.find((merchant) => merchant.id === input.merchantId)
    : merchants[0];

  if (!selectedMerchant) {
    throw new AppError("IFOOD_MERCHANT_NOT_AUTHORIZED", "Nenhum merchant autorizado foi encontrado para este aplicativo.", 403);
  }

  const detail = await getMerchantDetail(oauth.accessToken, selectedMerchant.id);
  return {
    credentials: {
      accessToken: encryptIfoodToken(oauth.accessToken),
      ...(oauth.refreshToken ? { refreshToken: encryptIfoodToken(oauth.refreshToken) } : {}),
      tokenExpiresAt: ifoodTokenExpiresAt(oauth.expiresIn)
    },
    merchant: {
      id: detail.id,
      name: detail.name ?? selectedMerchant.name,
      corporateName: detail.corporateName ?? selectedMerchant.corporateName ?? null
    },
    merchants: merchants.map((item) => ({
      id: item.id,
      name: item.name,
      corporateName: item.corporateName ?? null
    }))
  };
}
