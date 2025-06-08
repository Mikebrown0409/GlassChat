# GlassChat Data Models

This document defines the core data models for the GlassChat application. These models are used for local storage with Dexie.js and for data synchronization.

## Dexie.js Schema

The Dexie.js database will be named `glasschat-db` and will have the following schema:

```typescript
import Dexie, { Table } from 'dexie';

export interface Chat {
  id: string; // nanoid
  title: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface Message {
  id: string; // nanoid
  chatId: string;
  role: 'user' | 'assistant' | 'system';
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
    super('glasschat-db');
    this.version(1).stores({
      chats: 'id, createdAt',
      messages: 'id, chatId, createdAt',
      users: 'id',
    });
  }
}

export const db = new GlassChatDatabase();
```

## Model Descriptions

### `Chat`

-   **`id`**: A unique identifier for the chat session, generated using `nanoid`.
-   **`title`**: The title of the chat. This could be user-defined or auto-generated from the first few messages.
-   **`createdAt`**: The timestamp when the chat was created.
-   **`updatedAt`**: The timestamp when the chat was last updated.

### `Message`

-   **`id`**: A unique identifier for the message, generated using `nanoid`.
-   **`chatId`**: The `id` of the `Chat` this message belongs to.
-   **`role`**: The role of the entity that sent the message.
    -   `user`: A message from the human user.
    -   `assistant`: A message from the AI model.
    -   `system`: A system message (e.g., "User joined the chat").
-   **`content`**: The text content of the message. This can include markdown.
-   **`createdAt`**: The timestamp when the message was created.

### `User`

-   **`id`**: A unique identifier for a user.
-   **`name`**: The user's display name.
-   **`avatarUrl`**: An optional URL to the user's avatar image. 