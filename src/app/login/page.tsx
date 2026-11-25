"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiLogin, apiRegister } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

/** 登录后跳转目标白名单：仅允许站内路径，防 open redirect。
 *  拒绝绝对 URL、协议相对 URL（//）、含反斜杠的值（\ 会被部分浏览器/代理按 / 归一化
 *  绕过 startsWith 校验，如 /\evil.com）；再用 new URL 规范化兜底校验同源。 */
function safeFrom(raw: string): string {
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/ai";
  try {
    if (typeof window !== "undefined") {
      const resolved = new URL(raw, window.location.origin);
      if (resolved.origin !== window.location.origin) return "/ai";
    }
  } catch {
    return "/ai";
  }
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = safeFrom(searchParams.get("from") || "/ai");
  const { isLoggedIn, user, setAuth, logout } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  /** 已登录时点击"切换账号"才展开表单：默认停留在账号面板，
   *  避免"已登录"与"请登录"两种语义同屏出现。 */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    nickname: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // 注册侧客户端校验（与管理端密码门槛一致：≥8 位；昵称去首尾空白）
    const username = form.username.trim();
    const nickname = form.nickname.trim();
    if (mode === "register") {
      if (!username) {
        setError("用户名不能为空");
        return;
      }
      if (form.password.length < 8) {
        setError("密码长度至少 8 位");
        return;
      }
    }
    setBusy(true);
    try {
      const body =
        mode === "register"
          ? { username, password: form.password, nickname: nickname || undefined }
          : { username, password: form.password };
      const res = await (mode === "register" ? apiRegister : apiLogin)(body);
      setAuth(res);
      router.push(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };

  // 只有已登录才可能有账号面板；未登录或点了"切换账号"都回到表单。
  const accountUser = isLoggedIn ? user : null;
  const inAccountMode = accountUser !== null && !showForm;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gradient-to-br from-accent/10 via-background to-background px-4 py-12">
      <Card padding="lg" elevated className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-xl font-bold text-white">
            {"{T}"}
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {inAccountMode ? "欢迎回来" : mode === "login" ? "登录 Tech Codex" : "注册账号"}
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            {inAccountMode ? "当前账号已登录，无需重复输入" : "登录后可体验知识库 AI 助手"}
          </p>
        </div>

        {accountUser && !showForm ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-lg font-semibold text-accent">
              {(accountUser.nickname || accountUser.username).slice(0, 1).toUpperCase()}
            </div>
            <p className="mt-3 text-base font-semibold">{accountUser.nickname || accountUser.username}</p>
            <p className="mt-1 text-xs text-foreground/60">
              {accountUser.username} · {accountUser.role === "ADMIN" ? "管理员" : "普通用户"}
            </p>
            <div className="mt-5 space-y-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  router.push(from);
                  router.refresh();
                }}
              >
                继续使用
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => {
                  // 先清本地会话再展开表单：否则用户填完新账号前，页面仍认为旧身份在线。
                  logout();
                  setShowForm(true);
                }}
              >
                切换账号
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError("");
                  }}
                  className={`rounded-md py-2 text-sm font-medium transition ${
                    mode === m ? "bg-background text-accent shadow" : "text-foreground/60"
                  }`}
                >
                  {m === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              <Field
                label="用户名"
                htmlFor="login-username"
                required
                hint="3-64 位，可用中文、字母、数字、下划线或连字符"
              >
                <Input
                  id="login-username"
                  type="text"
                  required
                  placeholder="例如 zhangzhengyang"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </Field>
              {mode === "register" && (
                <Field label="昵称" htmlFor="login-nickname" hint="可选，留空时显示用户名">
                  <Input
                    id="login-nickname"
                    type="text"
                    placeholder="用于界面称呼"
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  />
                </Field>
              )}
              <Field label="密码" htmlFor="login-password" required hint="至少 8 位">
                <Input
                  id="login-password"
                  type="password"
                  required
                  placeholder="输入密码"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Field>
              {error && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              )}
              <Button type="submit" variant="primary" fullWidth loading={busy}>
                {mode === "login" ? "登录" : "注册"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-4 text-center text-xs leading-5 text-foreground/60">
          使用 AI 问答需要登录；
          <Link href="/docs" className="text-accent hover:underline">
            文档站无需登录，可直接浏览
          </Link>
        </p>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
