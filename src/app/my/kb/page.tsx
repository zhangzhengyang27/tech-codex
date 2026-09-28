"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FileUp,
  Loader2,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { myDocuments, myQuota, type KbQuota } from "@/lib/kb";
import { fmtDate, fmtSize, statusBadgeCls, statusText } from "@/lib/format";
import type { KbDocumentView } from "@/lib/documents";

function errText(e: unknown): string {
  return e instanceof Error ? e.message : "加载失败";
}

/** 单项配额统计卡；limit<=0 表示不限制。 */
function StatCard({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = !limit || limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const nearLimit = !unlimited && pct >= 80;
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-foreground/60">{label}</span>
        <span className={clsx("font-mono text-xs", nearLimit ? "text-amber-600" : "text-foreground/40")}>
          {unlimited ? "不限" : `${pct}%`}
        </span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">
        {used}
        <span className="ml-1 text-xs font-normal text-foreground/40">
          / {unlimited ? "不限" : limit}
        </span>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={clsx("h-full rounded-full transition-all", nearLimit ? "bg-amber-500" : "bg-accent")}
          style={{ width: `${unlimited ? Math.min(100, used * 2) : pct}%` }}
        />
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    href: "/my/kb/upload",
    icon: FileUp,
    title: "上传文档",
    desc: "Markdown / TXT / PDF / Word / Excel / PPT，解析分块后自动向量化",
  },
  {
    href: "/my/kb/documents",
    icon: FileText,
    title: "管理文档",
    desc: "查看索引状态，按标题/文件名搜索，删除不需要的文档",
  },
  {
    href: "/ai",
    icon: MessageSquareText,
    title: "AI 问答",
    desc: "在 AI 助手页把检索范围切到「我的知识库」或「全部」提问",
  },
];

export default function MyKbOverviewPage() {
  const { isLoggedIn } = useAuth();
  const hydrated = useHydrated();
  const [quota, setQuota] = useState<KbQuota | null>(null);
  const [recent, setRecent] = useState<KbDocumentView[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [q, docs] = await Promise.all([
        myQuota().catch(() => null),
        myDocuments("", 0, 5).catch(() => null),
      ]);
      setQuota(q);
      setRecent(docs?.content ?? null);
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated && isLoggedIn) void load();
  }, [load, hydrated, isLoggedIn]);

  if (!hydrated || !isLoggedIn) {
    return <div className="py-16 text-center text-sm text-foreground/40">加载中…</div>;
  }

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</div>}

      {/* 配额统计 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="私有文档" used={quota?.docUsed ?? 0} limit={quota?.docLimit ?? 0} />
        <StatCard label="今日检索" used={quota?.retrievalUsed ?? 0} limit={quota?.retrievalDailyLimit ?? 0} />
        <StatCard label="今日问答" used={quota?.chatUsed ?? 0} limit={quota?.chatDailyLimit ?? 0} />
      </div>

      {/* 快捷操作 */}
      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent/50 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2 text-[13px] font-medium">
              <a.icon size={15} className="text-accent" />
              {a.title}
              <ArrowRight
                size={13}
                className="ml-auto text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/50">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* 最近文档 */}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="text-[13px] font-medium">最近上传</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-foreground/60 hover:bg-muted/60"
              title="刷新"
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              刷新
            </button>
            <Link href="/my/kb/documents" className="text-xs text-accent hover:underline">
              查看全部 →
            </Link>
          </div>
        </div>
        {!recent || recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-foreground/40">
            还没有文档，
            <Link href="/my/kb/upload" className="text-accent hover:underline">
              去上传第一个文件
            </Link>
            ，构建你的私有知识库
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                  <td className="max-w-[280px] truncate px-4 py-2.5 font-medium">{d.title}</td>
                  <td className="px-3 py-2.5 text-foreground/50">{fmtSize(d.fileSize)}</td>
                  <td className="px-3 py-2.5">
                    <span className={clsx("rounded-full px-2 py-0.5 text-xs", statusBadgeCls(d.status))}>
                      {statusText(d.status)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-foreground/40">{fmtDate(d.createdDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
