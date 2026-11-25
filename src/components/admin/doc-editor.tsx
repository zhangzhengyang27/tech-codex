"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, FileText, Loader2, Save, X } from "lucide-react";
import { adminDocument, updateDocumentContent, type KbDocumentView } from "@/lib/documents";
import { adminBtn } from "@/components/admin/admin-ui";
import { Field } from "@/components/ui/field";

const errText = (e: unknown): string => (e instanceof Error ? e.message : "保存失败");

/**
 * 文档在线编辑器：弹窗内编辑 Markdown 原文（可选改标题），保存后后端重建索引。
 * 历史 SYNC 文档不允许在线编辑，避免旧同步源覆盖数据库内容。
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
  /**
   * 请求序守卫：快速切换 docId（A→B）时 A 的慢响应若后到，
   * 会用 A 的 content/title 覆盖 B，后续保存还可能带着 A 的数据写进 B 的 docId
   * （A 的内容写进 B，数据破坏级）。序号不匹配的响应一律丢弃。
   */
  const loadSeqRef = useRef(0);
  /** 当前已加载的文档ID：保存时以此为准，防止用旧请求残留的 content/title 保存错文档 */
  const loadedIdRef = useRef<number | null>(null);

  const load = useCallback(async (id: number) => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError("");
    setDoc(null);
    loadedIdRef.current = null;
    try {
      const d = await adminDocument(id, true);
      if (seq !== loadSeqRef.current) return; // 已切换到其他文档，丢弃过期响应
      if (d.sourceType === "SYNC") {
        setError("历史 SYNC 文档不支持在线编辑；如需修改，请通过 CMS 新建内容或迁移后再编辑。");
      }
      loadedIdRef.current = id;
      setDoc(d);
      setTitle(d.title);
      setContent(d.content ?? "");
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      setError(errText(e));
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, []);

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

  // 只有普通入库文档可编辑；历史 SYNC 文档是只读的，弹窗不应撑到整屏空白。
  const editable = !!doc && doc.sourceType !== "SYNC";
  const readOnlySync = !!doc && doc.sourceType === "SYNC";

  const onSave = async () => {
    if (!content.trim()) {
      setError("文档内容不能为空");
      return;
    }
    // 双保险：只有编辑器里装载完成的正是当前 docId 才允许保存，
    // 杜绝 A 的内容经慢响应残留在 state 后被写进 B 的文档
    if (loadedIdRef.current !== docId) {
      setError("文档尚未加载完成，请稍候再保存");
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="编辑文档"
    >
      <div
        className={`flex w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_32px_80px_-24px_rgba(15,23,42,0.55)] ${
          editable ? "h-[85vh]" : "max-h-[85vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-accent ring-1 ring-blue-100"><FileText size={15} /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-slate-800">编辑文档</div>
            {doc && <div className="mt-0.5 truncate font-mono text-2xs text-slate-400">{doc.fileName}</div>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* 编辑区 */}
        <div className={`flex flex-col gap-3 overflow-y-auto px-5 py-4 ${editable ? "flex-1" : ""}`}>
          {loading && (
            <div className="flex flex-1 items-center justify-center text-compact text-slate-400">
              <Loader2 size={20} className="mr-2 animate-spin" />
              正在加载文档…
            </div>
          )}
          {!loading && doc && doc.sourceType !== "SYNC" && (
            <>
              <Field size="sm" label="标题" htmlFor="doc-edit-title">
                <input
                  id="doc-edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-compact text-slate-700 outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/20"
                />
              </Field>
              <Field
                size="sm"
                label="正文"
                htmlFor="doc-edit-content"
                hint="Markdown 原文；保存后重新分块并更新检索索引"
                className="flex flex-1 flex-col"
              >
                <textarea
                  id="doc-edit-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  spellCheck={false}
                  className="min-h-[46vh] flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50/60 p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/20"
                  placeholder="Markdown 原文"
                />
              </Field>
            </>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <span className="text-caption text-slate-400">
            {readOnlySync ? "历史 SYNC 文档为只读，请在 CMS 中新建或迁移后编辑" : "保存后将自动重建该文档的分块与向量索引"}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={adminBtn("secondary", "sm")}
            >
              {readOnlySync ? "关闭" : "取消"}
            </button>
            {editable && (
              <button
                onClick={() => void onSave()}
                disabled={saving || loading || !doc}
                className={adminBtn("primary", "sm")}
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                保存并重建索引
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
