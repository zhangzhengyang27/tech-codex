import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { TopNav } from '@/components/ui/top-nav';
import { RouteProgress } from '@/components/route-progress';
import { AuthProvider } from '@/context/AuthContext';
import { SITE_URL } from '@/lib/site';
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
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Tech Codex - 开发者笔记',
    template: '%s · Tech Codex',
  },
  description: '开发者技术笔记与知识管理：前端/后端/架构/测试等 4000+ 篇文档，支持全文检索与 AI 问答',
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': '/feed.xml' },
  },
  openGraph: {
    type: 'website',
    siteName: 'Tech Codex',
    locale: 'zh_CN',
  },
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
