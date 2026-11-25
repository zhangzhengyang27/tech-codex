"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Gauge, Loader2, RotateCw, Search, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { listQuotas, updateUserLimits, type UserQuotaRow } from "@/lib/users";
import { usePagedList } from "@/lib/use-paged-list";
import { AdminCard, AdminPageHeader, AdminPagination, adminBtn } from "@/components/admin/admin-ui";
import { Field } from "@/components/ui/field";

const PAGE_SIZE = 20;

type MetricKey = "doc" | "retrieval" | "chat";

const METRIC_LABEL: Record<MetricKey, string> = {
  doc: "文档数（累计）",
  retrieval: "检索（当日）",
  chat: "问答（当日）",
};

/** 用量条：达到 100% 标红；limit=0 视为不限量。 */
function UsageBar({ used, limit, custom }: { used: number; limit: number; custom: boolean }) {
  const unlimited = limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="min-w-[128px]">
      <div className="flex items-baseline gap-1.5 font-mono text-xs">
        <span className={clsx(!unlimited && pct >= 100 ? "text-red-500 font-semibold" : "text-slate-700")}>
          {used}
        </span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">{unlimited ? "不限" : limit}</span>
        {custom && <span className="rounded bg-blue-50 px-1 py-px text-3xs font-medium text-accent ring-1 ring-blue-100">自定义</span>}
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx(
            "h-full rounded-full",
            unlimited ? "bg-slate-300" : pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-accent",
          )}
          style={{ width: unlimited ? "100%" : `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminQuotasPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();

  const {
    items: rows, page, totalElements: total, totalPages, loading, error, load,
  } = usePagedList<UserQuotaRow>();
  const [keyword, setKeyword] = useState("");
  const [msg, setMsg] = useState("");

  // 限额编辑弹窗：三输入框语义——留空=不变更，勾选"跟随默认"=清除覆盖
  const [editTarget, setEditTarget] = useState<UserQuotaRow | null>(null);
  const [docVal, setDocVal] = useState("");
  const [retrievalVal, setRetrievalVal] = useState("");
  const [chatVal, setChatVal] = useState("");
  const [clearDoc, setClearDoc] = useState(false);
  const [clearRetrieval, setClearRetrieval] = useState(false);
  const [clearChat, setClearChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/quotas");
  }, [isLoggedIn, hydrated, router]);

  const fetchPage = useCallback(
    (pg: number) => listQuotas(keyword || undefined, pg, PAGE_SIZE),
    [keyword],
  );

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    // 仅挂载首载（keyword 初始为空）；筛选变化由「搜索」按钮显式触发，避免逐键请求
    void load(0, () => listQuotas(undefined, 0, PAGE_SIZE));
  }, [load, hydrated, isAdmin]);

  const openEdit = (u: UserQuotaRow) => {
    setEditTarget(u);
    setDocVal(u.docLimitCustom ? String(u.docLimit) : "");
    setRetrievalVal(u.retrievalLimitCustom ? String(u.retrievalLimit) : "");
    setChatVal(u.chatLimitCustom ? String(u.chatLimit) : "");
    setClearDoc(false);
    setClearRetrieval(false);
    setClearChat(false);
    setEditError("");
  };

  const parseVal = (raw: string, clear: boolean): number | undefined => {
    if (clear) return -1;
    if (raw.trim() === "") return undefined;
    const n = Number(raw.trim());
    if (!Number.isFinite(n) || n < 0) throw new Error("限额须为非负整数（0=不限制）");
    return Math.round(n);
  };

  const onSave = async () => {
    if (!editTarget) return;
    setEditError("");
    let body: { docLimit?: number; retrievalLimit?: number; chatLimit?: number };
    try {
      body = {
        docLimit: parseVal(docVal, clearDoc),
        retrievalLimit: parseVal(retrievalVal, clearRetrieval),
        chatLimit: parseVal(chatVal, clearChat),
      };
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "参数错误");
      return;
    }
    if (body.docLimit === undefined && body.retrievalLimit === undefined && body.chatLimit === undefined) {
      setEditError("请至少填写一项（留空=不变更）");
      return;
    }
    setSaving(true);
    try {
      await updateUserLimits(editTarget.userId, body);
      setMsg(`已更新 ${editTarget.username} 的个人库限额`);
      setEditTarget(null);
      void load(page, fetchPage);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  // 限额编辑弹窗支持 Esc 关闭
  useEffect(() => {
    if (!editTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editTarget]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(0, fetchPage);
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

  /** 单元格编辑按钮 */
  const EditBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="whitespace-nowrap rounded-md px-1.5 py-0.5 text-2xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-accent"
    >
      调整
    </button>
  );

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={Gauge}
        title="配额管理"
        description="查看个人知识库（u-用户名）的文档、检索与问答用量；公共空间不限量，限额未自定义时跟随全局配置。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-caption text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              共 {total} 位用户
            </span>
            <span>用量按当日 / 累计口径统计</span>
          </>
        }
        actions={
          <button onClick={() => void load(page, fetchPage)} className={adminBtn("secondary")}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
            刷新
          </button>
        }
      />

      <AdminCard title="用户配额" description="按用户查看额度使用率，支持调整个人上限" icon={Gauge} contentClassName="">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <form onSubmit={onSearch} className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索用户名或昵称"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-compact outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/25"
              />
            </div>
            <button type="submit" className={adminBtn("secondary", "sm")}>搜索</button>
          </form>
          {msg && <span className="text-caption text-emerald-600">{msg}</span>}
          {error && <span className="text-caption text-red-500">{error}</span>}
          <span className="ml-auto rounded-full bg-slate-50 px-2.5 py-1 font-mono text-2xs text-slate-400">{total} 位</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-2xs uppercase tracking-[0.06em] text-slate-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">用户</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">账号</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">文档数（累计）</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">检索（当日）</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">问答（当日）</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 size={16} className="animate-spin" /> 加载中…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">暂无用户</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.userId} className="border-b border-slate-100/80 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", r.status === "DISABLED" ? "bg-red-500" : "bg-emerald-500")} title={r.status === "DISABLED" ? "已禁用" : "正常"} />
                        <span className="truncate font-mono text-xs font-medium text-slate-700">{r.username}</span>
                      </div>
                      {r.nickname && <div className="mt-0.5 truncate pl-3 text-2xs text-slate-400">{r.nickname}</div>}
                    </td>
                    <td className="hidden px-3 py-2.5 xl:table-cell">
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-2xs font-medium ring-1",
                          r.status === "DISABLED" ? "bg-red-50 text-red-600 ring-red-100" : "bg-emerald-50 text-emerald-600 ring-emerald-100",
                        )}
                      >
                        {r.status === "DISABLED" ? "已禁用" : "正常"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <UsageBar used={r.docUsed} limit={r.docLimit} custom={r.docLimitCustom} />
                        <EditBtn onClick={() => openEdit(r)} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <UsageBar used={r.retrievalUsed} limit={r.retrievalLimit} custom={r.retrievalLimitCustom} />
                        <EditBtn onClick={() => openEdit(r)} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <UsageBar used={r.chatUsed} limit={r.chatLimit} custom={r.chatLimitCustom} />
                        <EditBtn onClick={() => openEdit(r)} />
                      </div>
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
          totalElements={total}
          pageSize={PAGE_SIZE}
          unit="位用户"
          loading={loading}
          onPrev={() => void load(Math.max(0, page - 1), fetchPage)}
          onNext={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
        />
      </AdminCard>

      {/* 限额编辑弹窗 */}
      {editTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={() => setEditTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="调整限额"
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.55)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold text-slate-800">调整个人库限额 · <span className="font-mono text-xs text-slate-500">{editTarget.username}</span></div>
            <p className="mt-1 text-caption leading-5 text-slate-400">
              留空=不变更；0=不限制。清除自定义后恢复跟随系统配置中的全局默认值。
            </p>
            <div className="mt-4 space-y-3">
              {([
                ["doc", docVal, setDocVal, clearDoc, setClearDoc, editTarget.docLimit],
                ["retrieval", retrievalVal, setRetrievalVal, clearRetrieval, setClearRetrieval, editTarget.retrievalLimit],
                ["chat", chatVal, setChatVal, clearChat, setClearChat, editTarget.chatLimit],
              ] as [MetricKey, string, (v: string) => void, boolean, (v: boolean) => void, number][]).map(
                ([key, val, setVal, clear, setClear, current]) => (
                  <div key={key} className="flex items-end gap-3">
                    <Field
                      size="sm"
                      label={METRIC_LABEL[key]}
                      htmlFor={`quota-${key}`}
                      className="flex-1"
                    >
                      <input
                        id={`quota-${key}`}
                        type="number"
                        min={0}
                        value={clear ? "" : val}
                        onChange={(e) => setVal(e.target.value)}
                        disabled={clear}
                        placeholder={`当前 ${current}`}
                        className="h-9 w-32 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 font-mono text-xs outline-none transition-colors focus:border-accent focus:bg-white disabled:opacity-40"
                      />
                    </Field>
                    <label className="mb-0.5 flex items-center gap-1.5 text-caption text-slate-500">
                      <input type="checkbox" checked={clear} onChange={(e) => setClear(e.target.checked)} />
                      跟随默认
                    </label>
                  </div>
                ),
              )}
            </div>
            {editError && <p className="mt-3 text-xs text-red-500">{editError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditTarget(null)}
                className={adminBtn("secondary", "sm")}
              >
                取消
              </button>
              <button
                onClick={() => void onSave()}
                disabled={saving}
                className={adminBtn("primary", "sm")}
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
