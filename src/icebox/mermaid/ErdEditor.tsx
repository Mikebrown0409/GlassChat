// @ts-nocheck
"use client";

// === Archived Implementation: ErdEditor ===
// Original feature-rich ERD editor that leverages Mermaid for live entity-relationship diagrams.
// It has been moved to the icebox so the main bundle can remain lightweight.
// Restore by moving the file out of `icebox/` and adding `mermaid` back.

import { Minus, MoreVertical, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MermaidDiagram } from "~/components/chat/MermaidDiagram";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";

/** Simple templates for users to start from */
const TEMPLATES: Record<string, string> = {
  "SaaS Platform": `erDiagram
  USER ||--o{ PROJECT : creates
  PROJECT ||--o{ TASK : contains
  TASK ||--o{ SUBTASK : has
  TASK }o--|| USER : assigned_to
  PROJECT ||--o{ DOCUMENT : includes
  DOCUMENT ||--o{ COMMENT : has`,
  "Blog & CMS": `erDiagram
  AUTHOR ||--o{ POST : writes
  POST ||--o{ COMMENT : has
  AUTHOR ||--o{ COMMENT : writes
  POST }o--|| CATEGORY : in`,
  "E-commerce": `erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : appears_in
  PRODUCT }o--|| SUPPLIER : provided_by`,
  Custom: "erDiagram\n  ",
};

/** Parse mermaid code and extract names of declared subgraphs */
function extractModules(src: string): string[] {
  const regex = /^\s*subgraph\s+([^\n]+)$/gm;
  const modules: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(src))) {
    modules.push(m[1]!.trim());
  }
  return modules;
}

/** Remove subgraphs that the user has hidden */
function filterByModules(src: string, hidden: Set<string>): string {
  if (hidden.size === 0) return src;
  const lines = src.split("\n");
  const out: string[] = [];
  let skip = false;
  let current: string | null = null;
  const subgraphRegex = /^\s*subgraph\s+([^\n]+)$/;
  for (const line of lines) {
    const subMatch = subgraphRegex.exec(line);
    if (subMatch) {
      current = subMatch[1]!.trim();
      if (hidden.has(current)) {
        skip = true;
        continue; // skip subgraph declaration
      }
    }
    if (skip && /^\s*end\s*$/.test(line)) {
      skip = false;
      current = null;
      continue;
    }
    if (!skip) out.push(line);
  }
  return out.join("\n");
}

export function ErdEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCodeParam = searchParams.get("code");
  const messageIdParam = searchParams.get("msg");

  const initialCode: string = initialCodeParam
    ? decodeURIComponent(initialCodeParam)
    : (TEMPLATES["SaaS Platform"] ?? "");

  const [code, setCode] = useState<string>(initialCode);
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"split" | "visual" | "code">("split");
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => Math.min(z + 0.1, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3));

  const modules = useMemo(() => extractModules(code), [code]);

  useEffect(() => {
    setHiddenModules((prev) => {
      const next = new Set<string>();
      for (const m of prev) if (modules.includes(m)) next.add(m);
      return next;
    });
  }, [modules]);

  const previewCode = useMemo(
    () => filterByModules(code, hiddenModules),
    [code, hiddenModules],
  );

  /* UI helpers */
  const toggleModule = (m: string) => {
    setHiddenModules((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const onMouseDownDrag = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isPanningRef.current = true;
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.classList.add("select-none");
    startPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMoveDrag = (e: MouseEvent) => {
    if (!isPanningRef.current || !scrollRef.current || !startPos.current)
      return;
    const dx = startPos.current.x - e.clientX;
    const dy = startPos.current.y - e.clientY;
    scrollRef.current.scrollLeft += dx;
    scrollRef.current.scrollTop += dy;
    startPos.current = { x: e.clientX, y: e.clientY };
  };
  const endPan = () => {
    if (!isPanningRef.current || !scrollRef.current) return;
    isPanningRef.current = false;
    scrollRef.current.style.cursor = "grab";
    scrollRef.current.classList.remove("select-none");
  };
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMoveDrag);
    window.addEventListener("mouseup", endPan);
    return () => {
      window.removeEventListener("mousemove", onMouseMoveDrag);
      window.removeEventListener("mouseup", endPan);
    };
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="bg-surface-1 flex items-center justify-between gap-4 border-b px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Template:</span>
          <select
            className="bg-surface-2 focus:ring-brand-primary rounded border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
            value={
              Object.entries(TEMPLATES).find(([_, v]) => v === code)?.[0] ??
              "Custom"
            }
            onChange={(e) => setCode(TEMPLATES[e.target.value] ?? "")}
          >
            {Object.keys(TEMPLATES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {(["split", "visual", "code"] as const).map((m) => (
            <label key={m} className="inline-flex items-center gap-1">
              <input
                type="radio"
                name="mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
              />
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </label>
          ))}
        </div>

        {/* Copy menu */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hover:bg-surface-2 focus:ring-brand-primary cursor-pointer rounded p-1 focus:ring-2 focus:outline-none">
                <MoreVertical size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 cursor-pointer">
              <DropdownMenuItem
                onSelect={() => navigator.clipboard.writeText(code)}
              >
                Copy Mermaid
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => navigator.clipboard.writeText(previewCode)}
              >
                Copy Filtered Mermaid
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <button
          onClick={() => {
            if (messageIdParam) {
              window.dispatchEvent(
                new CustomEvent("diagram-update", {
                  detail: { id: messageIdParam, content: code },
                }),
              );
            } else {
              void navigator.clipboard.writeText(code);
            }
          }}
          className="bg-brand-primary/80 hover:bg-brand-primary rounded px-3 py-1 text-sm text-white shadow"
        >
          Save
        </button>
        <button
          onClick={() => router.back()}
          className="bg-brand-primary hover:bg-brand-primary/90 rounded px-3 py-1 text-sm text-white shadow"
        >
          Back to Chat
        </button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {(mode === "split" || mode === "visual") && (
          <div className="relative flex-1 p-4">
            {/* Zoom controls */}
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-1">
              <button
                onClick={zoomIn}
                className="bg-surface-0 hover:bg-surface-2 cursor-pointer rounded border p-1 shadow"
                title="Zoom in"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={zoomOut}
                className="bg-surface-0 hover:bg-surface-2 cursor-pointer rounded border p-1 shadow"
                title="Zoom out"
              >
                <Minus size={14} />
              </button>
            </div>
            <ScrollArea
              ref={scrollRef as never}
              className="h-full w-full rounded border"
              style={{ cursor: "grab" }}
              onMouseDown={onMouseDownDrag as never}
            >
              <div
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top left",
                }}
              >
                <MermaidDiagram chart={previewCode} showControls={false} />
              </div>
            </ScrollArea>
          </div>
        )}

        {(mode === "split" || mode === "code") && (
          <Sheet>
            <div className="relative hidden w-1/2 min-w-[320px] border-l md:block">
              <EditorPanel
                code={code}
                onCodeChange={setCode}
                modules={modules}
                hiddenModules={hiddenModules}
                toggleModule={toggleModule}
              />
            </div>
            <SheetTrigger className="bg-surface-2 absolute top-2 right-2 z-10 rounded p-1 text-xs shadow md:hidden">
              Edit
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full max-w-[90vw] md:hidden"
            >
              <EditorPanel
                code={code}
                onCodeChange={setCode}
                modules={modules}
                hiddenModules={hiddenModules}
                toggleModule={toggleModule}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
