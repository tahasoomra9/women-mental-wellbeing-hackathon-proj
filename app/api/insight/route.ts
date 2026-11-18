import { complete } from "@/lib/llm";
import { cleanText } from "@/lib/guard";
import { INSIGHT_PROMPT, insightInput } from "@/lib/prompts";

// Strict JSON schema mode: every property required, no extra keys.
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    moodScore: { type: "number", description: "0 (very distressed) to 10 (doing well)" },
    themes: { type: "array", items: { type: "string" }, description: "Up to 3 short themes" },
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
    .map((m) => `${m.role === "user" ? "Mother" : "Bloom"}: ${cleanText(m.text)}`)
    .join("\n");

  try {
    const text = await complete(
      [
        { role: "system", content: INSIGHT_PROMPT },
        { role: "user", content: insightInput(transcript) },
      ],
      { temperature: 0.2, jsonSchema: { name: "insight", schema } },
    );
    const parsed = JSON.parse(text || "{}");
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
