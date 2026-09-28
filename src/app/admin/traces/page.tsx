"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Activity, ChevronDown, ChevronRight, Loader2, RotateCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { listTraces, type RetrievalTraceView } from "@/lib/traces";
import { usePagedList } from "@/lib/use-paged-list";

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
          <Activity size={20} />
          检索诊断
        </h1>
        <p className="mt-1 text-[13px] text-foreground/50">
          每次混合检索的召回明细（向量/关键词/融合/重排），排查「答不好」是检索问题还是生成问题
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-border bg-background p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">空间</span>
          <input
            value={libraryId}
            onChange={(e) => setLibraryId(e.target.value)}
            placeholder="default / u-用户名"
            className="h-8 w-40 rounded-md border border-border bg-background px-2 font-mono text-[13px] outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">用户</span>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            list="trace-user-options"
            placeholder="按用户过滤"
            className="h-8 w-40 rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-accent"
          />
          <datalist id="trace-user-options">
            <option value={user?.username ?? ""} />
          </datalist>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-foreground/50">查询关键字</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            placeholder="匹配原始/检索用查询"
            className="h-8 w-52 rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-accent"
          />
        </label>
        <button
          onClick={onSearch}
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
                <th className="px-3 py-2 font-medium">用户</th>
                <th className="px-3 py-2 font-medium">原始查询</th>
                <th className="px-3 py-2 font-medium">召回（向量/关键词/融合）</th>
                <th className="px-3 py-2 font-medium">重排</th>
                <th className="px-3 py-2 font-medium">返回</th>
                <th className="px-3 py-2 font-medium">耗时</th>
                <th className="px-2 py-2" />
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
                        <td className="px-3 py-2.5 font-mono text-foreground/70">{t.userId || "-"}</td>
                        <td className="max-w-[260px] px-3 py-2.5">
                          <div className="truncate" title={t.originalQuery}>{t.originalQuery}</div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-foreground/70">
                          {t.vectorCount ?? "-"} / {t.keywordCount ?? "-"} / {t.fusedCount ?? "-"}
                        </td>
                        <td className="px-3 py-2.5">
                          <BoolBadge value={t.reranked} onLabel="已重排" offLabel="RRF" />
                        </td>
                        <td className="px-3 py-2.5 font-mono text-foreground/70">{t.resultCount ?? "-"}</td>
                        <td className="px-3 py-2.5 font-mono text-foreground/70">{fmtMs(t.elapsedMs)}</td>
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
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[13px] text-foreground/50">
            <span>第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => void load(Math.max(0, page - 1), fetchPage({ libraryId, userId, keyword }))}
                disabled={page <= 0}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                上一页
              </button>
              <button
                onClick={() => void load(Math.min(totalPages - 1, page + 1), fetchPage({ libraryId, userId, keyword }))}
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
