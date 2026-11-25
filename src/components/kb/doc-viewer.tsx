"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, FileText, Loader2, X } from "lucide-react";
import clsx from "clsx";
import { myDocument } from "@/lib/kb";
import { fmtDate, fmtSize, statusBadgeCls, statusText } from "@/lib/format";
import { ChatMarkdown } from "@/components/ai/chat-markdown";
import type { KbDocumentView } from "@/lib/documents";

function errText(e: unknown): string {
  return e instanceof Error ? e.message : "加载失败";
}

/** 文档详情加载器签名：私有库走 myDocument，管理端传 adminDocument 的封装 */
type DocLoader = (id: number) => Promise<KbDocumentView>;

/**
 * 文档阅读器：弹窗展示上传文档解析后的 Markdown 原文
 * （PDF/Word 等格式在入库时已被解析为 Markdown，统一渲染）。
 * docId 为 null 时不渲染；切换 docId 自动重新拉取。
 * loader 缺省为个人知识库 myDocument；管理端公共库请传 (id) => adminDocument(id)。
 */
export function DocViewer({
  docId,
  onClose,
  loader,
}: {
  docId: number | null;
  onClose: () => void;
  loader?: DocLoader;
}) {
  const loadDoc = loader ?? myDocument;
  const [doc, setDoc] = useState<KbDocumentView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  /** 请求序守卫：快速切换 docId（A→B）时丢弃 A 的慢响应，防止 A 内容覆盖 B */
  const loadSeqRef = useRef(0);

  const load = useCallback(
    async (id: number) => {
      const seq = ++loadSeqRef.current;
      setLoading(true);
      setError("");
      setDoc(null);
      try {
        const d = await loadDoc(id);
        if (seq !== loadSeqRef.current) return; // 已切换到其他文档，丢弃过期响应
        setDoc(d);
      } catch (e) {
        if (seq !== loadSeqRef.current) return;
        setError(errText(e));
      } finally {
        if (seq === loadSeqRef.current) setLoading(false);
      }
    },
    [loadDoc]
  );

  useEffect(() => {
    if (docId == null) return;
    // delayed setState：延后一拍发起加载，避免 effect 内同步 setState 级联渲染
    const t = setTimeout(() => void load(docId), 0);
    return () => clearTimeout(t);
  }, [docId, load]);

  // Esc 关闭
  useEffect(() => {
    if (docId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docId, onClose]);

  if (docId == null) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="文档查看"
    >
      <div
        className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部：元信息 + 关闭 */}
        <div className="flex items-start gap-3 border-b border-border px-5 py-3.5">
          <FileText size={18} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {loading ? "加载中…" : doc?.title ?? (error ? "无法打开文档" : "")}
            </div>
            {doc && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/40">
                <span className={clsx("rounded-full px-2 py-0.5", statusBadgeCls(doc.status))}>
                  {statusText(doc.status)}
                </span>
                <span title={doc.filePath}>{doc.fileName}</span>
                <span>{fmtSize(doc.fileSize)}</span>
                <span>{fmtDate(doc.createdDate)}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-foreground/40">
              <Loader2 size={20} className="mr-2 animate-spin" />
              正在加载文档…
            </div>
          )}
          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-foreground/40">
              <AlertCircle size={24} className="text-red-400" />
              {error}
            </div>
          )}
          {!loading && !error && doc && (
            doc.content ? (
              <ChatMarkdown content={doc.content} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-foreground/40">
                <AlertCircle size={24} className="text-foreground/20" />
                暂无可预览的内容
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
