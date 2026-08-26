# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server (Turbopack) on http://localhost:3000
npm run build    # production build
npm run start    # run a production build
npm run lint     # eslint
npx tsc --noEmit # type-check (no dedicated package.json script)
```

There is no test suite in this repo.

To manually exercise the pipeline without the UI, POST directly to the chat route (it expects the same body shape `useChat`'s `DefaultChatTransport` sends — `messages` as an array of UI messages with a `parts: [{type:"text", text}]` array, not a plain `content` string):

```bash
curl -s -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"m1","role":"user","parts":[{"type":"text","text":"Is there a good gay bar in Berlin?"}]}]}'
```

The response is an SSE stream of UI message chunks (`text-delta`, `data-debug`, etc.) — read it raw with `curl -N` rather than trying to parse it as JSON.

## Environment

Copy `.env.local.example` to `.env.local` and fill in the Bedrock Mantle gateway credentials (same gateway/credentials as the sibling `my-ai-eval` / `promtfoo-eval-tg` / `tg-chat-ai` projects — reuse those values rather than provisioning new ones):

- `AWS_BEDROCK_OPENAI_URL` — base URL for `openai.gpt-oss-120b` (Stage 1)
- `AWS_BEDROCK_OPENAI_MANTLE_PATH_URL` — separate base URL for `google.gemma-4-31b` (Stage 2)
- `OPENAI_API_KEY` (falls back to `AWS_BEARER_TOKEN_BEDROCK` if unset)

Retrieval also needs the `tg-datawarehouse` stack running (`docker compose up` in that sibling project) — ChromaDB on `CHROMA_URL` (default `http://localhost:8001`) and Postgres on `DATAWAREHOUSE_DATABASE_URL` (default `postgresql://db_user:db_password@localhost:5999/datawarehouse`). Without it, `hotelsRetriever` calls will fail — there's no automatic fallback to `mock.ts` anymore.

## Architecture

This is a demo of a 2-stage LGBTQ+ travel-assistant chat pipeline. Every user turn goes through Stage 1; Stage 2 only runs conditionally.

**Stage 1 — router + collector** (`lib/llm/stage1.ts`, `openai.gpt-oss-120b`): one `generateText()` call per turn, given the *full* conversation history, with a single system prompt (`instructions`, not a `system`-role message — see AI SDK version note below) that branches into three behaviors:
- **general** — answers directly in plain text. This is the final answer for the turn. A bare greeting ("hi", "chào bạn") gets a warm one-line hello + invitation to ask about travel, not the "I can only help with travel" disclaimer — that's reserved for an actual off-topic question/request.
- **location** — never answers directly; emits a JSON object (`intent: "location"`) describing what to search for.
- **planning** — collects `destination`/`start_date`/`duration_days`/`passengers` purely by re-reading the full history each turn (no server-persisted session state). Always emits JSON (`intent: "planning"`), with `status: "incomplete"` (plus `missing_fields` and a `reply` clarifying question) or `status: "complete"` (all four `trip` fields known) once everything is known. If the user asks Stage 1 to decide a missing field for them ("you choose", "I don't know", "gợi ý giúp tôi"), the prompt has it propose one concrete value in `reply` (keeping that field `null`/`status: "incomplete"` that turn) rather than filling it in unasked; a plain confirmation on the next turn ("yes"/"ok"/"được") is what actually locks the suggested value into `trip`. The prompt is built per-request via `buildSystemPrompt(todayIso)` (not a static string) so the model has today's real date to anchor sensible suggested dates against.

`app/api/chat/route.ts` parses Stage 1's output with `lib/llm/parseJson.ts` (tolerates markdown code fences around the JSON). If it doesn't parse as JSON with an `intent` field, Stage 1's raw text *is* the final answer and Stage 2 is skipped entirely. A `planning`/`incomplete` result also skips Stage 2 — the route streams `reply` as the message text and writes a `data-suggestions` chunk (`{missingFields}`) instead of `data-debug`, which the client uses to render quick-reply widgets (see Client section) instead of retrieval results.

**Retrieval** (`lib/retrieval/`): a `Retriever` interface (`search(query) -> {id, score}[]`, `getDetails(ids) -> PlaceRecord[]`). `index.ts` is the single swap point — nothing else should import an implementation directly.

