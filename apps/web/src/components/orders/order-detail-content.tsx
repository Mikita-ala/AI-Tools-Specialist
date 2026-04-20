"use client";

import Link from "next/link";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import type { OrderDetailRecord } from "@/lib/orders-data";
import {
  translateOrderMethod,
  translateOrderType,
  translateSource,
  translateStatus,
} from "@/lib/retailcrm-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const money = new Intl.NumberFormat("ru-RU");

const formatDate = (value: string | null) => {
  if (!value) return "Нет даты";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const copyValue = async (value: string, label: string) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} скопирован`);
  } catch {
    toast.error(`Не удалось скопировать ${label.toLowerCase()}`);
  }
};

function CopyRow({
  label,
  value,
  emptyLabel,
  truncate = false,
}: {
  label: string;
  value: string | null;
  emptyLabel: string;
  truncate?: boolean;
}) {
  if (!value) {
    return <span>{emptyLabel}</span>;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto w-full min-w-0 items-start justify-start gap-2 px-0 py-0 text-left font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
      onClick={() => copyValue(value, label)}
      title={value}
    >
      <span className={truncate ? "min-w-0 truncate" : "min-w-0 break-words whitespace-normal"}>{value}</span>
      <Copy data-icon="inline-end" className="shrink-0" />
    </Button>
  );
}

export function OrderDetailContent({
  order,
  compact = false,
}: {
  order: OrderDetailRecord;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "grid gap-5" : "grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]"}>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardDescription>Основная информация</CardDescription>
            <CardTitle>Карточка заказа</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="info">{translateStatus(order.status)}</Badge>
              <Badge variant="outline">{translateSource(order.utmSource)}</Badge>
              <Badge variant="outline">{translateOrderMethod(order.orderMethod)}</Badge>
              {order.crmOrderUrl ? (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={order.crmOrderUrl} target="_blank" />}>
                  <ExternalLink className="mr-2 size-4" />
                  Открыть в RetailCRM
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <UserRound className="size-4" />
                  Клиент
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{order.fullName}</span>
                  <CopyRow label="Email" value={order.email} emptyLabel="Email не указан" />
                  <CopyRow label="Телефон" value={order.phone} emptyLabel="Телефон не указан" />
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-4" />
                  Доставка
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{order.city ?? "Город не указан"}</span>
                  <CopyRow label="Адрес" value={order.address} emptyLabel="Адрес не указан" />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="size-4" />
                  Даты
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span>Создан: {formatDate(order.crmCreatedAt)}</span>
                  <span>Обновлён: {formatDate(order.crmUpdatedAt)}</span>
                  <span>Синк: {formatDate(order.syncedAt ?? null)}</span>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <Phone className="size-4" />
                  Канал
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span>Источник: {translateSource(order.utmSource)}</span>
                  <span>Тип заказа: {translateOrderType(order.orderType)}</span>
                  <span>Метод заказа: {translateOrderMethod(order.orderMethod)}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold">
                <ShoppingBag className="size-4" />
                Состав заказа
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead>Количество</TableHead>
                    <TableHead>Цена</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={`${order.externalId}-${item.productName}-${item.quantity}`}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{money.format(item.unitPrice)} ₸</TableCell>
                      <TableCell className="text-right">{money.format(item.lineTotal)} ₸</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>История клиента</CardDescription>
            <CardTitle>Прошлые заказы</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заказ</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.customerOrderHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      У клиента пока нет других заказов.
                    </TableCell>
                  </TableRow>
                ) : (
                  order.customerOrderHistory.map((historyOrder) => (
                    <TableRow key={historyOrder.externalId}>
                      <TableCell className="font-medium">
                        <Link href={`/orders/${historyOrder.externalId}`} className="transition-colors hover:text-primary">
                          #{historyOrder.externalId}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(historyOrder.crmCreatedAt)}</TableCell>
                      <TableCell>{translateStatus(historyOrder.status)}</TableCell>
                      <TableCell>{translateSource(historyOrder.utmSource)}</TableCell>
                      <TableCell className="text-right">{money.format(historyOrder.totalAmount)} ₸</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      <div className="grid gap-6 self-start lg:sticky lg:top-20">
        <Card>
          <CardHeader>
            <CardDescription>Суммы</CardDescription>
            <CardTitle>Итог заказа</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Позиций</span>
              <span>{order.items.length}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Итого</span>
              <span>{money.format(order.totalAmount)} ₸</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
