import { HIGH_VALUE_ALERT_RULE, isHighValueOrder, type NormalizedOrder } from "@gbc/domain";
import {
  buildNewOrderTelegramMessage,
  createOrderItemsPayload,
  createOrderUpsertPayload,
  sendTelegramMessage,
} from "@gbc/integrations";

import { env, hasTelegramEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const ALERT_RULE_KEY = HIGH_VALUE_ALERT_RULE.key;
const DELETE_BATCH_SIZE = 500;

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

export const upsertOrderAndItems = async (order: NormalizedOrder) => {
  const supabase = createAdminSupabaseClient();

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
  if (order.status !== "new") {
    return { sent: false, reason: "not-new" as const };
  }

  if (!isHighValueOrder(order.totalAmount)) {
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

  await sendTelegramMessage({
    botToken: env.telegramBotToken,
    chatId: env.telegramChatId,
    text: message,
    buttonText: crmUrl ? "Open in RetailCRM" : undefined,
    buttonUrl: crmUrl,
  });

  const { error: insertError } = await supabase.from("telegram_notifications").insert({
    order_external_id: order.externalId,
    rule_key: ALERT_RULE_KEY,
    sent_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(`Failed to record Telegram notification: ${insertError.message}`);
  }

  return { sent: true, reason: "sent" as const };
};
