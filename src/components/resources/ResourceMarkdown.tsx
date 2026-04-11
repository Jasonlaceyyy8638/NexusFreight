import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  markdown: string;
};

const mdClass =
  "mx-auto w-full max-w-[42rem] text-[15px] leading-relaxed text-slate-300 [&_strong]:font-semibold [&_strong]:text-slate-200";

export function ResourceMarkdown({ markdown }: Props) {
  return (
    <div className={mdClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight text-white first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h3 className="mt-8 scroll-mt-24 text-xl font-semibold tracking-tight text-white first:mt-0">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="mt-6 scroll-mt-24 text-lg font-semibold text-slate-100 first:mt-0">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mt-4 max-w-full first:mt-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mt-4 list-disc space-y-2 pl-5 first:mt-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-4 list-decimal space-y-2 pl-5 first:mt-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href ?? "#"}
              className="font-medium text-sky-400 underline decoration-sky-500/30 underline-offset-2 transition-colors hover:text-sky-300 hover:decoration-sky-400/50"
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              target={href?.startsWith("http") ? "_blank" : undefined}
            >
              {children}
            </a>
          ),
          code: ({ className, children }) => {
            if (className) {
              return (
                <code className={`${className} font-mono text-sm text-slate-200`}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-sky-200">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mt-4 max-w-full overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4 first:mt-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-4 border-l-2 border-sky-500/50 pl-4 text-slate-400 first:mt-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-white/10" />,
          img: ({ src, alt }) =>
            src ? (
              <span className="my-6 block w-full max-w-full overflow-hidden rounded-lg border border-white/[0.08] bg-slate-900/40">
                {/* eslint-disable-next-line @next/next/no-img-element -- CMS / arbitrary URLs */}
                <img
                  src={src}
                  alt={alt ?? ""}
                  className="h-auto w-full max-w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </span>
            ) : null,
          table: ({ children }) => (
            <div className="my-6 w-full max-w-full overflow-x-auto overscroll-x-contain">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-white/10 text-slate-400">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-white/[0.06] px-3 py-2">{children}</td>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
