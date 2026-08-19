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

## Architecture

This is a demo of a 2-stage LGBTQ+ travel-assistant chat pipeline. Every user turn goes through Stage 1; Stage 2 only runs conditionally.

**Stage 1 — router + collector** (`lib/llm/stage1.ts`, `openai.gpt-oss-120b`): one `generateText()` call per turn, given the *full* conversation history, with a single system prompt (`instructions`, not a `system`-role message — see AI SDK version note below) that branches into three behaviors:
- **general** — answers directly in plain text. This is the final answer for the turn.
- **location** — never answers directly; emits a JSON object (`intent: "location"`) describing what to search for.
- **planning** — collects `destination`/`start_date`/`duration_days`/`passengers` purely by re-reading the full history each turn (no server-persisted session state). Always emits JSON (`intent: "planning"`), with `status: "incomplete"` (plus `missing_fields` and a `reply` clarifying question) or `status: "complete"` (all four `trip` fields known) once everything is known.

`app/api/chat/route.ts` parses Stage 1's output with `lib/llm/parseJson.ts` (tolerates markdown code fences around the JSON). If it doesn't parse as JSON with an `intent` field, Stage 1's raw text *is* the final answer and Stage 2 is skipped entirely. A `planning`/`incomplete` result also skips Stage 2 — the route streams `reply` as the message text and writes a `data-suggestions` chunk (`{missingFields}`) instead of `data-debug`, which the client uses to render quick-reply widgets (see Client section) instead of retrieval results.

**Retrieval** (`lib/retrieval/`): a `Retriever` interface (`search(query) -> {id, score}[]`, `getDetails(ids) -> PlaceRecord[]`) with a mock implementation (`mock.ts`) hardcoding ~12 LGBTQ+-friendly places across six cities. `index.ts` is the single swap point for a future pgvector/Postgres implementation — nothing else should import from `mock.ts` directly. The mock's scoring in `scoreOf()` deliberately weights exact city/country/category field matches far higher than generic keyword substring hits (e.g. "gay-friendly", "nightlife" appear on nearly every record) — if the dataset grows, keep that weighting or unrelated cities will pollute results.

**Stage 2 — composer** (`lib/llm/stage2.ts`, `google.gemma-4-31b`): only invoked when Stage 1 produced structured JSON. `streamText()` with the Stage 1 JSON + retrieved `PlaceRecord[]` folded into `instructions`, plus the full conversation history as `messages`. No `temperature` is passed — Gemma rejects any explicit value on this gateway.

**Route orchestration** (`app/api/chat/route.ts`): uses `createUIMessageStream`/`createUIMessageStreamResponse` (not the older `createDataStreamResponse`). For the JSON-producing paths, it writes a custom `data-debug` chunk (`{stage1Json, retrieved}`) before merging Stage 2's `streamText` result via `writer.merge(stage2.toUIMessageStream())`, so the client can render a debug panel alongside the streamed reply. For the plain-text paths it manually writes `text-start`/`text-delta`/`text-end` chunks since there's no `streamText` call to merge.

**Conversation state** (`lib/conversation.ts`): `toChatHistory()` converts the client's `UIMessage[]` (with `.parts`) into plain `{role, content}` pairs — this is what both stages' prompts are built from, independent of which model produced a given turn.

**Client** (`app/page.tsx`, `components/ChatMessage.tsx`, `components/DebugPanel.tsx`): `useChat` with `throttle: 100` (Gemma streams near word-by-word; without throttling every chunk re-renders the whole tree and re-parses markdown from scratch, which visibly freezes the page). `ChatMessage` is wrapped in `React.memo`. Assistant replies render through `react-markdown` + `remark-gfm`; user bubbles render as plain text. A `data-debug` part on a message renders `DebugPanel`, a collapsed `<details>` showing Stage 1's JSON and the retrieved records.

**Planning quick-replies** (`components/PlanningSuggestions.tsx`, `components/DatePicker.tsx`): a `data-suggestions` part renders chip buttons for `duration_days`/`passengers` and a hand-built month calendar for `start_date`, based on `missingFields`. Clicking any of them calls `sendMessage` immediately (no fill-then-send step) via a callback threaded down from `page.tsx`. `onSuggestionSend` is only passed for the *last* message while `status` is idle (`index === messages.length - 1 && !isBusy` in `page.tsx`) — once the user answers and a new turn is appended, the previous message naturally stops being "latest" and its widgets stop rendering, so there's no need to track "answered" state separately.

### AI SDK version note

This repo is pinned to `ai@7` / `@ai-sdk/react@4` / `@ai-sdk/openai@4`, which differs from older Vercel AI SDK conventions in ways that aren't obvious from general training knowledge:
- `system`-role messages inside `messages` arrays are **rejected** by `generateText`/`streamText` (`AI_InvalidPromptError`) — use the top-level `instructions` string option instead.
- `useChat` no longer manages input state (no `input`/`handleInputChange`/`handleSubmit`) — the app manages its own `useState` for the input box.
- Data streaming uses the "UI message stream" primitives (`createUIMessageStream`, `createUIMessageStreamResponse`, `writer.write`/`writer.merge`), not `createDataStreamResponse`/`StreamingTextResponse`.
- There's no `message.annotations` — custom per-message metadata is a typed `data-<name>` part in `message.parts` instead (see the `data-debug` part above).
- `createOpenAI({baseURL, apiKey}).chat(modelId)` (Chat Completions) works against this Bedrock Mantle gateway for both `gpt-oss-120b` and `gemma-4-31b`, despite some sibling eval configs suggesting the newer Responses API (`.responses(modelId)`) might be required for Gemma — if Gemma calls ever start failing gateway-side, that's the first thing to try switching in `lib/llm/providers.ts`.

Before assuming any `ai`/`@ai-sdk/*` API shape from memory, check the installed package's `.d.ts` (`node_modules/ai/dist/index.d.ts`) — this SDK generation moves fast and training-data knowledge is likely stale.
