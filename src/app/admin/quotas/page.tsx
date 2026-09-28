"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Gauge, Loader2, RotateCw, Search, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { listQuotas, updateUserLimits, type UserQuotaRow } from "@/lib/users";
import { usePagedList } from "@/lib/use-paged-list";

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
    <div className="min-w-[150px]">
      <div className="flex items-baseline gap-1.5 font-mono text-xs">
        <span className={clsx(!unlimited && pct >= 100 ? "text-red-500 font-semibold" : "text-foreground/70")}>
          {used}
        </span>
        <span className="text-foreground/30">/</span>
        <span className="text-foreground/50">{unlimited ? "不限" : limit}</span>
        {custom && <span className="rounded bg-accent/10 px-1 py-px text-[10px] text-accent">自定义</span>}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className={clsx(
            "h-full rounded-full",
            unlimited ? "bg-accent/40" : pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-accent",
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

  /** 单元格编辑按钮 */
  const EditBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="rounded-md px-1.5 py-0.5 text-[11px] text-foreground/40 transition-colors hover:bg-muted hover:text-accent"
    >
      调整
    </button>
  );

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Gauge size={20} />
            配额管理
          </h1>
          <p className="mt-1 text-[13px] text-foreground/50">
            个人知识库（u-用户名）用量与限额一览；公共空间不限量。限额未自定义时跟随全局配置
          </p>
        </div>
        <div className="text-xs text-foreground/40">共 {total} 位用户</div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={onSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索用户名或昵称"
              className="h-8 w-56 rounded-md border border-border bg-muted/40 pl-8 pr-3 text-[13px] outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/70 hover:bg-muted/60"
          >
            搜索
          </button>
        </form>
        <button
          onClick={() => void load(page, fetchPage)}
          className="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[13px] text-foreground/60 hover:bg-muted/60"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
          刷新
        </button>
        {msg && <span className="text-[13px] text-emerald-600">{msg}</span>}
        {error && <span className="text-[13px] text-red-500">{error}</span>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">用户</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">文档数（累计）</th>
                <th className="px-3 py-2 font-medium">检索（当日）</th>
                <th className="px-3 py-2 font-medium">问答（当日）</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-foreground/40">
                    <Loader2 size={16} className="animate-spin" /> 加载中…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-foreground/40">暂无用户</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.userId} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <div className="font-mono">{r.username}</div>
                      {r.nickname && <div className="text-xs text-foreground/40">{r.nickname}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-xs",
                          r.status === "DISABLED" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600",
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[13px] text-foreground/50">
            <span>第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => void load(Math.max(0, page - 1), fetchPage)}
                disabled={page <= 0}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                上一页
              </button>
              <button
                onClick={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
                disabled={page >= totalPages - 1}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 限额编辑弹窗 */}
      {editTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="调整限额"
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold">调整个人库限额 · {editTarget.username}</div>
            <p className="mt-1 text-xs text-foreground/50">
              留空=不变更；0=不限制。清除自定义后恢复跟随系统配置中的全局默认值。
            </p>
            <div className="mt-4 space-y-3">
              {([
                ["doc", docVal, setDocVal, clearDoc, setClearDoc, editTarget.docLimit],
                ["retrieval", retrievalVal, setRetrievalVal, clearRetrieval, setClearRetrieval, editTarget.retrievalLimit],
                ["chat", chatVal, setChatVal, clearChat, setClearChat, editTarget.chatLimit],
              ] as [MetricKey, string, (v: string) => void, boolean, (v: boolean) => void, number][]).map(
                ([key, val, setVal, clear, setClear, current]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-28 text-[13px] text-foreground/60">{METRIC_LABEL[key]}</span>
                    <input
                      type="number"
                      min={0}
                      value={clear ? "" : val}
                      onChange={(e) => setVal(e.target.value)}
                      disabled={clear}
                      placeholder={`当前 ${current}`}
                      className="h-8 w-28 rounded-md border border-border bg-muted/40 px-2 text-[13px] outline-none focus:border-accent disabled:opacity-40"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-foreground/50">
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
                className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/60 hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={() => void onSave()}
                disabled={saving}
                className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-60"
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
