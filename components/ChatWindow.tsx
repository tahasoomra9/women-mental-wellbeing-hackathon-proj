"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { buildContext, stamp } from "@/lib/client";
import { CRISIS_TOKEN, detectCrisis } from "@/lib/safety";
import { readStore, useStore, type ChatMessage } from "@/lib/storage";

type Mode = "therapist" | "baby";

const STARTERS: Record<Mode, string[]> = {
  therapist: [
    "I feel like I'm failing as a mum",
    "I'm so exhausted I can't think",
    "I don't feel connected to my baby",
    "I just need to vent",
  ],
  baby: [
    "How often should a newborn feed?",
    "My baby won't stop crying in the evenings",
    "How much sleep does a 2-month-old need?",
    "When should I worry about a fever?",
  ],
};

const INSIGHT_EVERY = 4; // user messages

export default function ChatWindow({ mode, placeholder }: { mode: Mode; placeholder: string }) {
  const key = mode === "therapist" ? "chat:therapist" : "chat:baby";
  const [messages, setMessages, loaded] = useStore(key, []);
  const [, setCrisis] = useStore("crisis", { active: false, ts: 0 });
  const [, setInsights] = useStore("insights", []);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reflecting, setReflecting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming]);

  const flagCrisis = () => {
    setCrisis({ active: true, ts: stamp() });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function reflect(history: ChatMessage[]) {
    setReflecting(true);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, text }) => ({ role, text })) }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights((prev) => [...prev, { ts: stamp(), ...data }].slice(-50));
      }
    } finally {
      setReflecting(false);
    }
  }

  async function send(text: string) {
    text = text.trim();
    if (!text || streaming !== null) return;
    setError(null);
    setDraft("");
    const userMsg: ChatMessage = { role: "user", text, ts: stamp() };
    const history = [...readStore(key, []), userMsg];
    setMessages(history);
    if (detectCrisis(text)) flagCrisis();

    const t = stamp();
    const context = buildContext(readStore("epds", []), readStore("checkins", []), readStore("profile", {}), t);

    setStreaming("");
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, context, messages: history.map(({ role, text }) => ({ role, text })) }),
      });
      if (res.headers.get("X-Crisis") === "1") flagCrisis();
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let crisisSeen = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        if (!crisisSeen && full.includes(CRISIS_TOKEN)) {
          crisisSeen = true;
          flagCrisis();
        }
        setStreaming(full.replace(CRISIS_TOKEN, "").trimStart());
      }
      const final = full.replace(CRISIS_TOKEN, "").trim();
      const next = [...history, { role: "model" as const, text: final, ts: stamp() }];
      setMessages(next);
      if (mode === "therapist" && next.filter((m) => m.role === "user").length % INSIGHT_EVERY === 0) {
        void reflect(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStreaming(null);
    }
  }

  const userCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 pb-4">
        {loaded && messages.length === 0 && (
          <div className="rounded-3xl bg-card p-5 shadow-sm">
            <p className="text-sm text-muted">
              {mode === "therapist"
                ? "This is a safe, private space. There's no right way to feel. Start wherever you like, or try:"
                : "Ask anything about feeding, sleep, crying or development. No question is silly. Try:"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {STARTERS[mode].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-bg px-3 py-1.5 text-left text-sm hover:border-rose"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.ts + m.role} role={m.role} text={m.text} />
        ))}
        {streaming !== null && (streaming ? <Bubble role="model" text={streaming} /> : <Typing />)}
        {error && (
          <p className="rounded-2xl bg-alert-soft px-4 py-3 text-sm text-alert">
            Couldn&apos;t reach Bloom: {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {mode === "therapist" && userCount >= 2 && (
        <button
          onClick={() => reflect(messages)}
          disabled={reflecting || streaming !== null}
          className="mb-2 self-center text-xs font-semibold text-muted underline disabled:opacity-50"
        >
          {reflecting ? "Reflecting on our chat…" : "Reflect on this conversation → Home"}
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="sticky bottom-20 flex items-end gap-2 rounded-3xl border border-line bg-card p-2 shadow-sm"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || streaming !== null}
          className="rounded-full bg-rose px-4 py-2 font-bold text-rose-ink disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "model"; text: string }) {
  const mine = role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed ${
          mine ? "rounded-br-md bg-rose text-rose-ink" : "rounded-bl-md bg-card shadow-sm"
        }`}
      >
        <RichText text={text} />
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex">
      <div className="flex gap-1 rounded-3xl rounded-bl-md bg-card px-4 py-4 shadow-sm">
        {[0, 150, 300].map((d) => (
          <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  );
}

/** Minimal markdown: paragraphs, "- " / "* " / "1. " lists, **bold**. */
function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l));
        if (isList)
          return (
            <ul key={bi} className="my-1 list-disc space-y-1 pl-5">
              {lines.map((l, li) => (
                <li key={li}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""))}</li>
              ))}
            </ul>
          );
        return (
          <p key={bi} className={bi ? "mt-2" : ""}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part.replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|$|[.,!?])/g, "$1$2"),
  );
}
