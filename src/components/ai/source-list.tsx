"use client";

/** 引用来源卡：编号角标 + 标题/小节 + 可点击文档锚点。AI 页与「问这篇文档」共用。 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import type { KbChunkHit } from "@/lib/auth";
import { sourceHref } from "@/lib/citation";

/** 收起态展示条数：来源多于该数量时默认折叠，避免一次回答占满整屏 */
const COLLAPSED_COUNT = 5;

/**
 * 按「文档 + 小节」去重，保留分数最高的一条（同分保留先出现的）。
 * 后端已做去重与上限；这里是前端防御，兼容语义缓存里的旧数据与单文档问答。
 */
export function dedupeSources(sources: KbChunkHit[]): KbChunkHit[] {
  const best = new Map<string, KbChunkHit>();
  for (const s of sources) {
    const key = `${s.filePath ?? ""}#${s.headingPath ?? ""}`;
    const current = best.get(key);
    if (!current || (s.score ?? -Infinity) >= (current.score ?? -Infinity)) {
      best.set(key, s);
    }
  }
  return [...best.values()];
}

export function SourceList({
  sources,
  urlMap = {},
}: {
  sources: KbChunkHit[];
  urlMap?: Record<string, string | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const unique = useMemo(() => dedupeSources(sources), [sources]);

  if (!unique.length) return null;
  const visible = expanded ? unique : unique.slice(0, COLLAPSED_COUNT);

  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground/60">
        <FileText size={12} />
        引用来源（{unique.length}）
      </p>
      <ul className="space-y-1">
        {visible.map((s, idx) => {
          const href = sourceHref(s, urlMap);
          const label = s.title || s.filePath;
          const section = s.headingPath?.trim();
          const meta = section
            ? s.chunkType === "code"
              ? `代码 · ${s.codeLang || "code"} · ${section}`
              : s.chunkType === "table"
                ? `表格${s.tableHeader ? ` · ${s.tableHeader}` : ""} · ${section}`
                : section
            : null;
          return (
            <li key={`${s.filePath ?? ""}#${s.headingPath ?? ""}#${idx}`} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded bg-accent/10 px-1 text-2xs font-medium text-accent">
                {s.citationId ?? idx + 1}
              </span>
              {href ? (
                <Link
                  href={href}
                  // 新窗口打开：来源链接会卸载对话页，回来后当前会话上下文已丢失
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block min-w-0 text-xs text-accent hover:underline"
                >
                  <span className="line-clamp-1">{label}</span>
                  {meta && (
                    <span className="mt-0.5 block line-clamp-1 text-2xs font-normal text-foreground/45">
                      {meta}
                    </span>
                  )}
                </Link>
              ) : (
                <span className="block min-w-0 text-xs text-foreground/60">
                  <span className="line-clamp-1">{label}</span>
                  {meta && (
                    <span className="mt-0.5 block line-clamp-1 text-2xs text-foreground/45">
                      {meta}
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {unique.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 flex items-center gap-1 text-2xs text-foreground/50 hover:text-foreground"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "收起来源" : `展开全部 ${unique.length} 条`}
        </button>
      )}
    </div>
  );
}
