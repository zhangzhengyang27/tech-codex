"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, FileText, Loader2, Save, X } from "lucide-react";
import { adminDocument, updateDocumentContent, type KbDocumentView } from "@/lib/documents";

const errText = (e: unknown): string => (e instanceof Error ? e.message : "保存失败");

/**
 * 文档在线编辑器：弹窗内编辑 Markdown 原文（可选改标题），保存后后端重建索引。
 * docs 同步受管（SYNC）文档不允许在线编辑——需在源仓库修改后执行「同步 docs 内容」。
 */
export function DocEditor({
  docId,
  onClose,
  onSaved,
}: {
  docId: number | null;
  onClose: () => void;
  onSaved: (doc: KbDocumentView) => void;
}) {
  const [doc, setDoc] = useState<KbDocumentView | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError("");
    setDoc(null);
    try {
      const d = await adminDocument(id, true);
      if (d.sourceType === "SYNC") {
        setError("docs 同步受管文档不支持在线编辑：请在源仓库修改后执行「同步 docs 内容」");
      }
      setDoc(d);
      setTitle(d.title);
      setContent(d.content ?? "");
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (docId != null) void load(docId);
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

  const onSave = async () => {
    if (!content.trim()) {
      setError("文档内容不能为空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await updateDocumentContent(docId, content, title);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="编辑文档"
    >
      <div
        className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-start gap-3 border-b border-border px-5 py-3.5">
          <FileText size={18} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">编辑文档</div>
            {doc && <div className="mt-0.5 truncate text-xs text-foreground/40">{doc.fileName}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* 编辑区 */}
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex flex-1 items-center justify-center text-sm text-foreground/40">
              <Loader2 size={20} className="mr-2 animate-spin" />
              正在加载文档…
            </div>
          )}
          {!loading && doc && doc.sourceType !== "SYNC" && (
            <>
              <label className="flex items-center gap-2">
                <span className="shrink-0 text-[13px] text-foreground/50">标题</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
                />
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
                className="min-h-[46vh] flex-1 resize-none rounded-md border border-border bg-muted/40 p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-accent"
                placeholder="Markdown 原文"
              />
            </>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-600">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-foreground/40">保存后将自动重建该文档的分块与向量索引</span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/60 hover:bg-muted"
            >
              取消
            </button>
            <button
              onClick={() => void onSave()}
              disabled={saving || loading || !doc || doc.sourceType === "SYNC"}
              className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              保存并重建索引
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
