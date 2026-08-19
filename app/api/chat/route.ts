import { createUIMessageStream, createUIMessageStreamResponse, generateId, type UIMessage } from "ai";
import { toChatHistory } from "@/lib/conversation";
import { runStage1 } from "@/lib/llm/stage1";
import { runStage2 } from "@/lib/llm/stage2";
import { retriever } from "@/lib/retrieval";

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
    },
    onError: (error) => {
      console.error("chat route error", error);
      return error instanceof Error ? error.message : "An error occurred.";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
