import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coach",
  description: "Coach IA multi-sports",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body
        className={`${inter.className} flex min-h-full flex-col bg-slate-50 text-zinc-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
