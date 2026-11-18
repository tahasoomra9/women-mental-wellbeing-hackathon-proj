import BloomAvatar from "@/components/BloomAvatar";
import ChatWindow from "@/components/ChatWindow";

export const metadata = { title: "Talk · Bloom" };

export default function TalkPage() {
  return (
    <>
      <header className="mb-4 flex items-center gap-3">
        <BloomAvatar size={44} />
        <div>
          <h1 className="font-display text-2xl leading-tight">Bloom</h1>
          <p className="text-sm text-muted">Here and listening, any time</p>
        </div>
      </header>
      <ChatWindow mode="therapist" placeholder="What's on your mind?" />
    </>
  );
}
