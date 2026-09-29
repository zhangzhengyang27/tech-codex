"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

import { getToken } from "@/lib/auth";

/**
 * 课程分类过滤器（AI 问答页）：选项来自后端 /kb-api/categories
 * （kb_document.category 去重，即文档 frontmatter 的 category 标签，
 * 与站点的目录分类是两套口径）。值为空串 = 不按分类过滤。
 */
export function CategorySwitcher({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    // 端点在 /api/kb/** 鉴权范围内，必须携带 Bearer token，否则 401 静默失败、下拉永不出现
    fetch("/kb-api/categories", {
      headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: unknown) => {
        if (!cancelled && Array.isArray(list)) {
          setCategories(list.filter((c): c is string => typeof c === "string"));
        }
      })
      .catch(() => {
        /* 分类清单加载失败时仅展示"全部分类" */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (categories.length === 0) return null;

  return (
    <select
      aria-label="按分类过滤检索"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "h-[30px] max-w-[10rem] rounded-md border border-border bg-muted/40 px-1.5 text-xs text-foreground/70 outline-none",
        "hover:text-foreground focus:border-accent disabled:opacity-50",
      )}
    >
      <option value="">全部分类</option>
      {categories.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
