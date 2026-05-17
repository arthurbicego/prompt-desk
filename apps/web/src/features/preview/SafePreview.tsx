import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import type { ItemPreview } from "@prompt-desk/shared";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export interface SafePreviewProps {
  preview?: ItemPreview | null;
  loading?: boolean;
  error?: string | null;
  onCopy?: (content: string) => void;
  className?: string;
}

export function SafePreview({ preview, loading = false, error = null, onCopy, className }: SafePreviewProps) {
  if (loading) {
    return <PreviewState title="Loading preview" body="Reading safe textual content from the backend." className={className} />;
  }

  if (error) {
    return <PreviewState title="Preview unavailable" body={error} className={className} />;
  }

  if (!preview) {
    return <PreviewState title="No preview selected" body="Select an item to inspect its safe textual preview." className={className} />;
  }

  if (preview.state !== "available") {
    return (
      <PreviewState
        title={stateTitle(preview.state)}
        body={preview.message ?? "PromptDesk will not show this content because it is not safe to preview."}
        className={className}
      />
    );
  }

  const content = preview.content ?? "";

  return (
    <section className={cn("min-h-0 min-w-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]", className)}>
      <div className="flex h-10 items-center justify-between border-b border-[var(--border)] px-3">
        <div>
          <h3 className="text-sm font-semibold">Safe preview</h3>
          <p className="text-xs text-[var(--muted)]">{preview.contentType}</p>
        </div>
        <Button variant="ghost" size="sm" disabled={!content} onClick={() => onCopy?.(content)}>
          Copy
        </Button>
      </div>
      <div className="max-h-[min(420px,45vh)] overflow-auto p-3">
        {preview.contentType === "markdown" ? (
          <div className="prose prose-invert max-w-none text-sm leading-6 text-[var(--foreground)] light:prose-slate [&_a]:break-words [&_code]:break-words [&_pre]:overflow-x-auto">
            <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-[var(--foreground)]">
            {content}
          </pre>
        )}
      </div>
    </section>
  );
}

function PreviewState({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
    </section>
  );
}

function stateTitle(state: ItemPreview["state"]): string {
  switch (state) {
    case "blocked":
      return "Blocked by safety policy";
    case "missing":
      return "File is missing";
    case "binary":
      return "Binary content";
    default:
      return "Preview unavailable";
  }
}
