"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Activity, ChevronDown, ChevronRight, Loader2, RotateCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { listTraces, type RetrievalTraceView } from "@/lib/traces";
import { usePagedList } from "@/lib/use-paged-list";
import { AdminCard, AdminPageHeader, adminBtn } from "@/components/admin/admin-ui";

const PAGE_SIZE = 20;

const fmtTime = (iso: string | null): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("zh-CN", { hour12: false });
};

const fmtMs = (ms: number | null): string => {
  if (ms === null) return "-";
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
};

function BoolBadge({ value, onLabel, offLabel }: { value: boolean | null; onLabel: string; offLabel: string }) {
  if (value === null) return <span className="text-foreground/30">-</span>;
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-xs",
        value ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-foreground/50",
      )}
    >
      {value ? onLabel : offLabel}
    </span>
  );
}

export default function AdminTracesPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin, user } = useAuth();
  const hydrated = useHydrated();

  const {
    items: rows, page, totalElements, totalPages, loading, error, load,
  } = usePagedList<RetrievalTraceView>();
  const [libraryId, setLibraryId] = useState("");
  const [userId, setUserId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/traces");
  }, [isLoggedIn, hydrated, router]);

  /** fetchPage 在调用点以回调参数 pg 取页，筛选值经由 makeFetcher 捕获 */
  const fetchPage = useCallback(
    (f: { libraryId: string; userId: string; keyword: string }) =>
      (pg: number) => listTraces(f, pg, PAGE_SIZE),
    [],
  );

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    void load(0, fetchPage({ libraryId: "", userId: "", keyword: "" }));
  }, [load, hydrated, isAdmin, fetchPage]);

  const onSearch = () => {
    void load(0, fetchPage({ libraryId, userId, keyword }));
  };

  if (!hydrated || !isLoggedIn) {
    return <div className="w-full py-16 text-center text-sm text-foreground/40">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert size={36} className="text-foreground/30" />
        <p className="text-sm text-foreground/60">该页面需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={Activity}
        title="检索诊断"
        description="查看每次混合检索的召回明细（向量 / 关键词 / 融合 / 重排），判断「答不好」是检索问题还是生成问题。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              共 {totalElements} 条检索记录
            </span>
            <span>按检索时间倒序</span>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">空间</span>
          <input
            value={libraryId}
            onChange={(e) => setLibraryId(e.target.value)}
            placeholder="default / u-用户名"
            className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50/70 px-3 font-mono text-[12px] outline-none focus:border-accent focus:bg-white"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">用户</span>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            list="trace-user-options"
            placeholder="按用户过滤"
            className="h-9 w-40 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[12px] outline-none focus:border-accent focus:bg-white"
          />
          <datalist id="trace-user-options">
            <option value={user?.username ?? ""} />
          </datalist>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">查询关键字</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="匹配原始 / 检索用查询"
            className="h-9 w-52 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[12px] outline-none focus:border-accent focus:bg-white"
          />
        </label>
        <button
          onClick={onSearch}
          disabled={loading}
          className={adminBtn("primary")}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          查询
        </button>
        {error && <span className="text-[11px] text-red-500">{error}</span>}
      </div>

      <AdminCard
        title="检索明细"
        description="展开任一行查看改写后查询、命中片段与通道状态"
        icon={Activity}
        actions={<span className="rounded-full bg-slate-50 px-2.5 py-1 font-mono text-[10px] text-slate-400">{totalElements} 条</span>}
        contentClassName=""
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[10px] uppercase tracking-[0.06em] text-slate-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">时间</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">用户</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">原始查询</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium"title="召回：向量 / 关键词 / 融合">召回 V / K / F</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">重排</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">返回</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">耗时</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-foreground/40">
                    <Loader2 size={16} className="animate-spin" /> 加载中…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-foreground/40">
                    暂无检索记录（产生一次问答或检索后出现）
                  </td>
                </tr>
              ) : (
                rows.map((t) => {
                  const open = expanded === t.id;
                  return (
                    <Fragment key={t.id}>
                      <tr
                        className="cursor-pointer border-b border-border/60 hover:bg-muted/40"
                        onClick={() => setExpanded(open ? null : t.id)}
                      >
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-foreground/70">
                          {fmtTime(t.createdDate)}
                        </td>
                        <td className="hidden px-3 py-2.5 font-mono text-foreground/70 xl:table-cell">{t.userId || "-"}</td>
                        <td className="max-w-[220px] px-3 py-2.5">
                          <div className="truncate" title={t.originalQuery}>{t.originalQuery}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-foreground/70">
                          {t.vectorCount ?? "-"} / {t.keywordCount ?? "-"} / {t.fusedCount ?? "-"}
                        </td>
                        <td className="hidden px-3 py-2.5 xl:table-cell">
                          <BoolBadge value={t.reranked} onLabel="已重排" offLabel="RRF" />
                        </td>
                        <td className="hidden px-3 py-2.5 font-mono text-foreground/70 xl:table-cell">{t.resultCount ?? "-"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-foreground/70">{fmtMs(t.elapsedMs)}</td>
                        <td className="px-2 py-2.5 text-right text-foreground/40">
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-b border-border/60 bg-muted/30">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="grid gap-3 text-[13px] md:grid-cols-2">
                              <div>
                                <div className="text-xs font-medium text-foreground/40">检索用查询（改写后）</div>
                                <p className="mt-1 break-all text-foreground/80">{t.searchQuery || "-"}</p>
                              </div>
                              <div>
                                <div className="text-xs font-medium text-foreground/40">命中片段（docId#chunk）</div>
                                <p className="mt-1 break-all font-mono text-xs text-foreground/80">
                                  {t.hitSummary || "-"}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-foreground/60">
                                <span>关键词通道：{t.keywordUsed ? "参与" : "未参与"}</span>
                                <span>重排模型：{t.rerankModelAvailable ? "可用" : "不可用（降级）"}</span>
                                <span>空间：{t.libraryId || "-"}</span>
                                {t.pathFilter && <span>目录过滤：{t.pathFilter}</span>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400">
            <span>第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => void load(Math.max(0, page - 1), fetchPage({ libraryId, userId, keyword }))}
                disabled={page <= 0}
                className="rounded-md px-3 py-1 text-[12px] hover:bg-slate-100 disabled:opacity-40"
              >
                上一页
              </button>
              <button
                onClick={() => void load(Math.min(totalPages - 1, page + 1), fetchPage({ libraryId, userId, keyword }))}
                disabled={page >= totalPages - 1}
                className="rounded-md px-3 py-1 text-[12px] hover:bg-slate-100 disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
