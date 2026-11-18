import "server-only";

// Groq (OpenAI-compatible chat completions API), called with plain fetch.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const LLM_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// Used when the primary model is rate-limited (Groq limits are per model).
export const LLM_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

type Options = {
  temperature?: number;
  maxTokens?: number;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
};

/** Error safe to show users; the upstream detail is only logged server-side. */
export class LlmError extends Error {
  constructor(
    public publicMessage: string,
    detail: string,
  ) {
    super(detail);
  }
}

function apiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new LlmError("Bloom isn't configured yet (missing API key).", "GROQ_API_KEY is not set");
  return key;
}

function body(model: string, messages: LlmMessage[], opts: Options, stream: boolean) {
  return JSON.stringify({
    model,
    messages,
    stream,
    temperature: opts.temperature ?? 0.7,
    // gpt-oss is a reasoning model: keep reasoning short and out of the output.
    // Reasoning tokens count toward this limit. Groq also counts it against the
    // tokens-per-minute quota, so keep it modest.
    max_completion_tokens: opts.maxTokens ?? 700,
    reasoning_effort: "low",
    include_reasoning: false,
    ...(opts.jsonSchema
      ? { response_format: { type: "json_schema", json_schema: { ...opts.jsonSchema, strict: true } } }
      : {}),
  });
}

async function post(messages: LlmMessage[], opts: Options, stream: boolean): Promise<Response> {
  const key = apiKey();
  const models = [LLM_MODEL, LLM_FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastDetail = "";
  for (const model of models) {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body(model, messages, opts, stream),
      cache: "no-store",
    });
    if (res.ok) return res;
    const err = await res.json().catch(() => ({}));
    lastDetail = `${model} ${res.status}: ${err?.error?.message ?? ""}`;
    console.error("Groq error", lastDetail);
    if (res.status !== 429 && res.status < 500) break; // only fall back on rate limit / server errors
  }
  throw new LlmError(
    lastDetail.includes(" 429:")
      ? "Bloom is getting a lot of messages right now. Please try again in a few seconds."
      : "Bloom couldn't reply just now. Please try again.",
    lastDetail,
  );
}

/** Non-streaming completion; returns the message text. */
export async function complete(messages: LlmMessage[], opts: Options = {}): Promise<string> {
  const res = await post(messages, opts, false);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** Streaming completion; yields text deltas parsed from Groq's SSE stream. */
export async function* streamCompletion(messages: LlmMessage[], opts: Options = {}): AsyncGenerator<string> {
  const res = await post(messages, opts, true);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const delta = JSON.parse(data).choices?.[0]?.delta?.content;
        if (delta) yield delta as string;
      } catch {
        /* ignore keep-alive / partial lines */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Speech to text (Whisper on Groq)
// ---------------------------------------------------------------------------

const WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
export const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";
// Slower but a separate rate limit; used when the turbo model is rate-limited.
export const WHISPER_FALLBACK_MODEL = process.env.GROQ_WHISPER_FALLBACK_MODEL || "whisper-large-v3";

/**
 * Transcribe a short voice note. The language is auto-detected, so Urdu, Hindi, Arabic, Spanish and
 * English all work. Returns trimmed text (empty string if nothing intelligible was heard).
 */
export async function transcribe(audio: Blob, filename: string): Promise<string> {
  const key = apiKey();
  const models = [WHISPER_MODEL, WHISPER_FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastDetail = "";
  for (const model of models) {
    const form = new FormData();
    form.append("file", audio, filename);
    form.append("model", model);
    form.append("response_format", "json");
    form.append("temperature", "0");
    const res = await fetch(WHISPER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return String(data.text ?? "").trim();
    }
    const err = await res.json().catch(() => ({}));
    lastDetail = `${model} ${res.status}: ${err?.error?.message ?? ""}`;
    console.error("Whisper error", lastDetail);
    if (res.status !== 429 && res.status < 500) break;
  }
  throw new LlmError(
    lastDetail.includes(" 429:")
      ? "Voice is busy right now. Please try again in a few seconds, or type instead."
      : "Couldn't turn that into text. Please try again, or type instead.",
    lastDetail,
  );
}
