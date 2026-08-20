"use client";

import { useState } from "react";

const SUGGESTIONS = [
  "Is there a good gay bar in Berlin?",
  "What's an LGBTQ+-friendly hotel in Bangkok?",
  "Plan a 5-day trip to Amsterdam for 2 people",
  "I want to plan a trip but I'm not sure where to go yet",
  "Any pride events happening in Provincetown?",
  "Recommend a romantic dinner spot in Buenos Aires",
];

export function SuggestedQuestions({ onSend }: { onSend: (text: string) => void }) {
  const [open, setOpen] = useState(false);

  function handlePick(question: string) {
    onSend(question);
    setOpen(false);
  }

  return (
    <div className="absolute bottom-24 right-6 z-20">
      {open && (
        <>
          {/* Click-outside-to-close overlay */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 z-20 mb-3 w-72 rounded-2xl border border-tg-border bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-semibold text-tg-purple">
              Not sure what to ask? Try one of these:
            </p>
            <div className="flex flex-col gap-1">
              {SUGGESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => handlePick(question)}
                  className="rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-tg-pale-pink hover:text-tg-pink cursor-pointer"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Suggested questions"
        aria-expanded={open}
        className="tg-gradient flex h-12 w-12 items-center justify-center rounded-full text-xl text-white shadow-lg cursor-pointer"
      >
        💡
      </button>
    </div>
  );
}
