# Collaboration Redesign Proposal

A lightweight approach that replaces the existing sidebar–centred workflow with a share-first, focus-mode driven design.

---

## 0. Guiding Problem

Most users open an AI chat to think, get an artifact, or share the thread. The current Collaboration tab asks them to "decide" to collaborate **before** they see value. Adoption remains low.

Goal: make collaboration friction-less and obviously valuable while avoiding the scope-creep of becoming a full IDE.

---

## A. One-Click **Live Session** (replace "rooms")

1. _Share_ button in the chat header generates a secure URL: `…/chat/123?session=abcd`
2. Visitors auto-join, see presence chips (`LB`, `KM`) and a 🔴 **Live** badge.
3. Ending the session returns users to their private timeline; chat history remains intact.

**Why it helps**  
Removes decision friction and leverages the asset users already care about—the current chat.

---

## B. Context-Adaptive Layout ("Focus Modes")

| Mode           | Trigger                   | Layout                              | Notes                                   |
| -------------- | ------------------------- | ----------------------------------- | --------------------------------------- |
| Chat (default) | —                         | Full-width chat                     | Normal experience                       |
| **Code** focus | `/code` or <kbd>⌘⇧E</kbd> | Monaco/CodeMirror left, chat right  | Single file/scratchpad, no project tree |
| **Brainstorm** | `/board`                  | Sticky-note canvas left, chat right | Pin/drag messages as notes              |

Implementation: a single `mode` state at layout root swaps CSS `order` & `flex-basis`—no data-model overhaul.

---

## C. Making Team-Ups Worthwhile (without "projects")

1. **Shared Prompt History** – everyone scrolls & re-asks without copy/paste.
2. **AI Hand-Off** – highlight → _Ask AI_ → threaded assistant reply (parallel question flow).
3. **Real-Time Co-Editing** – tiny CRDT for the prompt input; pair-prompting feels fluid.
4. **Instant Recap** – on last collaborator leaving, auto-generate "Meeting Minutes" (bullets + TODO) and pin to Memory.

---

## D. UI Surface Area ↓, Perceived Power ↑

- Remove dedicated Collaboration tab.
- Fold presence & quick actions into chat header.
- Keep Memory / Insights drawer.
- Add floating `/` command bar listing _share link_ & _focus-mode_ commands.

---

## E. Shipping Sequence (≈ 3 – 5 days)

| Day     | Tasks                                                                       |
| ------- | --------------------------------------------------------------------------- |
| **1–2** | `useLiveSession(chatId)` hook → share URL → presence chips                  |
| **3**   | Global `focusMode` enum → swap panes → integrate Monaco for Code mode       |
| **4**   | Sync prompt input (y-text) + highlight-to-Ask-AI context menu               |
| **5**   | Auto-recap on `onSessionEnd` + polish (tooltips, escape to exit, analytics) |

---

## Why Judges & Users Will Care

- **Share link** + live presence is instantly understood.
- Focus modes show ambition without committing to full IDE scope.
- Auto-recap converts synchronous value into async artifacts.
- Builds on existing infrastructure while hiding complexity behind one button and one mode switch.
