/**
 * 文档路由骨架：分类页与详情页共用。
 * 左侧目录与正文段落同步占位——只占正文会让侧栏晚出现，正文被横向挤动一次。
 * 宽度用递增的百分比模拟不同段落长度，避免看起来像一排等长横条。
 */
export default function DocsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 md:px-6">
      <div className="hidden w-52 shrink-0 space-y-2 lg:block">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-muted"
            style={{ width: `${60 + ((i * 13) % 35)}%` }}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded bg-muted/70"
            style={{ width: `${70 + ((i * 7) % 30)}%` }}
          />
        ))}
      </div>
    </div>
  );
}
