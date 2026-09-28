"use client";

/**
 * 评测指标趋势折线图（纯 SVG）：命中率 / MRR / NDCG 三线，时间正序绘制。
 */
import { useMemo } from "react";
import type { EvalTrendPoint } from "@/lib/auth";

export function TrendChart({ points }: { points: EvalTrendPoint[] }) {
  const data = useMemo(() => {
    const arr = [...points].reverse(); // 时间正序绘制
    if (arr.length === 0) return null;
    const W = 720;
    const H = 240;
    const pad = { l: 40, r: 16, t: 16, b: 28 };
    const innerW = W - pad.l - pad.r;
    const innerH = H - pad.t - pad.b;
    const keys: { key: "hitRate" | "mrr" | "ndcg"; color: string; label: string }[] = [
      { key: "hitRate", color: "#2563eb", label: "命中率" },
      { key: "mrr", color: "#059669", label: "MRR" },
      { key: "ndcg", color: "#d97706", label: "NDCG" },
    ];
    const x = (i: number) =>
      pad.l + (arr.length === 1 ? innerW / 2 : (i / (arr.length - 1)) * innerW);
    const y = (v: number) => pad.t + (1 - Math.max(0, Math.min(1, v))) * innerH;
    const xTicks = arr
      .map((p, i) => ({ i, label: p.date.slice(5) }))
      .filter((_, i) => arr.length <= 7 || i % Math.ceil(arr.length / 6) === 0 || i === arr.length - 1);
    const yTicks = [0, 0.25, 0.5, 0.75, 1];
    const linePath = (key: typeof keys[number]["key"]) =>
      arr.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key] ?? 0).toFixed(1)}`).join(" ");
    const dots = (key: typeof keys[number]["key"]) =>
      arr.map((p, i) => (
        <circle
          key={`${key}-${i}`}
          cx={x(i)}
          cy={y(p[key] ?? 0)}
          r={2.6}
          fill="var(--background)"
          stroke={keys.find((k) => k.key === key)!.color}
          strokeWidth={1.6}
        />
      ));
    return { W, H, pad, innerW, innerH, keys, x, y, xTicks, yTicks, linePath, dots };
  }, [points]);

  if (!data) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-sm text-foreground/40">
        暂无趋势数据（每日 02:00 定时评测落库后显示）
      </div>
    );
  }

  const latest = points[0]; // 接口按日期倒序
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex flex-wrap items-center gap-4">
        {data.keys.map((k) => (
          <span key={k.key} className="flex items-center gap-1.5 text-xs text-foreground/60">
            <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
            {k.label}
          </span>
        ))}
        {latest && (
          <span className="ml-auto text-xs text-foreground/40">
            最新 {latest.date} · {latest.caseCount} 用例
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${data.W} ${data.H}`}
        className="w-full"
        role="img"
        aria-label="评测指标趋势折线图"
      >
        {data.yTicks.map((t) => (
          <g key={t}>
            <line
              x1={data.pad.l}
              x2={data.W - data.pad.r}
              y1={data.y(t)}
              y2={data.y(t)}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={data.pad.l - 8}
              y={data.y(t) + 3}
              textAnchor="end"
              fontSize={10}
              fill="var(--foreground)"
              opacity={0.4}
            >
              {Math.round(t * 100)}
            </text>
          </g>
        ))}
        {data.xTicks.map(({ i, label }) => (
          <text
            key={i}
            x={data.x(i)}
            y={data.H - 8}
            textAnchor="middle"
            fontSize={10}
            fill="var(--foreground)"
            opacity={0.4}
          >
            {label}
          </text>
        ))}
        {data.keys.map((k) => (
          <path
            key={k.key}
            d={data.linePath(k.key)}
            fill="none"
            stroke={k.color}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {data.keys.map((k) => (
          <g key={`${k.key}-dots`}>{data.dots(k.key)}</g>
        ))}
      </svg>
    </div>
  );
}
