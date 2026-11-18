/** Shared screen title: same size, subtitle gap and entrance on every page. */
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: React.ReactNode }) {
  return (
    <header className="animate-fade-up">
      <h1 className="font-display text-3xl leading-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}
