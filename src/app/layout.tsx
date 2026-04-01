import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css'; // Import cukup satu kali saja
import IdleTimer from '@/components/IdleTimer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Report Kendala - Stasiun Tangerang',
  description: 'Sistem Monitoring Kendala Operasional Stasiun',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">{children}</body>
    </html>
  );
}
