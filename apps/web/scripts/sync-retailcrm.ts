import { loadEnvConfig } from "@next/env";
import { createRetailCrmClient } from "@gbc/integrations";

loadEnvConfig(process.cwd());

const baseUrl = process.env.RETAILCRM_BASE_URL;
const apiKey = process.env.RETAILCRM_API_KEY;

const main = async () => {
  if (!baseUrl || !apiKey) {
    throw new Error("RETAILCRM_BASE_URL and RETAILCRM_API_KEY are required");
  }

  const { deleteOrdersMissingFromSnapshot, maybeSendNewOrderAlert, upsertOrderAndItems } =
    await import("../src/lib/orders");
  const client = createRetailCrmClient({ baseUrl, apiKey });
  const orders = await client.fetchOrders();

  for (const order of orders) {
    await upsertOrderAndItems(order, "manual");
    await maybeSendNewOrderAlert(order);
  }

  const deletedOrders = await deleteOrdersMissingFromSnapshot(orders);

  console.log(`Synced ${orders.length} orders from RetailCRM. Deleted ${deletedOrders} stale orders.`);
};

void main();
