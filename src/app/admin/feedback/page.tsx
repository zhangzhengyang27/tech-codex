'use client';

/** 管理端：问答反馈列表（点踩条目可一键回流为评测集 Golden Set 用例）。 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ListPlus, Loader2, MessageSquare, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  kbFeedbackList,
  kbEvalCaseFromFeedback,
  type ChatFeedbackItem,
} from '@/lib/auth';
import { usePagedList } from '@/lib/use-paged-list';
import { useHydrated } from '@/lib/use-hydrated';

type RatingFilter = '' | 'UP' | 'DOWN';
const PAGE_SIZE = 20;

export default function FeedbackAdminPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();

  const {
    items, page, totalElements: total, totalPages, loading, error, load,
  } = usePagedList<ChatFeedbackItem>();
  const [rating, setRating] = useState<RatingFilter>('');
  const [expanded, setExpanded] = useState<number | null>(null);

  // 点踩回流：展开的回流表单（feedbackId → 关键字/备注），已转用例的映射
  const [convertForm, setConvertForm] = useState<{ id: number; keywords: string; note: string } | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [converted, setConverted] = useState<Record<number, number>>({});

  const fetchPage = useCallback(
    (pg: number) => kbFeedbackList(rating === '' ? undefined : rating, pg, PAGE_SIZE),
    [rating],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace('/login?from=/admin/feedback');
  }, [isLoggedIn, hydrated, router]);

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    void load(0, fetchPage);
  }, [load, hydrated, isAdmin, fetchPage]);

  if (!hydrated || !isLoggedIn) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-center text-sm text-foreground/40">加载中…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center text-sm text-foreground/60">
        该页面需要管理员权限
      </div>
    );
  }

  /** 提交点踩回流：问题取反馈快照，期望关键字由管理员给定。 */
  const onConvert = async () => {
    if (!convertForm) return;
    if (!convertForm.keywords.trim()) {
      setConvertError('请填写期望命中关键字');
      return;
    }
    setConverting(true);
    setConvertError('');
    try {
      const { id } = await kbEvalCaseFromFeedback({
        feedbackId: convertForm.id,
        expectedKeywords: convertForm.keywords.trim(),
        note: convertForm.note,
      });
      setConverted((prev) => ({ ...prev, [convertForm.id]: id }));
      setConvertForm(null);
    } catch (e) {
      setConvertError(e instanceof Error ? e.message : '回流失败');
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-accent" />
          <h1 className="text-xl font-semibold tracking-tight">问答反馈</h1>
          <span className="text-xs text-foreground/40">共 {total} 条</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {(
            [
              ['全部', ''],
              ['👍 点赞', 'UP'],
              ['👎 点踩', 'DOWN'],
            ] as [string, RatingFilter][]
          ).map(([label, value]) => (
            <button
              key={label}
              onClick={() => setRating(value)}
              className={`rounded-full border px-3 py-1 transition-colors ${
                rating === value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-foreground/50 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <div className="py-24 text-center text-sm text-foreground/40">加载中…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-20 text-center text-sm text-foreground/50">
          暂无反馈数据
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/40">
                <span
                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${
                    item.rating === 'UP'
                      ? 'bg-accent/10 text-accent'
                      : 'bg-red-500/10 text-red-500'
                  }`}
                >
                  {item.rating === 'UP' ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
                  {item.rating === 'UP' ? '点赞' : '点踩'}
                </span>
                <span>{item.userId}</span>
                <span>{new Date(item.createdDate).toLocaleString('zh-CN')}</span>
              </div>
              {item.question && (
                <p className="mt-2 line-clamp-2 text-sm font-medium">Q：{item.question}</p>
              )}
              {item.comment && (
                <p className="mt-1 text-sm text-foreground/60">评语：{item.comment}</p>
              )}
              {item.answer && (
                <>
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="mt-1 text-xs text-accent hover:underline"
                  >
                    {expanded === item.id ? '收起回答' : '查看回答'}
                  </button>
                  {expanded === item.id && (
                    <p className="mt-1 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-foreground/70">
                      {item.answer}
                    </p>
                  )}
                </>
              )}

              {/* 点踩回流：转为 Golden Set 评测用例 */}
              {item.rating === 'DOWN' && (
                <div className="mt-3 border-t border-border pt-3">
                  {converted[item.id] ? (
                    <p className="text-xs text-emerald-600">
                      已转为评测用例 #{converted[item.id]}，可在检索评测页跑测验证
                    </p>
                  ) : convertForm?.id === item.id ? (
                    <div className="space-y-2">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          value={convertForm.keywords}
                          onChange={(e) => setConvertForm({ ...convertForm, keywords: e.target.value })}
                          placeholder="期望命中关键字（逗号分隔，必填）"
                          className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
                        />
                        <input
                          value={convertForm.note}
                          onChange={(e) => setConvertForm({ ...convertForm, note: e.target.value })}
                          placeholder="备注（缺省记录用户评语）"
                          className="h-8 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void onConvert()}
                          disabled={converting}
                          className="flex h-7 items-center gap-1 rounded-md bg-accent px-3 text-xs font-medium text-white disabled:opacity-60"
                        >
                          {converting ? <Loader2 size={12} className="animate-spin" /> : <ListPlus size={12} />}
                          确认转用例
                        </button>
                        <button
                          onClick={() => {
                            setConvertForm(null);
                            setConvertError('');
                          }}
                          className="h-7 rounded-md border border-border px-3 text-xs text-foreground/60 hover:bg-muted"
                        >
                          取消
                        </button>
                        {convertError && <span className="text-xs text-red-500">{convertError}</span>}
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setConvertForm({ id: item.id, keywords: '', note: item.comment ?? '' })
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-foreground/60 transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      <ListPlus size={12} />
                      转为评测用例
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3 text-sm">
          <button
            disabled={page === 0}
            onClick={() => void load(page - 1, fetchPage)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-xs text-foreground/50">
            第 {page + 1} / {totalPages} 页
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => void load(page + 1, fetchPage)}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-foreground/30">
        点踩条目可就地转为 Golden Set 用例，在{' '}
        <Link href="/admin/eval" className="text-accent hover:underline">
          检索评测页
        </Link>{' '}
        跑测回归，驱动检索质量提升
      </p>
    </div>
  );
}
