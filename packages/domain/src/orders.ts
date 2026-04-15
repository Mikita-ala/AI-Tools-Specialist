export type NormalizedOrderItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type NormalizedOrder = {
  externalId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  address: string | null;
  status: string;
  orderType: string | null;
  orderMethod: string | null;
  utmSource: string | null;
  totalAmount: number;
  crmCreatedAt: string | null;
  crmUpdatedAt: string | null;
  rawPayload: unknown;
  items: NormalizedOrderItem[];
};

export type HighValueAlertRule = {
  key: "order_total_gt_50000";
  threshold: number;
};

export const HIGH_VALUE_ALERT_RULE: HighValueAlertRule = {
  key: "order_total_gt_50000",
  threshold: 50_000,
};

export const calculateOrderTotal = (items: Array<{ quantity: number; unitPrice: number }>) =>
  items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

export const isHighValueOrder = (totalAmount: number) => totalAmount > 50_000;
