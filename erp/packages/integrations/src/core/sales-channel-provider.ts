export type SalesChannelCapability =
  | "CATALOG_SYNC"
  | "INVENTORY_SYNC"
  | "PRICE_SYNC"
  | "ORDER_RECEIVE"
  | "ORDER_ACCEPT"
  | "ORDER_CANCEL"
  | "DELIVERY_TRACKING"
  | "FINANCIAL_RECONCILIATION";

export type SalesChannelProvider = {
  id: string;
  name: string;
  capabilities: SalesChannelCapability[];
};
