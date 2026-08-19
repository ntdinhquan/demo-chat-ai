import { createUIMessageStream, createUIMessageStreamResponse, generateId, type UIMessage } from "ai";
import { toChatHistory } from "@/lib/conversation";
import type { UsageData } from "@/lib/chat-types";
import { runStage1, type UsageInfo } from "@/lib/llm/stage1";
import { runStage2 } from "@/lib/llm/stage2";
import { estimateCostUsd } from "@/lib/llm/pricing";
import { STAGE2_MODEL_ID } from "@/lib/llm/providers";
import { retriever } from "@/lib/retrieval";

function usageChunk(stage1: UsageInfo, stage2: UsageInfo | null): { type: "data-usage"; data: UsageData } {
  const costUsd =
    estimateCostUsd(stage1.model, stage1.inputTokens, stage1.outputTokens) +
    (stage2 ? estimateCostUsd(stage2.model, stage2.inputTokens, stage2.outputTokens) : 0);

  return { type: "data-usage", data: { stage1, stage2, costUsd } };
}

export const runtime = "nodejs";

function buildRetrievalQuery(stage1: Awaited<ReturnType<typeof runStage1>>): string {
  if (stage1.kind === "location") {
    const { query } = stage1.json;
    return [query.place_name, query.city, query.country, query.location_type, ...query.keywords]
      .filter(Boolean)
      .join(" ");
  }
  if (stage1.kind === "planning") {
    return stage1.json.trip.destination;
  }
  return "";
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const history = toChatHistory(messages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const stage1 = await runStage1(history);

      if (stage1.kind === "text") {
        const id = generateId();
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: stage1.text });
        writer.write({ type: "text-end", id });
        writer.write(usageChunk(stage1.usage, null));
        return;
      }

      if (stage1.kind === "planning-incomplete") {
        const id = generateId();
        writer.write({ type: "text-start", id });
        writer.write({ type: "text-delta", id, delta: stage1.json.reply });
        writer.write({ type: "text-end", id });
        writer.write({
          type: "data-suggestions",
          data: { missingFields: stage1.json.missing_fields },
        });
        writer.write(usageChunk(stage1.usage, null));
        return;
      }

      const query = buildRetrievalQuery(stage1);
      const hits = await retriever.search(query);
      const retrieved = await retriever.getDetails(hits.map((hit) => hit.id));

      writer.write({
        type: "data-debug",
        data: { stage1Json: stage1.json, retrieved },
      });

      const stage2 = runStage2({ history, stage1Json: stage1.json, retrieved });
      writer.merge(stage2.toUIMessageStream());

      const stage2Usage = await stage2.usage;
      writer.write(
        usageChunk(stage1.usage, {
          model: STAGE2_MODEL_ID,
          inputTokens: stage2Usage.inputTokens ?? 0,
          outputTokens: stage2Usage.outputTokens ?? 0,
        }),
      );
    },
    onError: (error) => {
      console.error("chat route error", error);
      return error instanceof Error ? error.message : "An error occurred.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
