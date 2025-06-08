# Tech Stack for GlassChat

This document outlines the technology stack for GlassChat, our T3 Chat Cloneathon entry, designed to replicate and enhance T3 Chat with innovative features and top-tier performance.

## Overview
GlassChat leverages a robust, open-source-friendly stack built on the T3 ecosystem, augmented with cutting-edge tools for UI, sync, AI integration, and testing. This ensures a winning submission with "vibes-based" appeal.

## Detailed Stack

| **Category**          | **Technology**         | **Description**                                                                 | **Resources**                                      |
|-----------------------|-------------------------|-----------------------------------------------------------------------------|----------------------------------------------------|
| **Frontend Framework** | Next.js                | A React framework for server-side rendering and static site generation.     | [Next.js Docs](https://nextjs.org/docs)            |
| **Type Safety**       | TypeScript             | Adds type safety to JavaScript, enhancing developer experience.             | [TypeScript Docs](https://www.typescriptlang.org/docs) |
| **Styling**           | Tailwind CSS + Framer Motion | Utility-first CSS with animation library for UI polish.                   | [Tailwind CSS](https://tailwindcss.com/docs), [Framer Motion](https://www.framer.com/motion/) |
| **State Management**  | React Context + Dexie.js | Local state management with IndexedDB for offline storage.                 | [Dexie.js Docs](https://dexie.org/docs)            |
| **API Communication** | tRPC                   | Type-safe API layer for frontend-backend interaction.                      | [tRPC Docs](https://trpc.io/docs)                  |
| **Real-Time Sync**    | Upstash Redis          | HTTP-based Redis client for serverless sync, replacing Socket.IO for Vercel compatibility. | [Upstash Redis Docs](https://upstash.com/docs/redis/howto/connectwithupstashredis) |
| **AI Integration**    | OpenAI API, Anthropic API | APIs for integrating multiple AI models (e.g., GPT-4, Claude).             | [OpenAI API](https://platform.openai.com/docs/api-reference), [Anthropic API](https://docs.anthropic.com/claude/docs) |
| **Performance**       | WebAssembly            | Technology for performance-critical computations, enhancing speed.         | [WebAssembly Docs](https://webassembly.org/docs/web/) |
| **Testing**           | Jest, Playwright       | Unit and end-to-end testing with CI/CD integration.                        | [Jest Docs](https://jestjs.io/docs/getting-started), [Playwright Docs](https://playwright.dev/docs/intro) |
| **Internationalization** | next-i18next       | Library for handling multiple languages in Next.js.                        | [next-i18next Docs](https://github.com/i18next/next-i18next) |
| **UI Utilities**      | Intro.js, react-markdown | Guided tours and markdown rendering for UI enhancements.                   | [Intro.js Docs](https://introjs.com/docs/introduction), [react-markdown Docs](https://github.com/remarkjs/react-markdown) |
| **Deployment**        | Vercel                 | Serverless deployment platform for hosting.                                | [Vercel Docs](https://vercel.com/docs)             |

## Justification
- Builds on T3 Chat’s T3 stack (Next.js, TypeScript, Tailwind CSS, tRPC) with enhancements for glassmorphism (Framer Motion), real-time collaboration (Upstash Redis), and performance (WebAssembly).
- Ensures open-source compatibility and scalability, aligning with Cloneathon requirements and judging criteria.

## Notes
- All tools are open-source or have free tiers, supporting our MIT-licensed project.
- Reference this file during setup (see `SETUP.md`) and development phases.