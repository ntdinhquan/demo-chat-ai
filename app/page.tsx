"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { UsageBadge } from "@/components/UsageBadge";
import type { ChatUIMessage } from "@/lib/chat-types";

export default function Home() {
  // Gemma streams near-word-by-word; without throttling, every chunk re-renders
  // the message list and re-parses the growing markdown text, which is what
  // was making the page unresponsive while a reply streamed in.
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ throttle: 100 });
  const [input, setInput] = useState("");

  const isBusy = status === "submitted" || status === "streaming";

  function submitText(text: string) {
    if (!text.trim() || isBusy) return;
    sendMessage({ text });
    setInput("");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    submitText(input);
  }

  return (
    <div className="flex h-dvh w-full flex-col items-center bg-zinc-50">
      <div className="flex h-full w-full max-w-3xl flex-col lg:max-w-4xl">
        <header className="tg-gradient flex items-center gap-2 px-6 py-5 text-white shadow-sm">
          <span className="text-xl font-bold">TravelGay</span>
          <span className="text-base opacity-90">AI Chat Demo</span>
          <UsageBadge messages={messages} />
        </header>

        <main className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <p className="text-center text-base text-zinc-400">
              Ask about an LGBTQ+-friendly place, or start planning a trip.
            </p>
          )}
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              onSuggestionSend={index === messages.length - 1 && !isBusy ? submitText : undefined}
            />
          ))}
          {isBusy && <p className="text-sm text-zinc-400">Thinking…</p>}
        </main>

        <form onSubmit={handleSubmit} className="flex gap-3 border-t border-tg-border px-6 py-5">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask about a place, or plan a trip..."
            className="flex-1 rounded-full border border-tg-border px-5 py-3 text-base outline-none focus:border-tg-pink"
          />
          <button
            type="submit"
            disabled={isBusy || !input.trim()}
            className="tg-gradient rounded-full px-6 py-3 text-base font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
