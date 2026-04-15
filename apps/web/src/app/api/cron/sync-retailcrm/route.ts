import { createRetailCrmClient } from "@gbc/integrations";
import { NextResponse } from "next/server";

import { env, hasSupabaseAdminEnv } from "@/lib/env";
import { deleteOrdersMissingFromSnapshot, maybeSendNewOrderAlert, upsertOrderAndItems } from "@/lib/orders";

const getProvidedSecret = (request: Request) => {
  const url = new URL(request.url);

  return (
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret")
  );
};

const isAuthorized = (request: Request) => {
  if (!env.cronSecret) {
    return false;
  }

  return getProvidedSecret(request) === env.cronSecret;
};

const runSync = async () => {
  if (!hasSupabaseAdminEnv) {
    throw new Error("Supabase admin environment variables are not configured");
  }

  if (!env.retailCrmBaseUrl || !env.retailCrmApiKey) {
    throw new Error("RetailCRM environment variables are not configured");
  }

  const client = createRetailCrmClient({
    baseUrl: env.retailCrmBaseUrl,
    apiKey: env.retailCrmApiKey,
  });

  const orders = await client.fetchOrders();

  for (const order of orders) {
    await upsertOrderAndItems(order);
    await maybeSendNewOrderAlert(order);
  }

  const deletedOrders = await deleteOrdersMissingFromSnapshot(orders);

  return {
    syncedOrders: orders.length,
    deletedOrders,
  };
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized cron secret" }, { status: 401 });
  }

  try {
    const result = await runSync();

    return NextResponse.json({
      ok: true,
      ...result,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron sync error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
