# TravelGay AI Chat Demo

A demo chat app for TravelGay — an AI travel assistant for LGBTQ+ travelers. It showcases a 2-stage AI pipeline:

1. **Stage 1 (router)** — `openai.gpt-oss-120b` reads the full conversation history and classifies the user's message into one of three intents: a general question, a question about a specific place, or a trip-planning request.
2. **Stage 2 (composer)** — `google.gemma-4-31b` is only called when Stage 1 needs retrieved data to answer (a location question, or a trip-planning request with all the required info) and composes the final reply using that retrieved data.

For a deeper dive into the architecture and code flow, see [CLAUDE.md](./CLAUDE.md).

## Requirements

- Node.js 20 or newer (latest LTS recommended)
- npm (comes bundled with Node.js)

## 1. Install

```bash
git clone <repo-url>
cd demo-chat-ai
npm install
```

## 2. Configure environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```
## structure .env.example
```bash

AWS_BEDROCK_OPENAI_URL=
AWS_BEDROCK_OPENAI_MANTLE_PATH_URL=
OPENAI_API_KEY=
AWS_BEARER_TOKEN_BEDROCK=
```


Then fill in `.env.local` (this is the same Bedrock Mantle gateway shared with other projects in the team, like `my-ai-eval`, `promtfoo-eval-tg`, `tg-chat-ai` — ask whoever manages credentials for the real values instead of provisioning new ones):

| Variable | Purpose |
|---|---|
| `AWS_BEDROCK_OPENAI_URL` | Base URL for the Stage 1 model (`gpt-oss-120b`) |
| `AWS_BEDROCK_OPENAI_MANTLE_PATH_URL` | Base URL for the Stage 2 model (`gemma-4-31b`) |
| `OPENAI_API_KEY` | API key for the gateway |
| `AWS_BEARER_TOKEN_BEDROCK` | Fallback — used if `OPENAI_API_KEY` isn't set |

`.env.local` is already covered by `.gitignore` — never commit it.

## 3. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

A few example messages to try each branch of the pipeline:

- **General question** (unrelated to travel) → the bot just apologizes and declines:
  > "What's the weather like today?"
- **Location question** → triggers retrieval + Stage 2; a "Pipeline debug" panel appears below the reply showing Stage 1's JSON and the retrieved records:
  > "Is there a good gay bar in Berlin?"
- **Trip planning** → if info is missing (dates, duration, passengers...), the bot asks a follow-up and shows quick-reply widgets (duration chips, a date picker) so you can click instead of typing:
  > "Plan a trip for me and my husband. Destination: Riyadh, Saudi Arabia. Passengers: 2."

The place data is currently mocked — about 12 places across 6 cities: Bangkok, Berlin, Amsterdam, Provincetown, Cape Town, Buenos Aires. Asking about other cities won't return any retrieval results.

## Other commands

```bash
npm run build     # production build
npm run start     # run the production build
npm run lint      # ESLint
npx tsc --noEmit  # TypeScript type-check (no dedicated package.json script yet)
```

There's no automated test suite yet. To call the pipeline API directly without the UI (useful for debugging), use `curl`:

```bash
curl -s -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"id":"m1","role":"user","parts":[{"type":"text","text":"Is there a good gay bar in Berlin?"}]}]}'
```

The response is an SSE stream (multiple `data: {...}` lines), not plain JSON — read it raw with `curl -N` rather than trying to parse it as JSON.

## Project structure

```
app/
  page.tsx              # main chat UI
  api/chat/route.ts     # API route running the 2-stage pipeline
lib/
  llm/                  # Stage 1 / Stage 2 model calls, prompts, JSON parsing
  retrieval/             # place lookup (mock for now, swappable for a real DB later)
  conversation.ts        # converts chat history into plain {role, content} pairs
components/
  ChatMessage.tsx         # one chat bubble (markdown, debug panel, suggestions)
  DebugPanel.tsx           # shows Stage 1's JSON + retrieved records
  PlanningSuggestions.tsx  # quick-reply chips + date picker for missing trip info
  DatePicker.tsx           # hand-built calendar date picker
```

## Troubleshooting

- **API key / 401 / gateway errors** — double-check all 4 variables in `.env.local` from step 2, then restart `npm run dev` after editing it (Next.js doesn't hot-reload environment variables while the server is running).
- **Blank page or errors on startup** — run `npm install` again to make sure dependencies are all installed, then `npx tsc --noEmit` to check for type errors.
- **Curious why the bot answered a certain way** — expand the "Pipeline debug" panel under a reply (when present) to see what intent Stage 1 detected and which places got retrieved.