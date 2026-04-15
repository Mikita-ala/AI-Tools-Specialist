import { extractRetailCrmOrderFromWebhook, verifyRetailCrmWebhook } from "@gbc/integrations";
import { NextResponse } from "next/server";

import { env, hasSupabaseAdminEnv } from "@/lib/env";
import { maybeSendNewOrderAlert, upsertOrderAndItems } from "@/lib/orders";

const getProvidedSecret = (request: Request, payload: Record<string, unknown>) => {
  const url = new URL(request.url);

  return (
    request.headers.get("x-retailcrm-secret") ??
    request.headers.get("x-webhook-secret") ??
    url.searchParams.get("secret") ??
    (typeof payload.secret === "string" ? payload.secret : null)
  );
};

export async function POST(request: Request) {
  if (!hasSupabaseAdminEnv) {
    return NextResponse.json(
      { ok: false, error: "Supabase admin environment variables are not configured" },
      { status: 500 },
    );
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const providedSecret = getProvidedSecret(request, payload);

  if (!verifyRetailCrmWebhook(env.retailCrmWebhookSecret, providedSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized webhook secret" }, { status: 401 });
  }

  try {
    const order = extractRetailCrmOrderFromWebhook(payload);
    await upsertOrderAndItems(order, "webhook");
    const telegram = await maybeSendNewOrderAlert(order);

    return NextResponse.json({
      ok: true,
      orderId: order.externalId,
      alert: telegram.reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
