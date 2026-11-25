"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FileUp,
  MessageSquareText,
  RefreshCw,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { myDocuments, myQuota, type KbQuota } from "@/lib/kb";
import { fmtDate, fmtSize, statusBadgeCls, statusText } from "@/lib/format";
import type { KbDocumentView } from "@/lib/documents";
import { Button } from "@/components/ui/button";

/** 单项配额统计卡；limit<=0 表示不限制。 */
function StatCard({
  label,
  used,
  limit,
  hint,
}: {
  label: string;
  used: number;
  limit: number;
  /** 补充口径说明（如"检索 3/200 · 问答 1/100"），避免用户猜合并值怎么来的 */
  hint?: string;
}) {
  const unlimited = !limit || limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const nearLimit = !unlimited && pct >= 80;
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between text-compact">
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
      {hint && <p className="mt-2 text-xs leading-5 text-foreground/60">{hint}</p>}
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
  /** 请求序守卫：连续刷新时丢弃旧响应 */
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError("");
    // 配额与最近文档独立加载：部分失败仍展示已取得的数据 + 错误提示（不再吞错显示 0 值）
    const [qRes, dRes] = await Promise.allSettled([myQuota(), myDocuments("", 0, 5)]);
    if (seq !== loadSeqRef.current) return; // 已有更新的刷新接管渲染
    const failed: string[] = [];
    if (qRes.status === "fulfilled") setQuota(qRes.value);
    else {
      setQuota(null);
      failed.push("配额信息");
    }
    if (dRes.status === "fulfilled") setRecent(dRes.value.content ?? null);
    else failed.push("最近文档");
    if (failed.length > 0) setError(`${failed.join("、")}加载失败，请刷新重试`);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    // delayed setState：延后一拍发起加载，避免 effect 内同步 setState 级联渲染
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, hydrated, isLoggedIn]);

  if (!hydrated || !isLoggedIn) {
    return <div className="py-16 text-center text-sm text-foreground/40">加载中…</div>;
  }

  // 检索与问答对用户是同一件事（"用掉一次 AI 能力"），但后端是两条独立额度，
  // 所以卡片显示合计进度，hint 里保留两条额度的明细口径。
  const retrievalLimit = quota?.retrievalDailyLimit ?? 0;
  const chatLimit = quota?.chatDailyLimit ?? 0;
  const callUsed = (quota?.retrievalUsed ?? 0) + (quota?.chatUsed ?? 0);
  // 任一子额度不限，合计就无法给出有意义的百分比，统一按"不限"展示。
  const callLimit = retrievalLimit <= 0 || chatLimit <= 0 ? 0 : retrievalLimit + chatLimit;
  const limitText = (v: number) => (v <= 0 ? "不限" : String(v));

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-compact text-red-600">{error}</div>}

      {/* 配额统计：文档与调用各一张，避免"检索/问答是否重复计数"的困惑 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="私有文档"
          used={quota?.docUsed ?? 0}
          limit={quota?.docLimit ?? 0}
          hint="仅自己可见，不计入公共文档站"
        />
        <StatCard
          label="今日调用"
          used={callUsed}
          limit={callLimit}
          hint={`检索 ${quota?.retrievalUsed ?? 0}/${limitText(retrievalLimit)} · 问答 ${quota?.chatUsed ?? 0}/${limitText(chatLimit)}`}
        />
      </div>

      {/* 快捷操作 */}
      <div className="grid gap-3 sm:grid-cols-3">
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent/50 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2 text-compact font-medium">
              <a.icon size={15} className="text-accent" />
              {a.title}
              <ArrowRight
                size={13}
                className="ml-auto text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
              />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/60">{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* 最近文档 */}
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <span className="text-compact font-medium">最近上传</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void load()}
              loading={loading}
              className="px-2"
              title="刷新"
            >
              {!loading && <RefreshCw size={12} />}
              刷新
            </Button>
            <Link href="/my/kb/documents" className="text-xs text-accent hover:underline">
              查看全部 →
            </Link>
            <Link href="/my/favorites" className="text-xs text-foreground/60 hover:text-accent">
              我的收藏
            </Link>
          </div>
        </div>
        {!recent || recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-foreground/60">
            还没有上传过文档。上传的文件只进入你的私有知识库，不会出现在公共文档站。
            <div className="mt-2">
              <Link href="/my/kb/upload" className="text-accent hover:underline">
                上传第一份文件
              </Link>
            </div>
          </div>
        ) : (
          <table className="w-full text-compact">
            <tbody>
              {recent.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                  <td className="max-w-[280px] truncate px-4 py-2.5 font-medium">{d.title}</td>
                  <td className="px-3 py-2.5 text-foreground/60">{fmtSize(d.fileSize)}</td>
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
