"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ChevronDown, Menu, X, Sparkles, Shield, FileText, BarChart3, ScrollText, Library, LogOut, LayoutDashboard, MessageSquare, Users, Gauge, Activity, Settings, CalendarRange } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

/* ---------- 导航数据结构 ---------- */

interface NavChild {
  label: string;
  href: string;
  icon: string;
}

interface NavItem {
  label: string;
  href?: string; // 有 href 则为直链，无则为下拉
  icon?: string; // 直链项的图标
  children?: NavChild[];
}

const navItems: NavItem[] = [
  { label: "首页", href: "/" },
  { label: "AI 助手", href: "/ai" },
  {
    label: "前端",
    children: [
      { label: "HTML5", href: "/docs/html5", icon: "📄" },
      { label: "CSS", href: "/docs/css", icon: "🎨" },
      { label: "JavaScript", href: "/docs/javascript", icon: "⚡" },
      { label: "TypeScript", href: "/docs/typescript", icon: "🔷" },
      { label: "Vue2", href: "/docs/vue2", icon: "💚" },
      { label: "Vue3", href: "/docs/vue3", icon: "💚" },
      { label: "构建工具", href: "/docs/tools", icon: "🔧" },
      { label: "Electron", href: "/docs/electron", icon: "🖥️" },
      { label: "前端调试", href: "/docs/debugging", icon: "🔍" },
    ],
  },
  { label: "Java", href: "/docs/java", icon: "☕" },
  { label: "Python", href: "/docs/python", icon: "🐍" },
  { label: "Node.js", href: "/docs/node", icon: "🟢" },
  { label: "DevOps", href: "/docs/devops" },
  { label: "安全", href: "/docs/security", icon: "🛡️" },
  { label: "操作系统", href: "/docs/os", icon: "🖥️" },
  {
    label: "测试",
    children: [
      { label: "测试基础", href: "/docs/test-fundamentals", icon: "🧪" },
      { label: "测试模型与流程", href: "/docs/test-models", icon: "🏛️" },
      { label: "单元测试与代码级测试", href: "/docs/unit-testing", icon: "🔬" },
      { label: "API 测试", href: "/docs/api-testing", icon: "🔌" },
      { label: "GUI 自动化测试", href: "/docs/gui-testing", icon: "🖱️" },
      { label: "移动端测试", href: "/docs/mobile-testing", icon: "📱" },
      { label: "性能测试", href: "/docs/performance-testing", icon: "📊" },
      { label: "CI/CD 与测试基础设施", href: "/docs/cicd-infra", icon: "🔧" },
      { label: "测试开发与平台工程", href: "/docs/test-dev", icon: "🛠️" },
      {
        label: "测试前沿与质量管理",
        href: "/docs/testing-frontier",
        icon: "🚀",
      },
      { label: "测试附录", href: "/docs/testing-appendix", icon: "📚" },
    ],
  },
  {
    label: "更多",
    children: [
      { label: "数据可视化", href: "/docs/visualization", icon: "📊" },
      { label: "架构与工程", href: "/docs/architecture", icon: "🏗️" },
      { label: "运维", href: "/docs/ops", icon: "⚙️" },
      { label: "技术管理", href: "/docs/tech-management", icon: "👔" },
      { label: "产品", href: "/docs/product", icon: "📱" },
    ],
  },
];

/* ---------- 管理后台入口（导航栏「管理」下拉，仅管理员可见） ---------- */

const ADMIN_LINKS = [
  { label: "管理总览", href: "/admin", icon: LayoutDashboard },
  { label: "文档管理", href: "/admin/documents", icon: FileText },
  { label: "RAG 评测", href: "/admin/eval", icon: Shield },
  { label: "问答反馈", href: "/admin/feedback", icon: MessageSquare },
  { label: "用量统计", href: "/admin/usage", icon: BarChart3 },
  { label: "运营周报", href: "/admin/report", icon: CalendarRange },
  { label: "检索诊断", href: "/admin/traces", icon: Activity },
  { label: "用户管理", href: "/admin/users", icon: Users },
  { label: "配额管理", href: "/admin/quotas", icon: Gauge },
  { label: "系统配置", href: "/admin/config", icon: Settings },
  { label: "审计日志", href: "/admin/audit", icon: ScrollText },
];

/* ---------- 下拉面板（桌面端 hover） ---------- */

