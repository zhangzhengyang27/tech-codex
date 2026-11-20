"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
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
    <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="管理导航">
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.title} className="mb-4 last:mb-0">
          <div className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/35">
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
                    "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-accent/10 font-medium text-accent shadow-[inset_2px_0_0_var(--accent)]"
                      : "text-foreground/60 hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={clsx(
                      "shrink-0 transition-colors",
                      active ? "text-accent" : "text-foreground/40 group-hover:text-foreground/70",
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
    <div className="border-b border-border px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white shadow-sm">
          <ShieldCheck size={16} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold tracking-tight">管理工作台</div>
          <div className="mt-0.5 truncate text-[11px] text-foreground/40">公共知识库 · default</div>
        </div>
      </div>
    </div>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-border p-2.5">
      <Link
        href="/"
        className="flex items-center justify-between rounded-lg px-2.5 py-2 text-[12px] text-foreground/50 transition-colors hover:bg-muted/70 hover:text-foreground"
      >
        返回文档站
        <ArrowUpRight size={13} />
      </Link>
      <p className="px-2.5 pt-1 text-[10px] leading-relaxed text-foreground/30">
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

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* 桌面端常驻侧栏：与顶部导航同为 sticky，主内容滚动时保持可见 */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-[228px] shrink-0 flex-col border-r border-border bg-muted/20 md:flex">
          <SidebarBrand />
          <NavLinks />
          <SidebarFooter />
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/* 移动端：顶部一条工作台入口，点击后从左侧展开抽屉 */}
      <div className="sticky top-14 z-30 flex h-11 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <span className="flex items-center gap-2 text-[13px] font-medium">
          <ShieldCheck size={15} className="text-accent" />
          管理工作台
        </span>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label={mobileOpen ? "关闭管理菜单" : "打开管理菜单"}
          aria-expanded={mobileOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-muted"
        >
          {mobileOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 top-14 z-30 md:hidden">
          <button
            type="button"
            aria-label="关闭管理菜单"
            className="absolute inset-0 bg-black/25"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-[calc(100vh-3.5rem)] w-[260px] flex-col border-r border-border bg-background shadow-2xl">
            <SidebarBrand />
            <NavLinks onNavigate={() => setMobileOpen(false)} />
            <SidebarFooter />
          </aside>
        </div>
      )}
    </div>
  );
}
