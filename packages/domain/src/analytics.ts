import { isHighValueOrder } from "./orders";

export type DashboardOrderRecord = {
  externalId: string;
  fullName: string;
  city: string | null;
  status: string;
  utmSource: string | null;
  totalAmount: number;
  crmCreatedAt: string | null;
};

export type DashboardStats = {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  highValueOrders: number;
};

export type DailyMetric = {
  date: string;
  orders: number;
  revenue: number;
};

export type BreakdownMetric = {
  label: string;
  value: number;
};

export type DashboardSnapshot = {
  stats: DashboardStats;
  daily: DailyMetric[];
  cities: BreakdownMetric[];
  sources: BreakdownMetric[];
  recentOrders: DashboardOrderRecord[];
};

const formatDateKey = (value: string | null) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().slice(0, 10);
};

const toBreakdown = (counts: Map<string, number>) =>
  Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

export const buildDashboardSnapshot = (orders: DashboardOrderRecord[]): DashboardSnapshot => {
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const highValueOrders = orders.filter((order) => isHighValueOrder(order.totalAmount)).length;
  const averageOrderValue = totalOrders === 0 ? 0 : Math.round(totalRevenue / totalOrders);

  const dailyMap = new Map<string, DailyMetric>();
  const cityMap = new Map<string, number>();
  const sourceMap = new Map<string, number>();

  for (const order of orders) {
    const dateKey = formatDateKey(order.crmCreatedAt);
    const dayEntry = dailyMap.get(dateKey) ?? { date: dateKey, orders: 0, revenue: 0 };
    dayEntry.orders += 1;
    dayEntry.revenue += order.totalAmount;
    dailyMap.set(dateKey, dayEntry);

    const cityKey = order.city ?? "Unknown";
    cityMap.set(cityKey, (cityMap.get(cityKey) ?? 0) + 1);

    const sourceKey = order.utmSource ?? "Unknown";
    sourceMap.set(sourceKey, (sourceMap.get(sourceKey) ?? 0) + 1);
  }

  const daily = Array.from(dailyMap.values()).sort((left, right) => left.date.localeCompare(right.date));

  const recentOrders = [...orders]
    .sort((left, right) => {
      const leftTime = left.crmCreatedAt ? Date.parse(left.crmCreatedAt) : 0;
      const rightTime = right.crmCreatedAt ? Date.parse(right.crmCreatedAt) : 0;
      return rightTime - leftTime;
    })
    .slice(0, 8);

  return {
    stats: {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      highValueOrders,
    },
    daily,
    cities: toBreakdown(cityMap),
    sources: toBreakdown(sourceMap),
    recentOrders,
  };
};
