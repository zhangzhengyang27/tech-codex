"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Clock, ExternalLink, FileText, FolderOpen, Sparkles, Star, Trash2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { fetchDocUrls } from "@/lib/doc-url";
import { useHydrated } from "@/lib/use-hydrated";
import { favoritesList, favoriteRemove, type KbFavoriteView } from "@/lib/kb";

/** 从 docs 相对路径推导分类标签（顶级目录名去编号前缀），根级文件返回 null。 */
function categoryOf(filePath: string): string | null {
  const top = filePath.replace(/\\/g, "/").split("/")[0];
  if (!top || !filePath.includes("/")) return null;
  return top.replace(/^\d+-/, "");
}

const fmtDate = (v: string | null): string => {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
};

/** 收藏卡片：分类徽章 + 标题 + 路径 + 收藏时间 + 取消收藏图标按钮。 */
function FavoriteCard({
  item,
  href,
  onRemove,
}: {
  item: KbFavoriteView;
  href: string | null;
  onRemove: (docId: number) => void;
}) {
  const category = categoryOf(item.filePath);
  const isPublic = item.libraryId === "default";
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              isPublic ? "bg-accent/10 text-accent" : "bg-emerald-500/10 text-emerald-600",
            )}
          >
            {isPublic ? <FileText size={15} /> : <FolderOpen size={15} />}
          </span>
          <span
            className={clsx(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              isPublic ? "bg-accent/10 text-accent" : "bg-emerald-500/10 text-emerald-600",
            )}
          >
            {isPublic ? category ?? "文档" : "我的知识库"}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(item.docId);
          }}
          title="取消收藏"
          aria-label={`取消收藏 ${item.title}`}
          className="shrink-0 rounded-md p-1.5 text-foreground/30 transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <h2 className="mt-3 line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-accent">
        {item.title}
      </h2>
      <p className="mt-1 truncate text-xs text-foreground/40" title={item.filePath}>
        {item.filePath}
      </p>

      <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2.5 text-[11px] text-foreground/35">
        <Clock size={11} />
        {fmtDate(item.createdAt) || "—"} 收藏
        {href?.startsWith("/docs/") && <ExternalLink size={11} className="ml-auto opacity-0 transition-opacity group-hover:opacity-100" />}
      </div>
    </>
  );

  return href ? (
    <Link
      href={href}
      className="group relative flex flex-col rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
    >
      {body}
    </Link>
  ) : (
    <div className="group relative flex flex-col rounded-xl border border-border bg-background p-4">
      {body}
    </div>
  );
}

/** 加载骨架 */
function CardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-3 w-20 animate-pulse rounded bg-muted" />
    </div>
  );
}

/** 我的收藏：卡片网格 + 分类徽章 + 空态引导。 */
export default function MyFavoritesPage() {
  const { isLoggedIn } = useAuth();
  const hydrated = useHydrated();
  const [items, setItems] = useState<KbFavoriteView[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [urlMap, setUrlMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    favoritesList()
      .then((page) => {
        setItems(page.content);
        setTotal(page.totalElements);
        const publicPaths = page.content
          .filter((f) => f.libraryId === "default")
          .map((f) => f.filePath);
        if (publicPaths.length > 0) {
          void fetchDocUrls(publicPaths).then(setUrlMap);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [hydrated, isLoggedIn]);

  const linkOf = useMemo(
    () => (f: KbFavoriteView): string | null => {
      if (f.libraryId === "default") return urlMap[f.filePath] ?? null;
      return "/my/kb/documents";
    },
    [urlMap],
  );

  const onRemove = async (docId: number) => {
    const prev = items;
    // 乐观更新：先移除，失败回滚
    setItems((list) => list.filter((f) => f.docId !== docId));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await favoriteRemove(docId);
    } catch (e) {
      setItems(prev);
      setTotal(prev.length);
      setError(e instanceof Error ? e.message : "操作失败");
    }
  };

  if (!hydrated) {
    return <div className="mx-auto max-w-[1440px] px-4 py-24 text-center text-sm text-foreground/40">加载中…</div>;
  }
  if (!isLoggedIn) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-24 text-center text-sm text-foreground/60">
        请先<Link href="/login" className="mx-1 text-accent hover:underline">登录</Link>后查看收藏
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8">
      {/* 页头 */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Star size={20} className="fill-amber-400 text-amber-500" />
            我的收藏
          </h1>
          <p className="mt-1 text-xs text-foreground/40">
            收藏的文档会集中在这里，方便随时回顾
          </p>
        </div>
        {!loading && total > 0 && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-foreground/50">{total} 篇</span>
        )}
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm text-red-500">{error}</p>}

      {loading ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        /* 空态引导 */
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-20 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
            <Star size={26} className="text-amber-400" />
          </span>
          <h2 className="mt-4 text-base font-medium">还没有收藏任何文档</h2>
          <p className="mt-1 max-w-sm text-sm text-foreground/40">
            浏览文档时点击标题旁的星标即可收藏，之后就能在这里快速找到它们
          </p>
          <div className="mt-5 flex gap-2">
            <Link
              href="/"
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              去发现文档
            </Link>
            <Link
              href="/ai"
              className="rounded-lg border border-border px-4 py-2 text-xs text-foreground/60 transition-colors hover:bg-muted"
            >
              <Sparkles size={12} className="mr-1 inline" />
              问问 AI 助手
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <li key={f.docId}>
              <FavoriteCard item={f} href={linkOf(f)} onRemove={onRemove} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
