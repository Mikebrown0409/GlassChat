import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { AuthSessionProvider } from "~/components/AuthSessionProvider";
import { ThemeProvider } from "~/components/ui/ThemeProvider";
import { UserCacheIsolator } from "~/components/UserCacheIsolator";
import { CollabModeProvider } from "~/context/CollabModeContext";
import { auth } from "~/server/auth";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "GlassChat - AI Chat & Collaboration",
  description:
    "A modern AI chat application with real-time collaboration built with the T3 Stack",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  metadataBase: new URL("https://glass-chat-two.vercel.app"),
  openGraph: {
    title: "GlassChat - AI Chat & Collaboration",
    description:
      "A modern AI chat application with real-time collaboration built with the T3 Stack",
    url: "https://glass-chat-two.vercel.app",
    siteName: "GlassChat",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GlassChat - AI Chat & Collaboration",
    description:
      "A modern AI chat application with real-time collaboration built with the T3 Stack",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('glasschat-theme');
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const theme = storedTheme || systemTheme;
                
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {
                console.error('Failed to initialize theme:', e);
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthSessionProvider session={session}>
          <ThemeProvider storageKey="glasschat-theme">
            {/* TEMPORARILY REMOVED - this was overlaying the header */}
            {/* <div className="absolute top-4 right-4">
              <ThemeSwitcher />
            </div> */}
            <CollabModeProvider>
              <UserCacheIsolator userId={session?.user.id ?? null} />
              <TRPCReactProvider>{children}</TRPCReactProvider>
              <VercelAnalytics />
            </CollabModeProvider>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
