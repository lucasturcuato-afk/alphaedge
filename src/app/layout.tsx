// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "AlphaEdge — Sports Betting Intelligence",
  description:
    "Quantitative sports prediction platform for NBA, NCAAMB, and MLB",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="font-body">
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <div className="flex flex-1 pt-14">
            <Sidebar />
            <main className="flex-1 ml-0 lg:ml-56 px-4 lg:px-6 py-6 max-w-[1600px] mx-auto w-full">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
