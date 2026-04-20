"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildDashboardSnapshot, type DashboardOrderRecord, type DashboardSnapshot } from "@gbc/domain";
import type { DateRange } from "react-day-picker";
import {
  BellRing,
  LayoutDashboard,
  MapPinned,
  Package,
  ReceiptText,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { DateRangePicker } from "@/components/shared/date-range-picker";
import { createDateRangeFromValues, formatDateRangeLabel, isValueWithinDateRange } from "@/lib/date-range";
import { translateSource, translateStatus } from "@/lib/retailcrm-labels";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = new Intl.NumberFormat("ru-RU");

const chartConfig = {
  orders: { label: "Заказы", color: "var(--color-primary)" },
  revenue: { label: "Выручка", color: "var(--color-secondary-foreground)" },
};

type DashboardShellProps = {
  orders: DashboardOrderRecord[];
  state: "missing-env" | "empty" | "ready";
  section: "overview" | "orders" | "products" | "sources" | "geography" | "settings";
};

const sectionMeta = {
  overview: {
    title: "Обзор",
    description: "Общая картина по заказам, источникам и географии.",
    breadcrumb: "Обзор",
  },
  orders: {
    title: "Заказы",
    description: "Количество заказов, выручка и последние покупки.",
    breadcrumb: "Заказы",
  },
  products: {
    title: "Товары",
    description: "Сводка по товарным продажам и выручке.",
    breadcrumb: "Товары",
  },
  sources: {
    title: "Источники",
    description: "Какие каналы приводят больше заказов.",
    breadcrumb: "Источники",
  },
  geography: {
    title: "География",
    description: "Города, в которых спрос выше всего.",
    breadcrumb: "География",
  },
  settings: {
    title: "Настройки",
    description: "Порог уведомлений, получатели и правила.",
    breadcrumb: "Настройки",
  },
} as const;

const formatOverviewChartTooltipValue = (value: number | string | Array<number | string>, key: string) => {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (key === "revenue") {
    return `${money.format(Number(normalizedValue))} ₸`;
  }

  if (key === "orders") {
    return `${normalizedValue} заказов`;
  }

  return String(normalizedValue);
};

const getDateKey = (value: string | null) => {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
};

const formatSignedPercent = (value: number) => {
  const absolute = Math.abs(value);
  const fractionDigits = absolute >= 100 || Number.isInteger(absolute) ? 0 : 1;
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";

  return `${prefix}${absolute.toFixed(fractionDigits)}%`;
};

const formatSignedCount = (value: number) => {
  if (value > 0) return `+${value}`;
  if (value < 0) return String(value);
  return "0";
};

const getPercentDelta = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) return 0;
    return 100;
  }

  return ((current - previous) / previous) * 100;
};

const getBadgeVariant = (delta: number): "success" | "destructive" | "outline" => {
  if (delta > 0) return "success";
  if (delta < 0) return "destructive";
  return "outline";
};

