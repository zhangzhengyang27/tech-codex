"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { BarChart3, Coins, Layers, Loader2, MessageSquare, ShieldAlert, RotateCw, Timer, Users, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { timeoutOr } from "@/lib/fetch-helpers";
import {
  usageSummary,
  usageRecent,
  usageTopUsers,
  type UsageSummaryView,
  type ChatUsageView,
  type UserUsageRow,
} from "@/lib/usage";
import { AdminCard, AdminEmptyState, AdminMetricCard, AdminPageHeader, adminBtn } from "@/components/admin/admin-ui";

const fmtNum = (v: number): string => v.toLocaleString("en-US");
const fmtPct = (v: number): string => `${(v * 100).toFixed(1)}%`;

/** 大数缩写（>1e6 显示 M，>1e3 显示 k）。 */
const fmtCompact = (v: number): string => {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(v);
};

const fmtMs = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

const fmtTime = (iso: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("zh-CN", { hour12: false });
};

/* ---------- 近 30 天趋势条形图（纯 CSS/DIV） ---------- */

function TrendBarChart({ points }: { points: UsageSummaryView["trend"] }) {
  const data = useMemo(() => {
    const arr = [...points].reverse(); // 时间正序绘制
    if (arr.length === 0) return null;
    const max = Math.max(...arr.map((p) => p.tokens), 1);
    return { arr, max };
  }, [points]);

  if (!data) {
    return (
      <AdminCard title="每日 token 消耗" description="按天统计问答 token" icon={BarChart3} contentClassName="px-4 py-12 text-center text-xs text-slate-400">
        暂无用量数据，产生问答后将在此显示每日趋势
      </AdminCard>
    );
  }

  return (
    <AdminCard title="每日 token 消耗" description={`近 ${data.arr.length} 天 · 峰值 ${fmtNum(data.max)}`} icon={BarChart3} contentClassName="p-4">
      <div className="flex h-44 items-end gap-[2px]">
        {data.arr.map((p) => (
          <div key={p.date} className="group relative flex-1" title={`${p.date} · 问题 ${p.questions} · token ${fmtNum(p.tokens)}`}>
            <div
              className="w-full rounded-t-[2px] bg-accent/80 transition-colors group-hover:bg-accent"
              style={{ height: `${Math.max(2, (p.tokens / data.max) * 100)}%` }}
            />
            {(data.arr.length <= 15 || p.date.endsWith("-01")) && (
              <div className="mt-1 text-center text-3xs text-slate-400">
                {p.date.slice(5)}
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminCard>
  );
}

/* ---------- 用量明细表 ---------- */

function UsageTable({ rows, loading }: { rows: ChatUsageView[]; loading: boolean }) {
  return (
    <AdminCard
      title="最近用量明细"
      description={`${rows.length} 条问答记录`}
      icon={MessageSquare}
      contentClassName=""
    >
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> 加载中…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-slate-400">暂无用量记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-2xs uppercase tracking-[0.06em] text-slate-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">时间</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">用户</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">问题</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">命中片段</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">缓存</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">耗时</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">token 估算</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-caption text-slate-500">
                    {fmtTime(r.createdDate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{r.userId}</td>
                  <td className="max-w-[280px] px-3 py-2.5 text-slate-600">
                    <div className="truncate" title={r.question}>{r.question}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">{r.hitCount ?? 0}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className={clsx(
                      "inline-flex rounded-full border px-1.5 py-0.5 text-2xs",
                      r.cacheHit
                        ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                        : "border-slate-200 bg-slate-50 text-slate-400",
                    )}>
                      {r.cacheHit ? "命中" : "回源"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">
                    {r.elapsedMs != null ? fmtMs(r.elapsedMs) : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">{fmtNum(r.totalTokens ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}

/* ---------- Top 用户排行 ---------- */

function TopUsersTable({ rows, loading }: { rows: UserUsageRow[]; loading: boolean }) {
  return (
    <AdminCard
      title="Top 用户"
      description={`近 7 天按问答数排序 · ${rows.length} 人`}
      icon={Users}
      contentClassName=""
    >
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> 加载中…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-slate-400">周期内暂无问答记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-2xs uppercase tracking-[0.06em] text-slate-400">
                <th className="w-10 whitespace-nowrap px-4 py-2.5 font-medium">#</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">用户</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">问答数</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">token 估算</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">平均耗时</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">平均命中</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">最近活跃</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-mono text-2xs text-slate-400">{String(i + 1).padStart(2, "0")}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{r.userId}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono font-medium text-slate-700">{fmtNum(r.questions)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">{fmtCompact(r.totalTokens)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">{fmtMs(r.avgLatencyMs)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">{r.avgHitCount.toFixed(1)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-2xs text-slate-400">
                    {fmtTime(r.lastActiveAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}

/* ---------- 页面 ---------- */

export default function AdminUsagePage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<UsageSummaryView | null>(null);
  const [recent, setRecent] = useState<ChatUsageView[]>([]);
  // 挂载即拉取明细/Top 用户：初始即为加载中，避免在 effect 内同步 setState
  const [recentLoading, setRecentLoading] = useState(true);
  const [topUsers, setTopUsers] = useState<UserUsageRow[]>([]);
  /** 请求序守卫：挂载自动加载与手动刷新并发时丢弃旧响应 */
  const loadSeqRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/usage");
  }, [isLoggedIn, hydrated, router]);

  const loadAll = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError("");
    setRecentLoading(true);
    try {
      const n = Number(days);
      const d = Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 30;
      const [s, r] = await Promise.all([usageSummary(d), usageRecent(0, 20)]);
      if (seq !== loadSeqRef.current) return; // 已有更新的请求接管渲染
      setSummary(s);
      setRecent(r.content);
    } catch (e) {
      if (seq !== loadSeqRef.current) return;
      setError(timeoutOr(e, e instanceof Error ? e.message : "用量查询失败"));
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
        setRecentLoading(false);
      }
    }
  }, [days]);

  // 挂载后自动加载汇总/明细/Top 用户（各自独立：部分失败也展示已取得的数据 + 错误提示，
  // 不再吞错显示 0 值）；与手动刷新 loadAll 共享请求序守卫，慢的旧响应不覆盖新数据
  useEffect(() => {
    const seq = ++loadSeqRef.current;
    Promise.allSettled([usageSummary(30), usageRecent(0, 20), usageTopUsers(7, 10)]).then(
      (results) => {
        if (seq !== loadSeqRef.current) return; // 用户已手动刷新，丢弃过期响应
        const [s, r, t] = results;
        const failed: string[] = [];
        if (s.status === "fulfilled") setSummary(s.value);
        else failed.push("用量汇总");
        if (r.status === "fulfilled") setRecent(r.value.content);
        else failed.push("用量明细");
        if (t.status === "fulfilled") setTopUsers(t.value);
        else failed.push("Top 用户");
        if (failed.length > 0) setError(`${failed.join("、")}加载失败，请刷新重试`);
        setRecentLoading(false);
      }
    );
    return () => {
      loadSeqRef.current += 1; // 卸载后响应作废
    };
  }, []);

  if (!hydrated || !isLoggedIn) {
    return <div className="w-full py-16 text-center text-sm text-slate-400">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert size={36} className="text-slate-300" />
        <p className="text-sm text-slate-500">该页面需要管理员权限</p>
      </div>
    );
  }

  // 空态判定：三个数据源都确认无数据后才展示单一空态，避免多张空卡片堆叠
  const isEmpty = summary !== null && !recentLoading
    && summary.totalQuestions === 0 && recent.length === 0 && topUsers.length === 0;

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={BarChart3}
        title="用量统计"
        description="基于 token 估算的问答用量看板；估算口径为中文约 1 字符 / token。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-caption text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              最近 {days} 天
            </span>
            <span>按问答时间统计</span>
          </>
        }
        actions={
          <>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-caption text-slate-500 shadow-sm">
              天数
              <input
                type="number"
                min={1}
                max={90}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="h-6 w-12 rounded border border-slate-200 bg-slate-50 px-1 text-center font-mono text-xs outline-none focus:border-accent"
              />
            </label>
            <button onClick={() => void loadAll()} disabled={loading} className={adminBtn("secondary")}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
              刷新
            </button>
          </>
        }
      />

      {error && <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-compact text-red-600">{error}</p>}

      {summary && !isEmpty && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <AdminMetricCard label="总问答数" value={fmtNum(summary.totalQuestions)} hint="周期内累计" icon={MessageSquare} tone="blue" />
          <AdminMetricCard label="TOKEN 估算" value={fmtCompact(summary.totalTokens)} hint={`输入 ${fmtCompact(summary.totalInputTokens)} + 输出 ${fmtCompact(summary.totalOutputTokens)}`} icon={Coins} tone="violet" />
          <AdminMetricCard label="缓存命中率" value={fmtPct(summary.cacheHitRate)} hint={`${fmtNum(summary.cacheHitCount)} 次命中`} icon={Zap} tone={summary.cacheHitRate >= 0.2 ? "emerald" : "amber"} />
          <AdminMetricCard label="缓存节省 TOKEN" value={fmtCompact(summary.cacheSavedTokens)} hint="命中回放估算" icon={Zap} tone="emerald" />
          <AdminMetricCard label="未答率" value={fmtPct(summary.unansweredRate)} hint={`${fmtNum(summary.unansweredQuestions)} 条空回答`} icon={ShieldAlert} tone={summary.unansweredRate < 0.1 ? "emerald" : "amber"} />
          <AdminMetricCard label="平均耗时" value={fmtMs(summary.avgLatencyMs)} hint={`平均命中 ${summary.avgHitCount.toFixed(1)} 片段`} icon={Timer} tone="emerald" />
        </div>
      )}

      {isEmpty ? (
        <div className="mt-5">
          <AdminCard title="用量概览" description="近周期内的问答、token 与用户分布" icon={BarChart3} contentClassName="">
            <AdminEmptyState
              icon={MessageSquare}
              title="还没有问答用量"
              description="产生第一条问答后，这里会显示每日 token 趋势、Top 用户和最近问答明细。"
              compact
              action={
                <button onClick={() => router.push("/ai")} className={adminBtn("primary")}>
                  去问答页体验
                </button>
              }
            />
          </AdminCard>
        </div>
      ) : (
        <>
          {summary && <div className="mt-5"><TrendBarChart points={summary.trend} /></div>}

          <div className="mt-5"><TopUsersTable rows={topUsers} loading={recentLoading} /></div>

          <div className="mt-5"><UsageTable rows={recent} loading={recentLoading} /></div>
        </>
      )}
    </div>
  );
}