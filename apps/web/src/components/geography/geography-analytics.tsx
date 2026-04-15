"use client";

import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Building2, MapPinned, PackageSearch, ReceiptText, RotateCcw, TrendingUp } from "lucide-react";

import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isValueWithinDateRange } from "@/lib/date-range";
import { buildCityMetrics } from "@/lib/geography-analytics";
import type { OrderRecord } from "@/lib/orders-data";
import { translateSource } from "@/lib/retailcrm-labels";

const money = new Intl.NumberFormat("ru-RU");

type GeographyAnalyticsProps = {
  orders: OrderRecord[];
  dateRange: DateRange | undefined;
  source: string;
};

export function GeographyAnalytics({
  orders,
  dateRange,
  source,
}: GeographyAnalyticsProps) {
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!isValueWithinDateRange(order.crmCreatedAt, dateRange)) return false;
      if (source !== "all" && order.utmSource !== source) return false;
      return true;
    });
  }, [dateRange, orders, source]);

  const cityMetrics = useMemo(() => buildCityMetrics(filteredOrders), [filteredOrders]);
  const topCitiesByCheck = useMemo(
    () => [...cityMetrics].sort((left, right) => right.averageCheck - left.averageCheck).slice(0, 5),
    [cityMetrics],
  );

  const mainCity = cityMetrics[0];
  const highestAverageCheckCity = topCitiesByCheck[0];

  return (
    <div className="grid gap-6 px-4 pb-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          title="Городов в аналитике"
          value={cityMetrics.length}
          description="Города с заказами в выбранном диапазоне."
          icon={Building2}
        />
        <SummaryCard
          title="Основной город"
          value={mainCity?.city ?? "Нет данных"}
          description={mainCity ? `${mainCity.ordersCount} заказов` : "Нет данных по заказам"}
          icon={MapPinned}
        />
        <SummaryCard
          title="Средний чек лидера"
          value={mainCity ? `${money.format(mainCity.averageCheck)} ₸` : "0 ₸"}
          description={mainCity ? `Выручка ${money.format(mainCity.revenue)} ₸` : "Нет данных"}
          icon={ReceiptText}
        />
        <SummaryCard
          title="Макс. средний чек"
          value={highestAverageCheckCity ? `${money.format(highestAverageCheckCity.averageCheck)} ₸` : "0 ₸"}
          description={highestAverageCheckCity?.city ?? "Нет данных"}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Города по заказам и выручке</CardTitle>
            <CardDescription>
              Где заказывают чаще всего, какой средний чек и что покупают в первую очередь.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cityMetrics.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                <PackageSearch className="mx-auto mb-2 size-5" />
                Нет данных по выбранным фильтрам.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Город</TableHead>
                    <TableHead className="text-right">Заказы</TableHead>
                    <TableHead className="text-right">Выручка</TableHead>
                    <TableHead className="text-right">Средний чек</TableHead>
                    <TableHead>Топ-товары</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityMetrics.map((city, index) => (
                    <TableRow key={city.city}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{city.city}</span>
                          {/* {index === 0 ? <Badge variant="info">Лидер</Badge> : null} */}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{city.ordersCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{money.format(city.revenue)} ₸</TableCell>
                      <TableCell className="text-right tabular-nums">{money.format(city.averageCheck)} ₸</TableCell>
                      <TableCell className="whitespace-normal">
                        {city.topProducts.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Нет данных</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {city.topProducts.map((product) => (
                              <div
                                key={`${city.city}-${product.productName}`}
                                className="text-sm leading-5 text-foreground"
                              >
                                {product.productName} x{product.quantity}
                              </div>
                            ))}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Города с самым высоким чеком</CardTitle>
              <CardDescription>Полезно для приоритетов рекламы и логистики.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {topCitiesByCheck.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                  Нет данных по выбранным фильтрам.
                </div>
              ) : (
                topCitiesByCheck.map((city, index) => (
                  <div key={city.city} className="rounded-xl border px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">{city.city}</span>
                      </div>
                      <span className="font-medium">{money.format(city.averageCheck)} ₸</span>
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {city.ordersCount} заказов, выручка {money.format(city.revenue)} ₸
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

export function GeographyAnalyticsFilters({
  sources,
  dateRange,
  source,
  onDateRangeChange,
  onSourceChange,
  onReset,
}: {
  sources: string[];
  dateRange: DateRange | undefined;
  source: string;
  onDateRangeChange: (value: DateRange | undefined) => void;
  onSourceChange: (value: string) => void;
  onReset: () => void;
}) {
  const sourceLabel = source === "all" ? "Все источники" : translateSource(source);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      <Select value={source} onValueChange={(value) => onSourceChange(value ?? "all")}>
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue className="truncate" placeholder="Источник">
            {sourceLabel}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все источники</SelectItem>
          {sources.map((item) => (
            <SelectItem key={item} value={item}>
              {translateSource(item)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" onClick={onReset} className="w-9 px-0 sm:w-auto sm:px-3">
        <RotateCcw />
        <span className="hidden sm:inline">Сбросить</span>
      </Button>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Building2;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="flex items-center justify-between gap-3">
          <span>{value}</span>
          <Icon className="size-4 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  );
}
