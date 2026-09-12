import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TradeAI Research — AI-Native Trading Experiment Builder',
  description:
    'Ask trading questions in natural language. TradeAI structures your idea into a testable experiment, identifies missing parameters, and prepares it for backtesting.',
  keywords: ['trading', 'backtesting', 'AI', 'NIFTY', 'market research', 'quantitative'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
