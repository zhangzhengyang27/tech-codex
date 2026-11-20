"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  KeyRound,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { usePagedList } from "@/lib/use-paged-list";
import { AdminCard, AdminPageHeader, AdminPagination, adminBtn } from "@/components/admin/admin-ui";
import {
  listUsers,
  updateUserRole,
  updateUserStatus,
  resetUserPassword,
  type UserView,
} from "@/lib/users";

const PAGE_SIZE = 20;

const fmtDate = (v: string | null): string => {
  if (!v) return "-";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "-" : d.toLocaleString("zh-CN", { hour12: false });
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin, user } = useAuth();
  const hydrated = useHydrated();

  const {
    items: users, page, totalElements: total, totalPages, loading, error, setError, load,
  } = usePagedList<UserView>();
  const [keyword, setKeyword] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pwdTarget, setPwdTarget] = useState<UserView | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/users");
  }, [isLoggedIn, hydrated, router]);

  const fetchPage = useCallback(
    (pg: number) => listUsers(keyword || undefined, pg, PAGE_SIZE),
    [keyword],
  );

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    // 仅挂载首载（keyword 初始为空）；筛选变化由「搜索」按钮显式触发，避免逐键请求
    void load(0, () => listUsers(undefined, 0, PAGE_SIZE));
  }, [load, hydrated, isAdmin]);

  /** 变更操作统一入口：busy 状态 + 失败展示 + 成功刷新 */
  const act = async (u: UserView, fn: () => Promise<unknown>, okMsg: string) => {
    setBusyId(u.id);
    setError("");
    setMsg("");
    try {
      await fn();
      setMsg(okMsg);
      void load(page, fetchPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  };

  const onToggleRole = (u: UserView) => {
    const to = u.role === "ADMIN" ? "USER" : "ADMIN";
    if (!window.confirm(`确定将用户「${u.username}」的角色变更为 ${to === "ADMIN" ? "管理员" : "普通用户"}？`)) return;
    void act(u, () => updateUserRole(u.id, to), `已将 ${u.username} 角色变更为 ${to}`);
  };

  const onToggleStatus = (u: UserView) => {
    const to = u.status === "DISABLED" ? "ACTIVE" : "DISABLED";
    if (to === "DISABLED" && !window.confirm(`确定禁用「${u.username}」？禁用后该用户无法登录，既有登录立即失效。`)) return;
    void act(u, () => updateUserStatus(u.id, to), to === "DISABLED" ? `已禁用 ${u.username}` : `已启用 ${u.username}`);
  };

  const onResetPwd = () => {
    if (!pwdTarget) return;
    if (newPwd.length < 8) {
      setError("新密码长度至少 8 位");
      return;
    }
    const target = pwdTarget;
    void act(target, () => resetUserPassword(target.id, newPwd), `已重置 ${target.username} 的密码`);
    setPwdTarget(null);
    setNewPwd("");
  };

  // 重置密码弹窗支持 Esc 关闭
  useEffect(() => {
    if (!pwdTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPwdTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pwdTarget]);

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

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={Users}
        title="用户管理"
        description="管理账号角色、启用状态和密码；角色变更与禁用即时生效，引导管理员受保护不可降级或禁用。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              共 {total} 位用户
            </span>
            <span>所有变更写入审计日志</span>
          </>
        }
        actions={
          <button onClick={() => void load(page, fetchPage)} className={adminBtn("secondary")}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            刷新
          </button>
        }
      />

      <AdminCard title="账号列表" description="用户名、角色与账号状态" icon={Users} contentClassName="">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <form onSubmit={onSearch} className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索用户名或昵称"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/25"
              />
            </div>
            <button type="submit" className={adminBtn("secondary", "sm")}>搜索</button>
          </form>
          {msg && <span className="text-[11px] text-emerald-600">{msg}</span>}
          {error && <span className="text-[11px] text-red-500">{error}</span>}
          <span className="ml-auto rounded-full bg-slate-50 px-2.5 py-1 font-mono text-[10px] text-slate-400">
            {total} 个账号
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] uppercase tracking-[0.06em] text-slate-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">用户名</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">昵称</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">角色</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">状态</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">个人空间</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">注册时间</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    <Loader2 size={16} className="mx-auto mb-2 animate-spin" /> 加载中…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center">
                    <Users size={22} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-[13px] text-slate-500">暂无匹配用户</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const self = u.username === user?.username;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className="border-b border-slate-100/80 last:border-b-0 hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-[10px] font-semibold uppercase text-slate-500">
                            {u.username.slice(0, 1)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-mono text-[12px] font-medium text-slate-700">{u.username}</div>
                            {self && <div className="mt-0.5 text-[10px] text-accent">当前账号</div>}
                          </div>
                        </div>
                      </td>
                      <td className="hidden max-w-[140px] truncate px-3 py-3 text-slate-500 xl:table-cell">{u.nickname || "-"}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={clsx(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                            u.role === "ADMIN" ? "bg-violet-50 text-violet-600 ring-violet-100" : "bg-slate-100 text-slate-500 ring-slate-200",
                          )}
                        >
                          {u.role === "ADMIN" ? "管理员" : "用户"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1",
                            u.status === "DISABLED" ? "bg-red-50 text-red-600 ring-red-100" : "bg-emerald-50 text-emerald-600 ring-emerald-100",
                          )}
                        >
                          <span className={clsx("h-1.5 w-1.5 rounded-full", u.status === "DISABLED" ? "bg-red-500" : "bg-emerald-500")} />
                          {u.status === "DISABLED" ? "已禁用" : "正常"}
                        </span>
                      </td>
                      <td className="hidden px-3 py-3 font-mono text-[11px] text-slate-400 xl:table-cell">{u.libraryId || "-"}</td>
                      <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-[11px] text-slate-400 xl:table-cell">
                        {fmtDate(u.createdDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <button
                          onClick={() => onToggleRole(u)}
                          disabled={busy || self}
                          title={self ? "不能变更自己的角色" : "变更角色"}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                        >
                          <ShieldCheck size={12} />
                          {u.role === "ADMIN" ? "降为用户" : "升为管理员"}
                        </button>
                        <button
                          onClick={() => onToggleStatus(u)}
                          disabled={busy || self}
                          title={self ? "不能禁用自己的账号" : u.status === "DISABLED" ? "启用账号" : "禁用账号"}
                          className={clsx(
                            "ml-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] disabled:opacity-40",
                            u.status === "DISABLED" ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500/80 hover:bg-red-50",
                          )}
                        >
                          {busy ? <Loader2 size={12} className="animate-spin" /> : <UserCog size={12} />}
                          {u.status === "DISABLED" ? "启用" : "禁用"}
                        </button>
                        <button
                          onClick={() => {
                            setPwdTarget(u);
                            setNewPwd("");
                            setError("");
                          }}
                          className="ml-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <KeyRound size={12} />
                          重置密码
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalElements={total}
          pageSize={PAGE_SIZE}
          unit="个账号"
          loading={loading}
          onPrev={() => void load(Math.max(0, page - 1), fetchPage)}
          onNext={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
        />
      </AdminCard>

      {/* 重置密码弹窗 */}
      {pwdTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPwdTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label="重置密码"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
              <KeyRound size={15} className="text-accent" /> 重置密码 · {pwdTarget.username}
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-400">新密码直接生效，无需旧密码；请通过其他渠道告知该用户。</p>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newPwd.length >= 8 && onResetPwd()}
              placeholder="新密码（至少 8 位）"
              autoComplete="new-password"
              autoFocus
              className="mt-4 h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[13px] outline-none focus:border-accent focus:bg-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPwdTarget(null)}
                className={adminBtn("secondary", "sm")}
              >
                取消
              </button>
              <button
                onClick={onResetPwd}
                disabled={newPwd.length < 8 || busyId === pwdTarget.id}
                className={adminBtn("primary", "sm")}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
