/** Bloom's "presence": a soft, slowly breathing gradient orb. Gives the feeling that someone is here. */
export default function BloomAvatar({ size = 40, calm = false }: { size?: number; calm?: boolean }) {
  return (
    <span
      aria-hidden
      className={`relative inline-block shrink-0 rounded-full ${calm ? "" : "animate-bloom"}`}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 30% 30%, var(--peach-soft) 0%, var(--peach-glow) 35%, var(--primary) 100%)",
        boxShadow: "0 6px 20px -6px var(--primary)",
      }}
    >
      <span
        className="absolute rounded-full"
        style={{ inset: size * 0.18, background: "radial-gradient(circle at 35% 35%, #ffffffaa, transparent 70%)" }}
      />
    </span>
  );
}
