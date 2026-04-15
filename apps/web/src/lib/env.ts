type AppEnv = {
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
  supabaseSecretKey: string | null;
  retailCrmBaseUrl: string | null;
  retailCrmApiKey: string | null;
  retailCrmWebhookSecret: string | null;
  cronSecret: string | null;
  telegramBotToken: string | null;
  telegramChatId: string | null;
};

const read = (value: string | undefined) => (value && value.length > 0 ? value : null);

export const env: AppEnv = {
  supabaseUrl: read(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: read(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseSecretKey: read(process.env.SUPABASE_SECRET_KEY),
  retailCrmBaseUrl: read(process.env.RETAILCRM_BASE_URL),
  retailCrmApiKey: read(process.env.RETAILCRM_API_KEY),
  retailCrmWebhookSecret: read(process.env.RETAILCRM_WEBHOOK_SECRET),
  cronSecret: read(process.env.CRON_SECRET),
  telegramBotToken: read(process.env.TELEGRAM_BOT_TOKEN),
  telegramChatId: read(process.env.TELEGRAM_CHAT_ID),
};

export const hasSupabasePublicEnv = Boolean(env.supabaseUrl && env.supabasePublishableKey);
export const hasSupabaseAdminEnv = Boolean(
  env.supabaseUrl && env.supabasePublishableKey && env.supabaseSecretKey,
);
export const hasRetailCrmEnv = Boolean(env.retailCrmBaseUrl && env.retailCrmApiKey);
export const hasTelegramEnv = Boolean(env.telegramBotToken && env.telegramChatId);
