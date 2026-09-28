"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiLogin, apiRegister } from "@/lib/auth";

/** 登录后跳转目标白名单：仅允许站内路径，拒绝绝对 URL / 协议相对 URL，防 open redirect */
function safeFrom(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/ai";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = safeFrom(searchParams.get("from") || "/ai");
  const { isLoggedIn, setAuth } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
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
    setBusy(true);
    try {
      const body =
        mode === "register"
          ? form
          : { username: form.username, password: form.password };
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

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center bg-gradient-to-br from-accent/10 via-background to-background px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 shadow-xl shadow-black/5">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white">
            {"{T}"}
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            {mode === "login" ? "登录 Tech Codex" : "注册账号"}
          </h1>
          <p className="mt-1 text-sm text-foreground/50">
            登录后可体验知识库 AI 助手
          </p>
        </div>

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
                mode === m
                  ? "bg-background text-accent shadow"
                  : "text-foreground/50"
              }`}
            >
              {m === "login" ? "登录" : "注册"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            required
            placeholder="用户名"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          {mode === "register" && (
            <input
              type="text"
              placeholder="昵称（可选）"
              value={form.nickname}
              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          )}
          <input
            type="password"
            required
            placeholder="密码"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "处理中…" : mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-foreground/40">
          {isLoggedIn ? (
            <span>
              你已登录，{" "}
              <Link href={from} className="text-accent underline">
                去使用 AI 助手
              </Link>
            </span>
          ) : (
            <span>使用 AI 需要账号登录，文档浏览无需登录。</span>
          )}
        </div>
      </div>
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
