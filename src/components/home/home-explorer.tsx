'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  FileText,
  Clock,
  Sparkles,
  ChevronRight,
  ListTree,
  Layers,
} from 'lucide-react';
import type { DocCategory } from '@/lib/docs-config';
import type { DocsStats } from '@/lib/docs-reader';
import type { CategoryFileItem } from '@/lib/docs-reader';
import type { RecentUpdate } from '@/lib/recent-updates';
import { kbSearch, type KbChunkHit } from '@/lib/auth';
import { resolveDocUrl } from '@/lib/doc-url';

/** 首页分组：分类附带该目录下的全部文件 */
export interface HomeCategory extends DocCategory {
  files: CategoryFileItem[];
}

export interface HomeGroup {
  id: string;
  title: string;
  description: string;
  categories: HomeCategory[];
}

interface HomeExplorerProps {
  groups: HomeGroup[];
  stats: DocsStats;
  updates: RecentUpdate[];
}

/** 智能搜索状态机：防抖请求 /kb-api/search（需登录），401 提示登录 */
interface SmartState {
  loading: boolean;
  error: string;
  needLogin: boolean;
  results: KbChunkHit[];
  doneQuery: string;
}

const SMART_IDLE: SmartState = {
  loading: false,
  error: '',
  needLogin: false,
  results: [],
  doneQuery: '',
};