const KpiCards = ({
  snapshot,
  orders,
}: {
  snapshot: DashboardSnapshot;
  orders: DashboardOrderRecord[];
}) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const ordersByDay = orders.reduce<Map<string, DashboardOrderRecord[]>>((accumulator, order) => {
    const dateKey = getDateKey(order.crmCreatedAt);

    if (!dateKey) {
      return accumulator;
    }

    const bucket = accumulator.get(dateKey) ?? [];
    bucket.push(order);
    accumulator.set(dateKey, bucket);

    return accumulator;
  }, new Map());
  const sortedDays = Array.from(ordersByDay.keys()).sort((left, right) => left.localeCompare(right));
  const previousDayKey = [...sortedDays].reverse().find((key) => key < todayKey);
  const previousDayOrders = previousDayKey ? ordersByDay.get(previousDayKey) ?? [] : [];
  const previousDayRevenue = previousDayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const previousDayAverageOrderValue =
    previousDayOrders.length === 0 ? 0 : Math.round(previousDayRevenue / previousDayOrders.length);
  const previousDayHighValueOrders = previousDayOrders.filter((order) => order.totalAmount > 50_000).length;

  const cards = [
    {
      label: "Выручка",
      total: `${money.format(snapshot.stats.totalRevenue)} ₸`,
      today: `${money.format(snapshot.stats.todayRevenue)} ₸`,
      trend: formatSignedPercent(getPercentDelta(snapshot.stats.todayRevenue, previousDayRevenue)),
      trendVariant: getBadgeVariant(snapshot.stats.todayRevenue - previousDayRevenue),
    },
    {
      label: "Заказы",
      total: String(snapshot.stats.totalOrders),
      today: String(snapshot.stats.todayOrders),
      trend: formatSignedCount(snapshot.stats.todayOrders - previousDayOrders.length),
      trendVariant: getBadgeVariant(snapshot.stats.todayOrders - previousDayOrders.length),
    },
    {
      label: "Средний чек",
      total: `${money.format(snapshot.stats.averageOrderValue)} ₸`,
      today: `${money.format(snapshot.stats.todayAverageOrderValue)} ₸`,
      trend: formatSignedPercent(
        getPercentDelta(snapshot.stats.todayAverageOrderValue, previousDayAverageOrderValue),
      ),
      trendVariant: getBadgeVariant(
        snapshot.stats.todayAverageOrderValue - previousDayAverageOrderValue,
      ),
    },
    {
      label: "Крупные заказы",
      total: String(snapshot.stats.highValueOrders),
      today: String(snapshot.stats.todayHighValueOrders),
      trend: formatSignedCount(snapshot.stats.todayHighValueOrders - previousDayHighValueOrders),
      trendVariant: getBadgeVariant(
        snapshot.stats.todayHighValueOrders - previousDayHighValueOrders,
      ),
    },
  ];

  const getCardValueClassName = (label: string) =>
    label === "Выручка" || label === "Средний чек"
      ? "text-[clamp(2rem,8vw,2.25rem)] sm:text-3xl"
      : "text-[clamp(2rem,8vw,2.25rem)] sm:text-3xl";

  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 xl:grid-cols-4 lg:px-6">
      {cards.map((item) => (
        <Card key={item.label} className="gap-0 shadow-none">
          <CardHeader className="gap-3">
            <CardAction>
              <Badge variant={item.trendVariant}>{item.trend}</Badge>
            </CardAction>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle
              className={`whitespace-nowrap leading-none font-semibold tracking-tight tabular-nums ${getCardValueClassName(item.label)}`}
            >
              {item.total}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Сегодня
              </span>
              <span className="text-sm font-medium tabular-nums">{item.today}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const AppSidebar = ({
  snapshot,
  section,
}: {
  snapshot: DashboardSnapshot;
  section: DashboardShellProps["section"];
}) => (
  <Sidebar variant="inset">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg">
            <LayoutDashboard />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">GBC Аналитика</span>
              <span className="truncate text-xs text-muted-foreground">RetailCRM x Supabase</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Разделы</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={section === "overview"}
                tooltip="Общий дашборд"
                render={<Link href="/" />}
              >
                <LayoutDashboard />
                <span>Обзор</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={section === "orders"}
                tooltip="Последние заказы"
                render={<Link href="/orders" />}
              >
                <ReceiptText />
                <span>Заказы</span>
              </SidebarMenuButton>
              <SidebarMenuBadge>{snapshot.stats.totalOrders}</SidebarMenuBadge>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={section === "products"}
                tooltip="Товарная аналитика"
                render={<Link href="/products" />}
              >
                <Package />
                <span>Товары</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={section === "sources"}
                tooltip="Источники"
                render={<Link href="/sources" />}
              >
                <BellRing />
                <span>Источники</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={section === "geography"}
                tooltip="География"
                render={<Link href="/geography" />}
              >
                <MapPinned />
                <span>География</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={section === "settings"}
                tooltip="Настройки"
                render={<Link href="/settings" />}
              >
                <Settings2 />
                <span>Настройки</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
);

const SiteHeader = ({
  section,
  dateRange,
  onDateRangeChange,
  disabled,
}: {
  section: DashboardShellProps["section"];
  dateRange: DateRange | undefined;
  onDateRangeChange: (value: DateRange | undefined) => void;
  disabled: boolean;
}) => (
  <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur lg:px-6">
    <SidebarTrigger className="-ml-1" />
    <Separator orientation="vertical" className="mx-2 h-4 data-vertical:self-auto" />
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbPage>{sectionMeta[section].breadcrumb}</BreadcrumbPage>
      </BreadcrumbList>
    </Breadcrumb>
    <div className="ml-auto flex items-center gap-2">
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} disabled={disabled} />
    </div>
  </header>
);

const OrdersInsightsSection = ({ snapshot }: { snapshot: DashboardSnapshot }) => {
  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardDescription>Заказы и выручка</CardDescription>
          <CardTitle>Динамика по дням</CardTitle>
          <CardAction>
            <Badge variant="outline">
              {formatDateRangeLabel(createDateRangeFromValues(snapshot.daily.map((item) => item.date)), "Нет данных")}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <AreaChart data={snapshot.daily}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis yAxisId="revenue" hide />
              <YAxis yAxisId="orders" hide />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const dataKey = String(item.dataKey ?? item.name ?? "");

                      return (
                        <>
                          <span className="text-muted-foreground">
                            {chartConfig[dataKey as keyof typeof chartConfig]?.label ?? item.name}
                          </span>
                          <span className="min-w-[7ch] text-right font-mono font-medium text-foreground tabular-nums">
                            {formatOverviewChartTooltipValue(value, dataKey)}
                          </span>
                        </>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fill="var(--color-revenue)"
                fillOpacity={0.18}
              />
              <Area
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                stroke="var(--color-orders)"
                fill="var(--color-orders)"
                fillOpacity={0.08}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const DistributionSection = ({ snapshot }: { snapshot: DashboardSnapshot }) => {
  return (
    <div className="grid gap-4 px-4 pb-6 lg:grid-cols-2 lg:px-6">
      <Card>
        <CardHeader>
          <CardDescription>Источники заказов</CardDescription>
          <CardTitle>Каналы привлечения</CardTitle>
          <CardAction>
            <Badge variant="outline">{snapshot.sources.length} источников</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {snapshot.sources.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Нет данных по источникам.
            </div>
          ) : (
            snapshot.sources.map((item, index) => {
              const max = snapshot.sources[0]?.value ?? 1;
              const width = `${Math.max((item.value / max) * 100, 8)}%`;

              return (
                <div key={item.label} className="grid gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{translateSource(item.label)}</span>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-foreground" style={{ width }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Города</CardDescription>
          <CardTitle>Распределение заказов</CardTitle>
          <CardAction>
            <Badge variant="outline">{snapshot.cities.length} городов</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {snapshot.cities.length === 0 ? (
            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Нет данных по городам.
            </div>
          ) : (
            snapshot.cities.map((item, index) => {
              const max = snapshot.cities[0]?.value ?? 1;
              const width = `${Math.max((item.value / max) * 100, 8)}%`;

              return (
                <div key={item.label} className="grid gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.label}</span>
                      <Badge variant="outline">#{index + 1}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-foreground" style={{ width }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const OrdersSection = ({ snapshot }: { snapshot: DashboardSnapshot }) => {
  const [query, setQuery] = useState("");

  const filteredOrders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return snapshot.recentOrders;

    return snapshot.recentOrders.filter((order) =>
      [order.externalId, order.fullName, order.city ?? "", order.status].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [query, snapshot.recentOrders]);

  return (
    <div className="grid gap-4 px-4 pb-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] lg:px-6">
      <Card>
        <CardHeader>
          <CardDescription>Последние синки</CardDescription>
          <CardTitle>Недавние заказы</CardTitle>
          <CardAction>
            <Button variant="outline" size="sm">
              <RefreshCw data-icon="inline-start" />
              Обновить
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Фильтр по заказу, клиенту, городу или статусу..."
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заказ</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Город</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Заказы по текущему фильтру не найдены.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.externalId}>
                    <TableCell className="font-medium">#{order.externalId}</TableCell>
                    <TableCell className="max-w-48 truncate">{order.fullName}</TableCell>
                    <TableCell>{order.city ?? "Неизвестно"}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "new" ? "default" : "secondary"}>
                        {translateStatus(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{money.format(order.totalAmount)} ₸</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Итоги периода</CardDescription>
          <CardTitle>Основные показатели</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ChartContainer config={chartConfig} className="h-[220px] w-full">
            <BarChart data={snapshot.daily}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="orders" fill="var(--color-orders)" radius={8} />
            </BarChart>
          </ChartContainer>
          <Separator />
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <span className="text-sm text-muted-foreground">Источников</span>
              <span className="font-medium">{snapshot.sources.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <span className="text-sm text-muted-foreground">Городов</span>
              <span className="font-medium">{snapshot.cities.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-3">
              <span className="text-sm text-muted-foreground">Крупных заказов</span>
              <span className="font-medium">{snapshot.stats.highValueOrders}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const DashboardShell = ({ orders, state, section }: DashboardShellProps) => {
  const initialDateRange = useMemo(
    () => createDateRangeFromValues(orders.map((order) => order.crmCreatedAt)),
    [orders],
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange);

  const filteredOrders = useMemo(
    () => orders.filter((order) => isValueWithinDateRange(order.crmCreatedAt, dateRange)),
    [dateRange, orders],
  );
  const filteredSnapshot = useMemo(() => buildDashboardSnapshot(filteredOrders), [filteredOrders]);
  const heroShowsPeriodCard =
    section !== "overview" && section !== "sources" && section !== "geography";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar snapshot={filteredSnapshot} section={section} />
      <SidebarInset>
        <SiteHeader
          section={section}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          disabled={state === "missing-env"}
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <Card className="bg-linear-to-r from-primary/5 to-card shadow-xs">
                <CardHeader>
                  <CardDescription>{sectionMeta[section].breadcrumb}</CardDescription>
                  <CardTitle className="text-2xl font-semibold">{sectionMeta[section].title}</CardTitle>
                  <CardAction className="flex items-center gap-2">
                    {/* <Badge variant="outline">
                      {state === "missing-env" ? "Нет доступа" : hasFilteredData ? "По фильтру" : "Нет данных"}
                    </Badge> */}
                  </CardAction>
                </CardHeader>
                <CardContent className={heroShowsPeriodCard ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" : "grid gap-4"}>
                  <div className="grid gap-2">
                    <p className="text-sm text-muted-foreground">{sectionMeta[section].description}</p>
                    <p className="text-sm text-muted-foreground">Данные в графиках и сводках считаются по фактически загруженному периоду.</p>
                  </div>
                  {heroShowsPeriodCard ? (
                    <div className="grid gap-3 rounded-2xl border bg-background/80 p-4">
                      <span className="text-sm text-muted-foreground">Период отчёта</span>
                      <div className="text-sm font-medium">
                        {formatDateRangeLabel(dateRange, "Нет данных")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Используйте календарь в хедере, чтобы изменить диапазон.
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
            <KpiCards snapshot={filteredSnapshot} orders={filteredOrders} />
            {section === "overview" ? <OrdersInsightsSection snapshot={filteredSnapshot} /> : null}
            {section === "overview" ? <DistributionSection snapshot={filteredSnapshot} /> : null}
            {section === "orders" ? <OrdersInsightsSection snapshot={filteredSnapshot} /> : null}
            {section === "orders" ? <OrdersSection snapshot={filteredSnapshot} /> : null}
            {section === "sources" ? <DistributionSection snapshot={filteredSnapshot} /> : null}
            {section === "geography" ? <DistributionSection snapshot={filteredSnapshot} /> : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
