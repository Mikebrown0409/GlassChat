# GlassChat 🪟

An elegant, real-time, AI-powered chat & collaboration platform built with the **T3 Stack**, sprinkled with glassmorphism and production-ready tooling.

> “Chat beautifully, collaborate instantly.”

---

## ✨ Key Features

| Category           | Highlights                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **AI Chat**        | 🔥 GPT-4o & GPT-4-Turbo, Anthropic Claude 3<br>🧠 Per-chat "Memory" & smart summarisation                             |
| **Collaboration**  | 🫂 Multi-user rooms with live presence<br>📄 Real-time message & live-code editor powered by Upstash Redis            |
| **UI / UX**        | 🪟 Glassmorphism theme, dark & light modes<br>�� Fully responsive & keyboard-accessible                               |
| **Performance**    | ⚡️ React 18 + Next.js 15 App Router<br>🐇 Framer-Motion animations with custom cubic-bezier easing                   |
| **Dev Experience** | 🛡️ End-to-end type-safety via tRPC & Prisma<br>🔐 NextAuth (Discord / Google / Email)<br>📈 Vercel Analytics baked in |

---

## 🛠️ Tech Stack

• **Next.js 15** (App Router, Server & Client components)  
• **React 18.3** + TypeScript 5  
• **Tailwind CSS v4** + CSS Variables for theming  
• **Framer-Motion** for micro-interactions  
• **Prisma ORM** → **Supabase Postgres** (prod) / SQLite (dev)  
• **Upstash Redis** for pub/sub & rate-limiting  
• **tRPC** for end-to-end types  
• **NextAuth.js** for authentication  
• **OpenAI & Anthropic SDKs**  
• **Vercel Analytics & Edge runtime**  
• Deployed on **Vercel** (Preview & Prod environments)

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/glasschat.git && cd glasschat

# 2. Install deps
npm install

# 3. Create & fill env vars
cp .env.example .env.local
#   – OPENAI_API_KEY, AUTH_SECRET …
#   – DATABASE_URL="file:./dev.db"  # dev only

# 4. Generate Prisma client & SQLite DB
npx prisma migrate dev --name init

# 5. Run the dev server
npm run dev
```

Navigate to <http://localhost:3000> and start chatting! ✨

### Connect to Supabase (production)

1. Create a Supabase project → copy the **Prisma URL**.
2. In Vercel → _Project → Environment Variables_ set:
   `DATABASE_URL=<your Prisma URL>`
3. Deploy – Prisma migrations run with `prisma migrate deploy`.

---

## 🗂️ Project Structure (condensed)

```text
src/
 ├─ app/                 # Next.js routes (App Router)
 │  └─ api/…             # Route Handlers (auth, upload, tRPC)
 ├─ components/          # UI & feature components (chat, collab, ui)
 ├─ lib/                 # Shared logic (ai, db, sync, memory)
 ├─ server/              # tRPC routers, auth config, WebSocket gateway
 ├─ prisma/              # Schema & migrations
 └─ styles/              # Tailwind base + themes
```

---

## 🧑‍💻 Common Scripts

| Command                   | Purpose                       |
| ------------------------- | ----------------------------- |
| `npm run dev`             | Start Next.js with hot-reload |
| `npm run build` / `start` | Production build & serve      |
| `npm run lint`            | ESLint (strict)               |
| `npm run typecheck`       | TypeScript without emit       |
| `npm run prisma:migrate`  | Run `prisma migrate dev`      |
| `npm run ws:dev`          | Local WebSocket gateway       |

---

## 🎨 Design Tokens

• Backdrop blur `backdrop-blur-md` with 70% glass surfaces  
• Fluid typography via `clamp()`  
• Brand gradient accent `from-emerald-400 to-sky-500`  
• Motion curve `[0.22,1,0.36,1]` applied globally

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss substantial changes.

1. Fork & clone
2. Create a branch `feat/<feature>`
3. `pnpm i && pnpm dev` (or npm)
4. Run `npm run lint && npm run typecheck` before opening the PR

---

## 📝 License

MIT © 2025 GlassChat Team

---

**GlassChat – chat beautifully, together.**
