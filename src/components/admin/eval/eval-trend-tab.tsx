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
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <NumInput label="最近天数 days（1~90）" value={days} onChange={setDays} placeholder="30" />
        <button
          onClick={() => void load(days)}
          disabled={loading}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          刷新
        </button>
        {error && <span className="text-compact text-red-500">{error}</span>}
      </div>

      <TrendChart points={points} />

      {loaded && points.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-5 py-3.5 text-compact font-semibold text-slate-800">
            历史记录
            <span className="ml-2 text-caption font-normal text-slate-400">
              每日 02:00 定时评测自动落库
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-2xs uppercase tracking-[0.06em] text-slate-400">
                  <th className="px-4 py-2 font-medium">日期</th>
                  <th className="px-3 py-2 font-medium">用例数</th>
                  <th className="px-3 py-2 font-medium">命中率</th>
                  <th className="px-3 py-2 font-medium">MRR</th>
                  <th className="px-3 py-2 font-medium">NDCG</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.date} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-mono">{p.date}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{p.caseCount}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{pct(p.hitRate)}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{fmt(p.mrr)}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{fmt(p.ndcg)}</td>
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
