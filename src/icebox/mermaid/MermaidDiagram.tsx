// @ts-nocheck
"use client";

// === Archived Implementation: MermaidDiagram ===
// This is the original, fully-featured Mermaid diagram renderer that was
// removed from the main bundle in Phase 2.  It remains here for reference
// purposes only. Nothing in the primary application imports this file.
// If you want diagram rendering back, move the component out of `icebox/`
// and add `mermaid` back to package.json.

import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  /** When false the dropdown menu + inline editor are hidden */
  showControls?: boolean;
  /** Callback when user saves changes */
  onSave?: (newChart: string) => void;
  messageId?: string;
}

// Simple in-memory cache of rendered SVG keyed by diagram string
const svgCache = new Map<string, string>();

// Singleton flag to ensure we only call mermaid.initialize() once
let isMermaidInitialized = false;

/**
 * Lightweight wrapper around the `mermaid` library that converts a mermaid
 * definition string to an inline SVG at runtime.
 *
 * The actual `mermaid` package is imported dynamically so that it never runs
 * during static/SSR execution – the library expects `window` to exist.
 */
export function MermaidDiagram({
  chart,
  className,
  showControls = true,
  onSave,
  messageId,
}: MermaidDiagramProps) {
  const [localChart, setLocalChart] = useState(chart);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(chart);
  const [draftSvg, setDraftSvg] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const router = useRouter();

  // Ensure SVGs are intrinsically responsive without hard-coding the viewBox.
  //  1. If the SVG already has a viewBox we simply inject a responsive style.
  //  2. Otherwise derive the viewBox from explicit width/height attributes.
  //  3. Fallback to injecting the responsive style only.
  const makeResponsiveSvg = (rawSvg: string) => {
    if (rawSvg.includes("viewBox=")) {
      return rawSvg.replace(
        /<svg([^>]*)>/,
        '<svg$1 style="max-width:100%;height:auto;">',
      );
    }

    const sizeMatch = /width="(\d+\.?\d*)[^\"]*"[^>]*height="(\d+\.?\d*)/.exec(
      rawSvg,
    );
    if (sizeMatch) {
      const [, width, height] = sizeMatch;
      return rawSvg.replace(
        /<svg([^>]*)>/,
        `<svg$1 style="max-width:100%;height:auto;" viewBox="0 0 ${width} ${height}">`,
      );
    }

    return rawSvg.replace(
      /<svg([^>]*)>/,
      '<svg$1 style="max-width:100%;height:auto;">',
    );
  };

  // Helper to normalise ER modifiers like "PK FK" -> "PK, FK" for Mermaid parser compatibility
  const normalizeERModifiers = (src: string) =>
    src.replace(/\b(PK|FK)\s+(PK|FK)\b/g, (_m, a, b) => `${a}, ${b}`);

  /**
   * Clean up common spacing mistakes around ER relationship cardinality tokens
   * without modifying valid sequences like "o{", "}|", "||" etc.
   */
  const tidyCardinalitySpacing = (src: string) =>
    src
      .replace(/\|\s*\|/g, "||")
      .replace(/\|\s*(?=-)/g, "|")
      .replace(/(^|[^|])\|(?=-)/g, "$1||")
      .replace(/([|o}])-{3,}/g, "$1--")
      .replace(/o\s*\{/g, "o{")
      .replace(/}\s*\|/g, "}|");

  // No preprocessing – feed Mermaid exactly what the user typed.
  const preprocess = (src: string) => src;

  // Debounce helper
  function useDebounce<T>(value: T, delay: number) {
    const [debounced, setDebounced] = useState(value);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    useEffect(() => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setDebounced(value), delay);
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, [value, delay]);
    return debounced;
  }

  const debouncedDraft = useDebounce(draft, 300);

  // Initial render of main chart
  useEffect(() => {
    let isMounted = true;

    const cached = svgCache.get(chart);
    if (cached) {
      setSvg(cached);
      setLocalChart(chart);
      return; // skip heavy render
    }

    void import("mermaid").then((mod) => {
      if (!isMounted) return;

      const mermaid = mod.default ?? mod;

      const prefersDark =
        typeof window !== "undefined" &&
        (window.matchMedia("(prefers-color-scheme: dark)").matches ||
          document.documentElement.classList.contains("dark"));

      if (!isMermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: prefersDark ? "dark" : "default",
          themeVariables: { fontSize: "18px" },
        });
        (mermaid as unknown as { parseError?: () => void }).parseError = () => {};
        isMermaidInitialized = true;
      }

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

      (async () => {
        try {
          void mermaid.parse(chart);
          const { svg } = await mermaid.render(id, chart);
          if (isMounted) {
            const rendered = makeResponsiveSvg(svg);
            setSvg(rendered);
            svgCache.set(chart, rendered);
          }
        } catch (err) {
          if (isMounted) setError(err as Error);
        }
      })();
    });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  // Live preview while editing
  useEffect(() => {
    if (!editorOpen) return;
    void import("mermaid").then((mod) => {
      const mermaid = mod.default ?? mod;

      if (!isMermaidInitialized) return; // already configured in init effect

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid
        .render(id, debouncedDraft)
        .then(({ svg }) => {
          setDraftSvg(svg);
          setPreviewError(null);
        })
        .catch((e: Error) => {
          setDraftSvg(null);
          setPreviewError(e.message);
        });
    });
  }, [debouncedDraft, editorOpen]);

  // Re-render main diagram when localChart changes (after Save)
  useEffect(() => {
    let mounted = true;
    void import("mermaid").then((mod) => {
      const mermaid = mod.default ?? mod;
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid
        .render(id, localChart)
        .then(({ svg }) => {
          if (!mounted) return;
          const rendered = makeResponsiveSvg(svg);
          setSvg(rendered);
          svgCache.set(localChart, rendered);
        })
        .catch((err: Error) => mounted && setError(err));
    });
    return () => {
      mounted = false;
    };
  }, [localChart]);

  // Hide Mermaid default error overlay globally (once per page)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "mermaid-hide-error";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.innerHTML = `.mermaid .error-icon, .mermaid .error-text { display:none!important; }`;
      document.head.appendChild(s);
    }
  }, []);

  /* -------------------------------------------------------------------- */
  /*                       RENDERING & UI HELPERS                         */
  /* -------------------------------------------------------------------- */

  if (error)
    return (
      <div
        className={clsx(
          "max-w-full overflow-x-auto rounded bg-red-50 p-4 text-sm whitespace-pre-wrap text-red-700 dark:bg-red-950 dark:text-red-300",
          className,
        )}
      >
        <p className="mb-2 font-semibold">Mermaid render error:</p>
        <p className="mb-4">{error.message}</p>
        <p className="mb-1">You can edit &amp; preview this diagram online at:</p>
        <a
          href="https://mermaid.live/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          https://mermaid.live/
        </a>
      </div>
    );

  if (!svg)
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

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const openEditor = () => {
    setDraft(localChart);
    setEditorOpen(true);
  };

  return (
    <div className={clsx("group relative", className)}>
      {showControls && (
        <>
          {/* Dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
                <MoreVertical size={14} className="text-muted hover:text-primary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem
                onSelect={() => copyText(```mermaid\n${localChart}\n````)}
              >
                Copy Mermaid
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => copyText(svg)}>
                Copy SVG
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={openEditor}>Edit Diagram</DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  router.push(
                    `/erd-editor?code=${encodeURIComponent(localChart)}${messageId ? `&msg=${messageId}` : ""}`,
                  )
                }
              >
                Open in Full Editor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Inline editor modal */}
          <Dialog.Root open={editorOpen} onOpenChange={setEditorOpen}>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
              <Dialog.Content className="bg-surface-0 fixed top-4 left-1/2 z-50 flex w-[90vw] max-w-3xl -translate-x-1/2 flex-col rounded-lg p-6 shadow-lg focus:outline-none sm:top-1/2 sm:-translate-y-1/2" style={{ maxHeight: "90vh" }}>
                <Dialog.Title className="text-lg font-semibold">Edit Diagram</Dialog.Title>
                <Dialog.Description className="sr-only">Modify mermaid syntax and preview live.</Dialog.Description>
                <div className="mb-4 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setLocalChart(draft);
                      onSave?.(draft);
                      setEditorOpen(false);
                    }}
                    className="bg-brand-primary hover:bg-brand-primary/90 mr-2 rounded px-3 py-1 text-sm text-white shadow"
                  >
                    Save
                  </button>
                  <Dialog.Close className="hover:bg-surface-1 rounded p-1">
                    <MoreVertical size={16} className="rotate-45" />
                  </Dialog.Close>
                </div>
                <div className="flex flex-col gap-4 overflow-hidden">
                  <div className="max-h-56 overflow-auto rounded border p-2">
                    {previewError ? (
                      <pre className="text-sm whitespace-pre-wrap text-red-500">{previewError}</pre>
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
                <div className="mt-auto flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    onClick={() => copyText(`\`\`\`mermaid\n${draft}\n\`\`\``)}
                    className="bg-surface-2 text-muted hover:text-primary rounded px-3 py-1 text-sm shadow"
                  >
                    Copy Mermaid
                  </button>
                  <button
                    onClick={() => copyText(draftSvg ?? "")}
                    className="bg-surface-2 text-muted hover:text-primary rounded px-3 py-1 text-sm shadow disabled:opacity-50"
                    disabled={!draftSvg}
                  >
                    Copy SVG
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      )}

      {/* Rendered SVG */}
      {/* eslint-disable-next-line react/no-danger */}
      <div className="max-w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

export default MermaidDiagram; 