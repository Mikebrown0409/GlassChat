"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface MermaidDiagramProps {
  /** Raw mermaid syntax */
  chart: string;
  /** Optional additional styles */
  className?: string;
}

/**
 * Lightweight wrapper around the `mermaid` library that converts a mermaid
 * definition string to an inline SVG at runtime.
 *
 * The actual `mermaid` package is imported dynamically so that it never runs
 * during static/SSR execution – the library expects `window` to exist.
 */
export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(chart);

  // Re-render preview inside editor when draft changes
  const [draftSvg, setDraftSvg] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import to keep bundle size lean and avoid SSR issues
    void import("mermaid").then((mod) => {
      if (!isMounted) return;

      const mermaid = mod.default ?? mod; // CJS / ESM interop

      const prefersDark =
        typeof window !== "undefined" &&
        (window.matchMedia("(prefers-color-scheme: dark)").matches ||
          document.documentElement.classList.contains("dark"));

      mermaid.initialize({
        startOnLoad: false,
        theme: prefersDark ? "dark" : "default",
        themeVariables: {
          fontSize: "18px",
        },
      });

      const uniqueId = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

      // Use built-in render API that returns the SVG string; avoid manual DOM manipulation
      void (async () => {
        try {
          // New render signature in mermaid@10 returns an object
          const { svg } = await mermaid.render(uniqueId, chart);
          if (isMounted) setSvg(svg);
        } catch (err) {
          if (isMounted) setError(err as Error);
        }
      })();
    });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  useEffect(() => {
    if (!editorOpen) return;
    void import("mermaid").then((mod) => {
      const mermaid = mod.default ?? mod;
      const prefersDark =
        typeof window !== "undefined" &&
        (window.matchMedia("(prefers-color-scheme: dark)").matches ||
          document.documentElement.classList.contains("dark"));

      mermaid.initialize({
        startOnLoad: false,
        theme: prefersDark ? "dark" : "default",
        themeVariables: {
          fontSize: "18px",
        },
      });
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      void mermaid
        .render(id, draft)
        .then(({ svg }) => {
          setDraftSvg(svg);
          setPreviewError(null);
        })
        .catch((e: Error) => {
          setDraftSvg(null);
          setPreviewError(
            `${e.message}\n\nTip 🛠️  • Ensure participants are defined before messages.\n       • Use valid arrows like ->> or -->>.\n       • Escape special characters with quotes if needed.`,
          );
        });
    });
  }, [draft, editorOpen]);

  if (error) {
    return (
      <pre
        className={clsx(
          "rounded bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300",
          className,
        )}
      >
        Mermaid render error: {error.message}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div
        className={clsx(
          "bg-surface-2 text-muted flex items-center justify-center rounded p-4 text-sm",
          className,
        )}
      >
        Rendering diagram…
      </div>
    );
  }

  // Copy helpers
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const openEditor = () => {
    setDraft(chart);
    setEditorOpen(true);
  };

  // Render SVG with copy controls
  return (
    <div className={clsx("group relative", className)}>
      {/* Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
            <MoreVertical size={14} className="text-muted hover:text-primary" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem
            onSelect={() => void copyText(`\`\`\`mermaid\n${chart}\n\`\`\``)}
          >
            Copy Mermaid
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copyText(svg)}>
            Copy SVG
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={openEditor}>
            Edit Diagram
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Editor Modal */}
      <Dialog.Root open={editorOpen} onOpenChange={setEditorOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="bg-surface-0 fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg p-6 shadow-lg focus:outline-none">
            <Dialog.Title className="text-lg font-semibold">
              Edit Diagram
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Modify mermaid syntax and preview live.
            </Dialog.Description>
            <div className="mb-4 flex items-center justify-between">
              <span />
              <Dialog.Close className="hover:bg-surface-1 rounded p-1">
                <MoreVertical size={16} className="rotate-45" />
              </Dialog.Close>
            </div>
            {/* Stack preview on top of the editor for better visibility */}
            <div className="flex flex-col gap-4">
              <div className="max-h-[70vh] overflow-auto rounded border p-2">
                {previewError ? (
                  <pre className="text-sm whitespace-pre-wrap text-red-500">
                    {previewError}
                  </pre>
                ) : draftSvg ? (
                  // eslint-disable-next-line react/no-danger
                  <div
                    dangerouslySetInnerHTML={{
                      __html: draftSvg.replace(
                        /<svg /,
                        '<svg style="max-width:100%;height:auto;" ',
                      ),
                    }}
                  />
                ) : (
                  <span className="text-muted text-sm">Type to preview…</span>
                )}
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="border-input bg-surface-1 focus:ring-brand-primary h-40 w-full resize-none rounded-md border p-2 text-sm shadow-sm focus:ring-2 focus:outline-none"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  void copyText(`\`\`\`mermaid\n${draft}\n\`\`\``);
                  setEditorOpen(false);
                }}
                className="bg-brand-primary hover:bg-brand-primary/90 rounded px-3 py-1 text-sm text-white shadow"
              >
                Save & Copy
              </button>
              <button
                onClick={() => void copyText(draftSvg ?? "")}
                className="bg-surface-2 text-muted hover:text-primary rounded px-3 py-1 text-sm shadow disabled:opacity-50"
                disabled={!draftSvg}
              >
                Copy SVG
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Actual SVG */}
      {/* eslint-disable-next-line react/no-danger */}
      <div dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
