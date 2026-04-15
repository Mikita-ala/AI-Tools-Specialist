import { hasSupabaseAdminEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type OrderListItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderRecord = {
  externalId: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  status: string;
  orderType: string | null;
  orderMethod: string | null;
  utmSource: string | null;
  totalAmount: number;
  crmCreatedAt: string | null;
  crmUpdatedAt: string | null;
  items: OrderListItem[];
};

type OrderRow = {
  external_id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  status: string;
  order_type: string | null;
  order_method: string | null;
  utm_source: string | null;
  total_amount: number;
  crm_created_at: string | null;
  crm_updated_at: string | null;
};

type OrderItemRow = {
  order_external_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  line_index: number;
};

const mapOrder = (row: OrderRow, items: OrderListItem[]): OrderRecord => ({
  externalId: row.external_id,
  fullName: row.full_name,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  city: row.city,
  address: row.address,
  status: row.status,
  orderType: row.order_type,
  orderMethod: row.order_method,
  utmSource: row.utm_source,
  totalAmount: row.total_amount,
  crmCreatedAt: row.crm_created_at,
  crmUpdatedAt: row.crm_updated_at,
  items,
});

const mapItem = (row: OrderItemRow): OrderListItem => ({
  productName: row.product_name,
  quantity: row.quantity,
  unitPrice: row.unit_price,
  lineTotal: row.line_total,
});

const getItemsMap = async () => {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("order_external_id, product_name, quantity, unit_price, line_total, line_index")
    .order("line_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to load order items: ${error.message}`);
  }

  const itemsMap = new Map<string, OrderListItem[]>();

  for (const row of (data ?? []) as OrderItemRow[]) {
    const current = itemsMap.get(row.order_external_id) ?? [];
    current.push(mapItem(row));
    itemsMap.set(row.order_external_id, current);
  }

  return itemsMap;
};

export const getOrdersData = async (): Promise<OrderRecord[]> => {
  if (!hasSupabaseAdminEnv) {
    return [];
  }

  const supabase = createAdminSupabaseClient();
  const itemsMap = await getItemsMap();

  const { data, error } = await supabase
    .from("orders")
    .select(
      "external_id, full_name, first_name, last_name, email, phone, city, address, status, order_type, order_method, utm_source, total_amount, crm_created_at, crm_updated_at",
    )
    .order("crm_created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load orders: ${error.message}`);
  }

  return ((data ?? []) as OrderRow[]).map((row) => mapOrder(row, itemsMap.get(row.external_id) ?? []));
};

export const getOrderDetail = async (externalId: string): Promise<OrderRecord | null> => {
  if (!hasSupabaseAdminEnv) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "external_id, full_name, first_name, last_name, email, phone, city, address, status, order_type, order_method, utm_source, total_amount, crm_created_at, crm_updated_at",
    )
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load order detail: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("order_external_id, product_name, quantity, unit_price, line_total, line_index")
    .eq("order_external_id", externalId)
    .order("line_index", { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to load order detail items: ${itemsError.message}`);
  }

  return mapOrder(data as OrderRow, ((itemRows ?? []) as OrderItemRow[]).map(mapItem));
};

