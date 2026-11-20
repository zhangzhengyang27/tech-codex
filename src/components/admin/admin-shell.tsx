"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  Database,
  FileText,
  Gauge,
  LayoutDashboard,
  Menu,
  MessageSquare,
  ScrollText,
  Settings,
  ShieldCheck,
  Target,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:thin]" aria-label="管理导航">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.title} className="mb-5 last:mb-0">
          <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
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
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
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
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-950/30">
          <ShieldCheck size={17} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold tracking-tight text-white">Tech Codex</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">Admin Console</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2">
        <Database size={13} className="text-blue-400" />
        <span className="truncate text-[11px] text-slate-300">公共知识库</span>
        <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
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
        className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white"
      >
        返回文档站
        <ArrowUpRight size={13} />
      </Link>
      <p className="px-2.5 pt-1 text-[10px] leading-relaxed text-slate-600">
        管理操作会写入审计日志
      </p>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 路由变化后自动收起移动端抽屉，避免切换页面后仍停留在菜单上。
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // 移动端抽屉支持 Esc 关闭；抽屉打开后不再需要管理条上的汉堡按钮。
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    // 抽屉打开时锁住背景滚动，避免移动端在菜单上滑动却滚动到下层页面。
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#f4f6f9]">
      {/* 移动端：顶部一条工作台入口，点击后从左侧展开抽屉。必须放在内容之前，
          sticky 才能在首屏可见并固定于全局导航下方。 */}
      <div className={clsx(
        "sticky top-14 z-30 flex h-11 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden",
        mobileOpen && "invisible",
      )}>
        <span className="flex items-center gap-2 text-[13px] font-medium text-slate-800">
          <ShieldCheck size={15} className="text-accent" />
          管理工作台
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "关闭管理菜单" : "打开管理菜单"}
          aria-expanded={mobileOpen}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* 桌面端常驻侧栏：深色控制台风格，与内容画布形成清晰层级 */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[236px] shrink-0 flex-col bg-[#0b1524] lg:flex">
          <SidebarBrand />
          <NavLinks />
          <SidebarFooter />
        </aside>

        {/* 所有管理页共用同一内容容器：统一最大宽度和四周留白，避免各页各写一套 padding */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            {children}
          </div>
        </main>
      </div>


      {mobileOpen && (
        <div className="fixed inset-0 top-14 z-30 lg:hidden">
          <button
            type="button"
            aria-label="关闭管理菜单"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-[calc(100vh-3.5rem)] w-[264px] flex-col bg-[#0b1524] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="关闭管理菜单"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
            <SidebarBrand />
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}
    </div>
  );
}
