"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { FlaskConical, LineChart, ListPlus, Play, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { EvalRunTab } from "@/components/admin/eval/eval-run-tab";
import { EvalAbTab } from "@/components/admin/eval/eval-ab-tab";
import { EvalTrendTab } from "@/components/admin/eval/eval-trend-tab";
import { EvalCasesTab } from "@/components/admin/eval/eval-cases-tab";
import { AdminPageHeader } from "@/components/admin/admin-ui";

type Tab = "run" | "ab" | "trend" | "cases";

const TABS: { key: Tab; label: string; icon: typeof Play }[] = [
  { key: "run", label: "跑测", icon: Play },
  { key: "ab", label: "A/B 对照", icon: FlaskConical },
  { key: "trend", label: "历史趋势", icon: LineChart },
  { key: "cases", label: "用例维护", icon: ListPlus },
];

export default function AdminEvalPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("run");
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    // 客户端已挂载（异步触发，避免 effect 内同步 setState）
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);

  // 未登录跳登录页；非管理员提示无权限
  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/eval");
  }, [isLoggedIn, hydrated, router]);

  if (!hydrated || !isLoggedIn) {
    return <div className="w-full py-16 text-center text-sm text-foreground/40">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert size={36} className="text-foreground/30" />
        <p className="text-sm text-foreground/60">该页面需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={FlaskConical}
        title="RAG 评测"
        description="基于 Golden Set 的检索质量离线评测：命中率 / MRR / NDCG 三指标，支持 A/B 检索对比与每日趋势回归。"
        meta={<span>默认空间 · 公共知识库</span>}
      />

      <div className="mb-5 flex w-fit flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-medium transition-colors",
                active ? "bg-accent text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "run" && <EvalRunTab />}
      {tab === "ab" && <EvalAbTab />}
      {tab === "trend" && <EvalTrendTab />}
      {tab === "cases" && <EvalCasesTab />}
    </div>
  );
}
