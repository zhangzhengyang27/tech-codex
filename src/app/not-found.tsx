import Link from 'next/link';
import { ArrowLeft, FileQuestion, ListTree } from 'lucide-react';

/**
 * 全局 404 页。
 *
 * 存在的理由：此前项目没有 not-found.tsx，任何未匹配路径都落到 Next 默认的
 * 英文 "This page could not be found."，既不符合站点语言，也没有任何出口。
 * `/docs` 这类被外部链接引用的路径一旦断掉，用户只能手动改地址栏。
 *
 * 这里给出两个明确出口：回首页（可搜索）、或进文档总览（可逐级浏览）。
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-foreground/40">
        <FileQuestion size={26} />
      </span>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/40">
        404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">这个页面不存在</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-foreground/60">
        链接可能已经失效，或文档在目录调整中被移动。可以用站内搜索定位新地址，也可以从文档总览重新进入。
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <ArrowLeft size={15} />
          返回首页搜索
        </Link>
        <Link
          href="/docs"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <ListTree size={15} />
          浏览文档总览
        </Link>
      </div>
    </main>
  );
}