export function HomeExplorer({ groups, stats, updates }: HomeExplorerProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'title' | 'smart'>('title');
  const [smart, setSmart] = useState<SmartState>(SMART_IDLE);
  const q = query.trim().toLowerCase();
  const searching = q !== '';
  // 智能模式且有输入时，主区展示检索结果而非分类索引
  const smartActive = mode === 'smart' && searching;

  const categoriesCount = groups.reduce((n, g) => n + g.categories.length, 0);

  // 搜索过滤：匹配分组 / 分类 / 文档标题
  const filtered = useMemo<HomeGroup[]>(() => {
    if (!searching) return groups;

    return groups
      .map((group) => {
        const categories = group.categories
          .map((cat) => {
            const files = cat.files.filter(
              (f) =>
                f.title.toLowerCase().includes(q) ||
                f.slug.toLowerCase().includes(q)
            );
            const catMatch =
              group.title.toLowerCase().includes(q) ||
              cat.title.toLowerCase().includes(q) ||
              cat.slug.toLowerCase().includes(q) ||
              cat.description.toLowerCase().includes(q);
            return { ...cat, files: catMatch ? cat.files : files, catMatch };
          })
          .filter((cat) => cat.catMatch || cat.files.length > 0);
        return { ...group, categories };
      })
      .filter((group) => group.categories.length > 0);
  }, [groups, q, searching]);

  // 智能搜索：500ms 防抖后调后端混合检索（向量+BM25），401 引导登录。
  // 空查询时不做任何状态写入，渲染层用派生值回退空闲态（避免 effect 内同步 setState）。
  useEffect(() => {
    if (mode !== 'smart' || !q) return;
    const timer = setTimeout(async () => {
      setSmart((s) => ({ ...s, loading: true, error: '', needLogin: false }));
      try {
        const hits = await kbSearch(q, 8);
        setSmart({ loading: false, error: '', results: hits, needLogin: false, doneQuery: q });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '搜索失败';
        setSmart({ loading: false, error: msg, results: [], needLogin: msg.includes('401'), doneQuery: q });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [mode, q]);

  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[460px] w-[860px] max-w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(37,99,235,0.16),transparent)] blur-2xl"
        />
        <div className="mx-auto max-w-[1280px] px-4 pb-12 pt-12 text-center sm:px-6 sm:pt-16">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-foreground/60">
            <Sparkles size={13} className="text-accent" />
            开发者技术知识库 · 全量索引
          </div>

          <h1
            className="animate-fade-up mt-6 bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl"
            style={{ animationDelay: '0.05s' }}
          >
            Tech Codex
          </h1>

          <p
            className="animate-fade-up mx-auto mt-5 max-w-2xl text-base text-foreground/60 md:text-lg"
            style={{ animationDelay: '0.1s' }}
          >
            全站内容索引 —— 收录{' '}
            <span className="font-medium text-foreground">{stats.total}</span> 篇文档，
            <span className="font-medium text-foreground"> {groups.length} </span>
            大方向、<span className="font-medium text-foreground">{categoriesCount}</span>{' '}
            个分类，一键浏览全部内容。
          </p>

          {/* 搜索框：图标 + 输入框包在同一个 relative 容器内，保证图标垂直居中于输入框 */}
          <div
            className="animate-fade-up mx-auto mt-8 max-w-xl"
            style={{ animationDelay: '0.15s' }}
          >
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'smart' ? '语义 + 全文混合检索，试试描述你想找的内容…' : '搜索分组、分类或文档标题…'}
                className="w-full rounded-full border border-border bg-background py-3.5 pl-12 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-foreground/40 focus:border-accent focus:ring-4 focus:ring-accent/10"
              />
            </div>
            {/* 检索模式切换 */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <ModeButton active={mode === 'title'} onClick={() => setMode('title')}>
                标题匹配
              </ModeButton>
              <ModeButton active={mode === 'smart'} onClick={() => setMode('smart')}>
                <Sparkles size={12} className={mode === 'smart' ? '' : 'text-accent'} />
                智能搜索
              </ModeButton>
            </div>
          </div>

          {/* 数据条 */}
          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-9"
            style={{ animationDelay: '0.2s' }}
          >
            <Stat value={stats.total} label="文档总数" />
            <div className="h-8 w-px bg-border" />
            <Stat value={groups.length} label="技术方向" />
            <div className="h-8 w-px bg-border" />
            <Stat value={categoriesCount} label="分类" />
          </div>
        </div>
      </section>

      {/* ===== 主区：全量索引 ===== */}
      <div className="mx-auto max-w-[1280px] px-4 pb-24 sm:px-6">
        {/* 工具条 */}
        <div className="mb-6 flex items-center gap-4">
          <p className="text-sm text-foreground/50">
            {smartActive ? (
              <>
                智能搜索「<span className="font-medium text-foreground">{query}</span>」命中{' '}
                <span className="font-medium text-foreground">{smart.results.length}</span>{' '}
                个相关片段
              </>
            ) : searching ? (
              <>
                搜索「<span className="font-medium text-foreground">{query}</span>」匹配{' '}
                <span className="font-medium text-foreground">
                  {filtered.reduce((n, g) => n + g.categories.length, 0)}
                </span>{' '}
                个分类
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <ListTree size={15} className="text-accent" />
                全站 {categoriesCount} 个分类 · {stats.total} 篇文档
              </span>
            )}
          </p>
        </div>

        {/* 智能搜索结果区（语义+全文混合检索；空查询派生回空闲态） */}
        {smartActive && <SmartSearchSection state={q ? smart : SMART_IDLE} query={query.trim()} />}

        {!smartActive && (filtered.length > 0 ? (
          <div className="space-y-10">
            {filtered.map((group) => (
              <section key={group.id}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                      <Layers size={18} className="text-accent" />
                      {group.title}
                    </h2>
                    <p className="mt-1 text-sm text-foreground/50">{group.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-foreground/40">
                    {group.categories.length} 个分类 ·{' '}
                    {group.categories.reduce((n, c) => n + c.files.length, 0)} 篇
                  </span>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {group.categories.map((cat) => (
                    <CategoryCard key={cat.slug} cat={cat} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
            <Search size={28} className="text-foreground/30" />
            <p className="mt-4 text-sm text-foreground/50">
              没有匹配「<span className="font-medium text-foreground">{query}</span>」的内容
            </p>
            <button
              onClick={() => setQuery('')}
              className="mt-3 rounded-full border border-border px-4 py-1.5 text-xs text-foreground/60 transition-colors hover:border-accent hover:text-accent"
            >
              清除搜索
            </button>
          </div>
        ))}

        {/* 最近更新（无更新记录时整块隐藏，避免只渲染一个空标题） */}
        {!smartActive && updates.length > 0 && (
        <section className="mt-20">
          <div className="mb-4 flex items-center gap-2">
            <Clock size={16} className="text-accent" />
            <h2 className="font-semibold">最近更新</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {updates.map((u, i) => {
              const inner = (
                <>
                  <div className="flex items-center gap-2">
                    {u.type === 'new' ? (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                        NEW
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/50">
                        修订
                      </span>
                    )}
                    <span className="truncate text-sm font-medium group-hover:text-accent">
                      {u.title}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-foreground/50">
                    {u.description}
                  </p>
                </>
              );

              return (
                <div key={i}>
                  {u.href ? (
                    <Link
                      href={u.href}
                      className="group block rounded-2xl border border-border bg-muted/30 p-4 transition-colors hover:border-accent/40"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="block rounded-2xl border border-border bg-muted/30 p-4">
                      {inner}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}

/* ---------- 分类卡片（含可展开的文档列表） ---------- */

function CategoryCard({
  cat,
}: {
  cat: HomeCategory;
}) {
  return (
    <Link
      href={`/docs/${cat.slug}`}
      className="group flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-left transition-all duration-200 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl transition-colors group-hover:bg-accent/10">
        {cat.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium group-hover:text-accent">{cat.title}</span>
          {cat.hidden && (
            <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-500">
              拉勾专栏
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-foreground/40">
            <FileText size={11} />
            {cat.files.length}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 text-xs text-foreground/50">
          {cat.description}
        </span>
      </span>
      <ChevronRight
        size={16}
        className="mt-1 shrink-0 text-foreground/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
      />
    </Link>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold tracking-tight text-foreground">
        {value.toLocaleString()}
      </span>
      <span className="mt-1 text-xs text-foreground/50">{label}</span>
    </div>
  );
}

/* ---------- 智能搜索（语义 + 全文混合检索，复用知识库检索链路） ---------- */

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 transition-colors ${
        active
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-border text-foreground/50 hover:border-accent/40 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function SmartSearchSection({
  state,
  query,
}: {
  state: SmartState;
  query: string;
}) {
  if (state.loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Sparkles size={24} className="animate-pulse text-accent" />
        <p className="mt-3 text-sm text-foreground/50">正在检索全库（语义 + 全文）…</p>
      </div>
    );
  }
  if (state.needLogin) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Sparkles size={24} className="text-foreground/30" />
        <p className="mt-3 text-sm text-foreground/50">智能搜索需要登录后使用</p>
        <Link
          href={`/login?from=/`}
          className="mt-3 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          去登录
        </Link>
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Search size={24} className="text-foreground/30" />
        <p className="mt-3 text-sm text-foreground/50">{state.error}</p>
      </div>
    );
  }
  if (state.results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
        <Search size={24} className="text-foreground/30" />
        <p className="mt-3 text-sm text-foreground/50">
          没有找到与「<span className="font-medium text-foreground">{query}</span>」相关的内容
        </p>
        <p className="mt-1 text-xs text-foreground/40">
          试试更具体的技术关键词，或切换到「标题匹配」
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {state.results.map((hit, i) => (
        <SmartHit key={`${hit.docId}-${hit.chunkIndex}-${i}`} hit={hit} query={query} />
      ))}
    </div>
  );
}

function SmartHit({ hit, query }: { hit: KbChunkHit; query: string }) {
  const href = resolveDocUrl(hit.filePath);
  const crumb = hit.filePath.replace(/\.md$/, '').split('/').slice(0, -1).join(' / ');
  const inner = (
    <>
      <div className="flex items-center gap-2">
        <FileText size={14} className="shrink-0 text-accent" />
        <span className="truncate text-sm font-medium group-hover:text-accent">
          {hit.title || hit.filePath}
        </span>
        {typeof hit.score === 'number' && hit.score > 0 && (
          <span className="ml-auto shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-foreground/40">
            {hit.score >= 1 ? `命中 ${hit.score.toFixed(1)}` : `相关度 ${hit.score.toFixed(2)}`}
          </span>
        )}
      </div>
      {crumb && <p className="mt-1 truncate text-xs text-foreground/40">{crumb}</p>}
      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-foreground/60">
        <Snippet text={hit.text} query={query} />
      </p>
    </>
  );
  return href ? (
    <Link
      href={href}
      className="group block rounded-2xl border border-border bg-background p-4 transition-all hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5"
    >
      {inner}
    </Link>
  ) : (
    <div className="block rounded-2xl border border-border bg-muted/30 p-4">{inner}</div>
  );
}

/** 命中片段摘要：截取首个命中词附近文本并高亮词元 */
function Snippet({ text, query }: { text: string; query: string }) {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const flat = text.replace(/\s+/g, ' ');
  if (tokens.length === 0) {
    return <>{flat.length > 220 ? `${flat.slice(0, 220)}…` : flat}</>;
  }
  const lower = flat.toLowerCase();
  let first = -1;
  for (const t of tokens) {
    const i = lower.indexOf(t);
    if (i >= 0 && (first < 0 || i < first)) first = i;
  }
  const start = Math.max(0, (first < 0 ? 0 : first) - 60);
  const excerpt =
    (start > 0 ? '…' : '') +
    flat.slice(start, start + 240) +
    (start + 240 < flat.length ? '…' : '');
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = excerpt.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        tokens.includes(part.toLowerCase()) ? (
          <mark key={i} className="rounded bg-accent/20 px-0.5 text-accent">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}