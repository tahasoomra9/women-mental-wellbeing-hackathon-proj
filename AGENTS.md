<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bloom: agent guide

Bloom is an AI companion for mothers in the first year after birth. It offers therapist-style chat, EPDS postpartum-depression screening, a 0–100 wellbeing score, and a baby-care helper. It is a hackathon MVP, so prefer small, working changes over abstractions. Read [decision.md](decision.md) before changing anything architectural.

## Stack
- Next.js 16.4 App Router with Turbopack. `cacheComponents` is on (see `next.config.ts`). React 19.3, TypeScript, Tailwind v4.
- Groq's OpenAI-compatible API, called with plain `fetch` (no SDK) in `lib/llm.ts`. The key and model come from `.env.local` (`GROQ_API_KEY`, optional `GROQ_MODEL`, default `openai/gpt-oss-120b`). gpt-oss is a reasoning model, so requests send `reasoning_effort: "low"` and `include_reasoning: false`.
- No database and no auth. All user data is in the browser's localStorage.

## Commands
```
npm run dev      # local dev
npm run build    # must pass before you hand work back
npx tsc --noEmit
npm run lint
```

## Map
| Path | What it does |
|---|---|
| `app/page.tsx` | Home, built around talking: daily affirmation, "How are you, really?" message box and feeling chips (these hand off to Talk through the `pending` store key), breathing card, gentle care nudge, a Journey teaser with **no number** |
| `app/journey/page.tsx` | Score ring, trend, "What's shaping this", insights, check-in and EPDS links, Settings (country, demo data, reset) |
| `app/talk/page.tsx` | Therapist chat (wraps `ChatWindow mode="therapist"`) |
| `app/screen/page.tsx` | EPDS 10-question flow and result |
| `app/checkin/page.tsx` | Daily mood (drawn faces, not emoji) / sleep / support check-in |
| `components/Icon.tsx` | Inline SVG icon set. Use it instead of emoji for icons |
| `components/BloomAvatar.tsx` | Bloom's breathing gradient orb (its "presence") |
| `app/baby/page.tsx` | Feed/sleep/diaper quick log and baby-care chat |
| `app/breathe/page.tsx` | 1-minute paced breathing (in 4 / hold 2 / out 6, 5 rounds). Bloom links to it as `[Take a minute to breathe](/breathe)` |
| `components/ScoreExplainer.tsx` | "Why this score?" panel under the ring (uses `explainWellbeing`) |
| `components/CountrySelect.tsx` | Country dropdown used in onboarding, the crisis banner and the home footer |
| `app/api/chat/route.ts` | POST, streams plain text from Groq. Sets `X-Crisis: 1` on risky input |
| `app/api/insight/route.ts` | POST, structured JSON `{moodScore, themes, suggestion}` |
| `components/ChatWindow.tsx` | Shared chat UI: streaming, crisis handling, auto-insight |
| `components/Markdown.tsx` | Renders model replies with `react-markdown` + `remark-gfm` (tables). No raw HTML and no images. User messages are shown as plain text |
| `components/CrisisBanner.tsx` | Sticky hotline banner. Also exports `HotlineList` |
| `components/DisclaimerGate.tsx` | First-launch "not a therapist" modal |
| `lib/storage.ts` | Typed localStorage store and `useStore` hook (same-tab sync via custom event) |
| `lib/epds.ts` | EPDS items, scoring, risk bands |
| `lib/score.ts` | Wellbeing formula and 7-day history |
| `lib/prompts.ts` | All system prompts (therapist, baby, insight) |
| `lib/safety.ts` | Crisis regex (English only), `CRISIS_TOKEN`, per-country `COUNTRIES` hotlines, `DEFAULT_COUNTRY = "GB"`, `getHotlines()` |
| `lib/llm.ts` | Server-only Groq client: `complete()` (supports `jsonSchema`) and `streamCompletion()`. Falls back to `gpt-oss-20b` on 429/5xx. Throws `LlmError`, whose `publicMessage` is the only error text sent to the browser |
| `lib/guard.ts` | Prompt-injection classifier (`isInjection`, Llama Prompt Guard 2), `cleanText`, `cleanContext`, canned `GUARD_REPLY` |
| `lib/client.ts` | `useNow`, `stamp`, `timeAgo`, `buildContext` |

