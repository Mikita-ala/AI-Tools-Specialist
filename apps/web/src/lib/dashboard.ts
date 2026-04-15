import { buildDashboardSnapshot, type DashboardOrderRecord, type DashboardSnapshot } from "@gbc/domain";

import { hasSupabaseAdminEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type OrderRow = {
  external_id: string;
  full_name: string;
  city: string | null;
  status: string;
  utm_source: string | null;
  total_amount: number;
  crm_created_at: string | null;
};

export type DashboardDataState =
  | { kind: "missing-env"; snapshot: DashboardSnapshot; orders: DashboardOrderRecord[] }
  | { kind: "empty"; snapshot: DashboardSnapshot; orders: DashboardOrderRecord[] }
  | { kind: "ready"; snapshot: DashboardSnapshot; orders: DashboardOrderRecord[] };

const emptySnapshot = buildDashboardSnapshot([]);

const mapRow = (row: OrderRow): DashboardOrderRecord => ({
  externalId: row.external_id,
  fullName: row.full_name,
  city: row.city,
  status: row.status,
  utmSource: row.utm_source,
  totalAmount: row.total_amount,
  crmCreatedAt: row.crm_created_at,
});

export const getDashboardData = async (): Promise<DashboardDataState> => {
  if (!hasSupabaseAdminEnv) {
    return { kind: "missing-env", snapshot: emptySnapshot, orders: [] };
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("external_id, full_name, city, status, utm_source, total_amount, crm_created_at")
    .order("crm_created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load dashboard orders: ${error.message}`);
  }

  const orders = (data ?? []).map(mapRow);
  const snapshot = buildDashboardSnapshot(orders);

  if (orders.length === 0) {
    return { kind: "empty", snapshot, orders };
  }

  return { kind: "ready", snapshot, orders };
};
