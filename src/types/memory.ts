export interface MemoryEntry {
  id?: number;
  chatId: string;
  content: string;
  embedding: number[];
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface SmartSummary {
  id?: number;
  chatId: string;
  summary: string;
  keywords: string[];
  createdAt: number;
}

export interface MemoryEvent {
  id?: number;
  chatId: string;
  type: "summary" | "entry_added" | "search";
  details: string;
  timestamp: number;
}
