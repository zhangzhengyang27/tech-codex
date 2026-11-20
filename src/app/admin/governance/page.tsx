"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Copy, Database, FileWarning, Link2, Loader2, RefreshCw, ShieldAlert, UserX } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { timeoutOr } from "@/lib/fetch-helpers";
import {
  governanceIssues,
  governanceSummary,
  updateGovernance,
  type GovernanceIssue,
  type GovernanceIssueType,
  type GovernanceSummary,
} from "@/lib/governance";
import { contentLint, type LintReport } from "@/lib/lint";
import { fetchImportTask, syncGithub, type GitSyncResult, type ImportTask } from "@/lib/sources";
import { AdminCard, AdminEmptyState, AdminMetricCard, AdminPageHeader, adminBtn } from "@/components/admin/admin-ui";

const TYPE_LABEL: Record<GovernanceIssueType, string> = {
  DUPLICATE: "重复内容",
  STALE: "过期未复核",
  MISSING_OWNER: "缺责任人",
  EMPTY_CHUNKS: "空分块",
};

const SEVERITY_CLASS: Record<GovernanceIssue["severity"], string> = {
  HIGH: "border-red-200 bg-red-50 text-red-600",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-600",
  LOW: "border-slate-200 bg-slate-50 text-slate-500",
};

const fmtDate = (v: string | null): string => (v ? new Date(v).toLocaleDateString("zh-CN") : "-");

