import { loadEnvConfig } from "@next/env";
import { createRetailCrmClient } from "@gbc/integrations";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());

const baseUrl = process.env.RETAILCRM_BASE_URL;
const apiKey = process.env.RETAILCRM_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

const countBy = (values: Array<string | null | undefined>) => {
  const counts = new Map<string, number>();

  for (const rawValue of values) {
    const value = rawValue && rawValue.trim().length > 0 ? rawValue.trim() : "(empty)";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0], "ru")));
};

const printSection = (title: string, payload: object) => {
  console.log(`\n${title}`);
  console.log(JSON.stringify(payload, null, 2));
};

const inspectRetailCrm = async () => {
  if (!baseUrl || !apiKey) {
    throw new Error("RETAILCRM_BASE_URL and RETAILCRM_API_KEY are required");
  }

  const client = createRetailCrmClient({ baseUrl, apiKey });
  const orders = await client.fetchOrders();

  printSection("RetailCRM summary", {
    totalOrders: orders.length,
    statuses: countBy(orders.map((order) => order.status)),
    orderTypes: countBy(orders.map((order) => order.orderType)),
    orderMethods: countBy(orders.map((order) => order.orderMethod)),
    sources: countBy(orders.map((order) => order.utmSource)),
  });
};

const inspectSupabase = async () => {
  if (!supabaseUrl || !supabaseSecretKey) {
    console.log("\nSupabase summary");
    console.log("Skipped: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is not configured.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("orders")
    .select("status, order_type, order_method, utm_source");

  if (error) {
    throw new Error(`Failed to inspect Supabase orders: ${error.message}`);
  }

  const rows = data ?? [];

  printSection("Supabase summary", {
    totalOrders: rows.length,
    statuses: countBy(rows.map((row) => row.status)),
    orderTypes: countBy(rows.map((row) => row.order_type)),
    orderMethods: countBy(rows.map((row) => row.order_method)),
    sources: countBy(rows.map((row) => row.utm_source)),
  });
};

const main = async () => {
  await inspectRetailCrm();
  await inspectSupabase();
};

void main();
