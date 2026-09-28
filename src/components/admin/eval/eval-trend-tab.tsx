"use client";

/**
 * RAG 评测「历史趋势」Tab：每日定时评测的命中率 / MRR / NDCG 折线与历史记录表。
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { kbEvalTrend, type EvalTrendPoint } from "@/lib/auth";
import { NumInput, fmt, pct } from "./shared";
import { TrendChart } from "./trend-chart";

export function EvalTrendTab() {
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [points, setPoints] = useState<EvalTrendPoint[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    setError("");
    try {
      const n = Number(d);
      const r = await kbEvalTrend(Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 30);
      setPoints(r);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "趋势查询失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // 挂载时自动加载最近 30 天（await 后再 setState，避免 effect 内同步更新）
  useEffect(() => {
    let cancelled = false;
    kbEvalTrend(30)
      .then((r) => {
        if (cancelled) return;
        setPoints(r);
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "趋势查询失败");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border bg-background p-4">
        <NumInput label="最近天数 days（1~90）" value={days} onChange={setDays} placeholder="30" />
        <button
          onClick={() => void load(days)}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          刷新
        </button>
        {error && <span className="text-[13px] text-red-500">{error}</span>}
      </div>

      <TrendChart points={points} />

      {loaded && points.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">
            历史记录
            <span className="ml-2 text-xs font-normal text-foreground/40">
              每日 02:00 定时评测自动落库
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                  <th className="px-4 py-2 font-medium">日期</th>
                  <th className="px-3 py-2 font-medium">用例数</th>
                  <th className="px-3 py-2 font-medium">命中率</th>
                  <th className="px-3 py-2 font-medium">MRR</th>
                  <th className="px-3 py-2 font-medium">NDCG</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-mono">{p.date}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground/70">{p.caseCount}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground/70">{pct(p.hitRate)}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground/70">{fmt(p.mrr)}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground/70">{fmt(p.ndcg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
