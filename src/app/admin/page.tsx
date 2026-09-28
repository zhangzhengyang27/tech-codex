"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BellRing,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Unlock,
  FolderSync,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { kbStats, syncDocs, rebuildIndex, type KbStats, type AdminTaskView } from "@/lib/documents";
import { listOpenAlerts, listLockedAccounts, resolveAlert, unlockAccount, type KbAlertItem, type LockedAccountItem } from "@/lib/ops";
import { TaskProgress } from "@/components/admin/task-progress";

const fmtNum = (v: number): string => v.toLocaleString("en-US");

function StatCard({
  label,
  value,
  sub,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "amber" | "red";
  href?: string;
}) {
  const body = (
    <div className="rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent/40">
      <div className="text-[13px] text-foreground/50">{label}</div>
      <div
        className={clsx(
          "mt-1 text-2xl font-semibold tracking-tight font-mono",
          tone === "amber" && "text-amber-600",
          tone === "red" && "text-red-500",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-foreground/40">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

const QUICK_LINKS = [
  { href: "/admin/documents", label: "文档管理", desc: "公共库文档 · 上传 / 同步 / 重建", icon: FileText },
  { href: "/admin/eval", label: "RAG 评测", desc: "Golden Set · A/B 对照 · 趋势", icon: FlaskConical },
  { href: "/admin/feedback", label: "问答反馈", desc: "点赞点踩 · 回流评测用例", icon: MessageSquare },
  { href: "/admin/usage", label: "用量统计", desc: "问答量 · token · Top 用户", icon: BarChart3 },
  { href: "/admin/audit", label: "审计日志", desc: "管理操作留痕查询", icon: ScrollText },
];

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
    void loadStats();
    void loadOps();
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
          <LayoutDashboard size={20} />
          管理总览
        </h1>
        <p className="mt-1 text-[13px] text-foreground/50">
          公共知识库（default 空间）运行状态与常用运维操作
        </p>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {/* 知识库统计 */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard
          label="文档总数"
          value={stats ? fmtNum(stats.totalDocuments) : "…"}
          sub={stats ? `已索引 ${fmtNum(stats.indexedDocuments)}` : undefined}
          href="/admin/documents"
        />
        <StatCard label="分块总数" value={stats ? fmtNum(stats.totalChunks) : "…"} sub="kb_chunk 落库" />
        <StatCard
          label="待索引"
          value={stats ? fmtNum(stats.pendingDocuments) : "…"}
          sub="处理中/排队"
          tone="amber"
        />
        <StatCard
          label="索引失败"
          value={stats ? fmtNum(stats.failedDocuments) : "…"}
          sub={stats && stats.failedDocuments > 0 ? "可在文档管理重试" : "无失败文档"}
          tone={stats && stats.failedDocuments > 0 ? "red" : undefined}
          href="/admin/documents"
        />
        <StatCard label="向量规模" value={stats ? fmtNum(stats.totalVectorCount) : "…"} sub="Redis 索引" />
      </div>

      {/* 运维快捷操作 */}
      <div className="mb-6 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <Database size={15} className="text-accent" />
          运维操作
        </div>
        <p className="mt-1 text-xs text-foreground/40">
          内容变更后执行「docs 同步」对账入库；检索异常或批量更新后可「重建索引」全量修复（本地嵌入，无 API 成本）
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => void startSync()}
            disabled={starting !== null || taskId !== null}
            className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {starting === "sync" ? <RefreshCw size={14} className="animate-spin" /> : <FolderSync size={14} />}
            同步 docs 内容
          </button>
          <button
            onClick={() => void startRebuild()}
            disabled={starting !== null || taskId !== null}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-4 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-muted/60 disabled:opacity-60"
          >
            {starting === "rebuild" ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            重建向量索引
          </button>
          {actionError && <span className="self-center text-[13px] text-red-500">{actionError}</span>}
        </div>
        <TaskProgress taskId={taskId} title={taskTitle} onDone={onTaskDone} onDismiss={() => setTaskId(null)} />
      </div>

      {/* 运营告警与安全 */}
      {(alerts.length > 0 || locked.length > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {alerts.length > 0 && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50/40 p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium text-amber-700">
                <BellRing size={15} />
                未处理告警
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs">{alerts.length}</span>
              </div>
              <div className="mt-2.5 space-y-2.5">
                {alerts.slice(0, 5).map((a) => (
                  <div key={a.id} className="rounded-lg border border-amber-200 bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium">{a.message}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-foreground/40">
                          {a.type}
                          {a.createdDate && !Number.isNaN(new Date(a.createdDate).getTime()) && (
                            <> · {new Date(a.createdDate).toLocaleString("zh-CN", { hour12: false })}</>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => void onResolveAlert(a.id)}
                        className="shrink-0 rounded-md border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100"
                      >
                        标记处理
                      </button>
                    </div>
                  </div>
                ))}
                {alerts.length > 5 && (
                  <p className="text-xs text-foreground/40">还有 {alerts.length - 5} 条未展示</p>
                )}
              </div>
            </div>
          )}
          {locked.length > 0 && (
            <div className="rounded-xl border border-red-300/60 bg-red-50/40 p-4">
              <div className="flex items-center gap-2 text-[13px] font-medium text-red-600">
                <Unlock size={15} />
                登录锁定中的账号
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs">{locked.length}</span>
              </div>
              <div className="mt-2.5 space-y-2">
                {locked.map((l) => (
                  <div key={l.username} className="flex items-center justify-between rounded-lg border border-red-200 bg-background p-2.5">
                    <div className="min-w-0 font-mono text-[13px]">
                      {l.username}
                      <span className="ml-2 text-xs text-foreground/40">
                        失败 {l.failureCount} 次 · 剩余 {Math.ceil(l.remainingSeconds / 60)} 分钟
                      </span>
                    </div>
                    <button
                      onClick={() => void onUnlock(l.username)}
                      className="shrink-0 rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      解锁
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 功能入口 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent/40"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <Icon size={15} className="text-accent" />
                {l.label}
              </div>
              <div className="mt-1 text-xs text-foreground/40">{l.desc}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
