"use client";

/**
 * RAG 评测各 Tab 共享的展示组件与格式化工具（从 eval 页拆出）。
 */
import { useCallback, useState } from "react";
import clsx from "clsx";
import type { EvalCaseResult } from "@/lib/auth";

export function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return `${(v * 100).toFixed(digits)}%`;
}

export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return v.toFixed(3);
}

export function MetricCard({
  label,
  value,
  sub,
  good,
}: {
  label: string;
  value: string;
  sub?: string;
  good?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[13px] text-foreground/50">{label}</div>
      <div
        className={clsx(
          "mt-1 text-2xl font-semibold tracking-tight font-mono",
          good === true && "text-emerald-600",
          good === false && "text-red-500",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-foreground/40">{sub}</div>}
    </div>
  );
}

export function CaseTable({ cases, label }: { cases: EvalCaseResult[]; label?: string }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggle = useCallback((i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">
        {label ?? "用例明细"}
        <span className="ml-2 text-xs font-normal text-foreground/40">
          {cases.length} 条
        </span>
      </div>
      {cases.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-foreground/40">
          暂无评测用例（Golden Set）
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">问题</th>
                <th className="px-3 py-2 font-medium">期望关键字</th>
                <th className="px-3 py-2 font-medium">结果</th>
                <th className="px-3 py-2 font-medium">首命中位</th>
                <th className="px-3 py-2 font-medium">NDCG</th>
                <th className="px-3 py-2 font-medium">缺失关键字</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => {
                const open = expanded.has(i);
                return (
                  <FragmentRow
                    key={c.caseId ?? i}
                    c={c}
                    open={open}
                    onToggle={() => toggle(i)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FragmentRow({
  c,
  open,
  onToggle,
}: {
  c: EvalCaseResult;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={clsx(
          "border-b border-border/60 transition-colors hover:bg-muted/40",
          !c.hit && "bg-red-50/40",
        )}
      >
        <td className="max-w-[280px] px-4 py-2.5">
          <div className="truncate" title={c.question}>
            {c.question}
          </div>
        </td>
        <td className="px-3 py-2.5 text-foreground/60">{c.expectedKeywords}</td>
        <td className="px-3 py-2.5">
          <span
            className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
              c.hit ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600",
            )}
          >
            {c.hit ? "命中" : "未命中"}
          </span>
        </td>
        <td className="px-3 py-2.5 font-mono text-foreground/70">
          {c.firstHitRank > 0 ? `#${c.firstHitRank}` : "-"}
        </td>
        <td className="px-3 py-2.5 font-mono text-foreground/70">{fmt(c.ndcg)}</td>
        <td className="px-3 py-2.5">
          {c.missingKeywords.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {c.missingKeywords.map((k) => (
                <span
                  key={k}
                  className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-600"
                >
                  {k}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-foreground/30">-</span>
          )}
        </td>
        <td className="px-2 py-2.5 text-right">
          <button
            onClick={onToggle}
            className="rounded-md px-2 py-1 text-xs text-foreground/40 hover:bg-muted hover:text-foreground"
          >
            {open ? "收起" : "片段"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border/60 bg-muted/30">
          <td colSpan={7} className="px-4 py-3">
            <div className="text-xs font-medium text-foreground/40">
              返回片段 Top-{c.returnedCount}
            </div>
            {c.topTitles.length === 0 ? (
              <div className="mt-1 text-[13px] text-foreground/40">
                无检索结果（可能检索异常或知识库为空）
              </div>
            ) : (
              <ol className="mt-1.5 space-y-1">
                {c.topTitles.map((t, idx) => (
                  <li
                    key={idx}
                    className="flex gap-2 text-[13px] text-foreground/80"
                  >
                    <span className="w-5 shrink-0 text-right font-mono text-xs text-foreground/40">
                      {idx + 1}
                    </span>
                    <span className="truncate" title={t}>
                      {t}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function NumInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-foreground/50">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-24 rounded-md border border-border bg-background px-2 text-[13px] outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

export function ToggleGroup({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // "default" | "true" | "false"
  onChange: (v: string) => void;
}) {
  const opts = [
    { v: "default", label: "沿用" },
    { v: "true", label: "开" },
    { v: "false", label: "关" },
  ];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-foreground/50">{label}</span>
      <div className="flex h-8 overflow-hidden rounded-md border border-border">
        {opts.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={clsx(
              "px-2.5 text-[12px] transition-colors",
              value === o.v
                ? "bg-accent text-white"
                : "bg-background text-foreground/50 hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
