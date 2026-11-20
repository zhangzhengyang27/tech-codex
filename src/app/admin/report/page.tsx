"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, CalendarRange, Coins, Loader2, MessageSquare, Percent, RotateCw, ShieldAlert, ThumbsUp } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { weeklyReport, type WeeklyReport } from "@/lib/ops";
import { AdminCard, AdminMetricCard, AdminPageHeader, adminBtn } from "@/components/admin/admin-ui";

const fmtNum = (v: number): string => v.toLocaleString("en-US");
const fmtPct = (v: number): string => `${(v * 100).toFixed(1)}%`;

const PERIODS = [7, 14, 30, 90];

/* ---------- 每日问答量趋势（纯 CSS 条形，与用量页同风格） ---------- */

function ChatTrendChart({ report }: { report: WeeklyReport }) {
  const points = report.usage.trend;
  if (points.length === 0) {
    return (
      <AdminCard title="每日问答量" description="周期内按天统计问答与 token" icon={MessageSquare} contentClassName="px-4 py-12 text-center text-[12px] text-slate-400">
        周期内暂无问答数据
      </AdminCard>
    );
  }
  const arr = [...points].reverse();
  const max = Math.max(...arr.map((p) => p.questions), 1);
  return (
    <AdminCard title="每日问答量" description={`周期内峰值 ${fmtNum(max)} 条 / 天`} icon={MessageSquare} contentClassName="p-4">
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
              <div className="mt-1 text-center text-[9px] text-slate-400">{p.date.slice(5)}</div>
            )}
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

/* ---------- 检索质量趋势（评测日报） ---------- */

