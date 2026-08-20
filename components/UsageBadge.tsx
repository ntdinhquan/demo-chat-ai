import { useEffect, useRef, useState } from "react";
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
  const prevCostRef = useRef(costUsd);
  const [flashKey, setFlashKey] = useState(0);
  const [delta, setDelta] = useState(0);

  // Every time the running total ticks up, re-key the flash span so its CSS
  // animation restarts (a plain class toggle wouldn't replay on repeat hits) —
  // a little "casino" flourish on the cost readout rather than a flat number.
  useEffect(() => {
    const diff = costUsd - prevCostRef.current;
    if (diff > 1e-9) {
      setDelta(diff);
      setFlashKey((key) => key + 1);
    }
    prevCostRef.current = costUsd;
  }, [costUsd]);

  if (stage1Tokens === 0 && stage2Tokens === 0) return null;

  return (
    <div className="ml-auto text-right text-[12px] leading-tight text-white/75">
      <div>
        S1: {formatTokens(stage1Tokens)} tok · S2: {formatTokens(stage2Tokens)} tok
      </div>
      <div className="relative inline-block">
        <span key={flashKey} className={flashKey > 0 ? "cash-flash" : undefined}>
          ~${costUsd.toFixed(4)}
        </span>
        {flashKey > 0 && (
          <span
            key={`pop-${flashKey}`}
            className="cash-pop pointer-events-none absolute -top-3 right-0 font-semibold text-amber-300"
          >
            +${delta.toFixed(4)}
          </span>
        )}
      </div>
    </div>
  );
}
