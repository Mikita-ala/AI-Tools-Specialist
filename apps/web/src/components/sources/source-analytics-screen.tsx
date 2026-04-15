"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { RotateCcw } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { DateRangePicker } from "@/components/shared/date-range-picker";
import { AdminLayout } from "@/components/dashboard/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isValueWithinDateRange } from "@/lib/date-range";
import type { OrderRecord } from "@/lib/orders-data";
import { translateSource } from "@/lib/retailcrm-labels";
import { buildSourceMetrics } from "@/lib/source-analytics";

const money = new Intl.NumberFormat("ru-RU");
const chartRanges = {
  "90d": 90,
  "30d": 30,
  "7d": 7,
} as const;
const sourceChartPalette = [
  "#2563eb",
  "#f97316",
  "#16a34a",
  "#db2777",
  "#7c3aed",
  "#0891b2",
  "#ca8a04",
  "#dc2626",
];

export function SourceAnalyticsScreen({ orders }: { orders: OrderRecord[] }) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [chartRange, setChartRange] = useState<keyof typeof chartRanges>("30d");

  const filteredOrders = useMemo(
    () => orders.filter((order) => isValueWithinDateRange(order.crmCreatedAt, dateRange)),
    [dateRange, orders],
  );
  const metrics = useMemo(() => buildSourceMetrics(filteredOrders), [filteredOrders]);
  const sourceChartData = useMemo(() => {
    const grouped = new Map<string, { date: string; totalRevenue: number } & Record<string, number | string>>();
    const sourceKeys = metrics.map((metric) => metric.source);

    for (const order of filteredOrders) {
      const date = order.crmCreatedAt ? new Date(order.crmCreatedAt).toISOString().slice(0, 10) : "Unknown";
      const source = order.utmSource ?? "unknown";
      const current = grouped.get(date) ?? { date, totalRevenue: 0 };

      current.totalRevenue = Number(current.totalRevenue ?? 0) + order.totalAmount;
      current[source] = Number(current[source] ?? 0) + order.totalAmount;

      grouped.set(date, current);
    }

    const allRows = Array.from(grouped.values())
      .map((row) => {
        const normalizedRow = { ...row } as { date: string; totalRevenue: number } & Record<string, number | string>;
        normalizedRow.totalRevenue = Number(normalizedRow.totalRevenue ?? 0);

        for (const sourceKey of sourceKeys) {
          normalizedRow[sourceKey] = Number(normalizedRow[sourceKey] ?? 0);
        }

        return normalizedRow;
      })
      .sort((left, right) => left.date.localeCompare(right.date));
    if (allRows.length === 0) {
      return allRows;
    }

    const referenceDate = new Date(`${allRows[allRows.length - 1].date}T00:00:00`);
    const startDate = new Date(referenceDate);
    startDate.setDate(referenceDate.getDate() - chartRanges[chartRange]);

    return allRows.filter((item) => new Date(`${item.date}T00:00:00`) >= startDate);
  }, [chartRange, filteredOrders, metrics]);
  const chartConfig = useMemo(
    () =>
      metrics.reduce<Record<string, { label: string; color: string }>>((accumulator, metric, index) => {
        accumulator[metric.source] = {
          label: translateSource(metric.source),
          color: sourceChartPalette[index % sourceChartPalette.length],
        };
        return accumulator;
      }, {}),
    [metrics],
  );

  return (
    <AdminLayout
      section="sources"
      title="Источники"
      description="Доля заказов и выручки по каналам, без псевдо-конверсии."
      totalOrders={orders.length}
      actions={
        <>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button variant="outline" size="sm" onClick={() => setDateRange(undefined)} className="w-9 px-0 min-[1060px]:w-auto min-[1060px]:px-3">
            <RotateCcw />
            <span className="hidden min-[1060px]:inline">Сбросить</span>
          </Button>
        </>
      }
    >
      <div className="grid gap-6 px-4 pb-6 lg:px-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <KpiCard label="Источников" value={String(metrics.length)} />
          <KpiCard label="Заказов в срезе" value={String(filteredOrders.length)} />
          <KpiCard
            label="Выручка в срезе"
            value={`${money.format(filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0))} ₸`}
          />
          <KpiCard
            label="Крупные заказы"
            value={String(filteredOrders.filter((order) => order.totalAmount > 50_000).length)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Аналитика по источникам</CardTitle>
            <CardDescription>Показаны все каналы без режима фокуса и детализации по выбранной строке.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Источник</TableHead>
                  <TableHead className="text-right">Заказы</TableHead>
                  <TableHead className="text-right">Доля заказов</TableHead>
                  <TableHead className="text-right">Выручка</TableHead>
                  <TableHead className="text-right">Доля выручки</TableHead>
                  <TableHead className="text-right">Средний чек</TableHead>
                  <TableHead className="text-right">Крупные</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Нет данных по выбранному диапазону.
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.map((metric) => (
                    <TableRow key={metric.source}>
                      <TableCell className="font-medium">{translateSource(metric.source)}</TableCell>
                      <TableCell className="text-right">{metric.ordersCount}</TableCell>
                      <TableCell className="text-right">{(metric.ordersShare * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{money.format(metric.revenue)} ₸</TableCell>
                      <TableCell className="text-right">{(metric.revenueShare * 100).toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{money.format(metric.averageCheck)} ₸</TableCell>
                      <TableCell className="text-right">{metric.highValueOrders}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
              <div className="grid flex-1 gap-1">
                <CardTitle>Выручка по всем источникам</CardTitle>
                <CardDescription>На графике показаны все каналы за выбранный период.</CardDescription>
              </div>
              <Select value={chartRange} onValueChange={(value) => setChartRange(value as keyof typeof chartRanges)}>
                <SelectTrigger
                  className="hidden w-[140px] rounded-lg sm:ml-auto sm:flex"
                  aria-label="Выберите период графика"
                >
                  <SelectValue placeholder="Период" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="90d" className="rounded-lg">
                    90 дней
                  </SelectItem>
                  <SelectItem value="30d" className="rounded-lg">
                    30 дней
                  </SelectItem>
                  <SelectItem value="7d" className="rounded-lg">
                    7 дней
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="grid gap-6">
              {sourceChartData.length === 0 ? (
                <div className="rounded-xl border border-dashed px-4 py-10 text-sm text-muted-foreground">
                  Нет данных для построения графика по выбранному диапазону.
                </div>
              ) : (
                <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
                  <AreaChart data={sourceChartData}>
                    <defs>
                      {metrics.map((metric) => (
                        <linearGradient key={metric.source} id={`fill-${metric.source}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={`var(--color-${metric.source})`} stopOpacity={0.28} />
                          <stop offset="95%" stopColor={`var(--color-${metric.source})`} stopOpacity={0.04} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      tickFormatter={(value) =>
                        new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                    />
                    <ChartTooltip cursor={false} content={<SourcesChartTooltip />} />
                    {metrics.map((metric) => (
                      <Area
                        key={metric.source}
                        dataKey={metric.source}
                        name={translateSource(metric.source)}
                        type="natural"
                        fill={`url(#fill-${metric.source})`}
                        stroke={`var(--color-${metric.source})`}
                        strokeWidth={1.75}
                        fillOpacity={1}
                        strokeOpacity={0.95}
                      />
                    ))}
                    <ChartLegend content={<ChartLegendContent />} />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

function SourcesChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; dataKey?: string | number; name?: string | number; value?: number | string | Array<number | string> }>;
  label?: string | number;
}) {
  if (!active || !payload?.length || typeof label !== "string") {
    return null;
  }

  const items = payload
    .map((item) => {
      const rawValue = Array.isArray(item.value) ? item.value[0] : item.value;
      const numericValue = Number(rawValue ?? 0);
      const rawKey = String(item.dataKey ?? item.name ?? "");
      const itemLabel =
        rawKey === "totalRevenue"
          ? "Все источники"
          : translateSource(rawKey);

      return {
        key: rawKey,
        label: itemLabel,
        color: item.color ?? "currentColor",
        value: numericValue,
      };
    })
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid min-w-44 gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">
        {new Date(`${label}T00:00:00`).toLocaleDateString("ru-RU", {
          month: "long",
          day: "numeric",
        })}
      </div>
      <div className="grid gap-1.5">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: item.color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
            <span className="font-mono font-medium tabular-nums text-foreground">
              {money.format(item.value)} ₸
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
