"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { BarChart3, Loader2, ShieldAlert, RotateCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  usageSummary,
  usageRecent,
  usageTopUsers,
  type UsageSummaryView,
  type ChatUsageView,
  type UserUsageRow,
} from "@/lib/usage";

const fmtNum = (v: number): string => v.toLocaleString("en-US");

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

/* ---------- 指标卡片 ---------- */

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[13px] text-foreground/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight font-mono">{value}</div>
      {sub && <div className="mt-1 text-xs text-foreground/40">{sub}</div>}
    </div>
  );
}

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
      <div className="flex h-56 items-center justify-center rounded-xl border border-dashed border-border text-sm text-foreground/40">
        暂无用量数据（产生问答后将在此显示每日趋势）
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-foreground/40">
        <span className="text-foreground/60">近 {data.arr.length} 天每日 token 消耗</span>
        <span>峰值 {fmtNum(data.max)}</span>
      </div>
      <div className="flex h-44 items-end gap-[2px]">
        {data.arr.map((p) => (
          <div key={p.date} className="group relative flex-1" title={`${p.date} · 问题 ${p.questions} · token ${fmtNum(p.tokens)}`}>
            <div
              className="w-full rounded-t-[2px] bg-accent/80 transition-colors group-hover:bg-accent"
              style={{ height: `${Math.max(2, (p.tokens / data.max) * 100)}%` }}
            />
            {(data.arr.length <= 15 || p.date.endsWith("-01")) && (
              <div className="mt-1 text-center text-[9px] text-foreground/30">
                {p.date.slice(5)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 用量明细表 ---------- */

function UsageTable({ rows, loading }: { rows: ChatUsageView[]; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">
        最近用量明细
        <span className="ml-2 text-xs font-normal text-foreground/40">{rows.length} 条</span>
      </div>
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-foreground/40">
          <Loader2 size={15} className="animate-spin" /> 加载中…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-foreground/40">暂无用量记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">用户</th>
                <th className="px-3 py-2 font-medium">问题</th>
                <th className="px-3 py-2 font-medium">命中片段</th>
                <th className="px-3 py-2 font-medium">耗时</th>
                <th className="px-3 py-2 font-medium">token 估算</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground/70">
                    {fmtTime(r.createdDate)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">{r.userId}</td>
                  <td className="max-w-[280px] px-3 py-2.5">
                    <div className="truncate" title={r.question}>{r.question}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">{r.hitCount ?? 0}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">
                    {r.elapsedMs != null ? fmtMs(r.elapsedMs) : "-"}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">{fmtNum(r.totalTokens ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- Top 用户排行 ---------- */

function TopUsersTable({ rows, loading }: { rows: UserUsageRow[]; loading: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="border-b border-border px-4 py-2.5 text-[13px] font-medium">
        Top 用户（近 7 天，按问答数）
        <span className="ml-2 text-xs font-normal text-foreground/40">{rows.length} 人</span>
      </div>
      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-foreground/40">
          <Loader2 size={15} className="animate-spin" /> 加载中…
        </div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-foreground/40">周期内暂无问答记录</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">用户</th>
                <th className="px-3 py-2 font-medium">问答数</th>
                <th className="px-3 py-2 font-medium">token 估算</th>
                <th className="px-3 py-2 font-medium">平均耗时</th>
                <th className="px-3 py-2 font-medium">平均命中</th>
                <th className="px-3 py-2 font-medium">最近活跃</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.userId} className="border-b border-border/60 last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-mono text-foreground/40">{i + 1}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">{r.userId}</td>
                  <td className="px-3 py-2.5 font-mono font-medium">{fmtNum(r.questions)}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">{fmtCompact(r.totalTokens)}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">{fmtMs(r.avgLatencyMs)}</td>
                  <td className="px-3 py-2.5 font-mono text-foreground/70">{r.avgHitCount.toFixed(1)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-foreground/50">
                    {fmtTime(r.lastActiveAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
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
  const [recentLoading, setRecentLoading] = useState(false);
  const [topUsers, setTopUsers] = useState<UserUsageRow[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/usage");
  }, [isLoggedIn, hydrated, router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const n = Number(days);
      const d = Number.isFinite(n) && n > 0 ? Math.min(n, 90) : 30;
      const [s, r] = await Promise.all([usageSummary(d), usageRecent(0, 20)]);
      setSummary(s);
      setRecent(r.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "用量查询失败");
    } finally {
      setLoading(false);
    }
  }, [days]);

  // 挂载后自动加载，并加载明细与 Top 用户
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      usageSummary(30).catch(() => null),
      usageRecent(0, 20).catch(() => null),
      usageTopUsers(7, 10).catch(() => []),
    ])
      .then(([s, r, t]) => {
        if (cancelled) return;
        setSummary(s);
        setRecent(r?.content ?? []);
        setTopUsers(t ?? []);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated || !isLoggedIn) {
    return <div className="mx-auto max-w-[1440px] px-4 py-24 text-center text-sm text-foreground/40">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-3 px-4 py-24 text-center">
        <ShieldAlert size={36} className="text-foreground/30" />
        <p className="text-sm text-foreground/60">该页面需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <BarChart3 size={20} />
          用量统计
        </h1>
        <p className="mt-1 text-[13px] text-foreground/50">
          基于 token 估算的问答用量看板（估算口径：中文约 1 字符/token）
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-background p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">最近天数 days（1~90）</span>
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="h-8 w-24 rounded-md border border-border bg-background px-2 text-[13px] outline-none transition-colors focus:border-accent"
          />
        </label>
        <button
          onClick={() => void loadAll()}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          刷新
        </button>
        {error && <span className="text-[13px] text-red-500">{error}</span>}
      </div>

      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="总问答数" value={fmtNum(summary.totalQuestions)} sub="周期内累计" />
          <MetricCard label="总 token（估算）" value={fmtCompact(summary.totalTokens)} sub={`输入 ${fmtCompact(summary.totalInputTokens)} + 输出 ${fmtCompact(summary.totalOutputTokens)}`} />
          <MetricCard label="平均耗时" value={fmtMs(summary.avgLatencyMs)} sub="每次问答" />
          <MetricCard label="平均命中片段" value={summary.avgHitCount.toFixed(1)} sub="检索命中数" />
        </div>
      )}

      {summary && <div className="mb-6"><TrendBarChart points={summary.trend} /></div>}

      <div className="mb-6"><TopUsersTable rows={topUsers} loading={recentLoading} /></div>

      <UsageTable rows={recent} loading={recentLoading} />
    </div>
  );
}