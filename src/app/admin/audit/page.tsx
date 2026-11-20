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
import { AdminCard, AdminPageHeader, AdminPagination, adminBtn } from "@/components/admin/admin-ui";
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
  const color = action ? ACTION_COLOR[action] : "bg-slate-100 text-slate-500";
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
        icon={ScrollText}
        title="审计日志"
        description="查询管理操作留痕：文档导入、删除、索引重建、配额与系统配置变更。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              共 {totalElements} 条记录
            </span>
            <span>按操作时间倒序</span>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">操作类型</span>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[12px] outline-none transition-colors focus:border-accent focus:bg-white"
          >
            <option value="">全部</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">空间</span>
          <input
            value={libraryId}
            onChange={(e) => setLibraryId(e.target.value)}
            list="audit-library-options"
            placeholder="留空查全部；default / u-用户名"
            className="h-9 w-64 rounded-lg border border-slate-200 bg-slate-50/70 px-3 font-mono text-[12px] outline-none transition-colors focus:border-accent focus:bg-white"
          />
          <datalist id="audit-library-options">
            {librarySuggestions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </label>
        <button onClick={applyFilters} disabled={loading} className={adminBtn("primary")}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          查询
        </button>
        {error && <span className="text-[11px] text-red-500">{error}</span>}
      </div>

      <AdminCard title="操作记录" description="所有管理操作均不可篡改地留痕" icon={ScrollText} contentClassName="">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[10px] uppercase tracking-[0.06em] text-slate-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">时间</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">操作</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">对象</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">操作人</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">空间</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">详情</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 size={16} className="mx-auto mb-2 animate-spin" /> 加载中…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">暂无审计记录</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[11px] text-slate-500">
                      {fmtTime(r.createdDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5"><ActionBadge action={r.action} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">
                      {r.targetType}
                      {r.targetId != null && <span className="font-mono text-slate-400">#{r.targetId}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-slate-600">{r.operator || "-"}</td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 font-mono text-slate-500 xl:table-cell">{r.libraryId || "公共"}</td>
                    <td className="max-w-[240px] px-3 py-2.5 text-slate-500">
                      <div className="truncate" title={r.detail ?? undefined}>{r.detail || "-"}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={PAGE_SIZE}
          unit="条记录"
          loading={loading}
          onPrev={() => void load(Math.max(0, page - 1), fetchPage(action, libraryId))}
          onNext={() => void load(Math.min(totalPages - 1, page + 1), fetchPage(action, libraryId))}
        />
      </AdminCard>
    </div>
  );
}