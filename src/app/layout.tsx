import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { TopNav } from '@/components/ui/top-nav';
import { RouteProgress } from '@/components/route-progress';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

const display = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tech Codex - 开发者笔记',
  description: '开发者技术笔记与知识管理',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${display.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          <TopNav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
