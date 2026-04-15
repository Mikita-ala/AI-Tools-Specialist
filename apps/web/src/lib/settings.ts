import { HIGH_VALUE_ALERT_RULE } from "@gbc/domain";

import { env } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const DEFAULT_THRESHOLD = HIGH_VALUE_ALERT_RULE.threshold;
const DEFAULT_RECIPIENT_MODE = "all_enabled";
const RECIPIENT_MODE_KEY = "telegram_default_recipient_mode";

type AppSettingRow = {
  key: string;
  value: unknown;
};

type TelegramRecipientRow = {
  id: number;
  chat_id: string;
  label: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

type TelegramRuleRow = {
  id: number;
  key: string;
  label: string;
  is_enabled: boolean;
  threshold_amount: number;
  recipient_mode: string;
  created_at: string;
  updated_at: string;
};

export type TelegramRecipient = {
  id: number | null;
  chatId: string;
  label: string;
  isEnabled: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  isFallback?: boolean;
};

export type TelegramRuleSettings = {
  id: number | null;
  key: string;
  label: string;
  isEnabled: boolean;
  thresholdAmount: number;
  recipientMode: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AppSettingsBundle = {
  rule: TelegramRuleSettings;
  recipients: TelegramRecipient[];
  appSettings: {
    defaultRecipientMode: string;
  };
};

export const getDefaultSettingsBundle = (): AppSettingsBundle => ({
  rule: {
    id: null,
    key: HIGH_VALUE_ALERT_RULE.key,
    label: "Крупный заказ",
    isEnabled: true,
    thresholdAmount: DEFAULT_THRESHOLD,
    recipientMode: DEFAULT_RECIPIENT_MODE,
    createdAt: null,
    updatedAt: null,
  },
  recipients: env.telegramChatId
    ? [
        {
          id: null,
          chatId: env.telegramChatId,
          label: "Основной чат из env",
          isEnabled: true,
          createdAt: null,
          updatedAt: null,
          isFallback: true,
        },
      ]
    : [],
  appSettings: {
    defaultRecipientMode: DEFAULT_RECIPIENT_MODE,
  },
});

const mapRule = (row: TelegramRuleRow | null | undefined): TelegramRuleSettings => ({
  id: row?.id ?? null,
  key: row?.key ?? HIGH_VALUE_ALERT_RULE.key,
  label: row?.label ?? "Крупный заказ",
  isEnabled: row?.is_enabled ?? true,
  thresholdAmount: row?.threshold_amount ?? DEFAULT_THRESHOLD,
  recipientMode: row?.recipient_mode ?? DEFAULT_RECIPIENT_MODE,
  createdAt: row?.created_at ?? null,
  updatedAt: row?.updated_at ?? null,
});

const mapRecipient = (row: TelegramRecipientRow): TelegramRecipient => ({
  id: row.id,
  chatId: row.chat_id,
  label: row.label,
  isEnabled: row.is_enabled,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getSettingsBundle = async (): Promise<AppSettingsBundle> => {
  const supabase = createAdminSupabaseClient();
  const [ruleResult, recipientsResult, appSettingsResult] = await Promise.all([
    supabase
      .from("telegram_rules")
      .select("id, key, label, is_enabled, threshold_amount, recipient_mode, created_at, updated_at")
      .eq("key", HIGH_VALUE_ALERT_RULE.key)
      .maybeSingle(),
    supabase
      .from("telegram_recipients")
      .select("id, chat_id, label, is_enabled, created_at, updated_at")
      .order("created_at", { ascending: true }),
    supabase.from("app_settings").select("key, value").in("key", [RECIPIENT_MODE_KEY]),
  ]);

  if (ruleResult.error) {
    throw new Error(`Failed to load Telegram rule settings: ${ruleResult.error.message}`);
  }

  if (recipientsResult.error) {
    throw new Error(`Failed to load Telegram recipients: ${recipientsResult.error.message}`);
  }

  if (appSettingsResult.error) {
    throw new Error(`Failed to load app settings: ${appSettingsResult.error.message}`);
  }

  const settingsByKey = new Map(
    ((appSettingsResult.data ?? []) as AppSettingRow[]).map((row) => [row.key, row.value]),
  );
  const defaultRecipientMode =
    typeof settingsByKey.get(RECIPIENT_MODE_KEY) === "string"
      ? (settingsByKey.get(RECIPIENT_MODE_KEY) as string)
      : DEFAULT_RECIPIENT_MODE;

  const recipients = ((recipientsResult.data ?? []) as TelegramRecipientRow[]).map(mapRecipient);
  const bundle = getDefaultSettingsBundle();

  return {
    rule: {
      ...mapRule(ruleResult.data as TelegramRuleRow | null),
      recipientMode: mapRule(ruleResult.data as TelegramRuleRow | null).recipientMode || defaultRecipientMode,
    },
    recipients: recipients.length > 0 ? recipients : bundle.recipients,
    appSettings: {
      defaultRecipientMode,
    },
  };
};

export const updateSettingsBundle = async (input: {
  rule: Pick<TelegramRuleSettings, "isEnabled" | "thresholdAmount" | "recipientMode">;
  recipients: Array<Pick<TelegramRecipient, "id" | "chatId" | "label" | "isEnabled">>;
}) => {
  const supabase = createAdminSupabaseClient();
  const normalizedRecipients = input.recipients
    .map((recipient) => ({
      id: recipient.id,
      chat_id: recipient.chatId.trim(),
      label: recipient.label.trim() || recipient.chatId.trim(),
      is_enabled: recipient.isEnabled,
      updated_at: new Date().toISOString(),
    }))
    .filter((recipient) => recipient.chat_id.length > 0);

  const { error: ruleError } = await supabase.from("telegram_rules").upsert(
    {
      key: HIGH_VALUE_ALERT_RULE.key,
      label: "Крупный заказ",
      is_enabled: input.rule.isEnabled,
      threshold_amount: input.rule.thresholdAmount,
      recipient_mode: input.rule.recipientMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (ruleError) {
    throw new Error(`Failed to update Telegram rule: ${ruleError.message}`);
  }

  const { error: appSettingError } = await supabase.from("app_settings").upsert(
    {
      key: RECIPIENT_MODE_KEY,
      value: input.rule.recipientMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (appSettingError) {
    throw new Error(`Failed to update app settings: ${appSettingError.message}`);
  }

  const { data: existingRecipients, error: existingRecipientsError } = await supabase
    .from("telegram_recipients")
    .select("id");

  if (existingRecipientsError) {
    throw new Error(`Failed to load existing Telegram recipients: ${existingRecipientsError.message}`);
  }

  const incomingIds = new Set(
    normalizedRecipients
      .map((recipient) => recipient.id)
      .filter((value): value is number => typeof value === "number"),
  );
  const staleIds = (existingRecipients ?? [])
    .map((row) => row.id as number)
    .filter((id) => !incomingIds.has(id));

  if (staleIds.length > 0) {
    const { error: deleteError } = await supabase.from("telegram_recipients").delete().in("id", staleIds);
    if (deleteError) {
      throw new Error(`Failed to delete stale Telegram recipients: ${deleteError.message}`);
    }
  }

  if (normalizedRecipients.length > 0) {
    const existingRecipientsPayload = normalizedRecipients.filter(
      (recipient): recipient is typeof recipient & { id: number } => typeof recipient.id === "number",
    );
    const newRecipientsPayload = normalizedRecipients
      .filter((recipient) => typeof recipient.id !== "number")
      .map((recipient) => ({
        chat_id: recipient.chat_id,
        label: recipient.label,
        is_enabled: recipient.is_enabled,
        updated_at: recipient.updated_at,
      }));

    if (existingRecipientsPayload.length > 0) {
      const { error: recipientsError } = await supabase
        .from("telegram_recipients")
        .upsert(existingRecipientsPayload, { onConflict: "id" });

      if (recipientsError) {
        throw new Error(`Failed to update Telegram recipients: ${recipientsError.message}`);
      }
    }

    if (newRecipientsPayload.length > 0) {
      const { error: recipientsError } = await supabase
        .from("telegram_recipients")
        .insert(newRecipientsPayload);

      if (recipientsError) {
        throw new Error(`Failed to create Telegram recipients: ${recipientsError.message}`);
      }
    }
  }

  return getSettingsBundle();
};

export const getHighValueAlertSettings = async () => {
  const bundle = await getSettingsBundle();
  const enabledRecipients = bundle.recipients.filter((recipient) => recipient.isEnabled);

  return {
    isEnabled: bundle.rule.isEnabled,
    thresholdAmount: bundle.rule.thresholdAmount,
    recipientMode: bundle.rule.recipientMode || bundle.appSettings.defaultRecipientMode,
    recipients: enabledRecipients,
  };
};
