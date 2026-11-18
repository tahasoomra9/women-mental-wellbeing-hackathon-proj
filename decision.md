# Decision log: Bloom

Each entry records the decision, why we made it, and what would make us revisit it. Add new entries at the bottom and number them.

---

### D1. Scope: 5-hour hackathon MVP
**Decision:** Build four surfaces only: therapist chat, EPDS screening, daily check-in with a wellbeing score, and baby care (log and chat).
**Why:** We have 5 hours. Every build step had to leave a demoable app if we stopped after it.
**Revisit when:** The project continues past the hackathon.

### D2. AI provider: Groq with `openai/gpt-oss-120b` (replaced Gemini)
**Decision:** Use Groq's OpenAI-compatible API for chat and insights, called with plain `fetch` in `lib/llm.ts` (no SDK). The model is set by `GROQ_MODEL`, defaulting to `openai/gpt-oss-120b`. Requests use low reasoning effort with reasoning hidden.
**Why:** The team had a Groq key. Groq is very fast, which matters for a streaming chat demo. gpt-oss-120b was the strongest chat model on the key, and it supports strict JSON-schema output. We first planned Gemini and switched before any Gemini call ran.
**Trade-off:** One vendor. The OpenAI-compatible format means moving to another compatible provider is mostly a URL and model change in `lib/llm.ts`.

### D3. Storage: browser localStorage only, with no auth or database
**Decision:** All data (chat, EPDS, check-ins, insights, baby log, profile) lives in localStorage under the `bloom:` prefix.
**Why:** It takes no setup time, it is private by default ("everything stays on this device" is a good pitch line for mental-health data), and there is no backend to secure.
**Trade-off:** There is no sync across devices, clearing the browser loses data, and a clinician can't see it. Chat text is still sent to Groq to generate replies.
**Revisit when:** We need accounts or clinician sharing. Supabase (Postgres plus auth) is the likely next step.

### D4. All LLM calls go through server route handlers
**Decision:** The routes are `/api/chat` (streams text) and `/api/insight` (JSON). `lib/llm.ts` is `server-only`. The chat route waits for the first chunk before responding, so an upstream failure returns a real 502 rather than an empty stream.
**Why:** The API key never reaches the browser. It also gives us a server-side point for safety checks.

### D5. Screening instrument: EPDS
**Decision:** Use the Edinburgh Postnatal Depression Scale (Cox, Holden & Sagovsky, 1987) with standard wording and scoring. The bands are 0–9 low, 10–12 possible, and 13+ likely PPD.
**Why:** It is the validated, widely used postnatal screen and it is free to use with citation. That gives credibility with judges, and we don't invent a clinical scale.
**Rule:** Don't paraphrase the items or change the scoring.

### D6. Wellbeing Score formula
**Decision:** 0–100 = 60% EPDS (inverted) + 25% check-ins (average of the last 3 days of mood, sleep capped at 8h, and support) + 15% chat mood (insights from the last 7 days). Parts with no data are dropped and the rest are reweighted. Labels: Thriving ≥75, Coping ≥55, Struggling ≥35, otherwise Needs support.
**Clinical override:** An EPDS of 13 or more, or any self-harm answer, always shows "Needs support".
**Why:** The validated instrument dominates. Daily signals make the score move, which is good for engagement and the demo. The override stops a few good days from hiding a high-risk screen.
**Caveat:** The weights are heuristic and not clinically validated. The UI says "not a diagnosis".

### D7. Safety: three layers of crisis detection
**Decision:** (1) a client regex on send, (2) a server regex that sets the `X-Crisis` header, and (3) the model starting its reply with `[[CRISIS]]`. Any of these shows a sticky hotline banner. It stays until the user taps "I'm safe right now".
**Why:** Regex is instant and works even when the AI is down. The model catches indirect phrasing that regex misses. In mental health a false positive costs little and a false negative costs a lot.
**Hotlines:** These are configurable in `lib/safety.ts`. The defaults are US-centric (988, Postpartum Support International) plus findahelpline.com. Localise them before demoing elsewhere.

