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
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">RAG 评测</h1>
        <p className="mt-1 text-[13px] text-foreground/50">
          基于 Golden Set 的检索质量离线评测：命中率 / MRR / NDCG 三指标 + A/B 检索对比 + 每日趋势回归
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-background p-1 w-fit">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                active ? "bg-accent text-white" : "text-foreground/60 hover:bg-muted hover:text-foreground",
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
