import { LlmError, transcribe } from "@/lib/llm";

// ~90 seconds of speech is well under this in every format the browser records.
const MAX_BYTES = 4 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
};

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid upload" }, { status: 400 });
  }
  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: "No audio received" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "That recording is too long. Try a shorter one." }, { status: 413 });
  }
  // "audio/webm;codecs=opus" -> "audio/webm"
  const base = file.type.split(";")[0].trim().toLowerCase();
  const ext = EXTENSIONS[base];
  if (!ext) {
    return Response.json({ error: "Unsupported audio format" }, { status: 415 });
  }

  try {
    const text = await transcribe(file, `voice.${ext}`);
    return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Transcribe error", err);
    return Response.json(
      { error: err instanceof LlmError ? err.publicMessage : "Couldn't turn that into text. Please try again." },
      { status: 502 },
    );
  }
}
