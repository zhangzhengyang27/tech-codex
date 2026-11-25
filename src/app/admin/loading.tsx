/**
 * 管理台骨架屏。首屏统计要等后端聚合（实测约 18 秒），
 * 用与真实布局同构的骨架占位，避免白屏结束后内容突然跳动。
 * 骨架高度对齐 AdminMetricCard 与列表块，减少加载完成时的布局位移。
 */
export default function AdminLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="space-y-2">
        <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-7 w-44 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted/70" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-border bg-muted/40"
          />
        ))}
      </div>

      <div className="h-40 animate-pulse rounded-lg border border-border bg-muted/30" />
    </div>
  );
}