function EvalTrendTable({ report }: { report: WeeklyReport }) {
  if (report.evalTrend.length === 0) {
    return (
      <AdminCard
        title="检索质量趋势"
        description="评测日报：命中率 / MRR / NDCG"
        icon={ShieldAlert}
        actions={<Link href="/admin/eval" className="text-[11px] text-accent hover:underline">去评测 →</Link>}
        contentClassName="px-4 py-10 text-center text-[12px] text-slate-400"
      >
        周期内暂无评测报告，在 RAG 评测手动或定时运行后显示
      </AdminCard>
    );
  }
  return (
    <AdminCard
      title="检索质量趋势"
      description="评测日报：命中率 / MRR / NDCG"
      icon={ShieldAlert}
      actions={<Link href="/admin/eval" className="text-[11px] text-accent hover:underline">去评测 →</Link>}
      contentClassName="overflow-x-auto"
    >
      <table className="w-full min-w-[640px] text-left text-[12px]">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-[0.06em] text-slate-400">
            <th className="whitespace-nowrap px-4 py-2.5 font-medium">日期</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">用例数</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">命中率</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">MRR</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">NDCG</th>
          </tr>
        </thead>
        <tbody>
          {report.evalTrend.slice(0, 10).map((p) => (
            <tr key={p.date} className="border-b border-slate-100/80 last:border-0">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-slate-500">{p.date}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{p.caseCount}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{p.hitRate == null ? "-" : fmtPct(p.hitRate)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{p.mrr == null ? "-" : p.mrr.toFixed(3)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{p.ndcg == null ? "-" : p.ndcg.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminCard>
  );
}

export default function AdminReportPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** 请求序守卫：快速切换统计周期（7/14/30/90 天）时丢弃旧周期响应 */
  const loadSeqRef = useRef(0);

  useEffect(() => {
    if (isLoggedIn && !isAdmin) router.replace("/");
  }, [isLoggedIn, isAdmin, router]);

  const load = useCallback((period: number) => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError("");
    weeklyReport(period)
      .then((r) => {
        if (seq !== loadSeqRef.current) return; // 已切换到其他周期，丢弃过期响应
        setReport(r);
      })
      .catch((e) => {
        if (seq !== loadSeqRef.current) return;
        setError(e instanceof Error ? e.message : "加载失败");
      })
      .finally(() => {
        if (seq === loadSeqRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) return;
    // delayed setState：延后一拍发起加载，避免 effect 内同步 setState 级联渲染
    const t = setTimeout(() => load(days), 0);
    return () => clearTimeout(t);
  }, [isLoggedIn, isAdmin, days, load]);

  if (!isLoggedIn || !isAdmin) {
    return <div className="w-full py-16 text-center text-sm text-slate-400">加载中…</div>;
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={CalendarRange}
        title="运营周报"
        description="按周期汇总问答用量、用户反馈、点踩问题榜和检索质量趋势。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              最近 {days} 天
            </span>
            {report && <span>生成于 {new Date(report.generatedAt).toLocaleString("zh-CN", { hour12: false })}</span>}
          </>
        }
        actions={
          <>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDays(p)}
                  className={clsx(
                    "rounded-md px-2.5 py-1.5 text-[12px] transition-colors",
                    days === p
                      ? "bg-accent font-medium text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                  )}
                >
                  {p} 天
                </button>
              ))}
            </div>
            <button onClick={() => load(days)} className={adminBtn("secondary")} title="刷新">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
              刷新
            </button>
          </>
        }
      />

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}

      {!report && loading ? (
        <AdminCard contentClassName="py-20 text-center text-sm text-slate-400">
          <Loader2 size={16} className="mx-auto mb-2 animate-spin" /> 加载中…
        </AdminCard>
      ) : report ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <AdminMetricCard
              label="问答总数"
              className="md:col-span-2"
              value={fmtNum(report.usage.totalQuestions)}
              hint={`均值 ${report.usage.avgHitCount.toFixed(1)} 片命中`}
              icon={MessageSquare}
              tone="blue"
            />
            <AdminMetricCard
              label="token 消耗"
              className="md:col-span-2"
              value={fmtNum(report.usage.totalTokens)}
              hint={`平均耗时 ${(report.usage.avgLatencyMs / 1000).toFixed(2)}s`}
              icon={Coins}
              tone="violet"
            />
            <AdminMetricCard
              label="点赞 / 点踩"
              className="md:col-span-2"
              value={`${report.feedbackUp} / ${report.feedbackDown}`}
              hint={`共 ${report.feedbackUp + report.feedbackDown} 条反馈`}
              icon={ThumbsUp}
              tone="emerald"
            />
            <AdminMetricCard
              label="点踩率"
              className="md:col-span-3"
              value={fmtPct(report.downRate)}
              hint="≥30% 红 · ≥15% 黄"
              icon={Percent}
              tone={report.downRate >= 0.3 ? "red" : report.downRate >= 0.15 ? "amber" : "emerald"}
            />
            <AdminMetricCard
              label="未处理告警"
              className="col-span-2 md:col-span-3"
              value={fmtNum(report.openAlerts)}
              hint={report.openAlerts > 0 ? "需要关注" : "全部已处理"}
              icon={ShieldAlert}
              tone={report.openAlerts > 0 ? "amber" : "emerald"}
            />
          </div>

          {report.openAlerts > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12px] text-amber-700">
              <ShieldAlert size={15} />
              有 {report.openAlerts} 条未处理告警，建议先到总览处理。
              <Link href="/admin" className="inline-flex items-center gap-1 font-medium text-amber-700 underline underline-offset-2">去处理 <ArrowRight size={12} /></Link>
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
            <AdminCard
              title="点踩 Top 问题榜"
              description="按出现次数排序，可直接作为内容补强清单"
              icon={ThumbsUp}
              actions={<Link href="/admin/feedback?rating=DOWN" className="text-[11px] text-accent hover:underline">全部点踩 →</Link>}
              contentClassName="overflow-x-auto"
            >
              {report.downTopQuestions.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <ThumbsUp size={22} className="mx-auto mb-2 text-emerald-400" />
                  <p className="text-[12px] font-medium text-slate-600">周期内没有点踩反馈</p>
                  <p className="mt-1 text-[11px] text-slate-400">问答质量保持良好，继续关注评测趋势即可</p>
                </div>
              ) : (
                <table className="w-full min-w-[560px] text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[10px] uppercase tracking-[0.06em] text-slate-400">
                      <th className="w-10 px-4 py-2.5 font-medium">#</th>
                      <th className="px-3 py-2.5 font-medium">问题</th>
                      <th className="w-16 px-3 py-2.5 font-medium">次数</th>
                      <th className="hidden px-3 py-2.5 font-medium xl:table-cell">最近评语</th>
                      <th className="w-28 px-3 py-2.5 font-medium">最近点踩</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.downTopQuestions.map((q, i) => (
                      <tr key={`${q.question}-${i}`} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{String(i + 1).padStart(2, "0")}</td>
                        <td className="max-w-0 truncate px-3 py-2.5 text-slate-700" title={q.question}>{q.question}</td>
                        <td className="px-3 py-2.5">
                          <span className={clsx("font-mono font-medium", q.count >= 3 ? "text-red-500" : "text-slate-600")}>
                            {q.count}
                          </span>
                        </td>
                        <td className="hidden max-w-0 truncate px-3 py-2.5 text-slate-500 xl:table-cell" title={q.lastComment ?? ""}>
                          {q.lastComment ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-[10px] text-slate-400">
                          {q.lastAt ? new Date(q.lastAt).toLocaleDateString("zh-CN") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </AdminCard>

            <AdminCard title="本期摘要" description="反馈与告警口径" icon={ShieldAlert} contentClassName="p-4">
              <div className="space-y-2.5">
                {[
                  ["反馈总量", `${report.feedbackUp + report.feedbackDown} 条`],
                  ["其中点踩", `${report.feedbackDown} 条`],
                  ["点踩率", fmtPct(report.downRate)],
                  ["未处理告警", `${report.openAlerts} 条`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="text-[11px] text-slate-400">{label}</span>
                    <span className="font-mono text-[13px] font-medium text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[10px] leading-4 text-slate-400">
                点踩率 ≥ 30% 标红，≥ 15% 标黄；点踩条目可在问答反馈页转为 Golden Set 用例。
              </div>
              <Link href="/admin/feedback" className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline">
                查看全部反馈 <ArrowRight size={12} />
              </Link>
            </AdminCard>
          </div>

          <ChatTrendChart report={report} />
          <EvalTrendTable report={report} />
        </div>
      ) : null}
    </div>
  );
}
