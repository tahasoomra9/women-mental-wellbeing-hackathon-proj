# Decision log: Bloom

Each entry records the decision, why we made it, and what would make us revisit it. Add new entries at the bottom and number them.

---

### D1. Scope: 5-hour hackathon MVP
**Decision:** Build four surfaces only: therapist chat, EPDS screening, daily check-in with a wellbeing score, and baby care (log and chat).
**Why:** We have 5 hours. Every build step had to leave a demoable app if we stopped after it.
**Revisit when:** The project continues past the hackathon.

### D2. AI provider: Google Gemini (`@google/genai`)
**Decision:** Use Gemini for chat and insights. The model is set by `GEMINI_MODEL`, defaulting to `gemini-3.8-flash`.
**Why:** It was the team's choice. Flash models are fast and cheap, the free tier is generous, and it streams and supports a JSON schema output mode.
**Trade-off:** One vendor. Prompts sit in `lib/prompts.ts` and all calls go through two route handlers, so switching providers touches about 3 files.

### D3. Storage: browser localStorage only, with no auth or database
**Decision:** All data (chat, EPDS, check-ins, insights, baby log, profile) lives in localStorage under the `bloom:` prefix.
**Why:** It takes no setup time, it is private by default ("everything stays on this device" is a good pitch line for mental-health data), and there is no backend to secure.
**Trade-off:** There is no sync across devices, clearing the browser loses data, and a clinician can't see it. Chat text is still sent to Gemini to generate replies.
**Revisit when:** We need accounts or clinician sharing. Supabase (Postgres plus auth) is the likely next step.

### D4. All Gemini calls go through server route handlers
**Decision:** The routes are `/api/chat` (streams text) and `/api/insight` (JSON). `lib/gemini.ts` is `server-only`.
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

---

## Open questions
- Localise hotlines for the judging region?
- Partner/support-person view (sharing the score with consent)?
- Encrypt localStorage, or move to accounts after the hackathon (D3)?
- Clinician validation of the score weights (D6).
