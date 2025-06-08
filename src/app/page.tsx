export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="glass-container max-w-2xl rounded-2xl border border-white/20 bg-white/20 p-8 text-center shadow-xl backdrop-blur-lg">
        <h1 className="mb-4 text-4xl font-bold text-white">
          Welcome to GlassChat 🪟
        </h1>
        <p className="mb-6 text-lg text-white/90">
          A stunning glassmorphism-powered AI chat application built with the T3
          Stack
        </p>
        <div className="mb-6 rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
          <p className="text-sm text-white/80">
            ✨ Project setup complete! Ready for AI integration and chat
            features.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm text-white/70">
          <div className="rounded-lg bg-white/5 p-3">
            <strong>🔧 Tech Stack:</strong>
            <br />
            Next.js 15, TypeScript, Tailwind CSS 4, tRPC
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <strong>🎨 Features:</strong>
            <br />
            Glassmorphism UI, Multi-AI Support, Real-time Sync
          </div>
        </div>
      </div>
    </div>
  );
}
