"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarRange,
  CircleCheck,
  Database,
  FileText,
  FlaskConical,
  FolderSync,
  HardDrive,
  Layers,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Target,
  Unlock,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { kbStats, syncDocs, rebuildIndex, type KbStats, type AdminTaskView } from "@/lib/documents";
import { listOpenAlerts, listLockedAccounts, resolveAlert, unlockAccount, type KbAlertItem, type LockedAccountItem } from "@/lib/ops";
import { TaskProgress } from "@/components/admin/task-progress";
import { AdminCard, AdminMetricCard, AdminPageHeader, adminBtn, type AdminTone } from "@/components/admin/admin-ui";

const fmtNum = (v: number): string => v.toLocaleString("en-US");

const QUICK_LINKS: { href: string; label: string; desc: string; icon: typeof FileText; tone: AdminTone }[] = [
  { href: "/admin/documents", label: "文档管理", desc: "公共库文档 · 上传 / 同步 / 重建", icon: FileText, tone: "blue" },
  { href: "/admin/eval", label: "RAG 评测", desc: "Golden Set · A/B 对照 · 趋势", icon: FlaskConical, tone: "violet" },
  { href: "/admin/gaps", label: "内容缺口", desc: "未答 / 零引用 / 点踩 · 转评测", icon: Target, tone: "amber" },
  { href: "/admin/feedback", label: "问答反馈", desc: "点赞点踩 · 回流评测用例", icon: MessageSquare, tone: "emerald" },
  { href: "/admin/usage", label: "用量统计", desc: "问答量 · token · Top 用户", icon: BarChart3, tone: "blue" },
  { href: "/admin/report", label: "运营周报", desc: "点踩榜 · 反馈率 · 质量趋势", icon: CalendarRange, tone: "violet" },
  { href: "/admin/audit", label: "审计日志", desc: "管理操作留痕查询", icon: ScrollText, tone: "slate" },
];

