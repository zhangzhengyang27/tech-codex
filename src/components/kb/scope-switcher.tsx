"use client";

import clsx from "clsx";
import type { KbScope } from "@/lib/auth";

const OPTIONS: { value: KbScope; label: string; title: string }[] = [
  { value: "public", label: "公共知识库", title: "仅检索站内公开文档（默认）" },
  { value: "mine", label: "我的知识库", title: "仅检索我的私有知识库" },
  { value: "all", label: "全部", title: "公共知识库 + 我的知识库一起检索" },
];

/**
 * 检索范围切换器（用户私有知识库 F1）：三态分段控件，
 * 悬停可见说明；busy 时禁用避免流式回答中途改范围。
 */
export function ScopeSwitcher({
  value,
  onChange,
  disabled,
}: {
  value: KbScope;
  onChange: (v: KbScope) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center rounded-md border border-border bg-muted/40 p-0.5"
      role="group"
      aria-label="检索范围"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={clsx(
            "rounded px-2 py-1 text-xs transition-colors disabled:opacity-50",
            value === o.value
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-foreground/50 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
