# GlassChat 🪟

> A stunning glassmorphism-powered AI chat application built with the T3 Stack

GlassChat is a next-generation AI chat interface that combines the power of multiple AI models (GPT-4, Claude) with a beautiful glassmorphism design and real-time collaboration features. Built for the T3 Chat Cloneathon competition.

## ✨ Features

- **🤖 Multi-Model AI Chat**: Support for OpenAI GPT-4, Anthropic Claude, and more
- **🪟 Glassmorphism UI**: Beautiful frosted glass aesthetic with backdrop blur effects
- **⚡ Local-First**: Instant responses with IndexedDB storage via Dexie.js
- **🔄 Real-Time Sync**: Multi-device synchronization with Upstash Redis
- **🎨 Theme Support**: Light and dark modes with smooth transitions
- **📱 Responsive Design**: Works beautifully on desktop, tablet, and mobile
- **🚀 Performance Optimized**: 60+ FPS animations with Framer Motion
- **♿ Accessible**: Full screen reader support and keyboard navigation
- **🌍 Internationalization**: Multi-language support with next-i18next

## 🛠️ Tech Stack

Built with the modern T3 Stack plus glassmorphism enhancements:

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion
- **Backend**: tRPC, NextAuth.js
- **Database**: Prisma, IndexedDB (Dexie.js)
- **Real-Time**: Upstash Redis
- **AI**: OpenAI API, Anthropic API
- **Performance**: WebAssembly, React Query
- **Testing**: Jest, Playwright
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/glasschat.git
   cd glasschat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Fill in your API keys and configuration
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Development

### Available Scripts

- `npm run dev` - Start development server with Turbo
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format:write` - Format code with Prettier
- `npm run typecheck` - Type check with TypeScript
- `npm run db:studio` - Open Prisma Studio

### Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
│   ├── chat/        # Chat-specific components
│   ├── common/      # Shared components
│   ├── layout/      # Layout components
│   └── ui/          # Base UI components
├── lib/             # Shared utilities
│   ├── ai/          # AI model integration
│   ├── db/          # Dexie.js database setup
│   └── sync/        # Real-time sync logic
├── server/          # tRPC backend
├── styles/          # Global styles
└── utils/           # Helper functions
```

## 🎨 Design System

GlassChat uses a consistent glassmorphism design language:

- **Glass Effects**: `backdrop-filter: blur(10px)` with 80% opacity backgrounds
- **Typography**: Inter font family with fluid sizing
- **Colors**: Blue accent (#3B82F6) with neutral grays
- **Animations**: Smooth 300ms transitions and bounce-in effects
- **Spacing**: 8px grid system via Tailwind

## 🤝 Contributing

We welcome contributions! This project is open-source under the MIT license.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built for the [T3 Chat Cloneathon](https://example.com) competition
- Inspired by the amazing [T3 Chat](https://github.com/example) project
- Design influenced by glassmorphism trends and modern UI patterns

---

**✨ Experience the future of AI chat with GlassChat** ✨
