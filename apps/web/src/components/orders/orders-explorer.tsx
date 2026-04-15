"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, RotateCcw, Search } from "lucide-react";
import type { DateRange } from "react-day-picker";

import type { OrderRecord } from "@/lib/orders-data";
import { isValueWithinDateRange } from "@/lib/date-range";
import { translateSource, translateStatus } from "@/lib/retailcrm-labels";
import { DateRangePicker } from "@/components/shared/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const money = new Intl.NumberFormat("ru-RU");
const PAGE_SIZE = 10;

const statusTone = (status: string) => {
  if (["complete", "partially-completed"].includes(status)) return "default";
  if (["cancel-other", "no-call", "no-product", "return"].includes(status)) return "destructive";
  return "secondary";
};

const formatDate = (value: string | null) => {
  if (!value) return "Нет даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getFirstProductLabel = (order: OrderRecord) => {
  if (order.items.length === 0) return "Нет товаров";
  if (order.items.length === 1) return order.items[0].productName;
  return `${order.items[0].productName} +${order.items.length - 1}`;
};

export function OrdersExplorer({
  orders,
  query,
  dateRange,
}: {
  orders: OrderRecord[];
  query: string;
  dateRange: DateRange | undefined;
}) {
  const [page, setPage] = useState(1);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      if (!isValueWithinDateRange(order.crmCreatedAt, dateRange)) return false;
      if (!normalizedQuery) return true;

      return [
        order.externalId,
        order.fullName,
        order.email ?? "",
        order.phone ?? "",
        order.city ?? "",
        order.utmSource ?? "",
        order.status,
        ...order.items.map((item) => item.productName),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [dateRange, orders, query]);

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedOrders = filteredOrders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="grid gap-6 px-4 pb-6 lg:px-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Показано заказов</CardDescription>
            <CardTitle>{filteredOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Выручка за период</CardDescription>
            <CardTitle>{money.format(totalRevenue)} ₸</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список заказов</CardTitle>
          <CardDescription>
            Наведите на товар, чтобы увидеть весь состав заказа. Полная карточка остаётся по кнопке `Детали`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Заказ</TableHead>
                <TableHead>Товар</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Источник</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Сумма</TableHead>
                <TableHead className="text-right">Действие</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    По выбранному диапазону и фильтру заказов нет.
                  </TableCell>
                </TableRow>
              ) : (
                pagedOrders.map((order) => (
                  <TableRow key={order.externalId}>
                    <TableCell className="font-medium">#{order.externalId}</TableCell>
                    <TableCell className="max-w-60">
                      <OrderItemsPreview order={order} />
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1">
                        <span className="font-medium">{order.fullName}</span>
                        <span
                          className="truncate text-xs text-muted-foreground"
                          title={order.email ?? order.phone ?? "Без контакта"}
                        >
                          {order.email ?? order.phone ?? "Без контакта"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{translateSource(order.utmSource)}</TableCell>
                    <TableCell>{formatDate(order.crmCreatedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={statusTone(order.status)}>{translateStatus(order.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{money.format(order.totalAmount)} ₸</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/orders/${order.externalId}`} />}
                      >
                        <Eye data-icon="inline-start" />
                        Детали
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Показаны {filteredOrders.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}-
              {Math.min(safePage * PAGE_SIZE, filteredOrders.length)} из {filteredOrders.length}
            </div>
            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    disabled={safePage === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  />
                </PaginationItem>
                {Array.from({ length: pageCount }, (_, index) => index + 1)
                  .slice(Math.max(0, safePage - 2), Math.min(pageCount, safePage + 1))
                  .map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink isActive={pageNumber === safePage} onClick={() => setPage(pageNumber)}>
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                <PaginationItem>
                  <PaginationNext
                    disabled={safePage === pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OrdersSearchFilters({
  query,
  dateRange,
  onQueryChange,
  onDateRangeChange,
  onReset,
}: {
  query: string;
  dateRange: DateRange | undefined;
  onQueryChange: (value: string) => void;
  onDateRangeChange: (value: DateRange | undefined) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm">
              <Search data-icon="inline-start" />
              Поиск
            </Button>
          }
        />
        <PopoverContent align="end">
          <PopoverHeader>
            <PopoverTitle>Поиск по заказам</PopoverTitle>
            <PopoverDescription>Номер заказа, клиент, источник, город или товар.</PopoverDescription>
          </PopoverHeader>
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Начните вводить..."
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
      <Button type="button" variant="outline" size="sm" onClick={onReset} className="w-9 px-0 sm:w-auto sm:px-3">
        <RotateCcw />
        <span className="hidden sm:inline">Сбросить</span>
      </Button>
    </div>
  );
}

function OrderItemsPreview({ order }: { order: OrderRecord }) {
  if (order.items.length === 0) {
    return <span className="text-muted-foreground">Нет товаров</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="max-w-full truncate text-left transition-colors hover:text-primary"
          />
        }
      >
        {getFirstProductLabel(order)}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm p-3" side="top" align="start">
        <div className="grid gap-2">
          <div className="text-sm font-medium text-background">Состав заказа</div>
          <div className="grid gap-1">
            {order.items.map((item, index) => (
              <div
                key={`${order.externalId}-${item.productName}-${index}`}
                className="flex items-start justify-between gap-3 text-xs text-background/80"
              >
                <span className="min-w-0 flex-1 break-words">{item.productName}</span>
                <span className="shrink-0">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
