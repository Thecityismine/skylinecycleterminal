import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout/LayoutShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skyline Cycle Terminal",
  description: "Bitcoin & Ethereum Macro Cycle Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable}`}
      suppressHydrationWarning
    >
      <body
        className="h-screen overflow-hidden"
        style={{ backgroundColor: "var(--sct-bg)" }}
      >
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
