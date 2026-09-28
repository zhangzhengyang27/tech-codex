"use client";

/**
 * RAG 评测「跑测」Tab：对 Golden Set 跑单组检索并展示命中率 / MRR / NDCG 与用例明细。
 */
import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { kbEvalRun, type KbEvalResult } from "@/lib/auth";
import { CaseTable, MetricCard, NumInput, fmt, pct } from "./shared";

export function EvalRunTab() {
  const [limit, setLimit] = useState("");
  const [topK, setTopK] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<KbEvalResult | null>(null);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await kbEvalRun(limit ? Number(limit) : undefined, topK ? Number(topK) : undefined);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "评测失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-background p-4">
        <NumInput label="用例数上限 limit" value={limit} onChange={setLimit} placeholder="全部" />
        <NumInput label="返回片段 topK" value={topK} onChange={setTopK} placeholder="5" />
        <button
          onClick={run}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          开始评测
        </button>
        {error && <span className="text-[13px] text-red-500">{error}</span>}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard
              label="命中率 HitRate"
              value={pct(result.hitRate)}
              sub={`${result.hit}/${result.total} 命中`}
              good={result.hitRate >= 0.8}
            />
            <MetricCard label="MRR" value={fmt(result.mrr)} sub="首个命中平均倒数排名" />
            <MetricCard label="NDCG@K" value={fmt(result.ndcg)} sub="排序质量（需期望文档）" />
            <MetricCard
              label="未命中"
              value={String(result.miss)}
              sub="用于失败归因分析"
              good={result.miss === 0 ? true : false}
            />
          </div>
          <CaseTable cases={result.cases} label="用例明细" />
        </>
      )}
    </div>
  );
}
