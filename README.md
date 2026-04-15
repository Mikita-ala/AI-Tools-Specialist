# AI Tools Specialist

Мини-дашборд заказов с интеграцией `RetailCRM -> Supabase -> Vercel` и Telegram-уведомлениями для заказов свыше `50 000 ₸`.

## Что реализовано

### Шаг 1. Аккаунты и сервисы

Использованы:

- `RetailCRM` demo account
- `Supabase` free project
- `Vercel` free account
- `Telegram Bot`

### Шаг 2. Загрузка заказов в RetailCRM

В репозитории есть файл [mock_orders.json](C:/Users/orys/project/gbc-analytics-dashboard/mock_orders.json) с тестовыми заказами.

Для загрузки заказов в RetailCRM реализован импортный скрипт:

```bash
npm run import:retailcrm
```

Что делает скрипт:

- читает `mock_orders.json`
- подтягивает офферы из RetailCRM
- сопоставляет товары по названию
- отправляет заказы в RetailCRM API

### Шаг 3. Синхронизация RetailCRM -> Supabase

Реализовано два способа синхронизации:

- ручной запуск через скрипт
- автоматическая синхронизация через webhook / cron endpoint

Команды:

```bash
npm run sync:retailcrm
npm run inspect:retailcrm
```

HTTP endpoints:

- `POST /api/webhooks/retailcrm`
- `GET|POST /api/cron/sync-retailcrm`

Данные сохраняются в Supabase таблицы:

- `orders`
- `order_items`
- `telegram_notifications`

SQL-схема лежит в [supabase/schema.sql](supabase/schema.sql).

### Шаг 4. Дашборд

Сделан веб-дашборд на `Next.js 16` с чтением данных из Supabase.

Основные разделы:

- обзор
- заказы
- товары
- источники
- география

Основные виджеты:

- общее количество заказов
- общая выручка
- средний чек
- количество крупных заказов
- график заказов по дням
- график выручки по дням
- топ городов
- топ источников
- таблица последних заказов

### Шаг 5. Telegram-бот

Настроено уведомление в Telegram при появлении нового заказа на сумму больше `50 000 ₸`.

Логика:

- заказ попадает в RetailCRM
- синхронизируется в Supabase
- если сумма больше порога и уведомление еще не отправлялось, бот отправляет сообщение в Telegram
- факт отправки сохраняется в `telegram_notifications`, чтобы избежать дублей

## Стек

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS`
- `shadcn/ui`
- `Supabase`
- `RetailCRM API`
- `Telegram Bot API`
- `Turborepo`

## Структура проекта

- [apps/web](C:/Users/orys/project/gbc-analytics-dashboard/apps/web) — Next.js приложение, API routes, UI, скрипты импорта и синка
- [packages/domain](C:/Users/orys/project/gbc-analytics-dashboard/packages/domain) — доменные типы и аналитические функции
- [packages/integrations](C:/Users/orys/project/gbc-analytics-dashboard/packages/integrations) — интеграции с RetailCRM, Supabase и Telegram
- [supabase/schema.sql](C:/Users/orys/project/gbc-analytics-dashboard/supabase/schema.sql) — схема базы

Монорепо выбрано специально, чтобы дальше можно было без переезда добавлять новые приложения, например Telegram Mini App.

## Локальный запуск

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка переменных окружения

Скопировать `apps/web/.env.example` в `apps/web/.env.local` и заполнить значения:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
RETAILCRM_BASE_URL=
RETAILCRM_API_KEY=
RETAILCRM_WEBHOOK_SECRET=
CRON_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### 3. Применение схемы Supabase

Выполнить SQL из файла [supabase/schema.sql](C:/Users/orys/project/gbc-analytics-dashboard/supabase/schema.sql).

### 4. Полезные команды

```bash
npm run dev
npm run build
npm run lint
npm run inspect:retailcrm
npm run import:retailcrm
npm run sync:retailcrm
npm run export:retailcrm:catalog
npm run sync:retailcrm:catalog
```

## Какой флоу использовался

1. Создать Supabase таблицы
2. Заполнить `.env.local`
3. Проверить CRM через `npm run inspect:retailcrm`
4. При необходимости импортировать тестовые заказы через `npm run import:retailcrm`
5. Запустить ручной sync через `npm run sync:retailcrm`
6. Настроить webhook или cron для дальнейшей автоматизации
7. Проверить отправку Telegram-уведомлений

## Промпты для AI-инструмента

Ниже смысловые группы промптов, которые использовались в Claude Code / Codex в процессе работы:

- выбрать стек и базовую архитектуру под задачу
- предложить структуру проекта с учетом возможного расширения в сторону TMA
- собрать админ-дашборд на `Next.js` + `shadcn/ui`
- реализовать импорт заказов из `mock_orders.json` в RetailCRM
- написать sync-скрипт из RetailCRM в Supabase
- реализовать webhook / cron endpoint для автоматической синхронизации
- настроить Telegram-уведомления для заказов выше `50 000 ₸`
- доработать UX/UI и вручную проверить сценарии

## Где AI застревал и как это решалось

### 1. Выбор стека и архитектуры

Сначала нужно было определиться, на каком стеке строить проект и как заложить архитектуру с запасом.

Решение:

- выбрали `Next.js`, потому что он хорошо подходит под задачу, где фронт и бэк удобно держать вместе
- отказались от обычной одно-приложенной структуры в пользу монорепо, чтобы дальше можно было расширять проект без рефакторинга всей базы

### 2. Визуальная часть

AI дал базовую реализацию, но интерфейс пришлось несколько раз дорабатывать по референсам и вручную шлифовать.

Решение:

- уточняли требования по дизайну
- давали визуальные ориентиры
- доводили UI ручной итерацией после генерации

### 3. Проблемы с данными и маппингом в базе

Основная практическая сложность была не в UI, а в данных:

- часть полей ложилась не так, как ожидалось
- часть данных в Supabase отображалась некорректно
- источники заказов сначала не появились как ожидалось

Решение:

- дорабатывался mapping между RetailCRM и Supabase
- через API были добавлены и проверены нужные значения
- отдельно перепроверялись метки и источники

### 4. Статусы заказов в RetailCRM

В `mock_orders.json` заказы отправлялись со статусом `new`, но RetailCRM автоматически определял их как `offer-analog`.

Решение:

- отдельно проверили настройки CRM
- добавили товары на склад
- поправили статусы и переходы статусов на стороне CRM

Вывод:

- не все проблемы решаются кодом, часть поведения определяется конфигурацией самой CRM

### 5. Автоматическая синхронизация

Здесь был основной архитектурный выбор.

Рассматривались варианты:

1. webhook из CRM
2. `Vercel Cron`
3. `Cloudflare`
4. `Supabase cron`
5. внешние сервисы, которые добавляют hooks в CRM

Проблема:

- webhook в нужном виде со стороны CRM был ограничен
- `Vercel Cron` для бесплатного сценария показался не самым удачным вариантом

Решение:

- выбран `Supabase cron` как наиболее простой и встроенный вариант
- дополнительных внешних сервисов настраивать не пришлось
- ограничение по `Edge CPU` для этой задачи приемлемо

### 6. Telegram

С Telegram больших проблем не было.

Решение:

- настроили базовую отправку
- проверили доставку
- подредактировали формат уведомления

## Что можно улучшить дальше

- добавить публичный healthcheck для интеграций
- сделать отдельный audit log по sync-операциям
- вынести настройки порога уведомлений в UI
- добавить Telegram Mini App поверх текущего монорепо
