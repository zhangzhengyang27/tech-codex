'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { getHighlighter, normalizeShikiLang } from '@/lib/shiki-highlighter';

interface CodeGroupItem {
  lang: string;
  label: string;
  code: string;
}

/** HTML 转义（无对应语言高亮时的纯文本回退） */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 高亮结果缓存（lang\0code → shiki html）：SSR 后首帧无缓存走纯文本兜底，
 *  tab 来回切换 / 卸载重挂时直接命中缓存，不再重复请求 Shiki 解析 */
const highlightCache = new Map<string, string>();

/** 一次高亮解析（优先读缓存），返回 <pre class="shiki">…完整 html */
async function resolveHighlight(code: string, lang: string): Promise<string> {
  const key = `${lang}\u0000${code}`;
  const cached = highlightCache.get(key);
  if (cached !== undefined) return cached;

  const hl = await getHighlighter();
  // 别名归一化（js→javascript、sh→bash 等）；归一化后仍未加载的语言回退纯文本
  const norm = normalizeShikiLang(lang);
  const loaded = hl.getLoadedLanguages().includes(norm as never);
  const html = loaded
    ? hl.codeToHtml(code, { lang: norm, theme: 'github-dark' })
    : `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  highlightCache.set(key, html);
  return html;
}

interface HighlightEntry {
  code: string;
  lang: string;
  html: string;
}

/** VitePress 代码组（::: code-group）：标签页切换 + 语法高亮 */
export function CodeGroup({ 'data-items': dataItems }: { 'data-items'?: string }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  // items 经 JSON 字符串传递（数组无法直接穿透 hast 属性）
  const items = useMemo<CodeGroupItem[]>(() => {
    try {
      return JSON.parse(dataItems || '[]');
    } catch {
      return [];
    }
  }, [dataItems]);

  const activeCode = items?.[active]?.code ?? '';
  const activeLang = items?.[active]?.lang ?? 'plaintext';

  // 高亮结果记录其对应的 code/lang：与当前激活 tab 不一致时（SSR 首帧、tab 刚切换、
  // 解析未完成）一律渲染纯文本兜底，避免 SSR 空白与旧 tab 内容残留。
  // 初始化器同步读缓存：客户端二次进入（缓存已热）时首帧即出高亮，SSR 首帧缓存必为空，
  // 与服务端输出一致，无 hydration 风险。
  const [entry, setEntry] = useState<HighlightEntry | null>(() => {
    const cached = highlightCache.get(`${activeLang}\u0000${activeCode}`);
    return cached !== undefined ? { code: activeCode, lang: activeLang, html: cached } : null;
  });

  // 切换标签或首次渲染时解析当前代码（Shiki 异步；setState 均发生在异步回调内）
  useEffect(() => {
    let cancelled = false;
    resolveHighlight(activeCode, activeLang)
      .then((html) => {
        if (!cancelled) setEntry({ code: activeCode, lang: activeLang, html });
      })
      .catch(() => {
        if (!cancelled) {
          setEntry({ code: activeCode, lang: activeLang, html: `<pre class="shiki"><code>${escapeHtml(activeCode)}</code></pre>` });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeCode, activeLang]);

  if (!items || items.length === 0) return null;

  const entryValid = entry !== null && entry.code === activeCode && entry.lang === activeLang;

  const handleCopy = async () => {
    const current = items[active];
    if (!current) return;
    try {
      await navigator.clipboard.writeText(current.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117]">
      <div className="flex items-center border-b border-[#21262d] pr-3">
        <div className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
          {items.map((it, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActive(idx)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs transition-colors ${
                idx === active
                  ? 'border-[#e6edf3] font-medium text-[#e6edf3]'
                  : 'border-transparent text-[#8b949e] hover:text-[#adbac7]'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          title="复制代码"
          aria-label="复制代码"
          className="ml-2 shrink-0 text-[#6e7681] transition-colors hover:text-[#e6edf3]"
        >
          {copied ? <Check className="h-[15px] w-[15px] text-[#3fb950]" /> : <Copy className="h-[15px] w-[15px]" />}
        </button>
      </div>
      {entryValid ? (
        <pre className="code-card-pre overflow-auto p-4 text-[13px] leading-[1.7]">
          <code dangerouslySetInnerHTML={{ __html: entry!.html }} />
        </pre>
      ) : (
        <pre className="code-card-pre overflow-auto p-4 text-[13px] leading-[1.7]">
          <code>{activeCode}</code>
        </pre>
      )}
    </div>
  );
}
