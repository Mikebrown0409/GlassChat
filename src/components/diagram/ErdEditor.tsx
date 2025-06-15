"use client";

import { MoreVertical, Plus, Minus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useRef } from "react";
import { MermaidDiagram } from "~/components/chat/MermaidDiagram";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
    modules.push(m[1].trim());
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
  for (const line of lines) {
    const subMatch = line.match(/^\s*subgraph\s+([^\n]+)$/);
    if (subMatch) {
      current = subMatch[1].trim();
      if (hidden.has(current)) {
        skip = true;
        continue; // skip subgraph declaration
      }
    }
    if (skip && /^\s*end\s*$/.test(line)) {
      // closing of skipped subgraph
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

  const [code, setCode] = useState(
    initialCodeParam
      ? decodeURIComponent(initialCodeParam)
      : TEMPLATES["SaaS Platform"],
  );
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"split" | "visual" | "code">("split");
  const [zoom, setZoom] = useState(1);
  const zoomIn = () => setZoom((z) => Math.min(z + 0.1, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3));

  const modules = useMemo(() => extractModules(code), [code]);

  // Ensure hiddenModules only contains currently existing modules
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
  const startPos = useRef<{x:number;y:number}>();

  const onMouseDownDrag = (e: React.MouseEvent) => {
    if(!scrollRef.current) return;
    isPanningRef.current = true;
    scrollRef.current.style.cursor = "grabbing";
    startPos.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseMoveDrag = (e: MouseEvent) => {
    if(!isPanningRef.current || !scrollRef.current || !startPos.current) return;
    const dx = startPos.current.x - e.clientX;
    const dy = startPos.current.y - e.clientY;
    scrollRef.current.scrollLeft += dx;
    scrollRef.current.scrollTop += dy;
    startPos.current = { x: e.clientX, y: e.clientY };
  };
  const endPan = () => {
    if(!isPanningRef.current || !scrollRef.current) return;
    isPanningRef.current=false;
    scrollRef.current.style.cursor = "grab";
  };
  useEffect(()=>{
    window.addEventListener("mousemove", onMouseMoveDrag);
    window.addEventListener("mouseup", endPan);
    return ()=>{
      window.removeEventListener("mousemove", onMouseMoveDrag);
      window.removeEventListener("mouseup", endPan);
    };
  },[]);

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
            onChange={(e) => setCode(TEMPLATES[e.target.value])}
          >
            {Object.keys(TEMPLATES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="mode"
              value="split"
              checked={mode === "split"}
              onChange={() => setMode("split")}
            />
            Split
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="mode"
              value="visual"
              checked={mode === "visual"}
              onChange={() => setMode("visual")}
            />
            Visual
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="mode"
              value="code"
              checked={mode === "code"}
              onChange={() => setMode("code")}
            />
            Code
          </label>
        </div>

        {/* Copy menu */}
        <div className="flex items-center gap-2">
          {/* Copy dropdown */}
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
          onClick={() => {
            if (messageIdParam) {
              window.dispatchEvent(
                new CustomEvent("diagram-update", {
                  detail: { id: messageIdParam, content: code },
                }),
              );
            }
            router.back();
          }}
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
            <div className="absolute right-6 top-6 z-20 flex flex-col gap-1">
              <button
                onClick={zoomIn}
                className="cursor-pointer rounded border bg-surface-0 p-1 shadow hover:bg-surface-2"
                title="Zoom in"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={zoomOut}
                className="cursor-pointer rounded border bg-surface-0 p-1 shadow hover:bg-surface-2"
                title="Zoom out"
              >
                <Minus size={14} />
              </button>
            </div>
            <div
              ref={scrollRef}
              className="h-full w-full overflow-auto rounded border"
              style={{ cursor: "grab" }}
              onMouseDown={onMouseDownDrag}
            >
              <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
                <MermaidDiagram chart={previewCode} showControls={false} />
              </div>
            </div>
          </div>
        )}

        {(mode === "split" || mode === "code") && (
          <Sheet>
            {/* Show side panel only on small screens as sheet, else inline */}
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

interface EditorProps {
  code: string;
  onCodeChange: (v: string) => void;
  modules: string[];
  hiddenModules: Set<string>;
  toggleModule: (m: string) => void;
}

function EditorPanel({
  code,
  onCodeChange,
  modules,
  hiddenModules,
  toggleModule,
}: EditorProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      {/* Module filter */}
      {modules.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="text-sm font-semibold">Modules</h3>
          {modules.map((m) => (
            <label key={m} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!hiddenModules.has(m)}
                onChange={() => toggleModule(m)}
              />
              {m}
            </label>
          ))}
        </div>
      )}

      {/* Cheat-sheet */}
      <details className="mb-4 rounded border p-2 text-xs leading-relaxed open:shadow">
        <summary className="cursor-pointer select-none font-medium">Mermaid ERD syntax cheatsheet</summary>
        <ul className="mt-2 list-disc pl-4 space-y-1">
          <li>
            <code className="font-mono">{"Entity {{ field PK }}"}</code>
          </li>
          <li>
            Relationships use <code className="font-mono">||</code>=one, <code className="font-mono">{"o{"}</code>=many.
          </li>
          <li>
            Example many-to-one: <code className="font-mono">ORDER }o--|| CUSTOMER : placed_by</code>
          </li>
          <li>
            Close every <code className="font-mono">subgraph ... end</code> pair.
          </li>
        </ul>
      </details>

      {/* Code editor */}
      <textarea
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        className="border-input bg-surface-1 focus:ring-brand-primary h-full flex-1 resize-none rounded-md border p-2 text-sm font-mono shadow focus:outline-none focus:ring-2"
      />
    </div>
  );
}
