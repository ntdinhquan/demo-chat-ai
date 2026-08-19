import type { UIMessage } from "ai";

/** Plain {role, content} pairs — the shape every stage's prompt is built from,
 * independent of which model produced a given turn's output. */
export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function textOf(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function toChatHistory(messages: UIMessage[]): ChatTurn[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: textOf(message),
    }));
}
