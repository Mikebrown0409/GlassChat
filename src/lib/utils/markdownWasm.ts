// Lightweight wrapper around `markdown-wasm` to provide fast markdown -> HTML parsing.
// This module is loaded dynamically only on the client to avoid increasing the SSR bundle.

// NOTE: markdown-wasm exposes a standalone `parse` function. We lazy-import to
// keep the initial bundle slim and avoid loading WebAssembly unless needed.

/**
 * Parse Markdown → HTML using the WebAssembly backend.
 * If the WASM parser fails to load (e.g. on unsupported browsers), we simply
 * return the original markdown string so that a fallback renderer (react-markdown)
 * can still handle it gracefully.
 */
export async function parseMarkdownWasm(markdown: string): Promise<string> {
  try {
    // Tryworker-based parsing first to offload heavy CPU from main thread.
    // Import lazily to avoid circular dependency when worker imports this util
    const { parseMarkdownWithWorker } = await import("./markdownWorkerClient");
    return await parseMarkdownWithWorker(markdown);
  } catch {
    // Worker failed (e.g., older browsers); fall back to direct WASM parse on the main thread.
    try {
      const wasm = (await import("markdown-wasm/dist/markdown.es.js")) as {
        parse: (input: string) => string;
      };
      return wasm.parse(markdown);
    } catch (error) {
      console.error("[markdown-wasm] Falling back to raw markdown", error);
      return markdown;
    }
  }
}
