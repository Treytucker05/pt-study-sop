import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { CALLOUT_STYLES } from "@/lib/colors";

interface ObsidianRendererProps {
  content: string;
  onWikilinkClick?: (noteName: string, shiftKey: boolean) => void;
}

/** Regex to split on [[wikilinks]] and ![[embeds]] while preserving them as tokens */
const WIKILINK_RE = /(\[\[.*?\]\])/g;

/** Obsidian embed regex: ![[filename.ext]] */
const EMBED_RE = /!\[\[(.*?)\]\]/g;

const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"];

/** Obsidian callout regex: > [!type] optional title */
const CALLOUT_RE = /^\[!([\w-]+)\]\s*(.*)?$/;

const CALLOUT_COLORS = CALLOUT_STYLES;

function renderWikilinks(text: string, onClick?: (name: string, shiftKey: boolean) => void) {
  return text.split(WIKILINK_RE).map((part, j) => {
    const match = part.match(/^\[\[(.*?)\]\]$/);
    if (match) {
      const display = match[1].includes("|") ? match[1].split("|")[1] : match[1];
      const target = match[1].includes("|") ? match[1].split("|")[0] : match[1];
      return (
        <span
          key={j}
          className="text-blue-400 hover:text-blue-300 cursor-pointer underline decoration-dotted"
          onClick={(e) => onClick?.(target, e.shiftKey)}
          title={`${target} (Shift+click for Obsidian app)`}
        >
          {display}
        </span>
      );
    }
    return <span key={j}>{part}</span>;
  });
}

/**
 * Pre-process Obsidian embeds: ![[file.png]] → markdown image via API proxy.
 * Non-image embeds become wikilink references.
 */
function preprocessEmbeds(content: string): string {
  return content.replace(EMBED_RE, (_match, filename: string) => {
    const lower = filename.toLowerCase();
    const isImage = IMAGE_EXTS.some((ext) => lower.endsWith(ext));
    if (isImage) {
      return `![${filename}](/api/obsidian/vault-file/${encodeURIComponent(filename)})`;
    }
    return `[[${filename}]]`;
  });
}

/**
 * Pre-process Obsidian markdown to handle callouts before passing to react-markdown.
 * Converts > [!type] blocks into HTML divs that react-markdown will pass through.
 */
function preprocessCallouts(content: string): string {
  const lines = content.split("\n");
  const result: string[] = [];
  let inCallout = false;
  let calloutType = "";
  let calloutTitle = "";
  let calloutBody: string[] = [];

  const flushCallout = () => {
    if (!inCallout) return;
    const colorClass = CALLOUT_COLORS[calloutType.toLowerCase()] || CALLOUT_COLORS.note;
    const title = calloutTitle || calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
    result.push(`<div class="callout ${colorClass} border-l-4 rounded px-3 py-2 my-2">`);
    result.push(`<div class="font-bold text-xs uppercase tracking-wider mb-1">${title}</div>`);
    result.push("");
    result.push(calloutBody.join("\n"));
    result.push("");
    result.push("</div>");
    inCallout = false;
    calloutBody = [];
  };

  for (const line of lines) {
    if (line.startsWith("> ")) {
      const inner = line.slice(2);
      const calloutMatch = inner.match(CALLOUT_RE);
      if (calloutMatch && !inCallout) {
        inCallout = true;
        calloutType = calloutMatch[1];
        calloutTitle = calloutMatch[2] || "";
        continue;
      }
      if (inCallout) {
        calloutBody.push(inner);
        continue;
      }
    } else if (line === ">" && inCallout) {
      calloutBody.push("");
      continue;
    } else {
      flushCallout();
    }
    result.push(line);
  }
  flushCallout();
  return result.join("\n");
}

export function ObsidianRenderer({ content, onWikilinkClick }: ObsidianRendererProps) {
  const processed = preprocessCallouts(preprocessEmbeds(content));

  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-xl font-bold text-primary border-b border-primary/30 pb-1 mb-3 mt-4">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-bold text-primary/90 border-b border-primary/20 pb-1 mb-2 mt-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold text-primary/80 mb-2 mt-3">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold text-primary/70 mb-1 mt-2">{children}</h4>
    ),
    p: ({ children }) => {
      // Render wikilinks inside paragraphs
      if (typeof children === "string") {
        return <p className="mb-2 leading-relaxed">{renderWikilinks(children, onWikilinkClick)}</p>;
      }
      return <p className="mb-2 leading-relaxed">{children}</p>;
    },
    strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
    em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5 ml-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5 ml-2">{children}</ol>,
    li: ({ children }) => {
      if (typeof children === "string") {
        return <li className="leading-relaxed">{renderWikilinks(children, onWikilinkClick)}</li>;
      }
      return <li className="leading-relaxed">{children}</li>;
    },
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary/30 pl-3 my-2 text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    code: ({ children, className }) => {
      const isBlock = className?.startsWith("language-");
      if (isBlock) {
        return (
          <code className="block bg-black/80 border border-secondary/40 rounded p-3 my-2 text-xs font-mono overflow-x-auto whitespace-pre">
            {children}
          </code>
        );
      }
      return (
        <code className="bg-secondary/40 px-1.5 py-0.5 rounded text-xs font-mono text-primary">
          {children}
        </code>
      );
    },
    pre: ({ children }) => <pre className="my-2">{children}</pre>,
    hr: () => <hr className="border-primary/20 my-4" />,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
        {children}
      </a>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-2">
        <table className="w-full text-xs border-collapse border border-secondary/40">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border border-secondary/40 bg-secondary/20 px-2 py-1 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => {
      if (typeof children === "string") {
        return <td className="border border-secondary/40 px-2 py-1">{renderWikilinks(children, onWikilinkClick)}</td>;
      }
      return <td className="border border-secondary/40 px-2 py-1">{children}</td>;
    },
    img: ({ src, alt }) => (
      <img
        src={src}
        alt={alt || ""}
        className="max-w-full rounded border border-secondary/40 my-2"
        loading="lazy"
      />
    ),
    del: ({ children }) => <del className="line-through text-muted-foreground">{children}</del>,
    input: ({ checked, ...props }) => (
      <input
        type="checkbox"
        checked={checked}
        readOnly
        className="mr-1.5 accent-primary"
        {...props}
      />
    ),
  };

  return (
    <div className="obsidian-preview prose-invert max-w-none text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        allowedElements={undefined}
        unwrapDisallowed={false}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
