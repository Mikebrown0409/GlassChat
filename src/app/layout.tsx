import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { ThemeProvider } from "~/components/ui/ThemeProvider";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "GlassChat - AI Chat with Glassmorphism",
  description:
    "A stunning glassmorphism-powered AI chat application built with the T3 Stack",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