export default function AdminGovernancePage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);
  const [issues, setIssues] = useState<GovernanceIssue[]>([]);
  const [type, setType] = useState<GovernanceIssueType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<GovernanceIssue | null>(null);
  const [owner, setOwner] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [lint, setLint] = useState<LintReport | null>(null);
  const [lintLoading, setLintLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [repoUrl, setRepoUrl] = useState("https://github.com/zhangzhengyang27/tech-codex");
  const [branch, setBranch] = useState("main");
  const [repoPath, setRepoPath] = useState("docs");
  const [syncResult, setSyncResult] = useState<GitSyncResult | null>(null);
  const [syncTask, setSyncTask] = useState<ImportTask | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/governance");
  }, [isLoggedIn, hydrated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [s, list] = await Promise.all([governanceSummary(180), governanceIssues(type || undefined, 180)]);
      setSummary(s);
      setIssues(list);
    } catch (e) {
      setError(timeoutOr(e, e instanceof Error ? e.message : "治理数据加载失败"));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, hydrated, isAdmin]);

  const runLint = async () => {
    setLintLoading(true);
    setError("");
    try {
      setLint(await contentLint(200));
    } catch (e) {
      setError(e instanceof Error ? e.message : "内容 Lint 失败");
    } finally {
      setLintLoading(false);
    }
  };

  const copyPrSummary = async () => {
    if (!lint) return;
    await navigator.clipboard.writeText(lint.prSummary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const runSync = async () => {
    setSyncLoading(true);
    setError("");
    try {
      const result = await syncGithub(repoUrl, branch, repoPath);
      setSyncResult(result);
      setSyncTask(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "GitHub 同步失败");
    } finally {
      setSyncLoading(false);
    }
  };

  const refreshSyncTask = async () => {
    if (!syncResult) return;
    try {
      setSyncTask(await fetchImportTask(syncResult.taskId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "任务查询失败");
    }
  };

  const openEdit = (issue: GovernanceIssue) => {
    setEditing(issue);
    setOwner(issue.owner ?? "");
    setDue(issue.reviewDueDate ? issue.reviewDueDate.slice(0, 10) : "");
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await updateGovernance(editing.docId, owner, due);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || !isLoggedIn) return <div className="w-full py-16 text-center text-sm text-slate-400">加载中…</div>;
  if (!isAdmin) return <div className="flex w-full flex-col items-center gap-3 py-16 text-center"><ShieldAlert size={36} className="text-slate-300" /><p className="text-sm text-slate-500">该页面需要管理员权限</p></div>;

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={ShieldAlert}
        title="知识治理中心"
        description="重复 / 过期 / 责任人 / 空分块体检；治理结果进入周报，不再靠人工抽查。"
        meta={<><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-blue-500" />公共库 default</span><span>过期口径 180 天</span></>}
        actions={<button onClick={() => void load()} disabled={loading} className={adminBtn("secondary")}>{loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}重新扫描</button>}
      />
      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}
      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <AdminMetricCard label="平均健康分" value={summary.avgHealthScore.toFixed(1)} hint={`${summary.totalDocuments} 篇文档`} icon={CheckCircle2} tone={summary.avgHealthScore >= 80 ? "emerald" : "amber"} />
          <AdminMetricCard label="重复文档" value={String(summary.duplicateDocuments)} hint={`${summary.duplicateGroups.length} 组`} icon={FileWarning} tone={summary.duplicateDocuments ? "amber" : "emerald"} />
          <AdminMetricCard label="过期未复核" value={String(summary.staleDocuments)} hint="超过 180 天" icon={AlertTriangle} tone={summary.staleDocuments ? "red" : "emerald"} />
          <AdminMetricCard label="缺责任人" value={String(summary.missingOwnerDocuments)} hint="无人认领" icon={UserX} tone={summary.missingOwnerDocuments ? "amber" : "emerald"} />
          <AdminMetricCard label="空分块" value={String(summary.emptyChunkDocuments)} hint="检索不可达" icon={Database} tone={summary.emptyChunkDocuments ? "red" : "emerald"} />
        </div>
      )}
      <div className="mt-5">
        <AdminCard title="GitHub 增量同步" description="浅克隆或 fetch 更新仓库，再按相对路径增量索引；只同步 Markdown，不自动改仓库。" icon={Database}>
          <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,2fr)_120px_minmax(0,1fr)_auto]">
            <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} placeholder="https://github.com/owner/repo" className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-[12px] outline-none focus:border-accent" />
            <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-[12px] outline-none focus:border-accent" />
            <input value={repoPath} onChange={(e) => setRepoPath(e.target.value)} placeholder="docs（仓库内子目录）" className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-[12px] outline-none focus:border-accent" />
            <button onClick={() => void runSync()} disabled={syncLoading} className={adminBtn("primary")}>{syncLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}同步</button>
          </div>
          {syncResult && (
            <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span>任务 <span className="font-mono text-slate-700">{syncResult.taskId}</span></span>
                <span>目录 <span className="font-mono text-slate-700">{syncResult.localPath}</span></span>
                <button onClick={() => void refreshSyncTask()} className="text-accent hover:underline">刷新任务状态</button>
              </div>
              {syncTask && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>状态 <span className={syncTask.status === "DONE" ? "text-emerald-600" : "text-amber-600"}>{syncTask.status}</span></span>
                  <span>进度 <span className="font-mono">{syncTask.processed}/{syncTask.total}</span></span>
                  <span>成功 <span className="font-mono text-emerald-600">{syncTask.succeeded}</span></span>
                  <span>失败 <span className="font-mono text-red-500">{syncTask.failed}</span></span>
                </div>
              )}
              {syncTask && syncTask.errors.length > 0 && <p className="mt-2 text-red-500">{syncTask.errors.slice(0, 3).join("；")}</p>}
            </div>
          )}
        </AdminCard>
      </div>
      <div className="mt-5">
        <AdminCard
          title="内容 Lint"
          description="扫描相对链接断链与同名标题；只产出修复清单，不自动改文档。"
          icon={Link2}
          actions={<button onClick={() => void runLint()} disabled={lintLoading} className={adminBtn("secondary")}>{lintLoading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}跑全站 Lint</button>}
        >
          {!lint ? (
            <div className="px-4 py-6 text-[12px] text-slate-400">尚未扫描。点右上角“跑全站 Lint”，约数秒完成 4,000+ 篇文档。</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-4 md:grid-cols-4">
                {[
                  ["扫描文档", lint.docCount, "篇"],
                  ["相对链接", lint.linkCount, "个"],
                  ["断链", lint.brokenLinkCount, "个"],
                  ["同名标题", lint.duplicateTitleCount, "篇"],
                ].map(([label, value, unit]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5">
                    <div className="text-[10px] text-slate-400">{label}</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-slate-800">{String(value)}<span className="ml-1 text-[10px] font-normal text-slate-400">{unit}</span></div>
                  </div>
                ))}
              </div>
              {lint.issues.length === 0 ? (
                <AdminEmptyState icon={CheckCircle2} title="没有发现断链或同名标题" description="当前公共库内容 Lint 全部通过。" compact />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-[12px]">
                    <thead><tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[10px] uppercase tracking-[0.06em] text-slate-400">
                      <th className="px-4 py-2.5 font-medium">文档</th><th className="px-3 py-2.5 font-medium">问题</th><th className="px-3 py-2.5 font-medium">修复建议</th>
                    </tr></thead>
                    <tbody>{lint.issues.slice(0, 20).map((issue) => (
                      <tr key={`${issue.docId}-${issue.type}-${issue.detail}`} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                        <td className="max-w-[300px] px-4 py-2.5"><div className="truncate font-medium text-slate-700" title={issue.title}>{issue.title}</div><div className="truncate text-[10px] text-slate-400" title={issue.filePath}>{issue.filePath}</div></td>
                        <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] ${issue.type === "BROKEN_LINK" ? "border-red-200 bg-red-50 text-red-600" : "border-amber-200 bg-amber-50 text-amber-600"}`}>{issue.type === "BROKEN_LINK" ? "断链" : "同名标题"}</span><div className="mt-1 max-w-[260px] text-[10px] text-slate-400">{issue.detail}</div></td>
                        <td className="max-w-[300px] px-3 py-2.5 text-[11px] text-slate-500">{issue.suggestion}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                  {lint.issues.length > 20 && <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">仅展示前 20 条，完整清单可复制下方 PR 建议。</p>}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
                <p className="text-[10px] text-slate-400">扫描于 {new Date(lint.scannedAt).toLocaleString("zh-CN")} · 仅提示，不自动提交</p>
                <button onClick={() => void copyPrSummary()} className={adminBtn("secondary")}>{copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}{copied ? "已复制" : "复制 PR 建议"}</button>
              </div>
            </>
          )}
        </AdminCard>
      </div>
      <div className="mt-5">
        <AdminCard title="治理问题"
 description={`${issues.length >= 300 ? "最多 300" : issues.length} 条 · 按健康分升序，最差的先出`} icon={AlertTriangle} contentClassName="">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
            {([["", "全部"], ["DUPLICATE", "重复"], ["STALE", "过期"], ["MISSING_OWNER", "缺责任人"], ["EMPTY_CHUNKS", "空分块"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setType(k)} className={type === k ? adminBtn("primary") : adminBtn("secondary")}>{label}</button>
            ))}
          </div>
          {loading && issues.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-[12px] text-slate-400"><Loader2 size={15} className="animate-spin" />扫描中…</div>
          ) : issues.length === 0 ? (
            <AdminEmptyState icon={CheckCircle2} title="没有发现治理问题" description="当前筛选下全部通过。" compact />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-[12px]">
                <thead><tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[10px] uppercase tracking-[0.06em] text-slate-400">
                  <th className="px-4 py-2.5 font-medium">文档</th><th className="px-3 py-2.5 font-medium">问题</th><th className="px-3 py-2.5 font-medium">责任人</th><th className="px-3 py-2.5 font-medium">复核日期</th><th className="px-3 py-2.5 font-medium">健康分</th><th className="px-3 py-2.5 text-right font-medium">操作</th>
                </tr></thead>
                <tbody>{issues.map((issue) => (
                  <tr key={`${issue.docId}-${issue.type}`} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[320px] px-4 py-2.5"><div className="truncate font-medium text-slate-700" title={issue.title}>{issue.title}</div><div className="truncate text-[10px] text-slate-400" title={issue.filePath}>{issue.filePath}</div></td>
                    <td className="px-3 py-2.5"><span className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] ${SEVERITY_CLASS[issue.severity]}`}>{TYPE_LABEL[issue.type]}</span><div className="mt-1 max-w-[240px] text-[10px] text-slate-400">{issue.detail}</div></td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">{issue.owner || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-500">{fmtDate(issue.reviewDueDate)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono font-medium text-slate-700">{issue.healthScore}</td>
                    <td className="px-3 py-2.5 text-right"><button onClick={() => openEdit(issue)} className="text-[11px] text-accent hover:underline">设置责任人</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-slate-800">设置治理信息</h3>
            <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">{editing.title}</p>
            <label className="mt-4 block text-[11px] text-slate-500">责任人</label>
            <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="如 张三 / frontend-team" className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-accent" />
            <label className="mt-3 block text-[11px] text-slate-500">下次复核日期</label>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-[12px] outline-none focus:border-accent" />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className={adminBtn("secondary")}>取消</button>
              <button onClick={() => void save()} disabled={saving} className={adminBtn("primary")}>{saving ? <Loader2 size={14} className="animate-spin" /> : null}保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
