import { HIGH_VALUE_ALERT_RULE, type NormalizedOrder } from "@gbc/domain";
import {
  buildNewOrderTelegramMessage,
  createOrderItemsPayload,
  createOrderUpsertPayload,
  sendTelegramMessage,
} from "@gbc/integrations";

import { env, hasTelegramEnv } from "@/lib/env";
import { getHighValueAlertSettings } from "@/lib/settings";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ALERT_RULE_KEY = HIGH_VALUE_ALERT_RULE.key;
const DELETE_BATCH_SIZE = 500;

type ExistingOrderRow = {
  raw_payload: unknown;
  status: string;
  total_amount: number;
  utm_source: string | null;
  city: string | null;
  address: string | null;
  full_name: string;
  crm_updated_at: string | null;
};

const buildRetailCrmOrderUrl = (order: NormalizedOrder) => {
  if (!env.retailCrmBaseUrl) {
    return null;
  }

  const baseUrl = /^https?:\/\//i.test(env.retailCrmBaseUrl)
    ? env.retailCrmBaseUrl
    : `https://${env.retailCrmBaseUrl}`;

  const rawPayload =
    order.rawPayload && typeof order.rawPayload === "object"
      ? (order.rawPayload as { id?: string | number })
      : null;
  const crmOrderId = rawPayload?.id;

  if (!crmOrderId) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, "")}/orders/${crmOrderId}/edit`;
};

const buildComparableOrderState = (order: NormalizedOrder) => ({
  fullName: order.fullName,
  city: order.city,
  address: order.address,
  status: order.status,
  utmSource: order.utmSource,
  totalAmount: order.totalAmount,
  crmUpdatedAt: order.crmUpdatedAt,
  items: order.items.map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  })),
});

const getChangedFields = (previous: ExistingOrderRow | null, next: NormalizedOrder) => {
  if (!previous) {
    return ["fullName", "city", "address", "status", "utmSource", "totalAmount", "crmUpdatedAt", "items"];
  }

  const previousState = {
    fullName: previous.full_name,
    city: previous.city,
    address: previous.address,
    status: previous.status,
    utmSource: previous.utm_source,
    totalAmount: previous.total_amount,
    crmUpdatedAt: previous.crm_updated_at,
    items: Array.isArray((previous.raw_payload as { items?: unknown[] } | null)?.items)
      ? (previous.raw_payload as { items: unknown[] }).items
      : [],
  };
  const nextState = buildComparableOrderState(next);

  return Object.entries(nextState)
    .filter(([key, value]) => JSON.stringify((previousState as Record<string, unknown>)[key]) !== JSON.stringify(value))
    .map(([key]) => key);
};

const insertOrderSyncEvent = async (input: {
  orderExternalId: string;
  eventType: "created" | "updated" | "telegram_sent";
  eventSource: string;
  payloadBefore?: unknown;
  payloadAfter?: unknown;
  changedFields?: string[];
}) => {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("order_sync_events").insert({
    order_external_id: input.orderExternalId,
    event_type: input.eventType,
    event_source: input.eventSource,
    payload_before: input.payloadBefore ?? null,
    payload_after: input.payloadAfter ?? null,
    changed_fields: input.changedFields ?? [],
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to insert order sync event: ${error.message}`);
  }
};

export const upsertOrderAndItems = async (order: NormalizedOrder, eventSource = "sync") => {
  const supabase = createAdminSupabaseClient();
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("raw_payload, status, total_amount, utm_source, city, address, full_name, crm_updated_at")
    .eq("external_id", order.externalId)
    .maybeSingle();

  if (existingOrderError) {
    throw new Error(`Failed to load existing order snapshot: ${existingOrderError.message}`);
  }

  const { error: orderError } = await supabase
    .from("orders")
    .upsert(createOrderUpsertPayload(order), { onConflict: "external_id" });

  if (orderError) {
    throw new Error(`Failed to upsert order: ${orderError.message}`);
  }

  const { error: deleteItemsError } = await supabase
    .from("order_items")
    .delete()
    .eq("order_external_id", order.externalId);

  if (deleteItemsError) {
    throw new Error(`Failed to clear previous order items: ${deleteItemsError.message}`);
  }

  const itemsPayload = createOrderItemsPayload(order);
  if (itemsPayload.length > 0) {
    const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
    if (itemsError) {
      throw new Error(`Failed to insert order items: ${itemsError.message}`);
    }
  }

  const changedFields = getChangedFields((existingOrder as ExistingOrderRow | null) ?? null, order);
  if (!existingOrder) {
    await insertOrderSyncEvent({
      orderExternalId: order.externalId,
      eventType: "created",
      eventSource,
      payloadAfter: order.rawPayload,
      changedFields,
    });
  } else if (changedFields.length > 0) {
    await insertOrderSyncEvent({
      orderExternalId: order.externalId,
      eventType: "updated",
      eventSource,
      payloadBefore: existingOrder.raw_payload,
      payloadAfter: order.rawPayload,
      changedFields,
    });
  }
};

