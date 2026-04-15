import { env, hasSupabaseAdminEnv } from "@/lib/env";
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
  rawPayload?: unknown;
  syncedAt?: string | null;
  items: OrderListItem[];
};

export type OrderTimelineEvent = {
  id: string;
  timestamp: string;
  label: string;
  description: string;
  tone: "default" | "success" | "warning" | "danger" | "info";
  changedFields: string[];
};

export type TelegramNotificationStatus = {
  sent: boolean;
  sentAt: string | null;
  ruleKey: string | null;
};

export type OrderDetailRecord = OrderRecord & {
  customerOrderHistory: OrderRecord[];
  timeline: OrderTimelineEvent[];
  telegramNotificationStatus: TelegramNotificationStatus;
  crmOrderUrl: string | null;
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
  raw_payload?: unknown;
  synced_at?: string | null;
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
  rawPayload: row.raw_payload,
  syncedAt: row.synced_at ?? null,
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
      "external_id, full_name, first_name, last_name, email, phone, city, address, status, order_type, order_method, utm_source, total_amount, crm_created_at, crm_updated_at, raw_payload, synced_at",
    )
    .order("crm_created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load orders: ${error.message}`);
  }

  return ((data ?? []) as OrderRow[]).map((row) => mapOrder(row, itemsMap.get(row.external_id) ?? []));
};

type SyncEventRow = {
  id: number;
  event_type: string;
  event_source: string;
  changed_fields: string[] | null;
  created_at: string;
};

type NotificationRow = {
  rule_key: string;
  sent_at: string;
};

const buildTimeline = (
  order: OrderRecord,
  events: SyncEventRow[],
  notification: TelegramNotificationStatus,
): OrderTimelineEvent[] => {
  const fallbackEvents: OrderTimelineEvent[] = [
    ...(order.crmCreatedAt
      ? [
          {
            id: `${order.externalId}-created-fallback`,
            timestamp: order.crmCreatedAt,
            label: "Заказ создан",
            description: "Базовое событие из данных CRM.",
            tone: "success" as const,
            changedFields: [],
          },
        ]
      : []),
    ...(order.crmUpdatedAt && order.crmUpdatedAt !== order.crmCreatedAt
      ? [
          {
            id: `${order.externalId}-updated-fallback`,
            timestamp: order.crmUpdatedAt,
            label: "Заказ обновлён",
            description: "Последнее обновление из данных CRM.",
            tone: "info" as const,
            changedFields: [],
          },
        ]
      : []),
    ...(notification.sent && notification.sentAt
      ? [
          {
            id: `${order.externalId}-telegram-fallback`,
            timestamp: notification.sentAt,
            label: "Уведомление отправлено",
            description: `Telegram rule: ${notification.ruleKey ?? "unknown"}.`,
            tone: "success" as const,
            changedFields: [],
          },
        ]
      : []),
  ];

  const mappedEvents = events.map((event) => {
    const tone =
      event.event_type === "created"
        ? "success"
        : event.event_type === "telegram_sent"
          ? "success"
          : "info";

    const label =
      event.event_type === "created"
        ? "Синк нового заказа"
        : event.event_type === "updated"
          ? "Заказ обновлён"
          : "Уведомление отправлено";

    return {
      id: `event-${event.id}`,
      timestamp: event.created_at,
      label,
      description: `Источник: ${event.event_source}.`,
      tone: tone as OrderTimelineEvent["tone"],
      changedFields: event.changed_fields ?? [],
    };
  });

  return [...fallbackEvents, ...mappedEvents].sort((left, right) => {
    const leftTime = Date.parse(left.timestamp);
    const rightTime = Date.parse(right.timestamp);
    return rightTime - leftTime;
  });
};

const getCustomerOrderHistory = async (order: OrderRecord) => {
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("orders")
    .select(
      "external_id, full_name, first_name, last_name, email, phone, city, address, status, order_type, order_method, utm_source, total_amount, crm_created_at, crm_updated_at, raw_payload, synced_at",
    )
    .neq("external_id", order.externalId)
    .order("crm_created_at", { ascending: false });

  if (order.email) {
    query = query.eq("email", order.email);
  } else if (order.phone) {
    query = query.eq("phone", order.phone);
  } else {
    query = query.eq("full_name", order.fullName);
  }

  const { data, error } = await query.limit(10);

  if (error) {
    throw new Error(`Failed to load customer order history: ${error.message}`);
  }

  const rows = (data ?? []) as OrderRow[];
  if (rows.length === 0) {
    return [];
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("order_external_id, product_name, quantity, unit_price, line_total, line_index")
    .in(
      "order_external_id",
      rows.map((row) => row.external_id),
    )
    .order("line_index", { ascending: true });

  if (itemsError) {
    throw new Error(`Failed to load customer order history items: ${itemsError.message}`);
  }

  const itemsMap = new Map<string, OrderListItem[]>();
  for (const row of (itemRows ?? []) as OrderItemRow[]) {
    const current = itemsMap.get(row.order_external_id) ?? [];
    current.push(mapItem(row));
    itemsMap.set(row.order_external_id, current);
  }

  return rows.map((row) => mapOrder(row, itemsMap.get(row.external_id) ?? []));
};

const buildRetailCrmOrderUrl = (rawPayload: unknown) => {
  if (!env.retailCrmBaseUrl || !rawPayload || typeof rawPayload !== "object") {
    return null;
  }

  const baseUrl = /^https?:\/\//i.test(env.retailCrmBaseUrl)
    ? env.retailCrmBaseUrl
    : `https://${env.retailCrmBaseUrl}`;
  const crmOrderId = (rawPayload as { id?: string | number }).id;

  if (!crmOrderId) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}/orders/${crmOrderId}/edit`;
};

export const getOrderDetail = async (externalId: string): Promise<OrderDetailRecord | null> => {
  if (!hasSupabaseAdminEnv) {
    return null;
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "external_id, full_name, first_name, last_name, email, phone, city, address, status, order_type, order_method, utm_source, total_amount, crm_created_at, crm_updated_at, raw_payload, synced_at",
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

  const order = mapOrder(data as OrderRow, ((itemRows ?? []) as OrderItemRow[]).map(mapItem));
  const [history, syncEventsResult, notificationResult] = await Promise.all([
    getCustomerOrderHistory(order),
    supabase
      .from("order_sync_events")
      .select("id, event_type, event_source, changed_fields, created_at")
      .eq("order_external_id", externalId)
      .order("created_at", { ascending: false }),
    supabase
      .from("telegram_notifications")
      .select("rule_key, sent_at")
      .eq("order_external_id", externalId)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (syncEventsResult.error) {
    throw new Error(`Failed to load order sync events: ${syncEventsResult.error.message}`);
  }

  if (notificationResult.error) {
    throw new Error(`Failed to load Telegram notification status: ${notificationResult.error.message}`);
  }

  const notification = notificationResult.data
    ? {
        sent: true,
        sentAt: (notificationResult.data as NotificationRow).sent_at,
        ruleKey: (notificationResult.data as NotificationRow).rule_key,
      }
    : {
        sent: false,
        sentAt: null,
        ruleKey: null,
      };

  return {
    ...order,
    customerOrderHistory: history,
    timeline: buildTimeline(order, (syncEventsResult.data ?? []) as SyncEventRow[], notification),
    telegramNotificationStatus: notification,
    crmOrderUrl: buildRetailCrmOrderUrl(order.rawPayload),
  };
};
