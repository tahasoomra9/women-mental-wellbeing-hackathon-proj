<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bloom: agent guide

Bloom is an AI companion for mothers in the first year after birth. It offers therapist-style chat, EPDS postpartum-depression screening, a 0–100 wellbeing score, and a baby-care helper. It is a hackathon MVP, so prefer small, working changes over abstractions. Read [decision.md](decision.md) before changing anything architectural.

## Stack
- Next.js 16.4 App Router with Turbopack. `cacheComponents` is on (see `next.config.ts`). React 19.3, TypeScript, Tailwind v4.
- Gemini via `@google/genai`. The key and model come from `.env.local` (`GEMINI_API_KEY`, optional `GEMINI_MODEL`, default `gemini-3.8-flash`).
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
| `app/page.tsx` | Dashboard: score ring, trend, insight card, nav cards, demo seed/reset |
| `app/talk/page.tsx` | Therapist chat (wraps `ChatWindow mode="therapist"`) |
| `app/screen/page.tsx` | EPDS 10-question flow and result |
| `app/checkin/page.tsx` | Daily mood / sleep / support check-in |
| `app/baby/page.tsx` | Feed/sleep/diaper quick log and baby-care chat |
| `app/api/chat/route.ts` | POST, streams plain text from Gemini. Sets `X-Crisis: 1` on risky input |
| `app/api/insight/route.ts` | POST, structured JSON `{moodScore, themes, suggestion}` |
| `components/ChatWindow.tsx` | Shared chat UI: streaming, crisis handling, auto-insight |
| `components/CrisisBanner.tsx` | Sticky hotline banner. Also exports `HotlineList` |
| `components/DisclaimerGate.tsx` | First-launch "not a therapist" modal |
| `lib/storage.ts` | Typed localStorage store and `useStore` hook (same-tab sync via custom event) |
| `lib/epds.ts` | EPDS items, scoring, risk bands |
| `lib/score.ts` | Wellbeing formula and 7-day history |
| `lib/prompts.ts` | All system prompts (therapist, baby, insight) |
| `lib/safety.ts` | Crisis regex, `CRISIS_TOKEN`, `HOTLINES` |
| `lib/gemini.ts` | Server-only Gemini client |
| `lib/client.ts` | `useNow`, `stamp`, `timeAgo`, `buildContext` |

## Rules

### Safety (do not weaken)
- Crisis detection has three layers: the client regex (`detectCrisis`), the server regex (the `X-Crisis` header), and the model emitting `[[CRISIS]]`. Keep all three. Strip the token before display.
- An EPDS item 10 (self-harm) answer above 0 must always set the crisis state and show hotlines, whatever the total.
- `computeWellbeing` must return "Needs support" when the EPDS is 13 or higher, or on any self-harm answer.
- Prompts must never diagnose, never advise on medication, and never claim to be human or a licensed therapist. User-facing copy calls Bloom an "AI companion".
- Keep the EPDS wording and scores exactly as in `lib/epds.ts`, because it is a validated instrument. Reverse-scored items are 3 and 5–10.

### Next.js / React
- Gemini is called only from route handlers, never from client code. `lib/gemini.ts` imports `server-only`.
- Pages that read localStorage are client components. Never read storage or call `Date.now()` during render: use `useStore` (its `loaded` flag) and `useNow()`, which returns `null` until mount. Inside event handlers, use `stamp()`. The react-hooks purity lint flags a bare `Date.now()` there.
- New persisted data: add the key and its type to `Store` in `lib/storage.ts`, then use `useStore(key, fallback)`. Do not call `localStorage` directly.

### Style
- Mobile-first, `max-w-md`. Use the colour tokens from `app/globals.css` (`bg-card`, `text-muted`, `bg-rose`, `text-alert`, …), not raw hex. Dark mode depends on those tokens.
- Headings use `font-display` (Fraunces). Body text is Nunito.
- Keep copy warm, short and non-judgmental, and use "you".

## Verifying a change
1. `npx tsc --noEmit && npm run lint && npm run build`.
2. `npm run dev`. On the home page, click **Load demo data** and check that the score shows about 46, "Needs support".
3. Talk: a starter chip streams a reply. Typing "I want to kill myself" shows the banner even when the API fails.
4. EPDS: all-best answers give 0, all-worst give 30, and any answer above 0 on item 10 shows hotlines.
