'use client';

import { useEffect, useRef, useState } from 'react';
import { getHighlighter, normalizeShikiLang } from '@/lib/shiki-highlighter';

/**
 * 统一的客户端懒高亮代码块。
 *
 * 背景：服务端若用 rehype-pretty-code 给每个 token 生成 <span>，重型文档 HTML 可达数 MB。
 * 改为服务端只输出纯文本，客户端用 IntersectionObserver 在代码块进入视口时才做 Shiki 高亮，
 * 既大幅降低首屏 HTML 体积与 DOM 节点数，又不牺牲滚动到代码时的彩色高亮。
 *
 * 说明：
 * - SSR 阶段输出纯文本 <pre><code>{code}</code></pre>，与首帧一致，避免 hydration 报错；
 * - 进入视口后调用 Shiki，得到的高亮 html 提取出 <code> 内部片段存入 entry（记录其对应的
 *   code/lang），渲染时按 entry 是否匹配当前 props 派生：不匹配一律回退纯文本。
 *   因此跨文档导航复用实例 / 流式更新 code 时旧高亮立刻失效并自动重新走高亮流程，
 *   异步回调经 cancelled 标志防止旧响应覆盖新值（修复 code 变化后永不重高亮的问题）。
 */

export interface HighlightEntry {
  /** 产生该高亮结果时的纯文本代码 */
  code: string;
  /** 产生该高亮结果时的语言 */
  lang: string;
  /** Shiki 输出 <code> 内部 html（或纯文本回退的转义 html） */
  html: string;
}

/** entry 是否已过期（为空或与当前 code/lang 不一致）——过期则渲染纯文本并重新调度高亮 */
export function isHighlightStale(entry: HighlightEntry | null, code: string, lang: string): boolean {
  return entry === null || entry.code !== code || entry.lang !== lang;
}

/* ---------- 共享 IntersectionObserver 单例（P2-7：避免每个代码块各建一个 observer） ---------- */

type VisibleCallback = () => void;
const pendingVisible = new Map<Element, VisibleCallback>();
let sharedObserver: IntersectionObserver | null = null;

/**
 * 在元素进入视口时触发一次 onVisible（触发后自动解除监听）。
 * 返回解除监听的清理函数；行为与「每实例一个 IntersectionObserver + 首次命中后 disconnect」等价。
 */
function observeOnce(el: Element, onVisible: VisibleCallback): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    onVisible();
    return () => {};
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cb = pendingVisible.get(entry.target);
          if (!cb || !entry.isIntersecting) continue;
          pendingVisible.delete(entry.target);
          sharedObserver?.unobserve(entry.target);
          cb();
        }
      },
      { rootMargin: '200px' }
    );
  }
  pendingVisible.set(el, onVisible);
  sharedObserver.observe(el);
  return () => {
    pendingVisible.delete(el);
    sharedObserver?.unobserve(el);
  };
}

/* ---------- 高亮调度（独立导出，便于在 node 环境模拟状态流转做单测） ---------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function highlightToInnerHtml(
  getHl: () => Promise<HighlighterLike>,
  code: string,
  lang: string
): Promise<string> {
  const hl = await getHl();
  // 别名归一化（js→javascript、sh→bash 等）；归一化后仍未加载的语言回退纯文本
  const norm = normalizeShikiLang(lang);
  const loaded = hl.getLoadedLanguages().includes(norm as never);
  const out = hl.codeToHtml(code, { lang: loaded ? norm : 'text', theme: 'github-dark' });
  // Shiki 输出为 <pre class="shiki"><code>…</code></pre>，提取 <code> 内部 html
  const m = /<code[^>]*>([\s\S]*?)<\/code>/.exec(out);
  return m ? m[1] : escapeHtml(code);
}

interface HighlighterLike {
  getLoadedLanguages(): string[];
  codeToHtml(code: string, options: { lang: string; theme: string }): string;
}

/**
 * 调度高亮：元素进入视口后请求 Shiki 并把结果写入 setEntry。
 * 返回清理函数——置位 cancelled，保证「code 已变化但旧 Shiki 响应晚到」时不覆盖新值。
 */
export function scheduleLazyHighlight(params: {
  code: string;
  lang: string;
  el: Element | null;
  setEntry: (entry: HighlightEntry) => void;
  /** 仅供单测注入；默认共享模块单例 */
  getHighlighter?: () => Promise<HighlighterLike>;
  /** 仅供单测注入；默认 observeOnce */
  observe?: (el: Element, onVisible: () => void) => () => void;
}): () => void {
  const { code, lang, el, setEntry } = params;
  const getHl = params.getHighlighter ?? getHighlighter;
  const observe = params.observe ?? observeOnce;
  let cancelled = false;
  const cleanup = () => {
    cancelled = true;
  };

  if (!el) return cleanup;

  const run = () => {
    if (cancelled) return;
    highlightToInnerHtml(getHl, code, lang)
      .then((html) => {
        if (!cancelled) setEntry({ code, lang, html });
      })
      .catch(() => {
        if (!cancelled) setEntry({ code, lang, html: escapeHtml(code) });
      });
  };

  if (typeof IntersectionObserver === 'undefined') {
    run();
    return cleanup;
  }

  const stop = observe(el, run);
  return () => {
    cancelled = true;
    stop();
  };
}

/* ---------- 组件 ---------- */

interface LazyCodeBlockProps {
  /** 纯文本代码 */
  code: string;
  /** 语言标识（如 javascript / vue / plaintext） */
  lang?: string;
  /** 附加到 <pre> 的类名（用于覆盖 code-card-pre 等样式） */
  className?: string;
}

export function LazyCodeBlock({ code, lang = 'plaintext', className }: LazyCodeBlockProps) {
  const preRef = useRef<HTMLPreElement>(null);
  // null 表示尚未高亮（渲染纯文本）；有值时按 entry.code/lang 与当前 props 是否一致判断新旧
  const [entry, setEntry] = useState<HighlightEntry | null>(null);

  useEffect(() => {
    return scheduleLazyHighlight({ code, lang, el: preRef.current, setEntry });
  }, [code, lang]);

  const stale = isHighlightStale(entry, code, lang);

  return (
    <pre ref={preRef} className={className}>
      {stale ? (
        <code>{code}</code>
      ) : (
        <code dangerouslySetInnerHTML={{ __html: entry!.html }} />
      )}
    </pre>
  );
}
