import { Loader2 } from "lucide-react";

/**
 * 根级加载骨架：路由段切换时立即出现，替代白屏。
 * 只覆盖服务端数据未就绪的时段；页面内部的刷新状态（如刷新按钮的 spinner）仍由各页面自己控制。
 */
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-foreground/40">
      <Loader2 size={18} className="animate-spin text-accent" />
      正在加载…
    </div>
  );
}
