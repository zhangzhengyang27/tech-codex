"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";

import { favoriteAdd, favoriteByPath, favoriteRemove } from "@/lib/kb";

/**
 * 文档详情页收藏星标：登录用户可见，按 docs 相对路径解析 KB 文档后收藏/取消。
 * 未登录、或该文档不在知识库（如 docs 根目录元文件）时整体隐藏。
 */
export function FavoriteButton({ docPath }: { docPath: string }) {
  const [docId, setDocId] = useState<number | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    favoriteByPath(docPath).then((r) => {
      if (cancelled || !r) return;
      setDocId(r.docId);
      setFavorite(r.favorite);
    });
    return () => {
      cancelled = true;
    };
  }, [docPath]);

  if (docId === null) return null;

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      if (favorite) {
        await favoriteRemove(docId);
        setFavorite(false);
      } else {
        await favoriteAdd(docId);
        setFavorite(true);
      }
    } catch {
      /* 收藏接口失败保持原态（网络/过期错误由全局请求层提示） */
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={favorite ? "取消收藏" : "收藏这篇文档"}
      aria-pressed={favorite}
      className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted"
    >
      <Star
        size={15}
        className={favorite ? "fill-amber-400 text-amber-500" : "text-foreground/40"}
      />
      <span className={favorite ? "text-amber-600" : "text-foreground/40"}>
        {favorite ? "已收藏" : "收藏"}
      </span>
    </button>
  );
}
