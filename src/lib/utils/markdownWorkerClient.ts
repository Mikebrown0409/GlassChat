import type { Remote } from "comlink";
import { wrap } from "comlink";

interface MarkdownParser {
  parse(markdown: string): string;
}

let parserProxy: Remote<MarkdownParser> | null = null;

export async function parseMarkdownWithWorker(
  markdown: string,
): Promise<string> {
  // Lazily create worker on first use (client-only)
  if (typeof window === "undefined") {
    // SSR fallback: return raw markdown; actual rendering handled by react-markdown later
    return markdown;
  }

  if (!parserProxy) {
    const worker = new Worker(
      new URL("../../workers/markdownParserWorker.ts", import.meta.url),
      {
        type: "module",
      },
    );
    parserProxy = wrap<MarkdownParser>(worker);
  }

  return parserProxy.parse(markdown);
}
