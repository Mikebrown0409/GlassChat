// WebAssembly type definitions for GlassChat
// Enables WASM integration for performance-critical computations

declare module "*.wasm" {
  const value: ArrayBuffer;
  export default value;
}

declare module "*.wasm?module" {
  const value: WebAssembly.Module;
  export default value;
}

declare module "*.wasm?init" {
  const initWasm: (
    imports?: WebAssembly.Imports,
  ) => Promise<WebAssembly.Instance>;
  export default initWasm;
}

// Extended WebAssembly types for modern browsers
declare global {
  namespace WebAssembly {
    interface Memory {
      buffer: ArrayBuffer;
    }

    interface Instance {
      exports: {
        memory?: Memory;
        [key: string]: unknown;
      };
    }

    // Streaming compilation and instantiation
    function compileStreaming(
      source: Response | Promise<Response>,
    ): Promise<Module>;
    function instantiateStreaming(
      source: Response | Promise<Response>,
      importObject?: Imports,
    ): Promise<ResultObject>;

    // SIMD support detection
    interface Global {
      value: unknown;
      valueOf(): unknown;
    }
  }

  // Performance monitoring for WASM
  interface Performance {
    measureUserAgentSpecificMemory?(): Promise<{
      bytes: number;
      breakdown: Array<{
        bytes: number;
        attribution: Array<{
          url: string;
          scope: string;
        }>;
      }>;
    }>;
  }
}

// GlassChat-specific WASM utilities
export interface WasmModule {
  exports: {
    // Text processing functions
    processMarkdown?(input: string): string;
    highlightCode?(code: string, language: string): string;

    // Performance optimization functions
    optimizeAnimations?(frameData: Float32Array): Float32Array;
    compressMessage?(message: string): Uint8Array;
    decompressMessage?(compressed: Uint8Array): string;

    // Memory management
    malloc?(size: number): number;
    free?(ptr: number): void;
    memory: WebAssembly.Memory;
  };
}

export interface WasmPerformanceMetrics {
  compilationTime: number;
  instantiationTime: number;
  executionTime: number;
  memoryUsage: number;
}
