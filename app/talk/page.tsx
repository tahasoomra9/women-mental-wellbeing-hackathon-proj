import ChatWindow from "@/components/ChatWindow";

export const metadata = { title: "Talk · Bloom" };

export default function TalkPage() {
  return (
    <>
      <header className="mb-4">
        <h1 className="font-display text-3xl font-semibold">Talk it through</h1>
        <p className="text-sm text-muted">Whatever you&apos;re feeling is allowed here.</p>
      </header>
      <ChatWindow mode="therapist" placeholder="How are you, really?" />
    </>
  );
}
