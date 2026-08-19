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

async function requestAccessToken() {
  const cfg = ifoodConfigOrThrow();
  const body = new URLSearchParams({
    grantType: "client_credentials",
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret
  });

  const response = await fetch(`${cfg.baseUrl}/authentication/v1.0/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  const payload = await parseJsonSafe(response) as { accessToken?: string; message?: string; code?: string } | null;
  if (!response.ok || !payload?.accessToken) {
    throw new AppError(
      "IFOOD_AUTH_FAILED",
      payload?.message ?? "Não foi possível autenticar no iFood com as credenciais configuradas.",
      response.status === 401 || response.status === 403 ? 401 : 502
    );
  }

  return payload.accessToken;
}

async function listMerchants(accessToken: string) {
  const cfg = ifoodConfigOrThrow();
  const response = await fetch(`${cfg.baseUrl}/merchant/v1.0/merchants?page=1&size=100`, {
    headers: {
      Accept: "application/json",
      Authorization: `******`
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
      Authorization: `******`
    }
  });

  const payload = await parseJsonSafe(response) as IfoodMerchantDetail | null;
  if (response.status === 404) {
    throw new AppError("IFOOD_MERCHANT_NOT_FOUND", "Merchant não encontrado no iFood.", 404);
  }

  if (!response.ok || !payload?.id) {
    throw new AppError("IFOOD_MERCHANT_DETAILS_FAILED", "Não foi possível consultar detalhes do merchant no iFood.", 502);
  }

  return payload;
}

export async function healthCheckIfoodMerchant(merchantId: string) {
  const accessToken = await requestAccessToken();
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
