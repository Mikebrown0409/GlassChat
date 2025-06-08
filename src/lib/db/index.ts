import Dexie, { type Table } from "dexie";

export interface Chat {
  id: string; // nanoid
  title: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface Message {
  id: string; // nanoid
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number; // timestamp
}

export interface User {
  id: string; // unique identifier
  name: string;
  avatarUrl?: string;
}

export class GlassChatDatabase extends Dexie {
  chats!: Table<Chat>;
  messages!: Table<Message>;
  users!: Table<User>;

  constructor() {
    super("glasschat-db");
    this.version(1).stores({
      chats: "id, createdAt",
      messages: "id, chatId, createdAt",
      users: "id",
    });
  }
}

export const db = new GlassChatDatabase();
