const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const money = new Intl.NumberFormat("ru-RU");

const statusLabels: Record<string, string> = {
  new: "Новый",
  complete: "Выполнен",
  "partially-completed": "Выполнен частично",
  "availability-confirmed": "Наличие подтверждено",
  "offer-analog": "Предложить замену",
  "ready-to-wait": "Готов ждать",
  "waiting-for-arrival": "Ожидается поступление",
  "client-confirmed": "Согласовано с клиентом",
  prepayed: "Предоплата поступила",
  "send-to-assembling": "Передано в комплектацию",
  assembling: "Комплектуется",
  "assembling-complete": "Укомплектован",
  "send-to-delivery": "Передан в доставку",
  delivering: "Доставляется",
  redirect: "Доставка перенесена",
  "ready-for-self-pickup": "Готов к самовывозу",
  "arrived-in-pickup-point": "Прибыл в ПВЗ",
  "no-call": "Недозвон",
  "no-product": "Нет в наличии",
  "already-buyed": "Купил в другом месте",
  "delyvery-did-not-suit": "Не устроила доставка",
  "prices-did-not-suit": "Не устроила цена",
  "cancel-other": "Отменён",
  return: "Возврат",
};

const sourceLabels: Record<string, string> = {
  instagram: "Instagram",
  google: "Google",
  tiktok: "TikTok",
  referral: "Рекомендации",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  website: "Сайт",
  unknown: "Неизвестно",
};

const translateStatus = (value: string) => statusLabels[value] ?? value;

const translateSource = (value: string | null) => {
  if (!value) return "Неизвестно";
  const normalized = value.trim().toLowerCase();
  return sourceLabels[normalized] ?? value;
};

const formatAmount = (value: number) => `${money.format(value)} ₸`;

const formatItemsSummary = (
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice?: number;
    lineTotal?: number;
  }>,
) => {
  if (items.length === 0) {
    return "Состав заказа не указан";
  }

  return items
    .map((item) => {
      const pricePart =
        typeof item.unitPrice === "number" && typeof item.lineTotal === "number"
          ? ` — ${formatAmount(item.unitPrice)} × ${item.quantity} = <b>${formatAmount(item.lineTotal)}</b>`
          : ` × ${item.quantity}`;

      return `• ${escapeHtml(item.productName)}${pricePart}`;
    })
    .join("\n");
};

export const buildNewOrderTelegramMessage = (input: {
  orderId: string;
  customerName: string;
  city: string | null;
  amount: number;
  source: string | null;
  status: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice?: number;
    lineTotal?: number;
  }>;
}) => {
  const totalUnits = input.items.reduce((sum, item) => sum + item.quantity, 0);

  return [
    "🔥 <b>Новый крупный заказ</b>",
    "",
    `Заказ: <b>#${escapeHtml(input.orderId)}</b>`,
    `Клиент: <b>${escapeHtml(input.customerName)}</b>`,
    `Город: ${escapeHtml(input.city ?? "Не указан")}`,
    `Источник: ${escapeHtml(translateSource(input.source))}`,
    `Статус: ${escapeHtml(translateStatus(input.status))}`,
    `Сумма: <b>${formatAmount(input.amount)}</b>`,
    `Позиции: ${input.items.length} | Единиц товара: ${totalUnits}`,
    "",
    "<b>Состав заказа:</b>",
    formatItemsSummary(input.items),
  ].join("\n");
};

export const sendTelegramMessage = async (input: {
  botToken: string;
  chatId: string;
  text: string;
  buttonText?: string;
  buttonUrl?: string | null;
}) => {
  const response = await fetch(`https://api.telegram.org/bot${input.botToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: input.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(input.buttonText && input.buttonUrl
        ? {
            reply_markup: {
              inline_keyboard: [[{ text: input.buttonText, url: input.buttonUrl }]],
            },
          }
        : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed with ${response.status}`);
  }

  return response.json();
};
