import { complete } from "@/lib/llm";
import { cleanText } from "@/lib/guard";
import { detectCrisis } from "@/lib/safety";
import { INSIGHT_PROMPT, insightInput } from "@/lib/prompts";

// Strict JSON schema mode: every property required, no extra keys.
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    moodScore: { type: "number", description: "0 (very distressed) to 10 (doing well)" },
    themes: { type: "array", items: { type: "string" }, description: "Up to 3 short themes" },
    suggestion: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" }, description: "Up to 4 doctor-useful facts, English" },
    doctorQuestions: { type: "array", items: { type: "string" }, description: "Up to 3 questions for a clinician, English" },
  },
  required: ["moodScore", "themes", "suggestion", "keyPoints", "doctorQuestions"],
};

const HARM_NOTE = "Mentioned thoughts of self-harm or suicide (please ask about this directly)";
const HARM_WORDS = /self.?harm|suicid|kill(ing)? (her|my)self|end(ing)? (her|my) life|hurt(ing)? (her|my)self|better off (dead|without)/i;

/**
 * Safety net: if she said something that suggests self-harm, the summary must say so, even if the model
 * ran out of room or missed it. The note always goes first.
 */
function withHarmNote(points: string[], messages: { role: string; text: string }[]): string[] {
  const said = messages.filter((m) => m.role === "user").some((m) => detectCrisis(String(m.text ?? "")));
  if (!said || points.some((p) => HARM_WORDS.test(p))) return points;
  return [HARM_NOTE, ...points].slice(0, 5);
}

/** Model output is untrusted text that ends up in a document she may hand to a doctor: trim, cap and drop junk. */
function cleanList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 220))
    .filter((v) => v.length > 3)
    .slice(0, max);
}

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
      { temperature: 0.2, maxTokens: 1000, jsonSchema: { name: "insight", schema } },
    );
    const parsed = JSON.parse(text || "{}");
    const moodScore = Math.max(0, Math.min(10, Number(parsed.moodScore)));
    if (!Number.isFinite(moodScore)) throw new Error("Bad moodScore");
    return Response.json({
      moodScore,
      themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 3).map(String) : [],
      suggestion: String(parsed.suggestion ?? ""),
      keyPoints: withHarmNote(cleanList(parsed.keyPoints, 5), messages),
      doctorQuestions: cleanList(parsed.doctorQuestions, 3),
    });
  } catch (err) {
    console.error("Insight error", err);
    return Response.json({ error: "Could not generate insight" }, { status: 502 });
  }
}
