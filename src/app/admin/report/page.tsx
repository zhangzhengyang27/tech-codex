"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { CalendarRange, Loader2, RotateCw, ShieldAlert } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { weeklyReport, type WeeklyReport } from "@/lib/ops";

const fmtNum = (v: number): string => v.toLocaleString("en-US");
const fmtPct = (v: number): string => `${(v * 100).toFixed(1)}%`;

const PERIODS = [7, 14, 30, 90];

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[13px] text-foreground/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight font-mono">{value}</div>
      {sub && <div className="mt-1 text-xs text-foreground/40">{sub}</div>}
    </div>
  );
}

/* ---------- 每日问答量趋势（纯 CSS 条形，与用量页同风格） ---------- */

function ChatTrendChart({ report }: { report: WeeklyReport }) {
  const points = report.usage.trend;
  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-foreground/40">
        周期内暂无问答数据
      </div>
    );
  }
  const arr = [...points].reverse();
  const max = Math.max(...arr.map((p) => p.questions), 1);
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-foreground/40">
        <span className="text-foreground/60">每日问答量</span>
        <span>峰值 {fmtNum(max)}</span>
      </div>
      <div className="flex h-36 items-end gap-[2px]">
        {arr.map((p) => (
          <div
            key={p.date}
            className="group relative flex-1"
            title={`${p.date} · 问答 ${p.questions} · token ${fmtNum(p.tokens)}`}
          >
            <div
              className="w-full rounded-t-[2px] bg-accent/80 transition-colors group-hover:bg-accent"
              style={{ height: `${Math.max(2, (p.questions / max) * 100)}%` }}
            />
            {(arr.length <= 15 || p.date.endsWith("-01")) && (
              <div className="mt-1 text-center text-[9px] text-foreground/30">{p.date.slice(5)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 检索质量趋势（评测日报） ---------- */

function EvalTrendTable({ report }: { report: WeeklyReport }) {
  if (report.evalTrend.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-background p-4 text-sm text-foreground/40">
        周期内暂无评测报告（在 <Link href="/admin/eval" className="text-accent hover:underline">RAG 评测</Link> 手动或定时运行后显示）
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">
        检索质量趋势（评测日报）
        <Link href="/admin/eval" className="ml-2 text-xs font-normal text-accent hover:underline">去评测 →</Link>
      </div>
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
          {report.evalTrend.slice(0, 10).map((p) => (
            <tr key={p.date} className="border-b border-border/50 last:border-0">
              <td className="px-4 py-2 font-mono text-xs">{p.date}</td>
              <td className="px-3 py-2">{p.caseCount}</td>
              <td className="px-3 py-2 font-mono">{p.hitRate == null ? "-" : fmtPct(p.hitRate)}</td>
              <td className="px-3 py-2 font-mono">{p.mrr == null ? "-" : p.mrr.toFixed(3)}</td>
              <td className="px-3 py-2 font-mono">{p.ndcg == null ? "-" : p.ndcg.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminReportPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoggedIn && !isAdmin) router.replace("/");
  }, [isLoggedIn, isAdmin, router]);

  const load = useCallback((period: number) => {
    setLoading(true);
    setError("");
    weeklyReport(period)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "加载失败"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isLoggedIn && isAdmin) load(days);
  }, [isLoggedIn, isAdmin, days, load]);

  if (!isLoggedIn || !isAdmin) {
    return <div className="mx-auto max-w-[1440px] px-4 py-24 text-center text-sm text-foreground/40">加载中…</div>;
  }

  const downRateCls = (v: number) =>
    v >= 0.3 ? "text-red-500" : v >= 0.15 ? "text-amber-500" : "text-emerald-600";

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8">
      {/* 页头 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <CalendarRange size={20} /> 运营周报
          </h1>
          <p className="mt-1 text-xs text-foreground/40">
            用量 · 反馈 · 点踩问题榜（内容补强清单）· 检索质量 · 告警
            {report && ` · 生成于 ${new Date(report.generatedAt).toLocaleString("zh-CN", { hour12: false })}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-muted/40 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDays(p)}
                className={clsx(
                  "rounded px-2 py-1 text-xs transition-colors",
                  days === p
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-foreground/50 hover:text-foreground",
                )}
              >
                {p} 天
              </button>
            ))}
          </div>
          <button
            onClick={() => load(days)}
            className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-foreground/60 hover:bg-muted/60"
            title="刷新"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
            刷新
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm text-red-500">{error}</p>}

      {!report && loading ? (
        <div className="py-24 text-center text-sm text-foreground/40">
          <Loader2 size={16} className="mx-auto mb-2 animate-spin" /> 加载中…
        </div>
      ) : report ? (
        <div className="space-y-6">
          {/* 概览指标 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard label="问答总数" value={fmtNum(report.usage.totalQuestions)} sub={`均值 ${report.usage.avgHitCount.toFixed(1)} 片命中`} />
            <MetricCard label="token 消耗" value={fmtNum(report.usage.totalTokens)} sub={`平均耗时 ${(report.usage.avgLatencyMs / 1000).toFixed(2)}s`} />
            <MetricCard label="点赞 / 点踩" value={`${report.feedbackUp} / ${report.feedbackDown}`} sub={`共 ${report.feedbackUp + report.feedbackDown} 条反馈`} />
            <MetricCard label="点踩率" value={fmtPct(report.downRate)} sub="≥30% 红 · ≥15% 黄" />
            <MetricCard label="未处理告警" value={fmtNum(report.openAlerts)} sub={report.openAlerts > 0 ? "需要关注" : "全部已处理"} />
          </div>

          {report.openAlerts > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600">
              <ShieldAlert size={16} />
              有 {report.openAlerts} 条未处理告警，
              <Link href="/admin" className="underline underline-offset-2">去处理 →</Link>
            </div>
          )}

          {/* 点踩 Top 问题榜：内容补强清单 */}
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">
              点踩 Top 问题榜
              <span className="ml-2 text-xs font-normal text-foreground/40">按出现次数排序 · 回流评测用例见问答反馈页</span>
              <Link href="/admin/feedback?rating=DOWN" className="ml-2 text-xs font-normal text-accent hover:underline">全部点踩 →</Link>
            </div>
            {report.downTopQuestions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-foreground/40">周期内没有点踩反馈，问答质量保持良好</div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                    <th className="w-12 px-4 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">问题</th>
                    <th className="w-20 px-3 py-2 font-medium">次数</th>
                    <th className="px-3 py-2 font-medium">最近评语</th>
                    <th className="w-36 px-3 py-2 font-medium">最近点踩</th>
                  </tr>
                </thead>
                <tbody>
                  {report.downTopQuestions.map((q, i) => (
                    <tr key={`${q.question}-${i}`} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs text-foreground/40">{i + 1}</td>
                      <td className="max-w-0 truncate px-3 py-2" title={q.question}>{q.question}</td>
                      <td className="px-3 py-2">
                        <span className={clsx("font-mono font-medium", q.count >= 3 ? "text-red-500" : "text-foreground")}>
                          {q.count}
                        </span>
                      </td>
                      <td className="max-w-0 truncate px-3 py-2 text-foreground/60" title={q.lastComment ?? ""}>
                        {q.lastComment ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-foreground/40">
                        {q.lastAt ? new Date(q.lastAt).toLocaleDateString("zh-CN") : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 趋势 */}
          <ChatTrendChart report={report} />
          <EvalTrendTable report={report} />
        </div>
      ) : null}
    </div>
  );
}
