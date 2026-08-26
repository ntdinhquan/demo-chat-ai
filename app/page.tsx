"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { SuggestedQuestions } from "@/components/SuggestedQuestions";
import { UsageBadge } from "@/components/UsageBadge";
import type { ChatUIMessage } from "@/lib/chat-types";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

export default function Home() {
  // Gemma streams near-word-by-word; without throttling, every chunk re-renders
  // the message list and re-parses the growing markdown text, which is what
  // was making the page unresponsive while a reply streamed in.
  const { messages, sendMessage, status } = useChat<ChatUIMessage>({ throttle: 100 });
  const [input, setInput] = useState("");

  const isBusy = status === "submitted" || status === "streaming";

  const mainRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Ref, not state — updated on every scroll event, but shouldn't itself
  // trigger a re-render (only the derived showScrollButton state does).
  const stickToBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  function isNearBottom() {
    const el = mainRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD_PX;
  }

  function scrollToBottom(behavior: ScrollBehavior) {
    bottomRef.current?.scrollIntoView({ behavior });
    stickToBottomRef.current = true;
    setShowScrollButton(false);
  }

  function handleScroll() {
    const atBottom = isNearBottom();
    stickToBottomRef.current = atBottom;
    setShowScrollButton(!atBottom);
  }

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    // Always snap to the newest message when the user themselves just sent
    // one, even if they'd scrolled up to read earlier history. Otherwise,
    // only auto-follow streaming replies while already at the bottom — a
    // user who scrolled away to read shouldn't get yanked back down.
    // Only the DOM scroll happens here — the resulting native `scroll` event
    // updates stickToBottomRef/showScrollButton via handleScroll below,
    // rather than setting state directly inside this effect.
    if (lastMessage?.role === "user") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

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
      <div className="relative flex h-full w-full max-w-3xl flex-col lg:max-w-4xl">
        <header className="tg-gradient flex items-center gap-2 px-6 py-5 text-white shadow-sm">
          <span className="text-xl font-bold">TravelGay</span>
          <span className="text-base opacity-90">AI Chat Demo</span>
          <UsageBadge messages={messages} />
        </header>

        <main
          ref={mainRef}
          onScroll={handleScroll}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6"
        >
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
          <div ref={bottomRef} />
        </main>

        {showScrollButton && (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="tg-gradient absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg cursor-pointer"
          >
            ↓ Jump to latest
          </button>
        )}

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
            className="tg-gradient rounded-full px-6 py-3 text-base font-medium text-white disabled:opacity-50 cursor-pointer"
          >
            Send
          </button>
        </form>

        <SuggestedQuestions onSend={submitText} />
      </div>
    </div>
  );
}
