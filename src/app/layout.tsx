import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Investment Research Agent — Smart Stock Analysis",
  description:
    "AI-powered investment research agent that analyzes companies using real-time data, financial metrics, news sentiment, competitive landscape, and industry trends to deliver actionable investment decisions.",
  keywords: [
    "AI investment",
    "stock analysis",
    "investment research",
    "financial analysis",
    "stock market AI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