export const deleteOrdersMissingFromSnapshot = async (orders: NormalizedOrder[]) => {
  const supabase = createAdminSupabaseClient();
  const currentExternalIds = new Set(orders.map((order) => order.externalId));

  const { data, error } = await supabase.from("orders").select("external_id");

  if (error) {
    throw new Error(`Failed to load existing orders for reconciliation: ${error.message}`);
  }

  const staleExternalIds = (data ?? [])
    .map((row) => row.external_id)
    .filter((externalId): externalId is string => !currentExternalIds.has(externalId));

  for (let index = 0; index < staleExternalIds.length; index += DELETE_BATCH_SIZE) {
    const batch = staleExternalIds.slice(index, index + DELETE_BATCH_SIZE);
    const { error: deleteError } = await supabase.from("orders").delete().in("external_id", batch);

    if (deleteError) {
      throw new Error(`Failed to delete stale orders: ${deleteError.message}`);
    }
  }

  return staleExternalIds.length;
};

export const maybeSendNewOrderAlert = async (order: NormalizedOrder) => {
  const settings = await getHighValueAlertSettings();

  if (!settings.isEnabled) {
    return { sent: false, reason: "rule-disabled" as const };
  }

  if (order.status !== "new") {
    return { sent: false, reason: "not-new" as const };
  }

  if (order.totalAmount < settings.thresholdAmount) {
    return { sent: false, reason: "below-threshold" as const };
  }

  if (!hasTelegramEnv || !env.telegramBotToken || !env.telegramChatId) {
    return { sent: false, reason: "telegram-not-configured" as const };
  }

  const supabase = createAdminSupabaseClient();
  const { data: existingNotification, error: fetchError } = await supabase
    .from("telegram_notifications")
    .select("id")
    .eq("order_external_id", order.externalId)
    .eq("rule_key", ALERT_RULE_KEY)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to check existing Telegram notifications: ${fetchError.message}`);
  }

  if (existingNotification) {
    return { sent: false, reason: "already-sent" as const };
  }

  if (settings.recipients.length === 0) {
    return { sent: false, reason: "telegram-not-configured" as const };
  }

  const message = buildNewOrderTelegramMessage({
    orderId: order.externalId,
    customerName: order.fullName || "Unknown customer",
    city: order.city,
    amount: order.totalAmount,
    source: order.utmSource,
    status: order.status,
    items: order.items,
  });
  const crmUrl = buildRetailCrmOrderUrl(order);

  for (const recipient of settings.recipients) {
    await sendTelegramMessage({
      botToken: env.telegramBotToken,
      chatId: recipient.chatId,
      text: message,
      buttonText: crmUrl ? "Open in RetailCRM" : undefined,
      buttonUrl: crmUrl,
    });
  }

  const { error: insertError } = await supabase.from("telegram_notifications").insert({
    order_external_id: order.externalId,
    rule_key: ALERT_RULE_KEY,
    sent_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(`Failed to record Telegram notification: ${insertError.message}`);
  }

  await insertOrderSyncEvent({
    orderExternalId: order.externalId,
    eventType: "telegram_sent",
    eventSource: "telegram",
    payloadAfter: {
      ruleKey: ALERT_RULE_KEY,
      recipients: settings.recipients.map((recipient) => recipient.chatId),
      thresholdAmount: settings.thresholdAmount,
    },
    changedFields: ["telegram_notification"],
  });

  return { sent: true, reason: "sent" as const };
};
