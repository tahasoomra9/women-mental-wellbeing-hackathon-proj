import { getGemini, GEMINI_MODEL } from "@/lib/gemini";
import { babyPrompt, therapistPrompt, type UserContext } from "@/lib/prompts";
import { detectCrisis } from "@/lib/safety";

type Body = {
  mode: "therapist" | "baby";
  messages: { role: "user" | "model"; text: string }[];
  context?: UserContext;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const messages = (body.messages ?? []).filter((m) => m.text?.trim()).slice(-20);
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  const lastUser = messages[messages.length - 1].text;
  const crisis = detectCrisis(lastUser);
  const ctx = body.context ?? {};
  const systemInstruction = body.mode === "baby" ? babyPrompt(ctx) : therapistPrompt(ctx);

  let stream: AsyncIterable<{ text?: string }>;
  try {
    stream = await getGemini().models.generateContentStream({
      model: GEMINI_MODEL,
      contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      config: { systemInstruction, temperature: 0.7, maxOutputTokens: 800 },
    });
  } catch (err) {
    console.error("Gemini error", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "AI service unavailable" },
      { status: 502, headers: crisis ? { "X-Crisis": "1" } : undefined },
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
        }
      } catch (err) {
        console.error("Gemini stream error", err);
        controller.enqueue(encoder.encode("\n\n_(Sorry, I lost my train of thought. Could you say that again?)_"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      ...(crisis ? { "X-Crisis": "1" } : {}),
    },
  });
}
