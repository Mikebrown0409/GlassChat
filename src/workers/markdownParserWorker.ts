import * as Comlink from "comlink";
import { parse } from "markdown-wasm/dist/markdown.es.js";

const api = {
  parse(markdown: string): string {
    return parse(markdown);
  },
};

Comlink.expose(api);
