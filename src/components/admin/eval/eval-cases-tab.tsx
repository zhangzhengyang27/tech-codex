"use client";

/**
 * RAG 评测「用例维护」Tab：Golden Set 用例分页列表、新增与删除。
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { usePagedList } from "@/lib/use-paged-list";
import { kbEvalCases, kbEvalAddCase, kbEvalDeleteCase, type KbEvalCase } from "@/lib/auth";

const CASE_PAGE_SIZE = 20;

export function EvalCasesTab() {
  const {
    items: cases, page, totalElements: total, totalPages, loading, error, setError, load,
  } = usePagedList<KbEvalCase>();
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // 新增表单
  const [question, setQuestion] = useState("");
  const [keywords, setKeywords] = useState("");
  const [docIds, setDocIds] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formMsg, setFormMsg] = useState("");

  const fetchPage = useCallback(
    (pg: number) => kbEvalCases(pg, CASE_PAGE_SIZE),
    [],
  );

  useEffect(() => {
    void load(0, fetchPage);
  }, [load, fetchPage]);

  const onSubmit = async () => {
    if (!question.trim() || !keywords.trim()) {
      setFormError("问题与期望关键字为必填项");
      return;
    }
    setSubmitting(true);
    setFormError("");
    setFormMsg("");
    try {
      const { id } = await kbEvalAddCase({
        question: question.trim(),
        expectedKeywords: keywords.trim(),
        expectedDocIds: docIds,
        note,
      });
      setFormMsg(`已新增用例 #${id}`);
      setQuestion("");
      setKeywords("");
      setDocIds("");
      setNote("");
      void load(0, fetchPage);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "新增用例失败");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (c: KbEvalCase) => {
    const label = c.question.length > 40 ? `${c.question.slice(0, 40)}…` : c.question;
    if (!window.confirm(`确定删除用例「${label}」？`)) return;
    setDeletingId(c.id);
    setError("");
    try {
      await kbEvalDeleteCase(c.id);
      void load(page, fetchPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium">新增评测用例（Golden Set）</div>
          <button
            onClick={() => setExpanded((o) => !o)}
            className="flex h-8 items-center gap-1 rounded-md border border-border px-3 text-[13px] text-foreground/70 hover:bg-muted/60"
          >
            <Plus size={13} />
            {expanded ? "收起" : "展开表单"}
          </button>
        </div>
        {expanded && (
          <div className="mt-3 space-y-2.5">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="评测问题（用户会问的原始问题）"
              className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
            />
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="期望命中关键字（逗号分隔，必填）"
                className="h-9 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
              />
              <input
                value={docIds}
                onChange={(e) => setDocIds(e.target.value)}
                placeholder="期望文档 id（逗号分隔，可选，供 NDCG）"
                className="h-9 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="备注 / 预期答案说明（可选）"
              className="h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                新增用例
              </button>
              {formMsg && <span className="text-xs text-emerald-600">{formMsg}</span>}
              {formError && <span className="text-xs text-red-500">{formError}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">
          用例列表
          <span className="ml-2 text-xs font-normal text-foreground/40">共 {total} 条</span>
        </div>
        {error && <div className="px-4 py-3 text-[13px] text-red-500">{error}</div>}
        {loading && cases.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-foreground/40">
            <Loader2 size={15} className="animate-spin" /> 加载中…
          </div>
        ) : cases.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-foreground/40">
            暂无评测用例——可在此新增，或在「问答反馈」页将点踩一键转为用例
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                  <th className="px-4 py-2 font-medium">问题</th>
                  <th className="px-3 py-2 font-medium">期望关键字</th>
                  <th className="px-3 py-2 font-medium">备注</th>
                  <th className="px-3 py-2 font-medium">创建人</th>
                  <th className="px-3 py-2 font-medium">创建时间</th>
                  <th className="px-2 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="max-w-[300px] px-4 py-2.5">
                      <div className="truncate" title={c.question}>{c.question}</div>
                    </td>
                    <td className="max-w-[200px] px-3 py-2.5 text-foreground/60">
                      <div className="truncate" title={c.expectedKeywords}>{c.expectedKeywords}</div>
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5 text-foreground/50">
                      <div className="truncate" title={c.note ?? undefined}>{c.note || "-"}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-foreground/50">{c.createdBy || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-foreground/50">
                      {c.createdDate ? new Date(c.createdDate).toLocaleString("zh-CN", { hour12: false }) : "-"}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <button
                        onClick={() => void onDelete(c)}
                        disabled={deletingId === c.id}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-500/80 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === c.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[13px] text-foreground/50">
            <span>第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => void load(Math.max(0, page - 1), fetchPage)}
                disabled={page <= 0}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                上一页
              </button>
              <button
                onClick={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
                disabled={page >= totalPages - 1}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
