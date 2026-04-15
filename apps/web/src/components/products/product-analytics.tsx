"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { ChevronDown, ChevronUp, PackageSearch } from "lucide-react";

import { DateRangePicker } from "@/components/shared/date-range-picker";
import { isValueWithinDateRange } from "@/lib/date-range";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { translateSource } from "@/lib/retailcrm-labels";
import { buildProductMetrics, type ProductMetric } from "@/lib/product-analytics";
import type { OrderRecord } from "@/lib/orders-data";

const money = new Intl.NumberFormat("ru-RU");
const DETAILS_PAGE_SIZE = 8;

type ProductAnalyticsProps = {
  orders: OrderRecord[];
  dateRange: DateRange | undefined;
  source: string;
};

const sortByRevenue = (items: ProductMetric[]) => [...items].sort((left, right) => right.revenue - left.revenue);
const sortByQuantity = (items: ProductMetric[]) => [...items].sort((left, right) => right.quantitySold - left.quantitySold);
const sortByAverageCheck = (items: ProductMetric[]) => [...items].sort((left, right) => right.averageCheck - left.averageCheck);

export function ProductAnalytics({ orders, dateRange, source }: ProductAnalyticsProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedProductPage, setSelectedProductPage] = useState(1);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!isValueWithinDateRange(order.crmCreatedAt, dateRange)) return false;
      if (source !== "all" && order.utmSource !== source) return false;
      return true;
    });
  }, [dateRange, orders, source]);

  const metrics = useMemo(() => buildProductMetrics(filteredOrders), [filteredOrders]);
  const topByQuantity = useMemo(() => sortByQuantity(metrics).slice(0, 10), [metrics]);
  const topByRevenue = useMemo(() => sortByRevenue(metrics).slice(0, 10), [metrics]);
  const topByAverageCheck = useMemo(() => sortByAverageCheck(metrics).slice(0, 10), [metrics]);
  const selectedProductOrders = useMemo(() => {
    if (!selectedProduct) return [];

    return filteredOrders
      .flatMap((order) =>
        order.items
          .filter((item) => item.productName === selectedProduct)
          .map((item) => ({
            externalId: order.externalId,
            fullName: order.fullName,
            crmCreatedAt: order.crmCreatedAt,
            utmSource: order.utmSource,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
      )
      .sort((left, right) => {
        const leftTime = left.crmCreatedAt ? new Date(left.crmCreatedAt).getTime() : 0;
        const rightTime = right.crmCreatedAt ? new Date(right.crmCreatedAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [filteredOrders, selectedProduct]);

  const totalRevenue = metrics.reduce((sum, metric) => sum + metric.revenue, 0);
  const totalUnits = metrics.reduce((sum, metric) => sum + metric.quantitySold, 0);
  const selectedProductPageCount = Math.max(1, Math.ceil(selectedProductOrders.length / DETAILS_PAGE_SIZE));
  const safeSelectedProductPage = Math.min(selectedProductPage, selectedProductPageCount);
  const selectedProductOrdersPage = selectedProductOrders.slice(
    (safeSelectedProductPage - 1) * DETAILS_PAGE_SIZE,
    safeSelectedProductPage * DETAILS_PAGE_SIZE,
  );

  return (
    <div className="grid gap-6 px-4 pb-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Товаров с продажами</CardDescription>
            <CardTitle>{metrics.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Продано единиц</CardDescription>
            <CardTitle>{totalUnits}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Выручка по товарам</CardDescription>
            <CardTitle>{money.format(totalRevenue)} ₸</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <MetricTable
          title="Топ товаров по количеству продаж"
          description="Показывает, какие товары чаще всего покупают."
          rows={topByQuantity}
          selectedProduct={selectedProduct}
          onSelectProduct={(value) => {
            setSelectedProduct(value);
            setSelectedProductPage(1);
          }}
          valueLabel="Количество"
          getValue={(item) => item.quantitySold}
        />
        <MetricTable
          title="Топ товаров по выручке"
          description="Лидеры по обороту за выбранный период."
          rows={topByRevenue}
          selectedProduct={selectedProduct}
          onSelectProduct={(value) => {
            setSelectedProduct(value);
            setSelectedProductPage(1);
          }}
          valueLabel="Выручка"
          getValue={(item) => `${money.format(item.revenue)} ₸`}
        />
        <MetricTable
          title="Средний чек по товару"
          description="Средняя сумма заказов, в которых встречается товар."
          rows={topByAverageCheck}
          selectedProduct={selectedProduct}
          onSelectProduct={(value) => {
            setSelectedProduct(value);
            setSelectedProductPage(1);
          }}
          valueLabel="Средний чек"
          getValue={(item) => `${money.format(item.averageCheck)} ₸`}
        />
      </div>

      {selectedProduct ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedProduct}</CardTitle>
            <CardDescription>Заказы, в которых встречается выбранный товар.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заказ</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProductOrdersPage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      По выбранному товару нет заказов в текущем диапазоне.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedProductOrdersPage.map((item) => (
                    <TableRow key={`${item.externalId}-${item.crmCreatedAt}-${item.lineTotal}`}>
                      <TableCell className="font-medium">#{item.externalId}</TableCell>
                      <TableCell>{item.fullName}</TableCell>
                      <TableCell>{item.crmCreatedAt ? new Date(item.crmCreatedAt).toLocaleDateString("ru-RU") : "—"}</TableCell>
                      <TableCell>{translateSource(item.utmSource)}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{money.format(item.lineTotal)} ₸</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {selectedProductOrders.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  Показаны {(safeSelectedProductPage - 1) * DETAILS_PAGE_SIZE + 1}-
                  {Math.min(safeSelectedProductPage * DETAILS_PAGE_SIZE, selectedProductOrders.length)} из{" "}
                  {selectedProductOrders.length}
                </div>
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        disabled={safeSelectedProductPage === 1}
                        onClick={() =>
                          setSelectedProductPage((current) => Math.max(1, current - 1))
                        }
                      />
                    </PaginationItem>
                    {Array.from({ length: selectedProductPageCount }, (_, index) => index + 1)
                      .slice(
                        Math.max(0, safeSelectedProductPage - 2),
                        Math.min(selectedProductPageCount, safeSelectedProductPage + 1),
                      )
                      .map((pageNumber) => (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            isActive={pageNumber === safeSelectedProductPage}
                            onClick={() => setSelectedProductPage(pageNumber)}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    {selectedProductPageCount > 3 &&
                    safeSelectedProductPage < selectedProductPageCount - 1 ? (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : null}
                    <PaginationItem>
                      <PaginationNext
                        disabled={safeSelectedProductPage === selectedProductPageCount}
                        onClick={() =>
                          setSelectedProductPage((current) =>
                            Math.min(selectedProductPageCount, current + 1),
                          )
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function ProductAnalyticsFilters({
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
        <SelectTrigger className="h-9 w-[180px]">
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
      <button type="button" onClick={onReset} className="h-9 rounded-lg border px-3 text-sm text-foreground transition-colors hover:bg-muted">
        Сбросить
      </button>
    </div>
  );
}

function MetricTable({
  title,
  description,
  rows,
  selectedProduct,
  onSelectProduct,
  valueLabel,
  getValue,
}: {
  title: string;
  description: string;
  rows: ProductMetric[];
  selectedProduct: string | null;
  onSelectProduct: (value: string | null) => void;
  valueLabel: string;
  getValue: (item: ProductMetric) => number | string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Товар</TableHead>
              <TableHead className="text-right">{valueLabel}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                  <PackageSearch className="mx-auto mb-2 size-5" />
                  Нет данных по выбранным фильтрам.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.productName}>
                  <TableCell className="font-medium">
                    <Button
                      variant="link"
                      className="h-auto px-0 py-0 text-left"
                      onClick={() =>
                        onSelectProduct(selectedProduct === item.productName ? null : item.productName)
                      }
                    >
                      {item.productName}
                      {selectedProduct === item.productName ? (
                        <ChevronUp data-icon="inline-end" />
                      ) : (
                        <ChevronDown data-icon="inline-end" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">{getValue(item)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