function DropdownPanel({
  item,
  onClose,
}: {
  item: NavItem;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <div
      className={clsx(
        "absolute left-0 top-full pt-2 animate-fade-up",
        // "更多"靠右展示
        item.label === "更多" && "left-auto right-0",
      )}
      style={{ animationDuration: "0.18s" }}
    >
      <div className="rounded-xl border border-border bg-background/95 backdrop-blur-xl shadow-xl shadow-black/5 p-2 min-w-[180px] space-y-0.5">
        {item.children!.map((child) => {
          const active =
            pathname === child.href || pathname.startsWith(child.href + "/");
          return (
            <Link
              key={child.href}
              href={child.href}
              onClick={onClose}
              className={clsx(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              <span className="text-base leading-none">{child.icon}</span>
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 账号菜单（头像 + 名称 + 下拉） ---------- */

function avatarInitial(name: string | undefined): string {
  return (name || "U").slice(0, 1).toUpperCase();
}

function AccountMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const displayName = user?.nickname || user?.username || "用户";
  const initial = avatarInitial(displayName);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  // 点击面板外关闭；路由变化时同步收起
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const onLogout = () => {
    setOpen(false);
    logout();
    router.push("/");
    router.refresh();
  };

  const itemCls = (active: boolean) =>
    clsx(
      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
      active ? "bg-accent/10 font-medium text-accent" : "text-foreground/70 hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full transition-colors hover:bg-muted/60"
        aria-label="账号菜单"
      >
        <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold shrink-0">
          {initial}
        </span>
        <span className="max-w-[96px] truncate text-[13px] font-medium text-foreground/70">
          {displayName}
        </span>
        <ChevronDown
          size={13}
          className={clsx("text-foreground/40 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div className="min-w-[220px] rounded-xl border border-border bg-background/95 shadow-xl shadow-black/5 backdrop-blur-xl overflow-hidden animate-fade-up" style={{ animationDuration: "0.18s" }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <span className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {initial}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{displayName}</div>
                <div className="truncate text-xs text-foreground/40">@{user?.username}</div>
              </div>
            </div>
            <div className="p-1.5 space-y-0.5">
              <Link href="/my/kb" onClick={() => setOpen(false)} className={itemCls(isActive("/my/kb"))}>
                <Library size={14} className="text-foreground/50" />
                我的知识库
              </Link>
              <Link href="/ai" onClick={() => setOpen(false)} className={itemCls(isActive("/ai"))}>
                <Sparkles size={14} className="text-foreground/50" />
                AI 助手
              </Link>
              <div className="my-1 border-t border-border" />
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-500/90 transition-colors hover:bg-red-50"
              >
                <LogOut size={14} />
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 主组件 ---------- */

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isAdmin, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 路由变化时关闭所有菜单（在渲染期调整状态，避免 effect 内同步 setState）
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setActiveDropdown(null);
  }

  // 卸载时清理下拉关闭定时器
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const isDirectActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  const isDropdownActive = (item: NavItem) =>
    item.children?.some(
      (c) => pathname === c.href || pathname.startsWith(c.href + "/"),
    ) ?? false;

  /** 管理下拉内任一页面处于激活态时，高亮「管理」按钮 */
  const isAdminAreaActive = ADMIN_LINKS.some(
    (l) => pathname === l.href || pathname.startsWith(l.href + "/"),
  );

  const handleMouseEnter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setActiveDropdown(null), 120);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-6 px-4 md:px-8">
          {/* Logo */}
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center transition-transform group-hover:scale-105">
              <span className="text-white font-bold text-xs font-mono">
                {"{T}"}
              </span>
            </div>
            <span className="font-semibold tracking-tight hidden sm:inline">
              Tech Codex
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1">
            {navItems.map((item) => {
              if (item.children) {
                const active = isDropdownActive(item);
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter(item.label)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      className={clsx(
                        "relative flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                        active || activeDropdown === item.label
                          ? "text-foreground bg-muted"
                          : "text-foreground/50 hover:text-foreground hover:bg-muted/60",
                      )}
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === item.label ? null : item.label,
                        )
                      }
                    >
                      {item.label}
                      <ChevronDown
                        size={13}
                        className={clsx(
                          "transition-transform duration-200",
                          activeDropdown === item.label && "rotate-180",
                        )}
                      />
                      {active && (
                        <span className="absolute -bottom-[13px] left-3 right-3 h-[2px] bg-accent rounded-full" />
                      )}
                    </button>
                    {activeDropdown === item.label && (
                      <DropdownPanel
                        item={item}
                        onClose={() => setActiveDropdown(null)}
                      />
                    )}
                  </div>
                );
              }

              const active = isDirectActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className={clsx(
                    "relative flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                    active
                      ? "text-foreground bg-muted"
                      : "text-foreground/50 hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  {item.label === "首页" && (
                    <Home size={15} strokeWidth={active ? 2.2 : 1.8} />
                  )}
                  {item.label}
                  {active && (
                    <span className="absolute -bottom-[13px] left-3 right-3 h-[2px] bg-accent rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Auth / AI entry */}
          <div className="hidden lg:flex items-center gap-1 ml-auto">
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <div
                    className="relative"
                    onMouseEnter={() => handleMouseEnter("管理")}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      className={clsx(
                        "relative flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                        isAdminAreaActive || activeDropdown === "管理"
                          ? "text-foreground bg-muted"
                          : "text-foreground/50 hover:text-foreground hover:bg-muted/60",
                      )}
                      onClick={() =>
                        setActiveDropdown(activeDropdown === "管理" ? null : "管理")
                      }
                    >
                      <Shield size={14} className="text-foreground/50" />
                      管理
                      <ChevronDown
                        size={13}
                        className={clsx(
                          "transition-transform duration-200",
                          activeDropdown === "管理" && "rotate-180",
                        )}
                      />
                    </button>
                    {activeDropdown === "管理" && (
                      <div className="absolute right-0 top-full pt-2 z-50">
                        <div className="min-w-[170px] space-y-0.5 rounded-xl border border-border bg-background/95 p-2 shadow-xl shadow-black/5 backdrop-blur-xl">
                          {ADMIN_LINKS.map((l) => (
                            <Link
                              key={l.href}
                              href={l.href}
                              onClick={() => setActiveDropdown(null)}
                              className={clsx(
                                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors",
                                pathname === l.href || pathname.startsWith(l.href + "/")
                                  ? "bg-accent/10 font-medium text-accent"
                                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
                              )}
                            >
                              <l.icon size={14} className="text-foreground/50" />
                              {l.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <AccountMenu />
              </>
            ) : (
              <Link
                href="/login?from=/ai"
                onClick={() => setActiveDropdown(null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[13px] font-medium text-accent hover:bg-accent/10 transition-colors"
              >
                <Sparkles size={14} />
                AI 助手 · 登录
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden ml-auto p-2 rounded-md bg-muted border border-border text-foreground/60"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="切换菜单"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-0 h-full w-[82%] max-w-xs overflow-y-auto border-l border-border bg-background px-4 py-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between px-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                菜单
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 text-foreground/50 hover:bg-muted"
                aria-label="关闭菜单"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-0.5">
              {navItems.map((item) => {
                if (item.children) {
                  const expanded = mobileExpanded === item.label;
                  const active = isDropdownActive(item);
                  return (
                    <div key={item.label}>
                      <button
                        onClick={() =>
                          setMobileExpanded(expanded ? null : item.label)
                        }
                        className={clsx(
                          "flex w-full items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors",
                          active
                            ? "text-accent font-medium"
                            : "text-foreground/60 hover:text-foreground hover:bg-muted",
                        )}
                      >
                        {item.label}
                        <ChevronDown
                          size={15}
                          className={clsx(
                            "transition-transform duration-200",
                            expanded && "rotate-180",
                          )}
                        />
                      </button>
                      {expanded && (
                        <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-3">
                          {item.children.map((child) => {
                            const childActive =
                              pathname === child.href ||
                              pathname.startsWith(child.href + "/");
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setMobileOpen(false)}
                                className={clsx(
                                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                                  childActive
                                    ? "bg-accent/10 text-accent font-medium"
                                    : "text-foreground/60 hover:text-foreground hover:bg-muted",
                                )}
                              >
                                <span className="text-base">{child.icon}</span>
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = isDirectActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href!}
                    onClick={() => setMobileOpen(false)}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                      active
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-foreground/60 hover:text-foreground hover:bg-muted",
                    )}
                  >
                    {item.label === "首页" && <Home size={17} />}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {/* 移动端登录态 */}
            <div className="mt-3 border-t border-border pt-3">
              {isLoggedIn ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-xs font-semibold shrink-0">
                        {avatarInitial(user?.nickname || user?.username)}
                      </span>
                      <span className="max-w-[120px] truncate">
                        {user?.nickname || user?.username}
                      </span>
                    </span>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/my/kb"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-1 text-sm text-foreground/60"
                      >
                        <Library size={14} />
                        我的知识库
                      </Link>
                      <button
                        onClick={() => {
                          setMobileOpen(false);
                          logout();
                          router.push("/");
                          router.refresh();
                        }}
                        className="text-sm text-foreground/50"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                  {isAdmin && (
                    <div>
                      <button
                        onClick={() =>
                          setMobileExpanded(mobileExpanded === "管理" ? null : "管理")
                        }
                        className={clsx(
                          "flex w-full items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors",
                          isAdminAreaActive
                            ? "text-accent font-medium"
                            : "text-foreground/60 hover:text-foreground hover:bg-muted",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <Shield size={15} />
                          管理
                        </span>
                        <ChevronDown
                          size={15}
                          className={clsx(
                            "transition-transform duration-200",
                            mobileExpanded === "管理" && "rotate-180",
                          )}
                        />
                      </button>
                      {mobileExpanded === "管理" && (
                        <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-3">
                          {ADMIN_LINKS.map((l) => (
                            <Link
                              key={l.href}
                              href={l.href}
                              onClick={() => setMobileOpen(false)}
                              className={clsx(
                                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                                pathname === l.href || pathname.startsWith(l.href + "/")
                                  ? "bg-accent/10 text-accent font-medium"
                                  : "text-foreground/60 hover:text-foreground hover:bg-muted",
                              )}
                            >
                              <l.icon size={14} />
                              {l.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login?from=/ai"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-accent"
                >
                  <Sparkles size={15} />
                  AI 助手 · 登录
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
