import type { NormalizedOrder } from "@gbc/domain";

export type DashboardStats = {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  highValueOrders: number;
};

export const createOrderUpsertPayload = (order: NormalizedOrder) => ({
  external_id: order.externalId,
  first_name: order.firstName,
  last_name: order.lastName,
  full_name: order.fullName,
  phone: order.phone,
  email: order.email,
  city: order.city,
  address: order.address,
  status: order.status,
  order_type: order.orderType,
  order_method: order.orderMethod,
  utm_source: order.utmSource,
  total_amount: order.totalAmount,
  crm_created_at: order.crmCreatedAt,
  crm_updated_at: order.crmUpdatedAt,
  raw_payload: order.rawPayload,
  synced_at: new Date().toISOString(),
});

export const createOrderItemsPayload = (order: NormalizedOrder) =>
  order.items.map((item, index) => ({
    order_external_id: order.externalId,
    line_index: index,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
  }));
