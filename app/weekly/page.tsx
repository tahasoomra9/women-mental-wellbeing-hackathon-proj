"use client";

import Link from "next/link";
import { useState } from "react";
import { TextInput } from "@astryxdesign/core/TextInput";
import Icon from "@/components/Icon";
import PageHeader from "@/components/PageHeader";
import { stamp, useNow } from "@/lib/client";
import { addNotesFromInsight, newNote } from "@/lib/notes";
import { buildPdf, downloadBlob, needsLatinWarning } from "@/lib/pdf";
import { buildReport, formatDay, hasAnyData, MOOD_LABELS, type Report } from "@/lib/report";
import { fmtHours } from "@/lib/sleep";
import { DAY, readStore, useStore, type DoctorNote } from "@/lib/storage";

export default function WeeklyPage() {
  const [profile, , profileLoaded] = useStore("profile", {});
  const [epds] = useStore("epds", []);
  const [checkins] = useStore("checkins", []);
  const [sleepLog] = useStore("sleepLog", []);
  const [babyLog] = useStore("babyLog", []);
  const [insights, setInsights] = useStore("insights", []);
  const [notes, setNotes] = useStore("doctorNotes", []);
  const [offset, setOffset] = useState(0); // 0 = the 7 days ending today
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"pdf" | "chats" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const now = useNow();

  if (!profileLoaded || now === null) return <div className="h-64" />;

  const endTs = now - offset * 7 * DAY;
  const report = buildReport({ profile, epds, checkins, sleepLog, babyLog, insights, doctorNotes: notes }, endTs);
  const empty = !hasAnyData(report);
  const allText = [
    ...report.points.map((n) => n.text),
    ...report.questions.map((n) => n.text),
    ...report.checkinNotes.map((n) => n.text),
    ...report.about.map((a) => a.value),
  ];
  const lossy = needsLatinWarning(allText);

  function addNote(kind: DoctorNote["kind"]) {
    const text = draft.trim();
    if (!text) return;
    setNotes((prev) => [...prev, newNote(text.slice(0, 300), kind, endTs)].slice(-300));
    setDraft("");
  }

  async function updateFromChats() {
    setBusy("chats");
    setMessage(null);
    try {
      const chat = readStore("chat:therapist", []);
      if (!chat.some((m) => m.role === "user")) {
        setMessage("There's no conversation with Bloom to read yet. Talk to Bloom first, and I'll pick out the useful bits.");
        return;
      }
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chat.map(({ role, text }) => ({ role, text })) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInsights((prev) => [...prev, { ts: stamp(), ...data }].slice(-50));
      addNotesFromInsight(data, stamp());
      setMessage("Updated from your recent chats.");
    } catch {
      setMessage("Couldn't read your chats just now. Please try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("pdf");
    setMessage(null);
    try {
      const { blob, filename } = await buildPdf(report);
      downloadBlob(blob, filename);
      setMessage("Your summary is ready. Check your downloads.");
    } catch {
      setMessage("Couldn't create the PDF on this device. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader title="For my doctor" subtitle="A one-week summary to bring to an appointment, saved as a PDF." />

      {/* Week switcher */}
      <div className="flex items-center justify-between rounded-3xl bg-card p-2 shadow-sm">
        <button
          onClick={() => setOffset((o) => o + 1)}
          aria-label="Previous week"
          className="flex h-11 w-11 items-center justify-center rounded-full text-primary"
        >
          <Icon name="chevron" className="h-5 w-5 rotate-180" strokeWidth={2.25} />
        </button>
        <p className="text-center text-sm font-bold">
          {offset === 0 ? "Last 7 days" : `${offset} week${offset === 1 ? "" : "s"} ago`}
          <span className="block text-xs font-normal text-muted">
            {formatDay(report.rangeStart)} to {formatDay(report.rangeEnd)}
          </span>
        </p>
        <button
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
          disabled={offset === 0}
          aria-label="Next week"
          className="flex h-11 w-11 items-center justify-center rounded-full text-primary disabled:opacity-30"
        >
          <Icon name="chevron" className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>

      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted">
        <Icon name="lock" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Only you see this. The PDF is made on your phone and goes nowhere unless you share it. Remove anything you would rather not include.
      </p>

      {report.about.length === 0 && (
        <Link href="/about" className="flex min-h-11 items-center gap-2 rounded-2xl bg-primary-soft px-4 text-sm font-bold text-primary">
          <Icon name="user" className="h-4 w-4" /> Add your age and your baby&apos;s details to the summary
        </Link>
      )}

      {empty ? (
        <div className="rounded-3xl bg-card p-6 text-center shadow-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sage-soft text-sage">
            <Icon name="file" className="h-7 w-7" />
          </span>
          <p className="mt-4 font-display text-xl">Nothing for this week yet</p>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
            Check in, log your sleep or talk to Bloom, and what matters will collect here ready for your appointment.
          </p>
        </div>
      ) : (
        <>
          <Glance report={report} />

          {/* Notes picked from chats, plus her own: she controls what goes in the PDF */}
          <div className="rounded-3xl bg-card p-5 shadow-sm">
            <p className="font-bold">Things worth mentioning</p>
            <p className="mt-0.5 text-xs text-muted">Bloom picks these out of your chats. Remove anything you don&apos;t want in the PDF.</p>
            <NoteList items={report.points} onRemove={(id) => setNotes((p) => p.filter((n) => n.id !== id))} empty="Nothing yet this week." />

            <p className="mt-5 font-bold">Questions to ask</p>
            <NoteList items={report.questions} onRemove={(id) => setNotes((p) => p.filter((n) => n.id !== id))} empty="No questions yet." />

            <div className="mt-5">
              <TextInput
                label="Add your own note"
                value={draft}
                onChange={setDraft}
                placeholder="e.g. Heart racing at night"
                width="100%"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => addNote("point")}
                  disabled={!draft.trim()}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary-soft text-sm font-bold text-primary disabled:opacity-40"
                >
                  <Icon name="plus" className="h-4 w-4" strokeWidth={2.25} /> Add as note
                </button>
                <button
                  onClick={() => addNote("question")}
                  disabled={!draft.trim()}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary-soft text-sm font-bold text-primary disabled:opacity-40"
                >
                  <Icon name="plus" className="h-4 w-4" strokeWidth={2.25} /> Add as question
                </button>
              </div>
            </div>

            {offset === 0 && (
              <button
                onClick={updateFromChats}
                disabled={busy !== null}
                className="mt-4 flex min-h-11 items-center gap-2 text-sm font-bold text-primary underline disabled:opacity-50"
              >
                <Icon name="refresh" className="h-4 w-4" />
                {busy === "chats" ? "Reading your chats..." : "Update from my recent chats"}
              </button>
            )}
          </div>

          {lossy && (
            <p className="rounded-2xl bg-amber-soft px-4 py-3 text-sm">
              Some of your notes use letters the PDF can&apos;t display, so they will show as question marks. Writing them in English or Latin letters fixes this.
            </p>
          )}
        </>
      )}

      {message && (
        <p role="status" className="rounded-2xl bg-sage-soft px-4 py-3 text-sm">
          {message}
        </p>
      )}

      <button
        onClick={download}
        disabled={busy !== null || empty}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand font-bold text-primary-ink disabled:opacity-40"
      >
        <Icon name="download" className="h-5 w-5" strokeWidth={2} />
        {busy === "pdf" ? "Making your PDF..." : "Download PDF"}
      </button>
    </section>
  );
}

function Glance({ report }: { report: Report }) {
  const items = [
    { label: "Average mood", value: report.avgMood === null ? "-" : MOOD_LABELS[Math.round(report.avgMood) - 1] },
    { label: "Sleep a day", value: fmtHours(report.sleep.avgHours) },
    { label: "Longest stretch", value: fmtHours(report.sleep.avgLongest) },
    {
      label: "Screening",
      value: report.epds.latest ? `${report.epds.latest.total}/30` : "-",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((i) => (
        <div key={i.label} className="rounded-3xl bg-card p-4 shadow-sm">
          <p className="text-xs text-muted">{i.label}</p>
          <p className="mt-1 font-display text-2xl">{i.value}</p>
        </div>
      ))}
    </div>
  );
}

function NoteList({ items, onRemove, empty }: { items: DoctorNote[]; onRemove: (id: string) => void; empty: string }) {
  if (!items.length) return <p className="mt-2 text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-2 space-y-2">
      {items.map((n) => (
        <li key={n.id} className="flex items-start gap-2 rounded-2xl bg-bg px-3 py-2 text-sm">
          <span className="flex-1 leading-relaxed">
            {n.text}
            <span className="ml-2 text-xs text-muted">{n.source === "me" ? "(my note)" : "(from my chats)"}</span>
          </span>
          <button
            onClick={() => onRemove(n.id)}
            aria-label={`Remove: ${n.text}`}
            className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:text-primary"
          >
            <Icon name="x" className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </li>
      ))}
    </ul>
  );
}
