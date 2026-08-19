"use client";

import { useState } from "react";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function DatePicker({ onSelect }: { onSelect: (isoDate: string) => void }) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function goToMonth(offset: number) {
    const next = new Date(viewYear, viewMonth + offset, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-xl border border-tg-border bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          aria-label="Previous month"
          className="rounded px-2 text-tg-purple hover:bg-tg-pale-pink"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-tg-purple">{monthLabel}</span>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          aria-label="Next month"
          className="rounded px-2 text-tg-purple hover:bg-tg-pale-pink"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400">
        {WEEKDAYS.map((weekday, i) => (
          <div key={i}>{weekday}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const isPast = new Date(viewYear, viewMonth, day) < startOfToday;
          const isoDate = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
          return (
            <button
              key={day}
              type="button"
              disabled={isPast}
              onClick={() => onSelect(isoDate)}
              className="rounded-full py-1 text-zinc-700 hover:bg-tg-pale-pink hover:text-tg-pink disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
