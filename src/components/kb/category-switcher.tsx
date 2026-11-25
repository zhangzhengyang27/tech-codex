"use client";

/**
 * 课程分类过滤器（AI 问答页）：选项来自后端 /kb-api/categories。
 *
 * 后端把 frontmatter 的 47 个细粒度分类归并成 10 个顶级分类（附文档数）。
 * 原生 select 无法搜索、也会截断长分类名，这里改为可搜索的两级下拉：
 * 默认只列顶级分类；展开后可下钻选单个原分类；输入关键词时同时过滤两级。
 * 选中顶级传顶级名（后端展开为原分类集合检索），选中子项仍按原分类精确过滤。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { getToken } from "@/lib/auth";

interface CategoryItem {
  name: string;
  count: number;
}

interface CategoryGroup {
  name: string;
  count: number;
  children: CategoryItem[];
}

/** 搜索结果项：顶级分类或某个原分类 */
type Match =
  | { kind: "group"; group: CategoryGroup }
  | { kind: "child"; group: CategoryGroup; child: CategoryItem };

export function CategorySwitcher({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 端点在 /api/kb/** 鉴权范围内，必须携带 Bearer token，否则 401 静默失败、下拉永不出现
    fetch("/kb-api/categories", {
      headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((list: unknown) => {
        if (cancelled || !Array.isArray(list)) return;
        // 兼容旧版纯字符串数组（后端未升级时不让下拉消失）
        if (list.every((item) => typeof item === "string")) {
          setGroups(
            (list as string[]).map((name) => ({ name, count: 0, children: [{ name, count: 0 }] }))
          );
          return;
        }
        setGroups(
          (list as CategoryGroup[])
            .filter((g) => g && typeof g.name === "string" && Array.isArray(g.children))
            .map((g) => ({
              name: g.name,
              count: Number(g.count) || 0,
              children: g.children
                .filter((c) => c && typeof c.name === "string")
                .map((c) => ({ name: c.name, count: Number(c.count) || 0 })),
            }))
        );
      })
      .catch(() => {
        /* 分类清单加载失败时仅展示"全部分类" */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 打开时聚焦搜索框（状态重置在 openPanel 中完成，避免 effect 里同步 setState）
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // 点击外部或 Esc 关闭面板
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /** 选中值对应的展示文案：子分类显示「父级 · 子分类」，避免只看到「CSS基础」不知道归属 */
  const label = useMemo(() => {
    if (!value) return "全部分类";
    const group = groups.find((g) => g.name === value);
    if (group) return group.name;
    const parent = groups.find((g) => g.children.some((c) => c.name === value));
    return parent ? `${parent.name} · ${value}` : value;
  }, [value, groups]);

  const matches = useMemo<Match[] | null>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return groups.flatMap<Match>((group) => {
      const hits: Match[] = [];
      if (group.name.toLowerCase().includes(q)) hits.push({ kind: "group", group });
      for (const child of group.children) {
        if (child.name.toLowerCase().includes(q)) hits.push({ kind: "child", group, child });
      }
      return hits;
    });
  }, [query, groups]);

  if (groups.length === 0) return null;

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  /** 打开面板：重置搜索词并展开当前选中值所属的顶级分类 */
  const openPanel = () => {
    setQuery("");
    const parent = groups.find(
      (g) => g.name === value || g.children.some((c) => c.name === value)
    );
    setExpanded(parent?.name ?? null);
    setOpen(true);
  };

  const optionClass = (selected: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
      selected ? "bg-accent/10 text-accent" : "text-foreground/75 hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="按分类过滤检索"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="flex h-[30px] max-w-[12rem] items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 text-xs text-foreground/70 outline-none hover:text-foreground focus:border-accent disabled:opacity-50"
      >
        <span className="truncate">{label}</span>
        <ChevronDown size={12} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute right-0 top-[34px] z-30 w-80 rounded-lg border border-border bg-background p-1.5 shadow-xl">
          <div className="relative mb-1">
            <Search
              size={12}
              className="pointer-events-none absolute left-2 top-2 text-foreground/40"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索分类，如 CSS、测试"
              aria-label="搜索分类"
              className="w-full rounded-md border border-border bg-muted/40 py-1 pl-7 pr-7 text-xs outline-none placeholder:text-foreground/35 focus:border-accent"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="清空搜索"
                className="absolute right-1 top-1 rounded p-0.5 text-foreground/40 hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div
            role="listbox"
            aria-label="分类选项"
            className="max-h-64 overflow-y-auto pr-2 [scrollbar-width:thin]"
          >
            {!query && (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => choose("")}
                className={optionClass(!value)}
              >
                <span>全部分类</span>
                <span className="text-2xs text-foreground/35">不限</span>
              </button>
            )}

            {matches
              ? matches.map((m) =>
                  m.kind === "group" ? (
                    <button
                      key={`g-${m.group.name}`}
                      type="button"
                      role="option"
                      aria-selected={value === m.group.name}
                      onClick={() => choose(m.group.name)}
                      className={optionClass(value === m.group.name)}
                    >
                      <span className="truncate">{m.group.name}</span>
                      <span className="shrink-0 text-2xs text-foreground/35">{m.group.count}</span>
                    </button>
                  ) : (
                    <button
                      key={`c-${m.group.name}-${m.child.name}`}
                      type="button"
                      role="option"
                      aria-selected={value === m.child.name}
                      onClick={() => choose(m.child.name)}
                      className={optionClass(value === m.child.name)}
                    >
                      <span className="min-w-0">
                        <span className="truncate">{m.child.name}</span>
                        <span className="ml-1 text-2xs text-foreground/35">{m.group.name}</span>
                      </span>
                      <span className="shrink-0 text-2xs text-foreground/35">{m.child.count}</span>
                    </button>
                  )
                )
              : groups.map((group) => {
                  const isExpanded = expanded === group.name;
                  const selected = value === group.name;
                  return (
                    <div key={group.name}>
                      <div className={`flex items-center rounded-md ${selected ? "bg-accent/10" : ""}`}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => choose(group.name)}
                          className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                            selected ? "text-accent" : "text-foreground/75 hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className="truncate">{group.name}</span>
                          <span className="shrink-0 text-2xs text-foreground/35">{group.count}</span>
                        </button>
                        {/* 展开箭头独立成按钮：避免在选项按钮里嵌套 button 造成语义/键盘问题 */}
                        <button
                          type="button"
                          onClick={() => setExpanded(isExpanded ? null : group.name)}
                          aria-label={isExpanded ? `收起 ${group.name}` : `展开 ${group.name}`}
                          aria-expanded={isExpanded}
                          className="mr-1 shrink-0 rounded p-1 text-foreground/35 hover:bg-muted hover:text-foreground"
                        >
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="mb-0.5">
                          {group.children.map((child) => (
                            <button
                              key={child.name}
                              type="button"
                              role="option"
                              aria-selected={value === child.name}
                              onClick={() => choose(child.name)}
                              className={`${optionClass(value === child.name)} pl-5`}
                            >
                              <span className="truncate">{child.name}</span>
                              <span className="shrink-0 text-2xs text-foreground/35">{child.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

            {matches && matches.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-foreground/40">没有匹配的分类</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
