"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { AdminLayout } from "@/components/dashboard/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Recipient = {
  id: number | null;
  chatId: string;
  label: string;
  isEnabled: boolean;
  isFallback?: boolean;
};

type SettingsState = {
  rule: {
    isEnabled: boolean;
    thresholdAmount: number;
    recipientMode: string;
  };
  recipients: Recipient[];
};

export function SettingsScreen({ totalOrders }: { totalOrders: number }) {
  const [settings, setSettings] = useState<SettingsState>({
    rule: {
      isEnabled: true,
      thresholdAmount: 50_000,
      recipientMode: "all_enabled",
    },
    recipients: [],
  });

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      const response = await fetch("/api/settings", { cache: "no-store" });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        settings?: {
          rule: {
            isEnabled: boolean;
            thresholdAmount: number;
            recipientMode: string;
          };
          recipients: Recipient[];
        };
      };

      if (!response.ok || !payload.ok || !payload.settings) {
        toast.error(payload.error ?? "Не удалось загрузить настройки");
        return;
      }

      if (!cancelled) {
        setSettings({
          rule: payload.settings.rule,
          recipients: payload.settings.recipients,
        });
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const enabledRecipientsCount = useMemo(
    () => settings.recipients.filter((recipient) => recipient.isEnabled).length,
    [settings.recipients],
  );

  return (
    <AdminLayout
      section="settings"
      title="Настройки уведомлений"
      description="Реальные настройки правил Telegram, подключённые к Supabase и логике отправки."
      totalOrders={totalOrders}
    >
      <div className="grid gap-6 px-4 pb-28 lg:px-6">
        <div className="grid gap-4 xl:grid-cols-4">
          <SettingsKpiCard
            label="Порог алерта"
            value={`${new Intl.NumberFormat("ru-RU").format(settings.rule.thresholdAmount)} ₸`}
          />
          <SettingsKpiCard
            label="Правило"
            value={settings.rule.isEnabled ? "Включено" : "Выключено"}
          />
          <SettingsKpiCard
            label="Активные получатели"
            value={String(enabledRecipientsCount)}
          />
          <SettingsKpiCard
            label="Всего получателей"
            value={String(settings.recipients.length)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
            <CardDescription>Глобальные настройки высокого чека.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Порог для Telegram-алерта</span>
              <Input type="number" min={0} value={settings.rule.thresholdAmount} disabled />
              <span className="text-muted-foreground">
                Заказы с суммой не меньше этого значения попадут в Telegram.
              </span>
            </label>
            <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              Уведомление отправляется всем включённым получателям из списка ниже.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Правила</CardTitle>
            <CardDescription>Управление правилом крупного заказа.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between rounded-2xl border p-4">
              <div className="grid gap-1">
                <span className="font-medium">Крупный заказ</span>
                <span className="text-sm text-muted-foreground">
                  Отправка уведомления при превышении порога.
                </span>
              </div>
              <Button variant={settings.rule.isEnabled ? "default" : "outline"} disabled>
                {settings.rule.isEnabled ? "Включено" : "Выключено"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Получатели</CardTitle>
            <CardDescription>Список Telegram-чатов, куда уходят алерты.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {settings.recipients.map((recipient, index) => (
              <div key={`${recipient.id ?? "new"}-${index}`} className="grid gap-3 rounded-2xl border p-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Название</span>
                  <Input value={recipient.label} disabled />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Chat ID</span>
                  <Input value={recipient.chatId} disabled />
                </label>
                <Button variant={recipient.isEnabled ? "default" : "outline"} disabled>
                  {recipient.isEnabled ? "Включён" : "Выключен"}
                </Button>
                <Button variant="outline" disabled>
                  <Trash2 className="size-4" />
                </Button>
                {recipient.isFallback ? <Badge variant="warning">Из env</Badge> : null}
              </div>
            ))}

            <Button variant="outline" disabled>
              <Plus className="mr-2 size-4" />
              Добавить получателя
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-4">
        <div className="pointer-events-auto mx-auto flex w-full max-w-5xl items-center justify-between gap-3 rounded-2xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
          <div className="grid gap-1">
            <span className="text-sm font-medium">Редактирование отключено</span>
            <span className="text-xs text-muted-foreground">
              Настройки доступны только для просмотра.
            </span>
          </div>
          <Button size="sm" disabled>
            <Save className="mr-2 size-4" />
            Сохранение недоступно
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

function SettingsKpiCard({
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
