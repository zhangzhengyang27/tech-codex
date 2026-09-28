"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Eye, FileUp, Inbox, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { deleteMyDocument, myDocuments } from "@/lib/kb";
import { DocViewer } from "@/components/kb/doc-viewer";
import { fmtDate, fmtSize, statusBadgeCls, statusText } from "@/lib/format";
import type { KbDocumentView } from "@/lib/documents";

function errText(e: unknown): string {
  return e instanceof Error ? e.message : "操作失败";
}

export default function MyKbDocumentsPage() {
  const { isLoggedIn } = useAuth();
  const hydrated = useHydrated();
  const [docs, setDocs] = useState<KbDocumentView[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** 正在查看的文档ID（阅读器弹窗） */
  const [viewingId, setViewingId] = useState<number | null>(null);

  const load = useCallback(async (kw: string, pg: number) => {
    setLoading(true);
    setError("");
    try {
      const data = await myDocuments(kw, pg, 20);
      setDocs(data.content ?? []);
      setTotal(data.totalElements ?? 0);
      setPage(data.number ?? pg);
      setTotalPages(data.totalPages ?? 1);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && isLoggedIn) void load("", 0);
  }, [load, hydrated, isLoggedIn]);

  const onDelete = async (d: KbDocumentView) => {
    if (!confirm(`确定删除《${d.title}》吗？其分块与向量索引将一并移除，不可恢复。`)) return;
    setError("");
    try {
      await deleteMyDocument(d.id);
      void load(keyword, page);
    } catch (e) {
      setError(errText(e));
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(keyword, 0);
  };

  if (!hydrated || !isLoggedIn) {
    return <div className="py-16 text-center text-sm text-foreground/40">加载中…</div>;
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <form onSubmit={onSearch} className="flex flex-1 items-center gap-2">
            <div className="relative max-w-xs flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题或文件名"
                className="h-8 w-full rounded-md border border-border bg-muted/40 pl-8 pr-3 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <button
              type="submit"
              className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/70 hover:bg-muted/60"
            >
              搜索
            </button>
          </form>
          <div className="text-xs text-foreground/40">共 {total} 篇</div>
          <button
            onClick={() => void load(keyword, page)}
            className="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[13px] text-foreground/60 hover:bg-muted/60"
            title="刷新"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            刷新
          </button>
          <Link
            href="/my/kb/upload"
            className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[13px] font-medium text-white hover:opacity-90"
          >
            <FileUp size={13} />
            上传文档
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">标题</th>
                <th className="px-3 py-2 font-medium">文件</th>
                <th className="px-3 py-2 font-medium">大小</th>
                <th className="px-3 py-2 font-medium">分块</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">上传时间</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {!loading && docs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-foreground/40">
                    <Inbox size={28} className="mx-auto mb-2 text-foreground/20" />
                    {keyword.trim() ? (
                      "没有匹配的文档，换个关键字试试"
                    ) : (
                      <>
                        还没有文档，
                        <Link href="/my/kb/upload" className="text-accent hover:underline">
                          去上传第一个文件
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              )}
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                  <td className="max-w-[260px] truncate px-4 py-2.5">
                    <button
                      onClick={() => setViewingId(d.id)}
                      className="truncate font-medium text-foreground hover:text-accent"
                      title="查看文档"
                    >
                      {d.title}
                    </button>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-foreground/60" title={d.filePath}>
                    {d.fileName}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/50">{fmtSize(d.fileSize)}</td>
                  <td className="px-3 py-2.5 text-foreground/50">{d.chunkCount ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs", statusBadgeCls(d.status))}>
                      {statusText(d.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-foreground/50">{fmtDate(d.createdDate)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => setViewingId(d.id)}
                        disabled={loading}
                        className="rounded-md p-1 text-foreground/40 transition-colors hover:bg-muted hover:text-accent disabled:opacity-50"
                        aria-label={`查看 ${d.title}`}
                        title="查看"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => onDelete(d)}
                        disabled={loading}
                        className="rounded-md p-1 text-foreground/40 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        aria-label={`删除 ${d.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
            <button
              onClick={() => void load(keyword, page - 1)}
              disabled={page <= 0 || loading}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/70 hover:bg-muted/60 disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-xs text-foreground/40">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => void load(keyword, page + 1)}
              disabled={page >= totalPages - 1 || loading}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/70 hover:bg-muted/60 disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        )}
      </div>

      <DocViewer docId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  );
}
