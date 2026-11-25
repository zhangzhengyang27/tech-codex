"use client";

/**
 * RAG 评测「用例维护」Tab：Golden Set 用例分页列表、新增与删除。
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { usePagedList } from "@/lib/use-paged-list";
import { Field } from "@/components/ui/field";
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
  const [caseType, setCaseType] = useState("RETRIEVAL");
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
        caseType,
        note,
      });
      setFormMsg(`已新增用例 #${id}`);
      setQuestion("");
      setKeywords("");
      setDocIds("");
      setCaseType("RETRIEVAL");
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
      <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700">新增评测用例（Golden Set）</div>
          <button
            onClick={() => setExpanded((o) => !o)}
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-caption text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <Plus size={13} />
            {expanded ? "收起" : "展开表单"}
          </button>
        </div>
        {expanded && (
          <div className="mt-3 space-y-2.5">
            <Field
              size="sm"
              label="问题"
              htmlFor="eval-question"
              required
              hint="用户会问的原始问题，检索召回按它执行"
            >
              <input
                id="eval-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：Redis 持久化有哪几种方式"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition-colors focus:border-accent focus:bg-white"
              />
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field
                size="sm"
                label="期望命中关键字"
                htmlFor="eval-keywords"
                required
                hint="逗号分隔；单个分块需覆盖全部关键字才算命中"
              >
                <input
                  id="eval-keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Redis, 持久化"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition-colors focus:border-accent focus:bg-white"
                />
              </Field>
              <Field
                size="sm"
                label="期望文档 id"
                htmlFor="eval-doc-ids"
                hint="逗号分隔，可选；仅参与 NDCG 计算"
              >
                <input
                  id="eval-doc-ids"
                  value={docIds}
                  onChange={(e) => setDocIds(e.target.value)}
                  placeholder="可选"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition-colors focus:border-accent focus:bg-white"
                />
              </Field>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-[13rem_1fr]">
              <Field
                size="sm"
                label="用例类型"
                htmlFor="eval-case-type"
                hint="多跳类不计入 HitRate"
              >
                <select
                  id="eval-case-type"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition-colors focus:border-accent focus:bg-white"
                >
                  <option value="RETRIEVAL">检索召回（进入 HitRate）</option>
                  <option value="ANSWER_FORMAT">回答格式/引用（不计 HitRate）</option>
                  <option value="MULTI_HOP">多跳召回（自然问法，Top-K 覆盖全部期望文档）</option>
                  <option value="MULTI_HOP_REF">引用型多跳（显式《标题》，验证实体链接）</option>
                </select>
              </Field>
              <Field
                size="sm"
                label="备注"
                htmlFor="eval-note"
                hint="可选；写预期答案或来源"
              >
                <input
                  id="eval-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="预期答案说明"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-xs outline-none transition-colors focus:border-accent focus:bg-white"
                />
              </Field>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onSubmit}
                disabled={submitting}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
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

      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-b border-slate-100 px-5 py-3.5 text-compact font-semibold text-slate-800">
          用例列表
          <span className="ml-2 text-caption font-normal text-slate-400">共 {total} 条</span>
        </div>
        {error && <div className="px-4 py-3 text-compact text-red-500">{error}</div>}
        {loading && cases.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-slate-400">
            <Loader2 size={15} className="animate-spin" /> 加载中…
          </div>
        ) : cases.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-400">
            暂无评测用例——可在此新增，或在「问答反馈」页将点踩一键转为用例
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-2xs uppercase tracking-[0.06em] text-slate-400">
                  <th className="px-4 py-2 font-medium">问题</th>
                  <th className="px-3 py-2 font-medium">期望关键字</th>
                  <th className="px-3 py-2 font-medium">类型</th>
                  <th className="px-3 py-2 font-medium">备注</th>
                  <th className="px-3 py-2 font-medium">创建人</th>
                  <th className="px-3 py-2 font-medium">创建时间</th>
                  <th className="px-2 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[300px] px-4 py-2.5">
                      <div className="truncate" title={c.question}>{c.question}</div>
                    </td>
                    <td className="max-w-[200px] px-3 py-2.5 text-slate-500">
                      <div className="truncate" title={c.expectedKeywords}>{c.expectedKeywords}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={c.caseType === "ANSWER_FORMAT"
                        ? "inline-flex rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-2xs text-amber-600"
                        : c.caseType === "MULTI_HOP" || c.caseType === "MULTI_HOP_REF"
                          ? "inline-flex rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-2xs text-violet-600"
                          : "inline-flex rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-2xs text-slate-500"}>
                        {c.caseType === "ANSWER_FORMAT" ? "格式/引用" : c.caseType === "MULTI_HOP" ? "多跳" : c.caseType === "MULTI_HOP_REF" ? "引用型多跳" : "检索"}
                      </span>
                    </td>
                    <td className="max-w-[220px] px-3 py-2.5 text-slate-400">
                      <div className="truncate" title={c.note ?? undefined}>{c.note || "-"}</div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-400">{c.createdBy || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-400">
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
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5 text-compact text-slate-400">
            <span>第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => void load(Math.max(0, page - 1), fetchPage)}
                disabled={page <= 0}
                className="rounded-md px-3 py-1 text-compact disabled:opacity-40 hover:bg-slate-100"
              >
                上一页
              </button>
              <button
                onClick={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
                disabled={page >= totalPages - 1}
                className="rounded-md px-3 py-1 text-compact disabled:opacity-40 hover:bg-slate-100"
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
