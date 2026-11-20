'use client';

/** 管理端：内容缺口中心（未答 / 零引用 / 点踩 / 追问聚合、聚类、流转与转评测）。 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Download, Layers, Loader2,
  MessageCircleQuestion, RefreshCw, Search, Sparkles, Target, X,
} from 'lucide-react';
import { AdminCard, AdminMetricCard, AdminPageHeader, AdminPagination, adminBtn } from '@/components/admin/admin-ui';
import { useAuth } from '@/context/AuthContext';
import { useHydrated } from '@/lib/use-hydrated';
import {
  batchGapStatus, convertGap, downloadGapCsv, draftGap, gapClusters, gapDetail, gapSummary,
  listGaps, updateGapStatus,
  type ContentGapCluster, type ContentGapDetail, type ContentGapItem,
  type ContentGapSummary, type ContentDraft, type GapStatus,
} from '@/lib/gaps';

const PAGE_SIZE = 20;
const STATUS_OPTIONS: { value: GapStatus; label: string; tone: string }[] = [
  { value: 'OPEN', label: '待处理', tone: 'text-amber-600 border-amber-500/30 bg-amber-500/10' },
  { value: 'TRIAGED', label: '已分诊', tone: 'text-sky-600 border-sky-500/30 bg-sky-500/10' },
  { value: 'PLANNED', label: '已排期', tone: 'text-violet-600 border-violet-500/30 bg-violet-500/10' },
  { value: 'RESOLVED', label: '已解决', tone: 'text-emerald-600 border-emerald-500/30 bg-emerald-500/10' },
  { value: 'IGNORED', label: '已忽略', tone: 'text-slate-500 border-slate-200 bg-slate-50' },
];
const SIGNAL_LABEL: Record<string, string> = {
  NO_ANSWER: '未答', ZERO_CITATION: '零引用', THUMB_DOWN: '点踩', FOLLOW_UP: '追问',
};

function statusMeta(status: GapStatus) {
  return STATUS_OPTIONS.find((s) => s.value === status) ?? STATUS_OPTIONS[0];
}
function formatDate(value: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
function signalChips(summary: string | null) {
  if (!summary) return [];
  return summary.split(',').map((part) => {
    const [key, count] = part.split(':');
    return { key, label: SIGNAL_LABEL[key] ?? key, count: Number(count) || 0 };
  });
}

export default function ContentGapsPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();
  const [items, setItems] = useState<ContentGapItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<GapStatus | ''>('OPEN');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ContentGapSummary | null>(null);
  const [clusters, setClusters] = useState<ContentGapCluster[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<ContentGapDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerError, setDrawerError] = useState('');
  const [convertKeywords, setConvertKeywords] = useState('');
  const [convertNote, setConvertNote] = useState('');
  const [converting, setConverting] = useState(false);
  const [draft, setDraft] = useState<ContentDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([gapSummary(), gapClusters()]);
      setSummary(s); setClusters(c);
    } catch { /* 概览失败不阻塞列表 */ }
  }, []);

  const loadPage = useCallback(async (target: number) => {
    setLoading(true); setError('');
    try {
      const res = await listGaps({ status, keyword: keyword.trim(), page: target, size: PAGE_SIZE });
      setItems(res.content); setTotal(res.totalElements); setTotalPages(res.totalPages);
      setPage(res.number); setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : '内容缺口加载失败');
    } finally { setLoading(false); }
  }, [status, keyword]);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) { router.replace('/login?from=/admin/gaps'); return; }
    if (!isAdmin) return;
    void loadPage(0); void loadMeta();
  }, [hydrated, isLoggedIn, isAdmin, router, loadPage, loadMeta]);

  if (!hydrated) {
    return <div className="w-full py-16 text-center text-sm text-slate-400">加载中…</div>;
  }
  // 未登录时明确给出登录入口，而不是一直停在“加载中”：
  // 鉴权失败发生在客户端，若这里仍渲染 loading，用户会误以为接口卡死。
  if (!isLoggedIn) {
    return (
      <div className="w-full py-16 text-center text-sm text-slate-500">
        <p>该页面需要管理员登录后查看。</p>
        <Link href="/login?from=/admin/gaps" className="mt-3 inline-block text-accent hover:underline">
          去登录
        </Link>
      </div>
    );
  }
  if (!isAdmin) {
    return <div className="w-full py-16 text-center text-sm text-slate-500">该页面需要管理员权限</div>;
  }

  const toggleSelect = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected((prev) =>
    prev.size === items.length ? new Set() : new Set(items.map((i) => i.id)),
  );
  const refresh = () => { void loadPage(page); void loadMeta(); };

  const onBatchStatus = async (next: GapStatus) => {
    if (!selected.size) return;
    setBatchBusy(true); setError('');
    try { await batchGapStatus(Array.from(selected), next); await loadPage(page); await loadMeta(); }
    catch (e) { setError(e instanceof Error ? e.message : '批量流转失败'); }
    finally { setBatchBusy(false); }
  };

  const onExport = async () => {
    setExporting(true); setError('');
    try { await downloadGapCsv(status, keyword.trim()); }
    catch (e) { setError(e instanceof Error ? e.message : '导出失败'); }
    finally { setExporting(false); }
  };

  const openDetail = async (id: number) => {
    setDrawerOpen(true); setDetailLoading(true); setDrawerError(''); setDetail(null);
    setConvertKeywords(''); setConvertNote(''); setDraft(null);
    try { setDetail(await gapDetail(id)); }
    catch (e) { setDrawerError(e instanceof Error ? e.message : '详情加载失败'); }
    finally { setDetailLoading(false); }
  };

  const onStatusChange = async (id: number, next: GapStatus) => {
    setActionBusy(true); setError('');
    try {
      const updated = await updateGapStatus(id, next);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      setDetail((prev) => (prev ? { ...prev, gap: updated } : prev));
      void loadMeta();
    } catch (e) { setError(e instanceof Error ? e.message : '状态更新失败'); }
    finally { setActionBusy(false); }
  };

  const onDraft = async () => {
    if (!detail) return;
    setDrafting(true); setDrawerError('');
    try { setDraft(await draftGap(detail.gap.id)); }
    catch (e) { setDrawerError(e instanceof Error ? e.message : '大纲生成失败'); }
    finally { setDrafting(false); }
  };

  const onConvert = async () => {
    if (!detail) return;
    if (!convertKeywords.trim()) { setDrawerError('请填写期望命中的关键字'); return; }
    setConverting(true); setDrawerError('');
    try {
      const { caseId } = await convertGap(detail.gap.id, convertKeywords.trim(), convertNote.trim());
      setDetail((prev) => (prev ? {
        ...prev, gap: { ...prev.gap, evalCaseId: caseId, status: 'PLANNED' },
      } : prev));
      setItems((prev) => prev.map((i) => (i.id === detail.gap.id
        ? { ...i, evalCaseId: caseId, status: 'PLANNED' } : i)));
      setConvertKeywords(''); setConvertNote(''); void loadMeta();
    } catch (e) { setDrawerError(e instanceof Error ? e.message : '转评测失败'); }
    finally { setConverting(false); }
  };

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={Target}
        title="内容缺口"
        description="聚合未答、零引用、点踩、追问四类信号，按归一化问题去重并聚类，流转为可评测的缺口。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              共 {total} 条缺口
            </span>
            {summary && <span>待处理 {summary.open} 条</span>}
            {summary && <span>近 7 天新增 {summary.last7Days} 条</span>}
          </>
        }
        actions={
          <>
            <button onClick={refresh} disabled={loading} className={adminBtn('secondary')}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 刷新
            </button>
            <button onClick={onExport} disabled={exporting} className={adminBtn('secondary')}>
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              导出 CSV
            </button>
          </>
        }
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <AdminMetricCard className="md:col-span-2" label="待处理" value={String(summary.open)} hint="需要分诊或补文档" icon={AlertTriangle} tone="amber" />
          <AdminMetricCard className="md:col-span-2" label="已分诊" value={String(summary.triaged)} hint="已确认问题归因" icon={Search} tone="blue" />
          <AdminMetricCard className="md:col-span-2" label="已排期" value={String(summary.planned)} hint="已进入内容计划" icon={CalendarClock} tone="violet" />
          <AdminMetricCard className="md:col-span-3" label="已解决" value={String(summary.resolved)} hint="内容或评测已补齐" icon={CheckCircle2} tone="emerald" />
          <AdminMetricCard className="col-span-2 md:col-span-3" label="近 7 天新增" value={String(summary.last7Days)} hint="按最近出现时间统计" icon={Sparkles} tone="slate" />
        </div>
      )}

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">{error}</p>}

      <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]">
              {([['全部', ''], ['待处理', 'OPEN'], ['已分诊', 'TRIAGED'], ['已排期', 'PLANNED'], ['已解决', 'RESOLVED'], ['已忽略', 'IGNORED']] as [string, GapStatus | ''][]).map(([label, value]) => (
                <button key={label} onClick={() => setStatus(value)}
                  className={`shrink-0 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                    status === value ? 'border-accent/20 bg-white font-medium text-accent shadow-sm' : 'border-transparent text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}>{label}</button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-56">
              <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索问题…"
                className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[12px] outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/25" />
            </div>
          </div>

          {selected.size > 0 && (
            <div className="m-3 flex flex-wrap items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-[11px]">
              <span className="font-medium text-accent">已选 {selected.size} 条</span>
              <button disabled={batchBusy} onClick={() => onBatchStatus('TRIAGED')}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:text-accent disabled:opacity-50">标记已分诊</button>
              <button disabled={batchBusy} onClick={() => onBatchStatus('IGNORED')}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-600 hover:text-slate-800 disabled:opacity-50">忽略</button>
              <button disabled={batchBusy} onClick={() => void loadPage(page)}
                className="ml-auto text-slate-400 hover:text-slate-700">取消选择</button>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              <Loader2 size={18} className="mx-auto mb-2 animate-spin" />加载中…
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ring-1 ring-emerald-100">
                <CheckCircle2 size={22} />
              </span>
              <p className="mt-3 text-[13px] font-medium text-slate-600">当前筛选下没有内容缺口</p>
              <p className="mt-1 text-[11px] text-slate-400">用户遇到未答、零引用、点踩或追问时会自动汇总到这里</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.06em] text-slate-400">
                  <tr className="border-b border-slate-100">
                    <th className="w-10 px-3 py-2.5"><input type="checkbox" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} aria-label="全选" /></th>
                    <th className="px-3 py-2.5 font-medium">问题</th>
                    <th className="w-16 px-2 py-2.5 text-right font-medium">频次</th>
                    <th className="w-28 px-2 py-2.5 font-medium">信号</th>
                    <th className="w-24 px-2 py-2.5 font-medium">状态</th>
                    <th className="w-24 px-2 py-2.5 font-medium">最近</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const sm = statusMeta(item.status);
                    return (
                      <tr key={item.id} className="border-b border-slate-100/80 align-top last:border-b-0 hover:bg-slate-50/60">
                        <td className="px-3 py-3"><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} aria-label={`选择 ${item.question}`} /></td>
                        <td className="max-w-[360px] px-3 py-3">
                          <button onClick={() => void openDetail(item.id)}
                            className="block text-left text-[13px] font-medium leading-snug text-slate-700 hover:text-accent">{item.question}</button>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                            {item.clusterLabel && <span className="inline-flex items-center gap-1"><Layers size={10} />{item.clusterLabel.slice(0, 24)}</span>}
                            {item.relatedDocIds && <span>文档 {item.relatedDocIds.split(',').length} 篇</span>}
                            {item.evalCaseId && <span className="text-violet-600">评测 #{item.evalCaseId}</span>}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right font-mono text-[12px] text-slate-500">{item.frequency}</td>
                        <td className="px-2 py-3">
                          <div className="flex flex-wrap gap-1">
                            {signalChips(item.signalSummary).map((s) => (
                              <span key={s.key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{s.label}{s.count > 1 ? `×${s.count}` : ''}</span>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3">
                          <select value={item.status} disabled={actionBusy} onChange={(e) => void onStatusChange(item.id, e.target.value as GapStatus)}
                            className={`rounded-md border px-1.5 py-1 text-[10px] outline-none ${sm.tone}`}>
                            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-[10px] text-slate-400">{formatDate(item.lastSeen)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <AdminPagination
            page={page}
            totalPages={totalPages}
            totalElements={total}
            pageSize={PAGE_SIZE}
            unit="条缺口"
            loading={loading}
            onPrev={() => void loadPage(page - 1)}
            onNext={() => void loadPage(page + 1)}
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <AdminCard title="主题聚类" description="本地 embedding 在线归并；同簇问题共享主题" icon={Layers} contentClassName="p-4">
            {clusters.length === 0 ? <p className="text-[11px] text-slate-400">暂无聚类，先积累一些信号。</p> : (
              <ul className="space-y-2">
                {clusters.slice(0, 8).map((c) => (
                  <li key={c.key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <div className="line-clamp-2 text-[11px] leading-snug text-slate-600">{c.label || c.key}</div>
                    <div className="mt-1 text-[10px] text-slate-400">{c.size} 个问题 · {formatDate(c.lastSeen)}</div>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
          <AdminCard title="处理指引" description="从缺口到评测闭环" icon={AlertTriangle} contentClassName="p-4">
            <ul className="space-y-2 text-[11px] leading-relaxed text-slate-500">
              <li className="flex gap-2"><span className="font-mono text-slate-300">01</span>高频缺口优先补文档，补完后在详情里标记「已解决」。</li>
              <li className="flex gap-2"><span className="font-mono text-slate-300">02</span>可转评测的缺口填写期望关键字，自动进 Golden Set。</li>
              <li className="flex gap-2"><span className="font-mono text-slate-300">03</span>点踩信号与反馈页同源，可交叉查看原对话。</li>
            </ul>
            <Link href="/admin/feedback" className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline">去看问答反馈 <ArrowRight size={12} /></Link>
          </AdminCard>
        </aside>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}>
          <div className="h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">缺口详情</div>
                <h2 className="mt-1 text-[17px] font-semibold leading-snug tracking-tight text-slate-900">{detail?.gap.question ?? '加载中…'}</h2>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="mt-12 text-center text-[13px] text-slate-400"><Loader2 size={18} className="mx-auto mb-2 animate-spin" />加载中…</div>
            ) : drawerError ? <p className="mt-4 text-sm text-red-500">{drawerError}</p> : detail ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="text-[10px] text-slate-400">累计频次</div><div className="mt-1 font-mono text-[18px] font-semibold text-slate-800">{detail.gap.frequency}</div></div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><div className="text-[10px] text-slate-400">状态</div><div className={`mt-1 inline-flex rounded-md border px-1.5 py-0.5 text-[11px] ${statusMeta(detail.gap.status).tone}`}>{statusMeta(detail.gap.status).label}</div></div>
                  <div className="col-span-2 rounded-lg bg-foreground/[0.03] p-2.5"><div className="text-[10px] text-slate-400">信号构成</div><div className="mt-1 flex flex-wrap gap-1">{signalChips(detail.gap.signalSummary).map((s) => <span key={s.key} className="rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-900/55">{s.label} ×{s.count}</span>)}</div></div>
                </div>

                <div className="mt-3 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-[11px] leading-5 text-slate-500">
                  <div>主题：{detail.gap.clusterLabel ?? detail.gap.clusterKey ?? '未聚类'}</div>
                  <div>相关文档：{detail.gap.relatedDocIds ?? '-'}</div>
                  <div>样本对话：{detail.gap.sampleConversationId ?? '-'}</div>
                  <div>首次 / 最近：{formatDate(detail.gap.firstSeen)} / {formatDate(detail.gap.lastSeen)}</div>
                </div>

                <div className="mt-5">
                  <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">流转状态</label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((s) => (
                      <button key={s.value} disabled={actionBusy || detail.gap.status === s.value} onClick={() => void onStatusChange(detail.gap.id, s.value)}
                        className={`rounded-md border px-2 py-1 text-[11px] disabled:opacity-40 ${s.tone}`}>{s.label}</button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-800"><Sparkles size={15} className="text-amber-500" /> 内容生产大纲</h3>
                 add_marker
                </div>

                <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/40 p-4">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-violet-800"><MessageCircleQuestion size={15} className="text-violet-500" /> 转为评测用例</h3>
                  {detail.gap.evalCaseId ? <p className="mt-2 text-xs text-violet-600">已转评测用例 #{detail.gap.evalCaseId}</p> : (
                    <>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">问题原文直接复用；填写一个能区分正确/错误答案的关键字（逗号分隔多个）。</p>
                      <input value={convertKeywords} onChange={(e) => setConvertKeywords(e.target.value)} placeholder="如：扩容、负载因子" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20" />
                      <input value={convertNote} onChange={(e) => setConvertNote(e.target.value)} placeholder="备注（可选）" className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent/20" />
                      <button onClick={() => void onConvert()} disabled={converting} className="mt-2 flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                        {converting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} 创建评测用例
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-5">
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">信号记录</h3>
                  <div className="mt-2 space-y-2">
                    {detail.events.length === 0 ? <p className="text-xs text-slate-400">暂无事件</p> : detail.events.map((event) => (
                      <div key={event.id} className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-[11px]">
                        <div className="flex items-center justify-between gap-2"><span className="font-medium text-slate-900/65">{SIGNAL_LABEL[event.signalType] ?? event.signalType}</span><span className="text-slate-900/35">{formatDate(event.createdDate)}</span></div>
                        {event.detail && <p className="mt-1 text-slate-500">{event.detail}</p>}
                        {(event.conversationId || event.feedbackId) && <p className="mt-1 text-slate-400">{event.conversationId ? `对话 ${event.conversationId.slice(0, 8)}…` : ''}{event.feedbackId ? ` · 反馈 #${event.feedbackId}` : ''}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
