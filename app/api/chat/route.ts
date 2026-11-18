import { cleanContext, cleanText, GUARD_REPLY, isInjection } from "@/lib/guard";
import { LlmError, streamCompletion } from "@/lib/llm";
import { babyPrompt, therapistPrompt } from "@/lib/prompts";
import { detectCrisis } from "@/lib/safety";

type Body = {
  mode?: unknown;
  messages?: { role?: unknown; text?: unknown }[];
  context?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mode = body.mode === "baby" ? "baby" : "therapist";
  // Only "user" and "model" roles are accepted, so clients can never inject a system message.
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "model"))
    .map((m) => ({ role: m.role as "user" | "model", text: cleanText(m.text) }))
    .filter((m) => m.text)
    .slice(-20);
  if (messages.at(-1)?.role !== "user") {
    return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  const lastUser = messages.at(-1)!.text;
  const crisis = detectCrisis(lastUser);
  const crisisHeader: Record<string, string> = crisis ? { "X-Crisis": "1" } : {};
  const headers = { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", ...crisisHeader };

  // Prompt-injection screen. A crisis message is never blocked: safety comes first.
  if (!crisis && (await isInjection(lastUser))) {
    return new Response(GUARD_REPLY[mode], { headers: { ...headers, "X-Guard": "1" } });
  }

  const ctx = cleanContext(body.context);
  const system = mode === "baby" ? babyPrompt(ctx) : therapistPrompt(ctx);

  // Baby answers are longer (tips + red flags); reasoning tokens also count toward this cap.
  const maxTokens = mode === "baby" ? 1200 : 600;
  const iterator = streamCompletion(
    [
      { role: "system", content: system },
      ...messages.map((m) => ({ role: m.role === "model" ? ("assistant" as const) : ("user" as const), content: m.text })),
    ],
    { maxTokens },
  );

  // Pull the first chunk before responding so upstream failures become a proper error status.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (err) {
    console.error("LLM error", err);
    return Response.json(
      { error: err instanceof LlmError ? err.publicMessage : "Bloom couldn't reply just now. Please try again." },
      { status: 502, headers: crisisHeader },
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) controller.enqueue(encoder.encode(first.value));
        for await (const chunk of iterator) controller.enqueue(encoder.encode(chunk));
      } catch (err) {
        console.error("LLM stream error", err);
        controller.enqueue(encoder.encode("\n\n_(Sorry, I lost my train of thought. Could you say that again?)_"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers });
}
