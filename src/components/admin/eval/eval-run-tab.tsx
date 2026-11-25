"use client";

/**
 * RAG 评测「跑测」Tab：对 Golden Set 跑单组检索并展示命中率 / MRR / NDCG 与用例明细。
 */
import { useState } from "react";
import { AlertCircle, ListOrdered, Loader2, Play, Target, TrendingUp } from "lucide-react";
import { kbEvalRun, type KbEvalResult } from "@/lib/auth";
import { AdminCard, AdminMetricCard, adminBtn } from "@/components/admin/admin-ui";
import { CaseTable, NumInput, fmt, pct } from "./shared";

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
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AdminCard
          title="本次评测配置"
          description="在公共知识库上跑 Golden Set；留空即使用后端默认值"
          icon={Play}
          contentClassName="p-5"
        >
          <div className="flex flex-wrap items-end gap-4">
            <NumInput label="用例数上限" value={limit} onChange={setLimit} placeholder="全部" />
            <NumInput label="返回片段 topK" value={topK} onChange={setTopK} placeholder="5" />
            <button onClick={run} disabled={loading} className={adminBtn("primary")}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              开始评测
            </button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </AdminCard>
        <AdminCard title="指标口径" description="先看命中率，再看排序质量" icon={Target} contentClassName="p-5">
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="font-mono text-caption font-medium text-slate-700">HitRate</dt>
              <dd className="mt-0.5 text-slate-500">TopK 内是否命中任一期望关键字，低于 60% 会触发质量告警。</dd>
            </div>
            <div>
              <dt className="font-mono text-caption font-medium text-slate-700">MRR</dt>
              <dd className="mt-0.5 text-slate-500">首个命中片段排名的倒数，衡量“正确答案是否排得够前”。</dd>
            </div>
            <div>
              <dt className="font-mono text-caption font-medium text-slate-700">NDCG@K</dt>
              <dd className="mt-0.5 text-slate-500">考虑位置与多期望文档的排序质量，需用例标注期望文档。</dd>
            </div>
          </dl>
        </AdminCard>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <AdminMetricCard
              label="命中率 HitRate"
              value={pct(result.hitRate)}
              hint={`${result.hit}/${result.total} 命中`}
              icon={Target}
              tone={result.hitRate >= 0.8 ? "emerald" : result.hitRate >= 0.6 ? "amber" : "red"}
            />
            <AdminMetricCard label="MRR" value={fmt(result.mrr)} hint="首个命中平均倒数排名" icon={TrendingUp} tone="blue" />
            <AdminMetricCard label="NDCG@K" value={fmt(result.ndcg)} hint="排序质量（需期望文档）" icon={ListOrdered} tone="violet" />
            <AdminMetricCard label="Context Precision" value={fmt(result.contextPrecision ?? 0)} hint="Top-K 相关分块占比" icon={Target} tone="blue" />
            <AdminMetricCard label="Context Recall" value={fmt(result.contextRecall ?? 0)} hint="期望文档召回比例" icon={Target} tone="emerald" />
            <AdminMetricCard
              label="未命中"
              value={String(result.miss)}
              hint="用于失败归因分析"
              icon={AlertCircle}
              tone={result.miss === 0 ? "emerald" : "red"}
            />
          </div>
          <CaseTable cases={result.cases} label="用例明细" />
        </>
      )}
    </div>

  );
}