## Rules

### Safety (do not weaken)
- Crisis detection has three layers: the client regex (`detectCrisis`), the server regex (the `X-Crisis` header), and the model emitting `[[CRISIS]]`. Keep all three. Strip the token before display.
- An EPDS item 10 (self-harm) answer above 0 must always set the crisis state and show hotlines, whatever the total.
- `computeWellbeing` must return "Needs support" when the EPDS is 13 or higher, or on any self-harm answer.
- Prompts must never diagnose, never advise on medication, and never claim to be human or a licensed therapist. User-facing copy calls Bloom an "AI companion".
- Keep the EPDS wording and scores exactly as in `lib/epds.ts`, because it is a validated instrument. Reverse-scored items are 3 and 5–10.

### Voice input (Whisper)
- `components/MicButton.tsx` records with `MediaRecorder` (webm/opus, or mp4 on Safari), caps at 90s, and POSTs to `app/api/transcribe/route.ts`, which validates type (allow-list) and size (4MB) and calls `transcribe()` in `lib/llm.ts` (`whisper-large-v3-turbo`, falling back to `whisper-large-v3` on 429/5xx). Language is auto-detected; don't set one.
- The transcript goes **into the text box, never straight to Bloom**, so she can review it. Run `detectCrisis` on it immediately so the support banner doesn't wait for send. The text still goes through the normal `/api/chat` guard when sent.
- Audio is never stored. The mic is released as soon as recording stops, and on unmount. Don't leave a stream open.
- Recording state uses no red (it's reserved for crisis UI). Errors are kind, short and always offer typing as the alternative.

### Hotlines and language
- Hotline numbers are safety-critical. Only add numbers you've verified from an official source, and note the hours if the line isn't 24/7. Every country list ends with findahelpline.com.
- Bloom replies in her language and script (`LANGUAGE_RULES`, plus a final reminder at the end of each chat prompt, which the model needs). The `[[CRISIS]]` token always stays in English. The crisis regex is English-only, so for other languages the model's token is the only crisis signal.

### Scope and prompt injection (do not weaken)
- **Topic limits:** the Talk chat covers *her* wellbeing and her everyday life as a mum, including practical help (productivity, routines, chores, asking for help, food for herself). The Baby chat discusses only *her baby*. Anything else gets a one-line kind redirect (rules in `lib/prompts.ts`).
- **Baby chat, "who is this about?":** an ambiguous subject ("my man", a bare "he", adult-sounding symptoms) gets one clarifying question and no advice yet. Never give health advice for a partner or another adult there.
- **Layer 1, code (`lib/guard.ts` and the chat route):**
  - only `user`/`model` roles are accepted from the client
  - messages are capped at 2000 characters, and the last 20 are kept
  - `[[CRISIS]]` is stripped from input
  - the context is coerced to bounded numbers, so no free text from the client reaches the system prompt
  - the last user message is screened by Prompt Guard (score ≥ 0.8 returns `GUARD_REPLY`, with header `X-Guard: 1`)
- **Layer 2, prompts:** `INTEGRITY_RULES` appears in every chat prompt. The insight route wraps the transcript in `<transcript>` tags as data.
- **A crisis message is never blocked by the guard.** Safety outranks injection defence.
- Never pass raw upstream error text to the client: it contains the Groq org ID. Use `LlmError.publicMessage`.

### Form controls: use Astryx, not native inputs
- Sliders, date pickers, dropdowns and the check-in note use `@astryxdesign/core` (`Slider`, `DateInput`, `Selector`, `TextArea`). Import per component, e.g. `import { Slider } from "@astryxdesign/core/Slider"`. Don't add `<input type="range|date">` or `<select>`.
- Setup (no build plugin needed): `app/providers.tsx` wraps the app in Astryx's `Theme` + `LinkProvider`; `app/globals.css` imports `astryx.css` and `theme-neutral/theme.css`, declares the layer order, then maps Astryx colour tokens to Bloom's palette in an unlayered `:root, [data-astryx-theme]` block. Change colours in Bloom's variables, not in Astryx's.
- Every Astryx field needs a `label` (use `isLabelHidden` when we show our own heading). Don't wrap one in a `<label>`.
- Full component docs are in `node_modules/@astryxdesign/core/dist/<Component>/*.d.ts` and the package README. `npx @astryxdesign/cli init` has **not** been run, so it hasn't edited this file.
- The chat composers (Home and chat screens) stay as plain textareas on purpose: they auto-grow and are styled as one pill with the send button.

### Layout consistency
- Every screen title uses `components/PageHeader.tsx` (`text-3xl`, 1.5-unit gap to the subtitle). Home and Talk have their own hero headers on purpose.
- Page sections are spaced with `space-y-5` (or `gap-5` for the chat pages that must stretch). Cards: `rounded-3xl bg-card p-5`; link rows `p-4`; hero or empty-state cards `p-6`.
- Minimum text size is 12px (`text-xs`); never `text-[11px]`. Buttons, links and summaries need at least ~40px height (`min-h-10` or `min-h-11`).
- Astryx's theme resets every `<p>`/`<small>`; `@layer base` in `app/globals.css` undoes it so text inherits colour and size. If text inside a coloured container looks wrong, check that rule first.
- To audit layout: serve a production build, load the pages in headless Edge at 320 and 390px, and check for horizontal overflow, small tap targets and text under 12px.

### Next.js / React
- The LLM is called only from route handlers, never from client code. `lib/llm.ts` imports `server-only`. Message roles are stored as `user`/`model` in the browser and mapped to `user`/`assistant` in `app/api/chat/route.ts`.
- Strict JSON schema mode (insight route) requires every property in `required` and `additionalProperties: false`.
- Pages that read localStorage are client components. Never read storage or call `Date.now()` during render: use `useStore` (its `loaded` flag) and `useNow()`, which returns `null` until mount. Inside event handlers, use `stamp()`. The react-hooks purity lint flags a bare `Date.now()` there.
- New persisted data: add the key and its type to `Store` in `lib/storage.ts`, then use `useStore(key, fallback)`. Do not call `localStorage` directly.

### Style
- Mobile-first, `max-w-md`. Use the colour tokens from `app/globals.css` (`bg-card`, `text-muted`, `bg-primary`, `bg-peach-soft`, `text-sage`, …), not raw hex. Dark mode depends on those tokens.
- **Red (`alert`) is only for crisis and safety UI.** Scores, EPDS results and care nudges use primary (lavender), peach or amber, never red.
- Home must never show the score number. The score lives on Journey. Home celebrates effort ("checked in 3 days this week").
- Headings use `font-display` (Lora). Body text is Nunito. Use SVG icons from `components/Icon.tsx`, not emoji. Touch targets are at least 40–44px.
- Talk has a "Just listen" / "Help me through it" switch (`talkStyle`, default "listen"). In listen mode the prompt forbids advice unless she asks a direct question. See `LISTEN_REMINDER` in `lib/prompts.ts`.
- Keep copy warm, short and non-judgmental, and use "you".

## Verifying a change
1. `npx tsc --noEmit && npm run lint && npm run build`.
2. `npm run dev`. Open **Journey → Settings → Load demo data** and check that the score shows about 46, "Needs extra care".
3. Talk: a starter chip streams a reply. Typing "I want to kill myself" shows the banner even when the API fails.
4. EPDS: all-best answers give 0, all-worst give 30, and any answer above 0 on item 10 shows hotlines.
