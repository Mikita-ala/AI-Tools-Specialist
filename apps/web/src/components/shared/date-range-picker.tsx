"use client";

import type { DateRange } from "react-day-picker";
import { ru } from "react-day-picker/locale";
import { CalendarIcon } from "lucide-react";

import { formatDateRangeLabel } from "@/lib/date-range";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DateRangePicker({
  value,
  onChange,
  className,
  disabled = false,
}: {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "min-w-[260px] justify-start px-2.5 text-left font-normal",
          className,
        )}
      >
        <CalendarIcon data-icon="inline-start" />
        <span className="truncate">{formatDateRangeLabel(value, "Выберите период")}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          locale={ru}
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          numberOfMonths={2}
          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
        />
      </PopoverContent>
    </Popover>
  );
}
