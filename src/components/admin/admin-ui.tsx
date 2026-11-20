import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AdminTone = "blue" | "emerald" | "amber" | "red" | "violet" | "slate";

const TONE_STYLES: Record<AdminTone, { icon: string; value: string; bar: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600 ring-blue-100", value: "text-slate-900", bar: "bg-blue-500" },
  emerald: { icon: "bg-emerald-50 text-emerald-600 ring-emerald-100", value: "text-slate-900", bar: "bg-emerald-500" },
  amber: { icon: "bg-amber-50 text-amber-600 ring-amber-100", value: "text-amber-600", bar: "bg-amber-500" },
  red: { icon: "bg-red-50 text-red-600 ring-red-100", value: "text-red-600", bar: "bg-red-500" },
  violet: { icon: "bg-violet-50 text-violet-600 ring-violet-100", value: "text-slate-900", bar: "bg-violet-500" },
  slate: { icon: "bg-slate-100 text-slate-600 ring-slate-200", value: "text-slate-900", bar: "bg-slate-400" },
};

/** 管理页统一按钮样式，避免每个页面各写一套高度和圆角。 */
export function adminBtn(
  variant: "primary" | "secondary" | "ghost" | "danger" = "secondary",
  size: "sm" | "md" = "md",
): string {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55";
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-[13px]",
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
  eyebrow = "管理工作台",
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
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-accent shadow-sm">
          <Icon size={19} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">{eyebrow}</div>
          <h1 className="mt-1 text-[22px] font-semibold leading-7 tracking-[-0.02em] text-slate-900">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-slate-500">{description}</p>}
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
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
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
              {title && <h2 className="text-[13px] font-semibold tracking-tight text-slate-800">{title}</h2>}
              {description && <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{description}</p>}
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
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: AdminTone;
  href?: string;
}) {
  const styles = TONE_STYLES[tone];
  const card = (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_28px_-18px_rgba(15,23,42,0.35)]">
      <span className={clsx("absolute inset-x-0 top-0 h-0.5", styles.bar)} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">{label}</div>
          <div className={clsx("mt-2 font-mono text-[26px] font-semibold leading-7 tracking-[-0.03em]", styles.value)}>
            {value}
          </div>
        </div>
        <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1", styles.icon)}>
          <Icon size={15} />
        </span>
      </div>
      {hint && <div className="mt-1.5 truncate text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{card}</Link> : card;
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
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/70">
        <Icon size={20} />
      </span>
      <p className="mt-3 text-[13px] font-medium text-slate-600">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
