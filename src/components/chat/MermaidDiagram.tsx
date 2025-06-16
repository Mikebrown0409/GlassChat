"use client";

// Mermaid functionality has been disabled for the current build.  We are keeping a lightweight stub component so that
// the rest of the codebase continues to compile without the heavy `mermaid` runtime dependency.  If the full
// diagram renderer is required again in the future, the original implementation is preserved under
// `src/icebox/mermaid/MermaidDiagram.tsx`.
//
// NOTE: Keep the exported component signature the same so no downstream changes are necessary.
// ... existing code ...
export interface MermaidDiagramProps {
  /** Raw mermaid definition string */
  chart: string;
  /** Optional extra class names */
  className?: string;
  /** Controls are no longer supported in stub but preserve prop for type compatibility */
  showControls?: boolean;
  /** onSave callback retained for compatibility but will never fire in stub */
  onSave?: (newChart: string) => void;
  /** Message id from chat – unused in stub */
  messageId?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  return (
    <div className={className} data-disabled-mermaid>
      <p className="mb-2 text-center text-sm text-slate-400">
        Mermaid diagrams are currently disabled in this build of GlassChat.
      </p>
      <pre className="max-h-64 overflow-x-auto rounded-lg bg-slate-800 p-3 text-xs whitespace-pre-wrap text-slate-300">
        {chart}
      </pre>
    </div>
  );
}

export default MermaidDiagram;
