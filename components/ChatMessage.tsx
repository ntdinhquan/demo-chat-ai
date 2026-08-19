import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatUIMessage } from "@/lib/chat-types";
import { DebugPanel } from "./DebugPanel";
import { PlaceThumbnails } from "./PlaceThumbnails";
import { PlanningSuggestions } from "./PlanningSuggestions";

const markdownComponents = {
  a: (props: React.ComponentProps<"a">) => (
    <a {...props} target="_blank" rel="noopener noreferrer" className="text-tg-pink underline" />
  ),
  p: (props: React.ComponentProps<"p">) => <p {...props} className="mb-2 last:mb-0" />,
  ul: (props: React.ComponentProps<"ul">) => <ul {...props} className="mb-2 list-disc pl-5 last:mb-0" />,
  ol: (props: React.ComponentProps<"ol">) => <ol {...props} className="mb-2 list-decimal pl-5 last:mb-0" />,
  strong: (props: React.ComponentProps<"strong">) => <strong {...props} className="font-semibold" />,
};

export const ChatMessage = memo(function ChatMessage({
  message,
  onSuggestionSend,
}: {
  message: ChatUIMessage;
  /** Only pass this for the latest assistant message while idle — clicking a
   * suggestion on a superseded turn wouldn't make sense. */
  onSuggestionSend?: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
  const debugPart = message.parts.find((part) => part.type === "data-debug");
  const suggestionsPart = message.parts.find((part) => part.type === "data-suggestions");

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2 text-base ${
          isUser ? "tg-gradient whitespace-pre-wrap text-white" : "bg-zinc-100 text-zinc-900"
        }`}
      >
        {isUser ? text : <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{text}</ReactMarkdown>}
      </div>
      {debugPart && <PlaceThumbnails places={debugPart.data.retrieved} />}
      {debugPart && <DebugPanel data={debugPart.data} />}
      {suggestionsPart && onSuggestionSend && (
        <PlanningSuggestions data={suggestionsPart.data} onSend={onSuggestionSend} />
      )}
    </div>
  );
});
