"use client";

import { useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { Building2, MapPinned, PackageSearch, ReceiptText, TrendingUp } from "lucide-react";

import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Badge } from "@/components/ui/badge";
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
                {cityMetrics.length === 0 ? (
                  <EmptyRow colSpan={5} />
                ) : (
                  cityMetrics.map((city) => (
                    <TableRow key={city.city}>
                      <TableCell className="font-medium">{city.city}</TableCell>
                      <TableCell className="text-right">{city.ordersCount}</TableCell>
                      <TableCell className="text-right">{money.format(city.revenue)} ₸</TableCell>
                      <TableCell className="text-right">{money.format(city.averageCheck)} ₸</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          {city.topProducts.length === 0 ? (
                            <span className="text-sm text-muted-foreground">Нет данных</span>
                          ) : (
                            city.topProducts.map((product) => (
                              <Badge key={`${city.city}-${product.productName}`} variant="outline">
                                {product.productName} x{product.quantity}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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

          <Card>
            <CardHeader>
              <CardTitle>Что заказывают по городам</CardTitle>
              <CardDescription>Самые частые товары в каждом городе.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Город</TableHead>
                    <TableHead>Лидер</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cityMetrics.length === 0 ? (
                    <EmptyRow colSpan={3} />
                  ) : (
                    cityMetrics.slice(0, 8).map((city) => {
                      const leadProduct = city.topProducts[0];

                      return (
                        <TableRow key={`${city.city}-top-product`}>
                          <TableCell className="font-medium">{city.city}</TableCell>
                          <TableCell>{leadProduct?.productName ?? "Нет данных"}</TableCell>
                          <TableCell className="text-right">{leadProduct?.quantity ?? 0}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
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
        <SelectTrigger className="h-9 w-[200px]">
          <SelectValue placeholder="Источник">{sourceLabel}</SelectValue>
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
      <button
        type="button"
        onClick={onReset}
        className="h-9 rounded-lg border px-3 text-sm text-foreground transition-colors hover:bg-muted"
      >
        Сбросить
      </button>
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

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
        <PackageSearch className="mx-auto mb-2 size-5" />
        Нет данных по выбранным фильтрам.
      </TableCell>
    </TableRow>
  );
}