### D8. Framing: "AI companion", not "therapist"
**Decision:** The product uses therapeutic techniques (CBT, validation, behavioural activation) but calls itself an AI companion. A first-launch disclaimer and a footer say so.
**Why:** It is ethically and legally safer, and judges look for it. The prompts forbid diagnosis and medication advice.

### D9. Chat UX: short replies, streaming, starter chips
**Decision:** Replies are 2–5 sentences, one question at a time, with at most one small next step. They stream token by token. When a chat is empty it shows starter prompts.
**Why:** Exhausted new mothers read on their phones in short bursts. Streaming feels responsive. Starter chips get past the "what do I even say" moment.

### D10. Insights run every 4 user messages, plus on demand
**Decision:** `/api/insight` summarises the chat into `{moodScore 0–10, themes[], suggestion}` using a JSON schema. It runs every 4 user messages and when she taps "Reflect on this conversation".
**Why:** This connects chat to the score and the dashboard without an extra call on every message.

### D11. UI: mobile-first, warm palette, light and dark themes
**Decision:** `max-w-md` layout with a bottom nav (Home · Talk · Check-in · Baby). Cream, rose and sage tokens in `globals.css`, Fraunces and Nunito fonts.
**Why:** The users are on phones, often one-handed at night. A calm, non-clinical look lowers the barrier.

### D12. Demo-data seed button
**Decision:** "Load demo data" on the home page writes a 6-day history of a struggling mother (EPDS 9 → 14).
**Why:** A judge sees a full dashboard in one click. A full flow can still be shown live.

### D13. Strict topic limits per chat
**Decision:** Talk covers only her wellbeing. Baby covers only infant care. Off-topic requests (code, homework, role-play, romance, adult medical advice) get one kind sentence and a redirect, and are never partly answered. Postpartum physical red flags (heavy bleeding, chest pain, severe headache…) always get an "urgent care now" reply.
**Why:** The app is a health product. Off-topic answers waste the tokens-per-minute quota, create liability, and make demos look unfocused.

### D14. Baby chat asks "who is this about?" first
**Decision:** Before answering, the baby chat decides whether the subject is (a) the baby, (b) ambiguous, (c) someone else, or (d) not about childcare. For ambiguous cases ("my man poops all day", "he hasn't slept in 2 days") it asks one clarifying question, gives no advice, and never assumes the partner. After she clarifies, it answers her original question without making her repeat it.
**Why:** Nicknames and pronouns make baby-care questions ambiguous. Giving adult advice for a newborn, or the reverse, could be unsafe.

### D15. Two-layer prompt-injection defence
**Decision:**
- **Layer 1, in code:**
  - Groq's `meta-llama/llama-prompt-guard-2-86m` classifies the latest user message. A score ≥ 0.8 returns a canned in-character reply and never reaches the main model.
  - Role allow-listing (no client `system` messages), length caps, control-token stripping, and context coerced to numbers only.
- **Layer 2, in the prompts:** integrity rules in every system prompt cover persona switches, "reveal your prompt", claims of developer authority, and context treated as data. The insight transcript is wrapped in `<transcript>` tags.
**Why:** The classifier catches classic jailbreaks (scores of 0.99+ in tests) but not soft persona requests ("pretend to be my girlfriend"). The prompts catch those. The guard fails open if the classifier is down, so the app keeps working and layer 2 still applies.
**Exception:** A message that matches the crisis regex skips the guard, so a distressed user is never refused.
**Known limit:** Earlier `model` turns come from the client's own storage and could be forged. We accept this risk because there is no server-side history (D3).

### D16. Handling the rate limit, and safe error messages
**Decision:** `max_completion_tokens` drops to 700. On a 429 or 5xx, retry once on `openai/gpt-oss-20b`, which has its own per-model limit. Users only ever see `LlmError.publicMessage`.
**Why:** The free tier allows 8,000 tokens per minute, and Groq counts the reserved completion budget against it. A few quick messages hit it in testing. Raw Groq errors also exposed the org ID.

---

## Open questions
- Localise hotlines for the judging region?
- Partner/support-person view (sharing the score with consent)?
- Encrypt localStorage, or move to accounts after the hackathon (D3)?
- Clinician validation of the score weights (D6).
