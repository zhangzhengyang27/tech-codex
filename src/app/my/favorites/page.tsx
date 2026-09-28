"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { fetchDocUrls } from "@/lib/doc-url";
import { useHydrated } from "@/lib/use-hydrated";
import { favoritesList, favoriteRemove, type KbFavoriteView } from "@/lib/kb";

/**
 * 我的收藏：收藏的公共文档跳转站内阅读页（经 doc-url 反查），
 * 个人空间文档跳转我的知识库列表。取消收藏即时移除。
 */
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
        // 公共文档路径反查站内 URL（个人空间文档不反查，走 /my/kb）
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

  const onRemove = async (docId: number) => {
    try {
      await favoriteRemove(docId);
      setItems((prev) => prev.filter((f) => f.docId !== docId));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  };

  const linkOf = (f: KbFavoriteView): string | null => {
    if (f.libraryId === "default") return urlMap[f.filePath] ?? null;
    return "/my/kb/documents";
  };

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">我的收藏</h1>
        <span className="text-xs text-foreground/40">{total} 篇</span>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="py-24 text-center text-sm text-foreground/40">加载中…</div>
      ) : items.length === 0 ? (
        <div className="py-24 text-center text-sm text-foreground/40">
          还没有收藏。浏览文档时点击标题旁的星标即可收藏。
        </div>
      ) : (
        <ul className="grid gap-2">
          {items.map((f) => {
            const href = linkOf(f);
            return (
              <li
                key={f.docId}
                className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  {href ? (
                    <Link href={href} className="block truncate text-sm font-medium hover:text-accent">
                      {f.title}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-medium">{f.title}</span>
                  )}
                  <span className="mt-0.5 block truncate text-xs text-foreground/40">{f.filePath}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(f.docId)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                  取消收藏
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
