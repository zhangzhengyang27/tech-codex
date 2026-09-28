"use client";

/**
 * RAG 评测「A/B 对照」Tab：同用例集跑两组检索参数，输出指标差值与两组用例明细。
 */
import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import clsx from "clsx";
import { kbEvalAb, type KbEvalAbResult } from "@/lib/auth";
import { CaseTable, NumInput, ToggleGroup, fmt } from "./shared";

function GroupConfig({
  title,
  rerank,
  bm25,
  topK,
  onRerank,
  onBm25,
  onTopK,
}: {
  title: string;
  rerank: string;
  bm25: string;
  topK: string;
  onRerank: (v: string) => void;
  onBm25: (v: string) => void;
  onTopK: (v: string) => void;
}) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-background p-4">
      <div className="mb-3 text-[13px] font-medium">{title}</div>
      <div className="flex flex-wrap items-end gap-4">
        <ToggleGroup label="语义重排 rerank" value={rerank} onChange={onRerank} />
        <ToggleGroup label="BM25 关键词" value={bm25} onChange={onBm25} />
        <NumInput label="topK" value={topK} onChange={onTopK} placeholder="沿用" />
      </div>
    </div>
  );
}

function AbMetric({
  label,
  base,
  variant,
  diff,
}: {
  label: string;
  base: number;
  variant: number;
  diff: number;
}) {
  const pctDiff = Math.abs(diff) >= 0.0001;
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[13px] text-foreground/50">{label}</div>
      <div className="mt-1 flex items-baseline gap-3">
        <span className="font-mono text-lg font-semibold">{fmt(base)}</span>
        <span className="text-foreground/30">→</span>
        <span className="font-mono text-lg font-semibold">{fmt(variant)}</span>
        <span
          className={clsx(
            "ml-auto text-[13px] font-mono",
            pctDiff ? (diff > 0 ? "text-emerald-600" : "text-red-500") : "text-foreground/30",
          )}
        >
          {pctDiff ? `${diff > 0 ? "+" : ""}${fmt(diff)}` : "持平"}
        </span>
      </div>
    </div>
  );
}

export function EvalAbTab() {
  const [limit, setLimit] = useState("");
  const [topK, setTopK] = useState("");
  const [baseRerank, setBaseRerank] = useState("true");
  const [baseBm25, setBaseBm25] = useState("default");
  const [baseTopK, setBaseTopK] = useState("");
  const [varRerank, setVarRerank] = useState("false");
  const [varBm25, setVarBm25] = useState("default");
  const [varTopK, setVarTopK] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<KbEvalAbResult | null>(null);

  const toBoolOrUndef = (v: string): boolean | undefined =>
    v === "default" ? undefined : v === "true";
  const toNumOrUndef = (v: string): number | undefined =>
    v === "" ? undefined : Number(v);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await kbEvalAb({
        limit: toNumOrUndef(limit),
        topK: toNumOrUndef(topK),
        baseRerank: toBoolOrUndef(baseRerank),
        baseBm25: toBoolOrUndef(baseBm25),
        baseTopK: toNumOrUndef(baseTopK),
        varRerank: toBoolOrUndef(varRerank),
        varBm25: toBoolOrUndef(varBm25),
        varTopK: toNumOrUndef(varTopK),
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "A/B 评测失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="mb-3 text-[13px] font-medium">同用例集跑两组检索参数（差值 = 变体 − 基线）</div>
        <div className="flex flex-wrap items-end gap-4">
          <NumInput label="用例数上限 limit" value={limit} onChange={setLimit} placeholder="全部" />
          <NumInput label="返回片段 topK" value={topK} onChange={setTopK} placeholder="5" />
          <button
            onClick={run}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            对比
          </button>
          {error && <span className="text-[13px] text-red-500">{error}</span>}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row">
        <GroupConfig
          title="基线（当前配置）"
          rerank={baseRerank}
          bm25={baseBm25}
          topK={baseTopK}
          onRerank={setBaseRerank}
          onBm25={setBaseBm25}
          onTopK={setBaseTopK}
        />
        <GroupConfig
          title="变体"
          rerank={varRerank}
          bm25={varBm25}
          topK={varTopK}
          onRerank={setVarRerank}
          onBm25={setVarBm25}
          onTopK={setVarTopK}
        />
      </div>

      {result && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <AbMetric label="命中率 HitRate" base={result.baseline.hitRate} variant={result.variant.hitRate} diff={result.hitRateDiff} />
            <AbMetric label="MRR" base={result.baseline.mrr} variant={result.variant.mrr} diff={result.mrrDiff} />
            <AbMetric label="NDCG@K" base={result.baseline.ndcg} variant={result.variant.ndcg} diff={result.ndcgDiff} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CaseTable cases={result.baseline.cases} label={`基线 · ${result.baselineLabel}`} />
            <CaseTable cases={result.variant.cases} label={`变体 · ${result.variantLabel}`} />
          </div>
        </>
      )}
    </div>
  );
}
