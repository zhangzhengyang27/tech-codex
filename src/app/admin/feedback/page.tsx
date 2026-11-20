'use client';

/** 管理端：问答反馈列表（点踩条目可一键回流为评测集 Golden Set 用例）。 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Inbox, ListPlus, Loader2, MessageSquare, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  kbFeedbackList,
  kbEvalCaseFromFeedback,
  type ChatFeedbackItem,
} from '@/lib/auth';
import { usePagedList } from '@/lib/use-paged-list';
import { useHydrated } from '@/lib/use-hydrated';
import { AdminCard, AdminPageHeader, adminBtn } from '@/components/admin/admin-ui';

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
    return <div className="w-full py-16 text-center text-sm text-slate-400">加载中…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="w-full py-16 text-center text-sm text-slate-500">
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
    <div className="w-full">
      <AdminPageHeader
        icon={MessageSquare}
        title="问答反馈"
        description="查看用户对问答结果的点赞与点踩，点踩条目可直接回流为 Golden Set 评测用例。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              共 {total} 条反馈
            </span>
            <span>按反馈时间倒序</span>
          </>
        }
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(
              [
                ['全部', ''],
                ['点赞', 'UP'],
                ['点踩', 'DOWN'],
              ] as [string, RatingFilter][]
            ).map(([label, value]) => (
              <button
                key={label}
                onClick={() => setRating(value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] transition-colors ${
                  rating === value
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {value === 'UP' && <ThumbsUp size={12} />}
                {value === 'DOWN' && <ThumbsDown size={12} />}
                {label}
              </button>
            ))}
          </div>
        }
      />

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {loading ? (
            <AdminCard contentClassName="py-20 text-center text-sm text-slate-400">
              <Loader2 size={18} className="mx-auto mb-2 animate-spin" />加载反馈…
            </AdminCard>
          ) : items.length === 0 ? (
            <AdminCard contentClassName="px-6 py-16 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/70">
                <Inbox size={22} />
              </span>
              <h2 className="mt-3 text-[14px] font-semibold text-slate-700">还没有问答反馈</h2>
              <p className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-slate-400">
                用户在问答页点赞或点踩后会汇总到这里。点踩条目可以补充期望关键字，直接转成可回归的评测用例。
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link href="/admin/eval" className={adminBtn('secondary', 'sm')}>查看评测集 <ArrowRight size={12} /></Link>
                <Link href="/docs" className={adminBtn('secondary', 'sm')}>去文档站</Link>
              </div>
            </AdminCard>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${
                        item.rating === 'UP'
                          ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                          : 'bg-red-50 text-red-600 ring-red-100'
                      }`}
                    >
                      {item.rating === 'UP' ? <ThumbsUp size={10} /> : <ThumbsDown size={10} />}
                      {item.rating === 'UP' ? '点赞' : '点踩'}
                    </span>
                    <span className="font-mono text-slate-500">{item.userId}</span>
                    <span>{new Date(item.createdDate).toLocaleString('zh-CN')}</span>
                    <span className="ml-auto font-mono text-[10px] text-slate-300">#{item.id}</span>
                  </div>

                  {item.question && (
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3">
                      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-400">用户问题</div>
                      <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-5 text-slate-700">{item.question}</p>
                    </div>
                  )}

                  {item.comment && (
                    <p className="mt-2.5 text-[12px] leading-5 text-slate-500">
                      <span className="mr-1 text-slate-400">评语</span>
                      {item.comment}
                    </p>
                  )}

                  {item.answer && (
                    <>
                      <button
                        onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                      >
                        {expanded === item.id ? '收起回答' : '查看回答'}
                      </button>
                      {expanded === item.id && (
                        <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px] leading-5 text-slate-600">
                          {item.answer}
                        </p>
                      )}
                    </>
                  )}

                  {/* 点踩回流：转为 Golden Set 评测用例 */}
                  {item.rating === 'DOWN' && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {converted[item.id] ? (
                        <p className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-600 ring-1 ring-emerald-100">
                          <ShieldCheck size={12} /> 已转为评测用例 #{converted[item.id]}，可在 RAG 评测页跑测验证
                        </p>
                      ) : convertForm?.id === item.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              value={convertForm.keywords}
                              onChange={(e) => setConvertForm({ ...convertForm, keywords: e.target.value })}
                              placeholder="期望命中关键字（逗号分隔，必填）"
                              className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[12px] outline-none focus:border-accent focus:bg-white"
                            />
                            <input
                              value={convertForm.note}
                              onChange={(e) => setConvertForm({ ...convertForm, note: e.target.value })}
                              placeholder="备注（缺省记录用户评语）"
                              className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-[12px] outline-none focus:border-accent focus:bg-white"
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => void onConvert()}
                              disabled={converting}
                              className={adminBtn('primary', 'sm')}
                            >
                              {converting ? <Loader2 size={12} className="animate-spin" /> : <ListPlus size={12} />}
                              确认转用例
                            </button>
                            <button
                              onClick={() => {
                                setConvertForm(null);
                                setConvertError('');
                              }}
                              className={adminBtn('secondary', 'sm')}
                            >
                              取消
                            </button>
                            {convertError && <span className="text-[11px] text-red-500">{convertError}</span>}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setConvertForm({ id: item.id, keywords: '', note: item.comment ?? '' })
                          }
                          className={adminBtn('secondary', 'sm')}
                        >
                          <ListPlus size={12} /> 转为评测用例
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-[11px] text-slate-400">
              <button
                disabled={page === 0}
                onClick={() => void load(page - 1, fetchPage)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] disabled:opacity-40"
              >
                上一页
              </button>
              <span>第 {page + 1} / {totalPages} 页</span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => void load(page + 1, fetchPage)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <AdminCard title="反馈如何回流" description="从用户信号到可回归的评测用例" icon={ListPlus} contentClassName="p-4">
            <ol className="space-y-3">
              {[
                ['01', '收集反馈', '点赞 / 点踩与用户评语落到反馈表。'],
                ['02', '补充期望', '点踩条目填写一到多个期望命中关键字。'],
                ['03', '进入评测', '转为 Golden Set 用例，在 RAG 评测页回归。'],
              ].map(([step, title, desc]) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-mono text-[10px] text-slate-400">{step}</span>
                  <div>
                    <div className="text-[11px] font-medium text-slate-700">{title}</div>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-400">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </AdminCard>
          <AdminCard title="质量口径" description="反馈页只展示公共空间问答" icon={ShieldCheck} contentClassName="space-y-2 p-4 text-[10px] leading-4 text-slate-400">
            <p>个人知识库问答不进入公共反馈池，避免跨账号泄露。</p>
            <p>点踩回流时会复用问题快照，不改写用户原始提问。</p>
            <Link href="/admin/eval" className="inline-flex items-center gap-1 pt-1 text-[11px] font-medium text-accent hover:underline">
              查看评测集 <ArrowRight size={12} />
            </Link>
          </AdminCard>
        </aside>
      </div>
    </div>
  );
}
