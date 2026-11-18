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
**Hotlines:** These are per country. See D17.

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

### D13. Topic limits per chat (widened to everyday life)
**Decision:**
- **Talk** covers her wellbeing *and* her everyday life as a mum. That includes practical help with planning her day, productivity, routines around naps, chores and the mental load, asking for help, quick food ideas for herself, self-care, and going back to work. When unsure, Bloom leans towards helping.
- **Baby** covers only infant care.
- Truly off-topic requests (code, homework, essays, politics, role-play, romance, medical advice for other adults) get one kind sentence and a redirect, and are never partly answered.
- Postpartum physical red flags always get an "urgent care now" reply.
- Practical answers are realistic for someone on broken sleep (rest counts as productive). If she's struggling (EPDS ≥ 13, mood ≤ 2, sleep under 5h, or unsupported), Bloom names it, gives 2–3 items at most, and says it's okay to do less.
**Why:** The first version refused "how can I make my day more productive". That's exactly the kind of pressure the app exists to help with, so practical help with a gentle reframe *is* mental-health support. We still refuse truly off-topic requests, because they waste the tokens-per-minute quota and make the app feel unfocused.

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

### D17. Hotlines by country, UK by default
**Decision:**
- She picks her country during onboarding. The default is the **UK**. She can change it from the home page or from inside the crisis banner.
- Lists: UK, US, Ireland, Canada, Australia, India and Pakistan, plus "Other", which shows the local emergency number and findahelpline.com.
- Pakistan shows only Rescue 1122, because sources disagreed on mental-health helpline numbers.
- The country is also passed to the AI as an allow-listed code, so Bloom uses local terms (GP, health visitor, NHS 111).
**Why:** Showing a UK mother US numbers in a crisis is a real failure. We only include numbers we have verified.

### D18. Bloom replies in her language
**Decision:** Bloom replies in her language and script, including Roman Urdu/Hinglish. A final reminder sits at the end of each chat prompt, because without it crisis replies fell back to English. The insight summary is also written in her language.
**Why:** Many mothers who most need support aren't comfortable in English. **Known gap:** the client and server crisis regex is English-only. For other languages we rely on the model's `[[CRISIS]]` token, which worked in testing with Spanish.

### D19. "I need a minute" breathing exercise
**Decision:** `/breathe` offers a 1-minute paced breathing exercise (in 4, hold 2, out 6). It has a button on the home page, and Bloom can offer it once per conversation as an in-app link. Afterwards she chooses "A bit calmer" or "Still tense, let's talk".
**Why:** It gives immediate, practical relief with no AI call and no network dependency. It's also a calm, visual moment in the demo.

### D20. Explaining the score
**Decision:** Tapping the score ring shows each factor's pull relative to a baseline of 70, using the same weights as the score. Factors are listed biggest drag first, with a tip or link for each negative one, plus the change since yesterday and notes for missing data and the EPDS override.
**Why:** A score without an explanation feels like a judgment. Showing "sleep 3.5h pulled you down" makes it actionable and builds trust.

### D21. Redesign: somewhere to talk, not a scorecard
**Problem:** The home page opened on a score ring with a red "needs support" box, so the app felt like a report card on her life rather than a safe place to vent.
**Decision:**
- **Home is built around talking:** a daily affirmation, a big "How are you, really?" message box, and one-tap feelings ("Overwhelmed", "Lonely"…). These open Talk with the message already sent, using the `pending` store key. Also: the breathing card, a lavender "You deserve care too" nudge when struggling, and a Journey teaser that celebrates check-ins and **never shows a number**.
- **The score moved to an optional Journey tab.** It's framed as "Not a grade" and uses gentler labels: Blooming, Steady, Tender days, Needs extra care.
- **Talk is built for venting:** a "Just listen" / "Help me through it" switch, with "Just listen" as the default. In listen mode Bloom only reflects and validates, unless she asks a direct question or safety applies. There's also a "Start fresh" button (the conversation is summarised for Journey first), the line "Private. Saved only on this phone", and Bloom's breathing orb as a sense of presence.
- **Visual system:** calm lavender with warm peach and sage, Lora and Nunito fonts, and a soft "dawn" gradient behind every screen. Red is reserved for crisis UI. SVG icons replace emoji, and drawn faces replace the mood emoji. Bottom nav: Home · Talk · Baby · Journey.
- Local wording: "Nappy" instead of "Diaper" for UK/IE/AU/IN/PK.
**Colour pass:** Light-mode contrast was measured, and peach icons (2.0:1), amber text (3.2:1) and sage labels (3.9:1) were too faint. Deeper tones now give 3.8–6.3:1, and every text pair is at least 4.5:1 in both themes. Decorative uses (Bloom's orb, the score ring and sparkline) keep the softer `--peach-glow`. Primary buttons, the active switch and your own message bubbles use a lavender-to-mauve gradient (`.bg-brand`). Check new colour pairs for contrast before adding them.
**Why:** Mothers with PPD already feel judged. The first screen should invite her to talk, and tracking should feel like noticing patterns, not grading. A clear "just listen" mode respects that venting often doesn't need fixing.
**Verified:** headless Edge screenshots at 390×844 in light and dark mode, plus a live test of the Home → Talk flow and of both talk styles.

### D22. Astryx for form controls
**Decision:** Native sliders, date input, country dropdown and the check-in note are replaced with Astryx components (`Slider`, `DateInput`, `Selector`, `TextArea`) from `@astryxdesign/core`, using its pre-built CSS with no compiler plugin. Astryx's tokens are mapped onto Bloom's palette, so it follows our light and dark themes. `@stylexjs/stylex` is installed because Astryx lists it as a dependency, but we don't write StyleX ourselves.
**Why:** Native controls look different on every device and ignore our palette. Astryx gives accessible keyboard and touch behaviour (tested: arrow keys move the sliders, the calendar and selector open) and a consistent look.
**Not converted on purpose:** The chat composers, which are custom pill-shaped auto-growing inputs.
**Cost:** More CSS and JS in the bundle. The country picker in the crisis banner is now a custom popup; it was tested to open correctly there.

### D23. Layout audit
**Found and fixed:**
- Astryx's theme reset every `<p>`, which turned text in your own chat bubbles dark on purple and changed paragraph sizes. It's neutralised in `@layer base`.
- Screen titles, subtitle gaps and section spacing differed per page, so a shared `PageHeader` and a single `space-y-5` rhythm were introduced.
- Tap targets under 36px (Journey settings and links, the in-chat breathing link, Undo) were enlarged to at least 40px, and 11px text became 12px.
- The Baby log card had different padding from Check-in.
**Verified:** no horizontal overflow at 320 or 390px (also 360 and 430 before the fixes) on any screen, and the screens were checked visually in light mode, plus the crisis banner and a desktop width.
**Left alone:** Astryx's own inner pieces (the date field's text input and calendar icon, the slider thumb wrapper), whose enclosing controls are full-size. On desktop the app is a centred phone-width column on purpose.

---

## Open questions
- Partner/support-person view (sharing the score with consent)?
- Encrypt localStorage, or move to accounts after the hackathon (D3)?
- Clinician validation of the score weights (D6).
