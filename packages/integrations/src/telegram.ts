const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const formatItemsSummary = (
  items: Array<{
    productName: string;
    quantity: number;
  }>,
) => {
  if (items.length === 0) {
    return "No items";
  }

  return items
    .map((item) => `• ${escapeHtml(item.productName)} × ${item.quantity}`)
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
  }>;
}) =>
  [
    "<b>New order</b>",
    `Order: <b>#${escapeHtml(input.orderId)}</b>`,
    `Customer: ${escapeHtml(input.customerName)}`,
    `City: ${escapeHtml(input.city ?? "Unknown")}`,
    `Amount: <b>${input.amount.toLocaleString("ru-RU")} ₸</b>`,
    `Source: ${escapeHtml(input.source ?? "Unknown")}`,
    `Status: ${escapeHtml(input.status)}`,
    "Items:",
    formatItemsSummary(input.items),
  ].join("\n");

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
