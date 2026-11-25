"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CalendarRange,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { type ReactNode } from "react";

type AdminNavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** 总览页需要精确匹配，避免 /admin/xxx 也命中 /admin */
  exact?: boolean;
};

const ADMIN_NAV_GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: "总览",
    items: [{ href: "/admin", label: "管理总览", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "内容运营",
    items: [
      { href: "/admin/content", label: "内容中心", icon: BookOpen },
      { href: "/admin/documents", label: "文档管理", icon: FileText },
      { href: "/admin/gaps", label: "内容缺口", icon: Target },
      { href: "/admin/feedback", label: "问答反馈", icon: MessageSquare },
      { href: "/admin/report", label: "运营周报", icon: CalendarRange },
    ],
  },
  {
    title: "质量与检索",
    items: [
      { href: "/admin/eval", label: "RAG 评测", icon: ShieldCheck },
      { href: "/admin/governance", label: "知识治理", icon: ShieldAlert },
      { href: "/admin/traces", label: "检索诊断", icon: Activity },
    ],
  },
  {
    title: "系统治理",
    items: [
      { href: "/admin/usage", label: "用量统计", icon: BarChart3 },
      { href: "/admin/users", label: "用户管理", icon: Users },
      { href: "/admin/quotas", label: "配额管理", icon: Gauge },
      { href: "/admin/config", label: "系统配置", icon: Settings },
      { href: "/admin/audit", label: "审计日志", icon: ScrollText },
    ],
  },
];

function isActive(pathname: string, item: AdminNavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]" aria-label="管理导航">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.title} className="mb-5 last:mb-0">
          <div className="px-2 pb-2 text-2xs font-medium uppercase tracking-[0.16em] text-slate-500">
            {group.title}
          </div>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-compact transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                    active
                      ? "bg-white/[0.08] font-medium text-white shadow-[inset_2px_0_0_#60a5fa]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100",
                  )}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.1 : 1.8}
                    className={clsx(
                      "shrink-0 transition-colors",
                      active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300",
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarBrand() {
  return (
    <div className="border-b border-white/10 px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-950/30">
          <ShieldCheck size={17} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-compact font-semibold tracking-tight text-white">Tech Codex</div>
          <div className="mt-0.5 text-2xs uppercase tracking-[0.16em] text-slate-500">Admin Console</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
        <Database size={13} className="text-blue-400" />
        <span className="truncate text-caption text-slate-300">公共知识库</span>
        <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-2xs text-slate-400">
          default
        </span>
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-white/10 p-2.5">
      <Link
        href="/"
        className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
      >
        返回文档站
        <ArrowUpRight size={13} />
      </Link>
      <p className="px-2.5 pt-1 text-2xs leading-relaxed text-slate-600">
        管理操作会写入审计日志
      </p>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {/* 管理工作台只面向桌面：导航固定在左侧，不再维护移动端抽屉。
          管理操作本身依赖宽表格与多列审计信息，窄屏折行后反而不可用；
          省掉第二套导航也少一处需要同步的路由状态。 */}
      <div className="flex min-h-screen">
        <aside className="sticky top-0 flex h-screen w-[236px] shrink-0 flex-col bg-[#0b1524]">
          <SidebarBrand />
          <NavLinks />
          <SidebarFooter />
        </aside>

        {/* 所有管理页共用同一内容容器：统一最大宽度和四周留白，避免各页各写一套 padding */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-8 py-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
