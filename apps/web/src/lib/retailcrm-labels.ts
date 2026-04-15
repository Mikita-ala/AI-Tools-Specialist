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

const orderMethodLabels: Record<string, string> = {
  "shopping-cart": "Через корзину",
  phone: "По телефону",
  "one-click": "В один клик",
  "price-decrease-request": "Запрос на снижение цены",
  "landing-page": "Заявка с лендинга",
  offline: "Оффлайн",
  app: "Мобильное приложение",
  "live-chat": "Онлайн-консультант",
  terminal: "Терминал",
  "missed-call": "Пропущенный звонок",
  messenger: "Мессенджер",
};

const orderTypeLabels: Record<string, string> = {
  main: "Основной",
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

const fallback = (value: string | null | undefined, empty = "Не указано") => value ?? empty;

export const translateStatus = (value: string | null | undefined) =>
  value ? statusLabels[value] ?? value : "Не указан";

export const translateOrderMethod = (value: string | null | undefined) =>
  value ? orderMethodLabels[value] ?? value : "Не указан";

export const translateOrderType = (value: string | null | undefined) =>
  value ? orderTypeLabels[value] ?? value : "Не указан";

export const translateSource = (value: string | null | undefined) => {
  if (!value) return "Неизвестно";
  const normalized = value.trim().toLowerCase();
  return sourceLabels[normalized] ?? fallback(value, "Неизвестно");
};

