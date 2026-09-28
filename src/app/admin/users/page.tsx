"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  KeyRound,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { usePagedList } from "@/lib/use-paged-list";
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Users size={20} />
            用户管理
          </h1>
          <p className="mt-1 text-[13px] text-foreground/50">
            角色变更与禁用即时生效（鉴权层按账号现状校验）；引导管理员受保护不可降级/禁用
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
          {loading ? <Loader2 size={13} className="animate-spin" /> : null}
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
                <th className="px-4 py-2 font-medium">用户名</th>
                <th className="px-3 py-2 font-medium">昵称</th>
                <th className="px-3 py-2 font-medium">角色</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">个人空间</th>
                <th className="px-3 py-2 font-medium">注册时间</th>
                <th className="px-3 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground/40">
                    <Loader2 size={16} className="animate-spin" /> 加载中…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground/40">暂无匹配用户</td>
                </tr>
              ) : (
                users.map((u) => {
                  const self = u.username === user?.username;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                      <td className="px-4 py-2.5 font-mono">
                        {u.username}
                        {self && <span className="ml-1.5 rounded bg-accent/10 px-1.5 py-0.5 text-[11px] text-accent">我</span>}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2.5 text-foreground/70">{u.nickname || "-"}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={clsx(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-muted text-foreground/60",
                          )}
                        >
                          {u.role === "ADMIN" ? "管理员" : "用户"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={clsx(
                            "rounded-full px-2 py-0.5 text-xs",
                            u.status === "DISABLED" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600",
                          )}
                        >
                          {u.status === "DISABLED" ? "已禁用" : "正常"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-foreground/50">{u.libraryId || "-"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-foreground/50">
                        {fmtDate(u.createdDate)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right">
                        <button
                          onClick={() => onToggleRole(u)}
                          disabled={busy || self}
                          title={self ? "不能变更自己的角色" : "变更角色"}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-muted hover:text-foreground disabled:opacity-40"
                        >
                          <ShieldCheck size={13} />
                          {u.role === "ADMIN" ? "降为用户" : "升为管理员"}
                        </button>
                        <button
                          onClick={() => onToggleStatus(u)}
                          disabled={busy || self}
                          title={self ? "不能禁用自己的账号" : u.status === "DISABLED" ? "启用账号" : "禁用账号"}
                          className={clsx(
                            "ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs disabled:opacity-40",
                            u.status === "DISABLED" ? "text-emerald-600 hover:bg-emerald-50" : "text-red-500/80 hover:bg-red-50",
                          )}
                        >
                          {busy ? <Loader2 size={13} className="animate-spin" /> : <UserCog size={13} />}
                          {u.status === "DISABLED" ? "启用" : "禁用"}
                        </button>
                        <button
                          onClick={() => {
                            setPwdTarget(u);
                            setNewPwd("");
                            setError("");
                          }}
                          className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-muted hover:text-foreground"
                        >
                          <KeyRound size={13} />
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
            className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold">重置密码 · {pwdTarget.username}</div>
            <p className="mt-1 text-xs text-foreground/50">为新密码直接生效，无需旧密码；请通过其他渠道告知该用户。</p>
            <input
              type="text"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && newPwd.length >= 8 && onResetPwd()}
              placeholder="新密码（至少 8 位）"
              autoComplete="new-password"
              autoFocus
              className="mt-3 h-9 w-full rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPwdTarget(null)}
                className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/60 hover:bg-muted"
              >
                取消
              </button>
              <button
                onClick={onResetPwd}
                disabled={newPwd.length < 6 || busyId === pwdTarget.id}
                className="h-8 rounded-md bg-accent px-4 text-[13px] font-medium text-white hover:bg-accent/90 disabled:opacity-60"
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
