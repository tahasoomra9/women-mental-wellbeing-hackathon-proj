import { getGemini, GEMINI_MODEL } from "@/lib/gemini";
import { INSIGHT_PROMPT } from "@/lib/prompts";

const schema = {
  type: "object",
  properties: {
    moodScore: { type: "number", minimum: 0, maximum: 10 },
    themes: { type: "array", items: { type: "string" }, maxItems: 3 },
    suggestion: { type: "string" },
  },
  required: ["moodScore", "themes", "suggestion"],
};

export async function POST(request: Request) {
  let messages: { role: "user" | "model"; text: string }[];
  try {
    ({ messages } = await request.json());
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(messages) || !messages.some((m) => m.role === "user")) {
    return Response.json({ error: "No conversation to analyse" }, { status: 400 });
  }

  const transcript = messages
    .slice(-30)
    .map((m) => `${m.role === "user" ? "Mother" : "Bloom"}: ${m.text}`)
    .join("\n");

  try {
    const res = await getGemini().models.generateContent({
      model: GEMINI_MODEL,
      contents: transcript,
      config: {
        systemInstruction: INSIGHT_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: schema,
        temperature: 0.2,
      },
    });
    const parsed = JSON.parse(res.text ?? "{}");
    const moodScore = Math.max(0, Math.min(10, Number(parsed.moodScore)));
    if (!Number.isFinite(moodScore)) throw new Error("Bad moodScore");
    return Response.json({
      moodScore,
      themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 3).map(String) : [],
      suggestion: String(parsed.suggestion ?? ""),
    });
  } catch (err) {
    console.error("Insight error", err);
    return Response.json({ error: "Could not generate insight" }, { status: 502 });
  }
}
