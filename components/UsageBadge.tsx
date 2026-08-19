import type { ChatUIMessage } from "@/lib/chat-types";

function sumUsage(messages: ChatUIMessage[]) {
  let stage1Tokens = 0;
  let stage2Tokens = 0;
  let costUsd = 0;

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "data-usage") continue;
      stage1Tokens += part.data.stage1.inputTokens + part.data.stage1.outputTokens;
      if (part.data.stage2) {
        stage2Tokens += part.data.stage2.inputTokens + part.data.stage2.outputTokens;
      }
      costUsd += part.data.costUsd;
    }
  }

  return { stage1Tokens, stage2Tokens, costUsd };
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
}

export function UsageBadge({ messages }: { messages: ChatUIMessage[] }) {
  const { stage1Tokens, stage2Tokens, costUsd } = sumUsage(messages);
  if (stage1Tokens === 0 && stage2Tokens === 0) return null;

  return (
    <div className="ml-auto text-right text-[11px] leading-tight text-white/75">
      <div>
        S1: {formatTokens(stage1Tokens)} tok · S2: {formatTokens(stage2Tokens)} tok
      </div>
      <div>~${costUsd.toFixed(4)}</div>
    </div>
  );
}
