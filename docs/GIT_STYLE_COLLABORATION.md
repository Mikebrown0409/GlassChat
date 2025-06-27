# Git-Style Branching for AI Collaboration

> Draft specification – feature under exploration

## Motivation

Current collaboration mixes user and AI messages in a single timeline. When 3–5 people iterate quickly the conversation becomes noisy and hard to follow. Git solved a similar problem for code by introducing **branches**, **pull-requests**, and **merges**. We borrow that mental model for chat-based workflows.

## Core Concepts

| Concept      | Analogy                     | Description                                                                                                                                   |
| ------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Room**     | Repository                  | Top-level workspace owned by a team (e.g. _Marketing Site_, _API Redesign_)                                                                   |
| **Branch**   | Git branch / feature branch | A focused thread of discussion. Every branch gets its own chatId and memory context. `main` is created by default.                            |
| **Merge**    | Pull Request merge          | Moves the entire message history of a branch into its target (`main` by default). An AI-generated summary is inserted to keep `main` concise. |
| **Presence** | N/A                         | Users are online in the **room** regardless of which branch they view. Typing indicators include the current branch name.                     |

## Data Model (Prisma)

```prisma
model Room {
  id        String  @id @default(cuid())
  name      String
  createdBy String
  createdAt DateTime @default(now())
  branches  Branch[]
}

model Branch {
  id         String  @id @default(cuid())
  roomId     String
  room       Room    @relation(fields: [roomId], references: [id])
  title      String
  parentId   String?  // null = main
  createdBy  String
  createdAt  DateTime @default(now())
}
```

Messages remain in the existing `Message` table; `chatId` = `branch.id`.

## API Surface (tRPC)

- `collaboration.createBranch(roomId, title)` → Branch
- `collaboration.mergeBranch(sourceId, targetId)` → `{summary: string}`
- `collaboration.subscribeRoom(roomId)` → SSE stream of `{type, payload}` events

## Client UX

1. **Sidebar Tree** – `Room › Branches` with unread counts.
2. **Branch Picker** – dropdown at top of `ChatInterface` (like GitHub).
3. **Merge Flow** – click _Merge_ → AI drafts summary → user confirms → branch archived.
4. **Presence Avatars** – show online users; tooltip includes "on branch _marketing-copy_".

## AI Integration

- Each branch keeps its own memory context → prompts stay relevant.
- On merge we stream:
  1. AI summary (`system` role) into target branch.
  2. Copy raw messages.

## Open Questions

- Do we allow re-base (editing history) or keep append-only?
- How to handle conflicting merges (same target lines)? For MVP we assume append-only messages so conflicts are impossible.

---

Copyright (c) T3-OSS et al.
