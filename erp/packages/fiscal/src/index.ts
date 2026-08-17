export type FiscalPendingReason = "MISSING_PROFILE" | "MISSING_NCM" | "MISSING_TAX_RULE";

export const fiscalPendingLabels: Record<FiscalPendingReason, string> = {
  MISSING_PROFILE: "Produto sem perfil fiscal",
  MISSING_NCM: "Produto sem NCM",
  MISSING_TAX_RULE: "Produto sem regra fiscal aplicável"
};

export type FiscalRuleVersion = {
  version: number;
  validFrom: Date;
  validUntil?: Date;
};

export const supportedTaxTypes = ["ICMS", "PIS", "COFINS", "IBS", "CBS", "ISS", "IPI", "OTHER"] as const;

export type SupportedTaxType = (typeof supportedTaxTypes)[number];
