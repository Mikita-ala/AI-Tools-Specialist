"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildDashboardSnapshot, type DashboardOrderRecord, type DashboardSnapshot } from "@gbc/domain";
import type { DateRange } from "react-day-picker";
import {
  BellRing,
  ChartColumnIncreasing,
  LayoutDashboard,
  MapPinned,
  Package,
  ReceiptText,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { DateRangePicker } from "@/components/shared/date-range-picker";
import { createDateRangeFromValues, formatDateRangeLabel, isValueWithinDateRange } from "@/lib/date-range";
import { translateSource, translateStatus } from "@/lib/retailcrm-labels";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
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
const compact = new Intl.NumberFormat("ru-RU", { notation: "compact", maximumFractionDigits: 1 });

const chartConfig = {
  orders: { label: "Заказы", color: "var(--color-primary)" },
  revenue: { label: "Выручка", color: "var(--color-secondary-foreground)" },
};

type DashboardShellProps = {
  orders: DashboardOrderRecord[];
  state: "missing-env" | "empty" | "ready";
  section: "overview" | "orders" | "products" | "sources" | "geography";
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
} as const;

const formatTrend = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "Без базы";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
};

const getTrend = (values: number[]) => {
  if (values.length < 2) return null;
  const midpoint = Math.floor(values.length / 2);
  const previous = values.slice(0, midpoint).reduce((sum, value) => sum + value, 0);
  const current = values.slice(midpoint).reduce((sum, value) => sum + value, 0);
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
};

const KpiCards = ({ snapshot }: { snapshot: DashboardSnapshot }) => {
  const orderTrend = getTrend(snapshot.daily.map((item) => item.orders));
  const revenueTrend = getTrend(snapshot.daily.map((item) => item.revenue));

  const cards = [
    {
      label: "Общая выручка",
      value: `${money.format(snapshot.stats.totalRevenue)} ₸`,
      trend: formatTrend(revenueTrend),
      icon: TrendingUp,
    },
    {
      label: "Всего заказов",
      value: compact.format(snapshot.stats.totalOrders),
      trend: formatTrend(orderTrend),
      icon: ReceiptText,
    },
    {
      label: "Средний чек",
      value: `${money.format(snapshot.stats.averageOrderValue)} ₸`,
      trend: "По всем заказам",
      icon: ChartColumnIncreasing,
    },
    {
      label: "Крупные заказы",
      value: compact.format(snapshot.stats.highValueOrders),
      trend: "Сумма выше 50 000 ₸",
      icon: BellRing,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 xl:grid-cols-4 lg:px-6">
      {cards.map((item) => (
        <Card key={item.label} className="bg-linear-to-t from-primary/5 to-card shadow-xs dark:bg-card">
          <CardHeader>
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{item.value}</CardTitle>
            <CardAction>
              <Badge variant="outline">
                <item.icon data-icon="inline-start" />
                {item.trend}
              </Badge>
            </CardAction>
          </CardHeader>
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
                isActive={section === "geography"}
                tooltip="География"
                render={<Link href="/geography" />}
              >
                <MapPinned />
                <span>География</span>
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
          <BreadcrumbItem>
            <BreadcrumbPage>Аналитика продаж</BreadcrumbPage>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{sectionMeta[section].breadcrumb}</BreadcrumbPage>
          </BreadcrumbItem>
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
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-revenue)" fill="var(--color-revenue)" fillOpacity={0.18} />
              <Area type="monotone" dataKey="orders" stroke="var(--color-orders)" fill="var(--color-orders)" fillOpacity={0.08} />
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
            <KpiCards snapshot={filteredSnapshot} />
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
