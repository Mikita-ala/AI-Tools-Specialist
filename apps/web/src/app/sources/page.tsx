import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const dashboardData = await getDashboardData();

  return (
    <DashboardShell
      orders={dashboardData.orders}
      state={dashboardData.kind}
      section="sources"
    />
  );
}