The active implementation, `hotels.ts` (`hotelsRetriever`), is backed by real data from the `tg-datawarehouse` stack:
- `search()` runs a semantic query against ChromaDB's `"vaults"` collection (`lib/retrieval/chroma.ts`), embedding the query client-side with `@chroma-core/default-embed`'s `DefaultEmbeddingFunction` — this **must** match the embedding function the ingestion pipeline used ("default" / all-MiniLM-L6-v2, confirmed by the collection's `dimension: 384`), or similarity search is meaningless. Only documents with `metadata.source === "google_map_overview"` are searched — the collection also holds individual guest-review documents (`metadata.type === "review"`), which aren't useful as standalone search hits. Chroma's raw HTTP API needs `query_embeddings` directly (confirmed via a raw curl — `query_texts` alone 400s); the JS client auto-embeds `queryTexts` locally as long as `embeddingFunction` was passed to `getCollection()`.
- Each hit's `metadata.hotel_ids[0]` (a UUID) is the join key into Postgres's `datawarehouse.hotels` table (`lib/retrieval/db.ts`, plain `pg` `Pool`). `getDetails()` joins `hotels` → `countries`/`states` for name lookups (note `countries.name` is a fixed-width `character(255)` column — needs `TRIM()` in the query or results come back space-padded).
- The `hotels` table has no photo field anywhere (not in Postgres, not in Chroma metadata) — `getDetails()` always returns `photos: []` for real data. `PlaceThumbnails` already no-ops when a place has no photos, so this degrades gracefully rather than breaking.
- Only hotels exist right now (no bars/restaurants/events/venues) — a `location_type` of anything else will still search the same hotel-only collection and likely come back empty. Stage 2's existing "say so honestly, don't invent" instruction handles this correctly already.
- `mock.ts` (~12 hardcoded LGBTQ+-friendly places across six cities, with a `scoreOf()` keyword-weighting scheme) is kept for reference/local dev without the datawarehouse stack running, but isn't wired into `index.ts` anymore.

**Turbopack + native/ML packages**: `chromadb` and `@chroma-core/default-embed` pull in packages with non-JS assets (a README bundled by `@chroma-core/ai-embeddings-common`, ONNX model files, native bindings) that Turbopack's dev bundler can't statically analyze — this surfaced as `Error: Unknown module type` on `README.md`. Fixed via `serverExternalPackages` in `next.config.ts`, which tells Next.js to `require()` these at runtime instead of bundling them. `onnxruntime-node`, `sharp`, `@huggingface/transformers`, and `pg` are already externalized by Next.js's own default list; only the Chroma packages needed adding explicitly. If a similar "Unknown module type" error shows up after adding another dependency, this is the first thing to check.

**Stage 2 — composer** (`lib/llm/stage2.ts`, `google.gemma-4-31b`): only invoked when Stage 1 produced structured JSON. `streamText()` with the Stage 1 JSON + retrieved `PlaceRecord[]` folded into `instructions`, plus the full conversation history as `messages`. No `temperature` is passed — Gemma rejects any explicit value on this gateway. The prompt branches on `stage1Json.intent`: a `location` result gets a short conversational reply, while a completed `planning` result gets an explicit instruction to produce a day-by-day itinerary (`Day 1`, `Day 2`, ... up to `trip.duration_days`), slotting retrieved places in where they fit and honestly labeling any day filled with a general (non-database) suggestion.

**Reliability guards in Stage 1** (`lib/llm/stage1.ts`): `gpt-oss-120b` occasionally returns a JSON-looking-but-truncated payload, or even a fully empty response, without touching `maxOutputTokens` — this appears to be inherent model flakiness rather than something prompt changes fix outright. `runStage1` never lets either failure mode leak to the user: an empty `text` or an unparseable-but-`{`-prefixed `text` both get swapped for a short "please rephrase" fallback (logged via `console.warn` for debugging) instead of being shown as-is.

**Cost control** (`lib/llm/pricing.ts`): both stages pass `maxOutputTokens` (400 for Stage 1's short JSON/questions, 700 for Stage 2's composed reply) as a backstop against runaway generations — Stage 2's prompt also asks the model to stay concise so this rarely triggers a hard cutoff. Every turn's `generateText`/`streamText` usage is turned into a `data-usage` chunk (`{stage1, stage2, costUsd}`, priced via `estimateCostUsd()`) so `components/UsageBadge.tsx` can sum it across all messages client-side and show a running token/cost total in the header. There's no server-side session, so this total is necessarily derived from `messages` on each render rather than tracked as state. The rates in `pricing.ts` are AWS Bedrock's published Standard-tier per-token prices for US West (Oregon) — matching the `us-west-2` region baked into the Mantle gateway URLs — not the Mantle gateway's own (unpublished) rate, so treat the on-screen cost as an approximation; re-derive the constants if the gateway moves region/tier.

**Route orchestration** (`app/api/chat/route.ts`): uses `createUIMessageStream`/`createUIMessageStreamResponse` (not the older `createDataStreamResponse`). For the JSON-producing paths, it writes a custom `data-debug` chunk (`{stage1Json, retrieved}`) before merging Stage 2's `streamText` result via `writer.merge(stage2.toUIMessageStream())`, so the client can render a debug panel alongside the streamed reply. For the plain-text paths it manually writes `text-start`/`text-delta`/`text-end` chunks since there's no `streamText` call to merge.

**Conversation state** (`lib/conversation.ts`): `toChatHistory()` converts the client's `UIMessage[]` (with `.parts`) into plain `{role, content}` pairs — this is what both stages' prompts are built from, independent of which model produced a given turn.

**Client** (`app/page.tsx`, `components/ChatMessage.tsx`, `components/DebugPanel.tsx`): `useChat` with `throttle: 100` (Gemma streams near word-by-word; without throttling every chunk re-renders the whole tree and re-parses markdown from scratch, which visibly freezes the page). `ChatMessage` is wrapped in `React.memo`. Assistant replies render through `react-markdown` + `remark-gfm`; user bubbles render as plain text. A `data-debug` part on a message renders `DebugPanel`, a collapsed `<details>` showing Stage 1's JSON and the retrieved records.

**Suggested questions** (`components/SuggestedQuestions.tsx`): a floating 💡 button, absolutely positioned in the chat card (needs the card's wrapper `div` to be `relative`) above the input bar, opens a small popover of example prompts on click. Clicking one calls the same `submitText` used by the input form (sends immediately, no fill-then-edit step) — consistent with how `PlanningSuggestions` chips behave.

**Scroll behavior** (`app/page.tsx`): a `stickToBottomRef` (ref, not state — updated on every scroll event without forcing a re-render) tracks whether the user is currently near the bottom of `main`. A `useEffect` on `messages` auto-scrolls in two cases: always when the newest message is the user's own (they just sent something, even if they'd scrolled away to read history), or when already stuck to the bottom (so a streaming reply keeps following naturally, but doesn't yank the view if the user scrolled up to read). Scrolling away from the bottom surfaces a floating "↓ Jump to latest" button (`showScrollButton` state) that scrolls back down on click.

**Usage badge flourish** (`components/UsageBadge.tsx`, `.cash-flash`/`.cash-pop` keyframes in `globals.css`): re-keys the cost `<span>` on every increase so its scale/color-pulse CSS animation restarts (toggling a class alone wouldn't replay on repeat hits), plus a floating `+$delta` label that fades upward — a purely decorative "cha-ching" touch, doesn't change the underlying total logic.

**Planning quick-replies** (`components/PlanningSuggestions.tsx`, `components/DatePicker.tsx`): a `data-suggestions` part renders chip buttons for `duration_days`/`passengers` and a hand-built month calendar for `start_date`, based on `missingFields`. Clicking any of them calls `sendMessage` immediately (no fill-then-send step) via a callback threaded down from `page.tsx`. `onSuggestionSend` is only passed for the *last* message while `status` is idle (`index === messages.length - 1 && !isBusy` in `page.tsx`) — once the user answers and a new turn is appended, the previous message naturally stops being "latest" and its widgets stop rendering, so there's no need to track "answered" state separately.

### AI SDK version note

This repo is pinned to `ai@7` / `@ai-sdk/react@4` / `@ai-sdk/openai@4`, which differs from older Vercel AI SDK conventions in ways that aren't obvious from general training knowledge:
- `system`-role messages inside `messages` arrays are **rejected** by `generateText`/`streamText` (`AI_InvalidPromptError`) — use the top-level `instructions` string option instead.
- `useChat` no longer manages input state (no `input`/`handleInputChange`/`handleSubmit`) — the app manages its own `useState` for the input box.
- Data streaming uses the "UI message stream" primitives (`createUIMessageStream`, `createUIMessageStreamResponse`, `writer.write`/`writer.merge`), not `createDataStreamResponse`/`StreamingTextResponse`.
- There's no `message.annotations` — custom per-message metadata is a typed `data-<name>` part in `message.parts` instead (see the `data-debug` part above).
- `createOpenAI({baseURL, apiKey}).chat(modelId)` (Chat Completions) works against this Bedrock Mantle gateway for both `gpt-oss-120b` and `gemma-4-31b`, despite some sibling eval configs suggesting the newer Responses API (`.responses(modelId)`) might be required for Gemma — if Gemma calls ever start failing gateway-side, that's the first thing to try switching in `lib/llm/providers.ts`.

Before assuming any `ai`/`@ai-sdk/*` API shape from memory, check the installed package's `.d.ts` (`node_modules/ai/dist/index.d.ts`) — this SDK generation moves fast and training-data knowledge is likely stale.
