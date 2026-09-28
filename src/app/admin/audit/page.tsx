"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ScrollText, Loader2, ShieldAlert, RotateCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  listAuditLogs,
  auditActionLabel,
  AUDIT_ACTIONS,
  type AuditLogView,
} from "@/lib/audit";
import { usePagedList } from "@/lib/use-paged-list";
const PAGE_SIZE = 20;

const fmtTime = (iso: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("zh-CN", { hour12: false });
};

const ACTION_COLOR: Record<string, string> = {
  UPLOAD: "bg-blue-100 text-blue-700",
  IMPORT_URL: "bg-cyan-100 text-cyan-700",
  IMPORT_DIR: "bg-teal-100 text-teal-700",
  DELETE: "bg-red-100 text-red-600",
  REBUILD_INDEX: "bg-amber-100 text-amber-700",
  REINDEX: "bg-orange-100 text-orange-700",
  DOCS_SYNC: "bg-lime-100 text-lime-700",
  USER_ROLE: "bg-violet-100 text-violet-700",
  USER_STATUS: "bg-rose-100 text-rose-700",
  USER_RESET_PWD: "bg-fuchsia-100 text-fuchsia-700",
  UPDATE_QUOTA: "bg-purple-100 text-purple-700",
  EDIT: "bg-indigo-100 text-indigo-700",
  CONFIG_UPDATE: "bg-slate-200 text-slate-700",
  ALERT_RESOLVE: "bg-lime-100 text-lime-700",
  USER_UNLOCK: "bg-emerald-100 text-emerald-700",
};

function ActionBadge({ action }: { action: string | null }) {
  const color = action ? ACTION_COLOR[action] : "bg-muted text-foreground/50";
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", color)}>
      {auditActionLabel(action)}
    </span>
  );
}

/* ---------- 页面 ---------- */

export default function AdminAuditPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin, user } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const {
    items: rows, page, totalElements, totalPages, loading, error, load,
  } = usePagedList<AuditLogView>();
  const [action, setAction] = useState("");
  const [libraryId, setLibraryId] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/audit");
  }, [isLoggedIn, hydrated, router]);

  const fetchPage = useCallback(
    (act: string, lib: string) =>
      (pg: number) => listAuditLogs(pg, PAGE_SIZE, act || undefined, lib || undefined),
    [],
  );

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    void load(0, fetchPage("", ""));
  }, [load, hydrated, isAdmin, fetchPage]);

  const applyFilters = () => {
    void load(0, fetchPage(action, libraryId));
  };

  /** 空间过滤候选：公共空间 + 当前管理员个人空间 */
  const librarySuggestions = ["default", `u-${user?.username ?? ""}`].filter((v) => v !== "u-");

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
          <ScrollText size={20} />
          审计日志
        </h1>
        <p className="mt-1 text-[13px] text-foreground/50">
          管理操作留痕：导入 / 删除 / 重建索引 / 配额变更
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-background p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">操作类型</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-8 w-40 rounded-md border border-border bg-background px-2 text-[13px] outline-none transition-colors focus:border-accent"
          >
            <option value="">全部</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">空间（留空查全部；公共 default，个人 u-用户名）</span>
          <input
            value={libraryId}
            onChange={(e) => setLibraryId(e.target.value)}
            list="audit-library-options"
            placeholder="全部空间"
            className="h-8 w-56 rounded-md border border-border bg-background px-2 font-mono text-[13px] outline-none transition-colors focus:border-accent"
          />
          <datalist id="audit-library-options">
            {librarySuggestions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <button
          onClick={applyFilters}
          disabled={loading}
          className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          查询
        </button>
        {error && <span className="text-[13px] text-red-500">{error}</span>}
        <span className="ml-auto text-xs text-foreground/40">共 {totalElements} 条</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">操作</th>
                <th className="px-3 py-2 font-medium">对象</th>
                <th className="px-3 py-2 font-medium">操作人</th>
                <th className="px-3 py-2 font-medium">空间</th>
                <th className="px-3 py-2 font-medium">详情</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-foreground/40">
                    <Loader2 size={16} className="animate-spin" /> 加载中…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-foreground/40">暂无审计记录</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground/70">
                      {fmtTime(r.createdDate)}
                    </td>
                    <td className="px-3 py-2.5"><ActionBadge action={r.action} /></td>
                    <td className="px-3 py-2.5 text-foreground/70">
                      {r.targetType}
                      {r.targetId != null && <span className="font-mono text-foreground/50">#{r.targetId}</span>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-foreground/70">{r.operator || "-"}</td>
                    <td className="px-3 py-2.5 font-mono text-foreground/70">{r.libraryId || "公共"}</td>
                    <td className="max-w-[360px] px-3 py-2.5">
                      <div className="truncate" title={r.detail ?? undefined}>{r.detail || "-"}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[13px] text-foreground/50">
            <span>第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => void load(Math.max(0, page - 1), fetchPage(action, libraryId))}
                disabled={page <= 0}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                上一页
              </button>
              <button
                onClick={() => void load(Math.min(totalPages - 1, page + 1), fetchPage(action, libraryId))}
                disabled={page >= totalPages - 1}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}