import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AdminTone = "blue" | "emerald" | "amber" | "red" | "violet" | "slate";

/** 颜色只用来编码状态，不用来做装饰：
 *  顶部色条仅"失败=红""待处理=黄"着色，其余（索引中/已就绪/普通统计）一律中性，
 *  否则一排统计卡会出现五种颜色，用户无法从颜色读出任何含义。 */
const TONE_STYLES: Record<AdminTone, { icon: string; value: string; bar: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600 ring-blue-100", value: "text-slate-900", bar: "bg-slate-300" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", value: "text-slate-900", bar: "bg-slate-300" },
  amber: { icon: "bg-amber-50 text-amber-600 ring-amber-100", value: "text-amber-600", bar: "bg-amber-500" },
  red: { icon: "bg-red-50 text-red-600 ring-red-100", value: "text-red-600", bar: "bg-red-500" },
  violet: { icon: "bg-violet-50 text-violet-600 ring-violet-100", value: "text-slate-900", bar: "bg-slate-300" },
  slate: { icon: "bg-slate-100 text-slate-600 ring-slate-200", value: "text-slate-900", bar: "bg-slate-200" },
};

/** 管理页统一按钮样式，避免每个页面各写一套高度和圆角。 */
export function adminBtn(
  variant: "primary" | "secondary" | "ghost" | "danger" = "secondary",
  size: "sm" | "md" = "md",
): string {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-55";
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-compact",
  } as const;
  const variants = {
    primary: "bg-accent text-white shadow-sm shadow-blue-600/15 hover:bg-accent/90",
    secondary: "border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
  } as const;
  return clsx(base, sizes[size], variants[variant]);
}

export function AdminPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-accent shadow-sm">
          <Icon size={19} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          {/* eyebrow 只在页面显式传入时渲染：管理台已有一级导航"管理工作台"，
              再给每个页面挂同名小字属于同屏重复编码，只会挤压标题区。 */}
          {eyebrow && (
            <div className="hidden text-2xs font-medium uppercase tracking-[0.16em] text-slate-400 sm:block">{eyebrow}</div>
          )}
          <h1 className={clsx("text-[22px] font-semibold leading-7 tracking-[-0.02em] text-slate-900", eyebrow && "mt-1")}>{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-compact leading-5 text-slate-500">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">{meta}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

export function AdminCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={clsx(
        "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icon size={14} />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-compact font-semibold tracking-tight text-slate-800">{title}</h2>}
              {description && <p className="mt-0.5 text-caption leading-4 text-slate-400">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

export function AdminMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "slate",
  href,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: AdminTone;
  href?: string;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];
  const card = (
    <div className={clsx("group relative overflow-hidden rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)]", className)}>
      <span className={clsx("absolute inset-x-0 top-0 h-0.5", styles.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-caption font-medium uppercase tracking-[0.08em] text-slate-400">{label}</div>
          <div className={clsx("mt-2 font-mono text-[26px] font-semibold leading-7 tracking-[-0.03em]", styles.value)}>
            {value}
          </div>
        </div>
        <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", styles.icon)}>
          <Icon size={15} />
        </span>
      </div>
      {hint && <div className="mt-1.5 truncate text-caption text-slate-400">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className={clsx("block", className)}>{card}</Link> : card;
}

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={clsx("flex flex-col items-center justify-center px-6 text-center", compact ? "py-10" : "py-16")}>
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200/70">
        <Icon size={20} />
      </span>
      <p className="mt-3 text-compact font-medium text-slate-600">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** 管理表格统一分页条：始终展示总数，翻页按钮保持同一密度。 */
export function AdminPagination({
  page,
  totalPages,
  totalElements,
  pageSize,
  unit = "条",
  loading = false,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  unit?: string;
  loading?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const pages = Math.max(totalPages, 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-caption text-slate-400">
      <span>共 {totalElements} {unit} · 第 {page + 1} / {pages} 页</span>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">每页 {pageSize} 条</span>
        <button
          onClick={onPrev}
          disabled={page <= 0 || loading}
          className="rounded-md border border-slate-200 bg-white px-3 py-1 text-caption text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          上一页
        </button>
        <button
          onClick={onNext}
          disabled={page >= pages - 1 || loading}
          className="rounded-md border border-slate-200 bg-white px-3 py-1 text-caption text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
