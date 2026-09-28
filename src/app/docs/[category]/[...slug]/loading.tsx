/** 文档详情页是动态 SSR（无 generateStaticParams），切换文档时服务端渲染期间
 *  先展示本骨架，避免「点了没反应」的空窗。布局与 [...slug]/page.tsx 对齐：
 *  正文（面包屑 + 标题 + 段落 + 代码卡片）+ 右侧目录栏（xl）。 */

function Bar({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className ?? ''}`} />;
}

export default function DocLoading() {
  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-10">
      <main className="min-w-0 flex-1 px-1 py-6 lg:px-0 lg:py-10">
        {/* 面包屑 */}
        <nav className="mb-6 flex items-center gap-2">
          <Bar className="h-3.5 w-10" />
          <span className="text-xs text-foreground/30">/</span>
          <Bar className="h-3.5 w-16" />
          <span className="text-xs text-foreground/30">/</span>
          <Bar className="h-3.5 w-32" />
        </nav>

        <article className="prose-doc">
          {/* 标题 */}
          <Bar className="h-8 w-3/5" />
          <div className="mt-8 space-y-3.5">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-11/12" />
            <Bar className="h-4 w-4/6" />
          </div>
          {/* 小节标题 + 段落 */}
          <Bar className="mt-10 h-5 w-2/5" />
          <div className="mt-5 space-y-3.5">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-5/6" />
            <Bar className="h-4 w-2/3" />
          </div>
          {/* 代码卡片 */}
          <div className="mt-8 rounded-lg bg-[#0d1117] p-4">
            <Bar className="h-3.5 w-full opacity-30" />
            <Bar className="mt-2.5 h-3.5 w-4/5 opacity-30" />
            <Bar className="mt-2.5 h-3.5 w-3/5 opacity-30" />
          </div>
          <div className="mt-8 space-y-3.5">
            <Bar className="h-4 w-full" />
            <Bar className="h-4 w-3/4" />
          </div>
        </article>
      </main>

      {/* 目录栏骨架 */}
      <aside className="hidden xl:block w-56 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-3 overflow-y-auto py-10 pl-4">
          <Bar className="h-3 w-20" />
          <Bar className="h-3 w-28" />
          <Bar className="ml-4 h-3 w-24" />
          <Bar className="ml-4 h-3 w-28" />
          <Bar className="h-3 w-16" />
          <Bar className="ml-4 h-3 w-24" />
        </div>
      </aside>
    </div>
  );
}
