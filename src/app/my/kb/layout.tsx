"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Database, FileUp, Files, LayoutDashboard } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";

/* 「我的知识库」分区：页头 + 分页标签，子页面（总览/文档/上传）在此布局下渲染。 */

const TABS = [
  { href: "/my/kb", label: "总览", icon: LayoutDashboard, exact: true },
  { href: "/my/kb/documents", label: "文档管理", icon: Files, exact: false },
  { href: "/my/kb/upload", label: "上传文档", icon: FileUp, exact: false },
];

export default function MyKbLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const hydrated = useHydrated();

  // 登录守卫只在布局做一次；子页面仅基于登录态决定是否发请求
  useEffect(() => {
    if (hydrated && !isLoggedIn) router.replace("/login?from=/my/kb");
  }, [hydrated, isLoggedIn, router]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-2">
        <Database size={20} className="text-accent" />
        <h1 className="text-xl font-semibold tracking-tight">我的知识库</h1>
        <span className="text-xs text-foreground/40">上传文档构建你的私有知识库，仅自己可见</span>
      </div>

      <nav className="mb-6 inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-foreground/50 hover:text-foreground",
              )}
            >
              <t.icon size={14} />
              {t.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
