import type { SuggestionsData } from "@/lib/chat-types";
import { DatePicker } from "./DatePicker";

const DURATION_OPTIONS = [2, 3, 4, 5, 7];
const PASSENGER_OPTIONS = [
  { label: "Just me", value: "1 person" },
  { label: "2 people", value: "2 people" },
  { label: "3 people", value: "3 people" },
  { label: "5 people", value: "5 people" },
];

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-tg-border bg-white px-4 py-1.5 text-sm text-tg-purple hover:border-tg-pink hover:text-tg-pink"
    >
      {label}
    </button>
  );
}

export function PlanningSuggestions({
  data,
  onSend,
}: {
  data: SuggestionsData;
  onSend: (text: string) => void;
}) {
  const { missingFields } = data;

  return (
    <div className="mt-2 flex max-w-[85%] flex-col gap-3">
      {missingFields.includes("duration_days") && (
        <div>
          <p className="mb-1 text-xs text-zinc-400">Choose how many days</p>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((days) => (
              <Chip key={days} label={`${days} days`} onClick={() => onSend(`${days} days`)} />
            ))}
          </div>
        </div>
      )}
      {missingFields.includes("passengers") && (
        <div>
          <p className="mb-1 text-xs text-zinc-400">How many travelers?</p>
          <div className="flex flex-wrap gap-2">
            {PASSENGER_OPTIONS.map((option) => (
              <Chip key={option.label} label={option.label} onClick={() => onSend(option.value)} />
            ))}
          </div>
        </div>
      )}
      {missingFields.includes("start_date") && (
        <div>
          <p className="mb-1 text-xs text-zinc-400">When do you want to travel?</p>
          <DatePicker onSelect={(isoDate) => onSend(isoDate)} />
        </div>
      )}
    </div>
  );
}