const QUICK_TONE: Record<AdminTone, string> = {
  blue: "bg-blue-50 text-blue-600 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  red: "bg-red-50 text-red-600 ring-red-100",
  violet: "bg-violet-50 text-violet-600 ring-violet-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default function AdminOverviewPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();
  const [stats, setStats] = useState<KbStats | null>(null);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState<"sync" | "rebuild" | null>(null);
  const [alerts, setAlerts] = useState<KbAlertItem[]>([]);
  const [locked, setLocked] = useState<LockedAccountItem[]>([]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin");
  }, [isLoggedIn, hydrated, router]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await kbStats());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "统计查询失败");
    }
  }, []);

  const loadOps = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([listOpenAlerts().catch(() => []), listLockedAccounts().catch(() => [])]);
      setAlerts(a);
      setLocked(l);
    } catch {
      // 运维区块加载失败不打断总览
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    // delayed setState：延后一拍发起加载，避免 effect 内同步 setState 级联渲染
    const t = setTimeout(() => {
      void loadStats();
      void loadOps();
    }, 0);
    return () => clearTimeout(t);
  }, [loadStats, loadOps, hydrated, isAdmin]);

  const startSync = async () => {
    setStarting("sync");
    setActionError("");
    try {
      const { taskId: id } = await syncDocs();
      setTaskTitle("docs 内容同步");
      setTaskId(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "触发同步失败");
    } finally {
      setStarting(null);
    }
  };

  const startRebuild = async () => {
    setStarting("rebuild");
    setActionError("");
    try {
      const { taskId: id } = await rebuildIndex();
      setTaskTitle("向量索引重建");
      setTaskId(id);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "触发重建失败");
    } finally {
      setStarting(null);
    }
  };

  const onTaskDone = useCallback(
    (_t: AdminTaskView) => {
      void loadStats();
      void loadOps();
    },
    [loadStats, loadOps],
  );

  const onResolveAlert = async (id: number) => {
    try {
      await resolveAlert(id);
      void loadOps();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "处理失败");
    }
  };

  const onUnlock = async (username: string) => {
    try {
      await unlockAccount(username);
      void loadOps();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "解锁失败");
    }
  };

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

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={LayoutDashboard}
        title="管理总览"
        description="公共知识库（default 空间）的运行状态、待办告警和常用运维入口。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              公共知识库 · default
            </span>
            {stats && <span>已索引 {fmtNum(stats.indexedDocuments)} / {fmtNum(stats.totalDocuments)} 篇</span>}
            {alerts.length > 0 && <span className="text-amber-600">{alerts.length} 条告警待处理</span>}
          </>
        }
        actions={
          <>
            <button
              onClick={() => {
                void loadStats();
                void loadOps();
              }}
              className={adminBtn("secondary")}
            >
              <RefreshCw size={14} /> 刷新数据
            </button>
            <Link href="/admin/documents" className={adminBtn("primary")}>
              <FileText size={14} /> 管理文档 <ArrowRight size={14} />
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
          <ShieldAlert size={15} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <AdminMetricCard
          label="文档总数"
          className="md:col-span-2"
          value={stats ? fmtNum(stats.totalDocuments) : "…"}
          hint={stats ? `已索引 ${fmtNum(stats.indexedDocuments)} 篇` : "正在读取统计"}
          icon={FileText}
          tone="blue"
          href="/admin/documents"
        />
        <AdminMetricCard
          label="分块总数"
          className="md:col-span-2"
          value={stats ? fmtNum(stats.totalChunks) : "…"}
          hint="kb_chunk 已落库"
          icon={Layers}
          tone="violet"
        />
        <AdminMetricCard
          label="待索引"
          className="md:col-span-2"
          value={stats ? fmtNum(stats.pendingDocuments) : "…"}
          hint="处理中 / 排队"
          icon={HardDrive}
          tone="amber"
          href="/admin/documents"
        />
        <AdminMetricCard
          label="索引失败"
          className="md:col-span-3"
          value={stats ? fmtNum(stats.failedDocuments) : "…"}
          hint={stats && stats.failedDocuments > 0 ? "可在文档管理重试" : "当前无失败文档"}
          icon={ShieldAlert}
          tone={stats && stats.failedDocuments > 0 ? "red" : "emerald"}
          href="/admin/documents"
        />
        <AdminMetricCard
          label="向量规模"
          className="col-span-2 md:col-span-3"
          value={stats ? fmtNum(stats.totalVectorCount) : "…"}
          hint="Redis 向量索引"
          icon={Database}
          tone="blue"
        />
      </div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <AdminCard
          title="待办与告警"
          description="需要人工介入的评测异常、内容问题和登录安全事件"
          icon={BellRing}
          actions={
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] text-slate-400">
              {alerts.length + locked.length} 项
            </span>
          }
          contentClassName="space-y-3 p-4"
        >
          {alerts.length === 0 && locked.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                <CircleCheck size={16} />
              </span>
              <div>
                <div className="text-[13px] font-medium text-emerald-800">当前没有待处理异常</div>
                <p className="mt-1 text-[11px] leading-4 text-emerald-700/70">
                  评测命中率、内容缺口和登录安全均在正常范围内。
                </p>
              </div>
            </div>
          ) : null}

          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <BellRing size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium leading-5 text-slate-800">{a.message}</div>
                <div className="mt-1 font-mono text-[10px] text-slate-400">
                  {a.type}
                  {a.createdDate && !Number.isNaN(new Date(a.createdDate).getTime()) && (
                    <> · {new Date(a.createdDate).toLocaleString("zh-CN", { hour12: false })}</>
                  )}
                </div>
              </div>
              <button
                onClick={() => void onResolveAlert(a.id)}
                className="shrink-0 rounded-lg border border-amber-300/70 bg-white px-2.5 py-1 text-[11px] font-medium text-amber-700 hover:bg-amber-100"
              >
                标记处理
              </button>
            </div>
          ))}

          {locked.map((l) => (
            <div key={l.username} className="flex items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/50 p-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Unlock size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[13px] font-medium text-slate-800">{l.username}</div>
                <div className="mt-1 text-[11px] text-slate-500">
                  连续失败 {l.failureCount} 次 · 剩余 {Math.ceil(l.remainingSeconds / 60)} 分钟解锁
                </div>
              </div>
              <button
                onClick={() => void onUnlock(l.username)}
                className="shrink-0 rounded-lg border border-red-300/70 bg-white px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100"
              >
                解锁
              </button>
            </div>
          ))}

          {alerts.length > 5 && (
            <p className="px-1 text-[11px] text-slate-400">还有 {alerts.length - 5} 条告警未展示</p>
          )}
        </AdminCard>

        <AdminCard title="运维操作" description="内容变更后先对账，再按需重建向量索引" icon={Database} contentClassName="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => void startSync()}
              disabled={starting !== null || taskId !== null}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-left transition-colors hover:border-accent/30 hover:bg-accent/[0.03] disabled:opacity-60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-accent ring-1 ring-slate-200">
                {starting === "sync" ? <RefreshCw size={14} className="animate-spin" /> : <FolderSync size={14} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-slate-700">同步 docs 内容</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">对账新增 / 更新 / 改名 / 删除</span>
              </span>
              <ArrowRight size={13} className="text-slate-300 group-hover:text-accent" />
            </button>
            <button
              onClick={() => void startRebuild()}
              disabled={starting !== null || taskId !== null}
              className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-accent/30 hover:bg-accent/[0.03] disabled:opacity-60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {starting === "rebuild" ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-medium text-slate-700">重建向量索引</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">全量修复 · 本地嵌入，无 API 成本</span>
              </span>
              <ArrowRight size={13} className="text-slate-300 group-hover:text-accent" />
            </button>
          </div>
          {actionError && <p className="text-[11px] text-red-500">{actionError}</p>}
          <TaskProgress taskId={taskId} title={taskTitle} onDone={onTaskDone} onDismiss={() => setTaskId(null)} />
        </AdminCard>
      </div>

      <section className="mt-7">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-slate-800">功能入口</h2>
            <p className="mt-0.5 text-xs text-slate-400">按运营场景快速进入对应管理模块</p>
          </div>
          <Link href="/admin/eval" className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
            查看评测质量 <ArrowUpRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-[0_12px_30px_-22px_rgba(15,23,42,0.4)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={clsx("flex h-9 w-9 items-center justify-center rounded-xl ring-1", QUICK_TONE[l.tone])}>
                    <Icon size={16} />
                  </span>
                  <ArrowUpRight size={14} className="text-slate-300 transition-colors group-hover:text-accent" />
                </div>
                <div className="mt-3 text-[13px] font-semibold text-slate-800">{l.label}</div>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">{l.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
