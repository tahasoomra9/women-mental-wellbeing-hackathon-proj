import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders model output as React elements (never raw HTML). react-markdown drops
// embedded HTML and unsafe URLs (javascript: etc.) by default. Images are also
// disallowed so model output can't load external images or tracking pixels.

const components: Components = {
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  h1: ({ children }) => <p className="mt-3 font-display text-lg font-semibold first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="mt-3 font-display text-lg font-semibold first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="mt-3 font-bold first:mt-0">{children}</p>,
  h4: ({ children }) => <p className="mt-3 font-bold first:mt-0">{children}</p>,
  ul: ({ children }) => <ul className="mt-2 list-disc space-y-1 pl-5 first:mt-0">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal space-y-1 pl-5 first:mt-0">{children}</ol>,
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  a: ({ href, children }) =>
    href?.startsWith("/") && !href.startsWith("//") ? (
      // In-app link (e.g. the breathing exercise Bloom suggests): show as a button-like pill.
      <Link href={href} className="mt-1 inline-block rounded-full bg-sage-soft px-3 py-1 font-bold text-sage no-underline">
        {children} →
      </Link>
    ) : (
      <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-primary underline">
        {children}
      </a>
    ),
  code: ({ children }) => <code className="rounded bg-bg px-1 py-0.5 text-[0.9em]">{children}</code>,
  blockquote: ({ children }) => <blockquote className="mt-2 border-l-4 border-primary-soft pl-3 text-muted">{children}</blockquote>,
  hr: () => <hr className="my-3 border-line" />,
  table: ({ children }) => (
    <div className="-mx-1 mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b-2 border-line px-2 py-1.5 align-bottom font-bold">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-2 py-1.5 align-top">{children}</td>,
};

export default function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} disallowedElements={["img"]} unwrapDisallowed>
      {text}
    </ReactMarkdown>
  );
}
