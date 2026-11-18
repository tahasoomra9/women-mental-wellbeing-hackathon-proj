import { readStore, writeStore, type DoctorNote, type Insight } from "./storage";

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/**
 * Save what Bloom picked out of a chat as notes for the doctor summary. Skips near-duplicates (the same
 * point is often re-found every few messages). She can delete any of them on the "For my doctor" screen.
 */
export function addNotesFromInsight(insight: Pick<Insight, "keyPoints" | "doctorQuestions">, ts: number): void {
  const existing = readStore("doctorNotes", []);
  const seen = new Set(existing.map((n) => `${n.kind}:${norm(n.text)}`));
  const fresh: DoctorNote[] = [];
  const add = (texts: string[] | undefined, kind: DoctorNote["kind"]) => {
    for (const raw of texts ?? []) {
      const text = raw.trim();
      const key = `${kind}:${norm(text)}`;
      if (!text || seen.has(key)) continue;
      seen.add(key);
      fresh.push({ id: newId(), ts, text, kind, source: "chat" });
    }
  };
  add(insight.keyPoints, "point");
  add(insight.doctorQuestions, "question");
  if (fresh.length) writeStore("doctorNotes", [...existing, ...fresh].slice(-300));
}

export function newNote(text: string, kind: DoctorNote["kind"], ts: number): DoctorNote {
  return { id: newId(), ts, text: text.trim(), kind, source: "me" };
}
