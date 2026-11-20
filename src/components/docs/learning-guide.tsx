"use client";

import { useState } from "react";
import { BookOpenCheck, Check, Loader2, Sparkles, X } from "lucide-react";
import { fetchLearningGuide, type LearningGuide } from "@/lib/auth";

/**
 * 学习型 AI 导读入口：按当前文档路径请求后端生成，首次点击才调用模型，
 * 不在文档页渲染时预生成（避免 4,500 篇静态页产生模型成本）。
 */
export function LearningGuideButton({ docPath, docTitle }: { docPath: string; docTitle: string }) {
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState<LearningGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const load = async () => {
    setOpen(true);
    if (guide || loading) return;
    setLoading(true);
    setError("");
    try {
      setGuide(await fetchLearningGuide(docPath));
    } catch (e) {
      setError(e instanceof Error ? e.message : "导读生成失败");
    } finally {
      setLoading(false);
    }
  };

  const reveal = (i: number) => setRevealed((prev) => new Set(prev).add(i));

  return (
    <>
      <button
        onClick={() => void load()}
        className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-100"
        title="生成一分钟导读与自测题"
      >
        <Sparkles size={12} />学习导读
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800"><BookOpenCheck size={18} className="text-violet-600" />学习导读</h3>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{docTitle}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="关闭"><X size={18} /></button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-[12px] text-slate-400"><Loader2 size={16} className="animate-spin" />AI 正在读这篇文档…</div>
            ) : error ? (
              <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-[12px] text-red-600">{error}</p>
            ) : guide ? (
              <div className="mt-4 space-y-5">
                <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3.5 py-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-violet-500">{guide.generatedBy === "AI" ? "AI 一分钟概览" : "抽取式概览（AI 暂不可用）"}</div>
                  <p className="mt-1.5 text-[13px] leading-6 text-slate-700">{guide.summary}</p>
                </div>
                <div>
                  <h4 className="text-[12px] font-semibold text-slate-700">分节要点</h4>
                  <div className="mt-2 space-y-2.5">
                    {guide.sections.map((s, i) => (
                      <div key={`${s.title}-${i}`} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                        <div className="text-[12px] font-medium text-slate-700">{s.title}</div>
                        <ul className="mt-1 space-y-1 text-[11.5px] leading-5 text-slate-500">
                          {s.points.map((p, j) => <li key={j} className="flex gap-1.5"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-violet-400" />{p}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                {guide.quiz.length > 0 && (
                  <div>
                    <h4 className="text-[12px] font-semibold text-slate-700">自测题</h4>
                    <div className="mt-2 space-y-2.5">
                      {guide.quiz.map((q, i) => (
                        <div key={`${q.question}-${i}`} className="rounded-xl border border-slate-100 px-3.5 py-2.5">
                          <div className="text-[12px] font-medium text-slate-700">{i + 1}. {q.question}</div>
                          <div className="mt-1.5 grid gap-1 text-[11.5px] text-slate-500">
                            {q.options.map((o, j) => <div key={j}>{o}</div>)}
                          </div>
                          {revealed.has(i) ? (
                            <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] text-emerald-600"><Check size={11} />答案：{q.answer}</div>
                          ) : (
                            <button onClick={() => reveal(i)} className="mt-1.5 text-[10.5px] text-accent hover:underline">查看答案</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
