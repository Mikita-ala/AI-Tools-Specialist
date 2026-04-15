import type { DateRange } from "react-day-picker";

const dateLabelFormatter = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const normalizeCalendarDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const parseCalendarDate = (value: string | null | undefined): Date | undefined => {
  if (!value) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return normalizeCalendarDate(parsed);
};

export const createDateRangeFromValues = (values: Array<string | null | undefined>): DateRange | undefined => {
  const dates = values
    .map((value) => parseCalendarDate(value))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime());

  if (dates.length === 0) return undefined;

  return {
    from: dates[0],
    to: dates.at(-1),
  };
};

export const formatDateRangeLabel = (
  range: DateRange | undefined,
  fallback = "Выберите период",
) => {
  if (!range?.from) return fallback;
  if (!range.to) return dateLabelFormatter.format(range.from);

  return `${dateLabelFormatter.format(range.from)} - ${dateLabelFormatter.format(range.to)}`;
};

export const isValueWithinDateRange = (
  value: string | null | undefined,
  range: DateRange | undefined,
) => {
  if (!range?.from && !range?.to) return true;

  const parsed = parseCalendarDate(value);
  if (!parsed) return false;

  if (range.from && parsed.getTime() < normalizeCalendarDate(range.from).getTime()) {
    return false;
  }

  if (range.to && parsed.getTime() > normalizeCalendarDate(range.to).getTime()) {
    return false;
  }

  return true;
};
