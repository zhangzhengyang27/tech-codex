'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { getHighlighter } from '@/lib/shiki-highlighter';

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

/** VitePress 代码组（::: code-group）：标签页切换 + 语法高亮 */
export function CodeGroup({ 'data-items': dataItems }: { 'data-items'?: string }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState('');

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

  // 切换标签或首次渲染时高亮当前代码（Shiki 异步）
  useEffect(() => {
    let cancelled = false;
    getHighlighter()
      .then((hl) => {
        if (cancelled) return;
        if (hl.getLoadedLanguages().includes(activeLang as never) || activeLang === 'plaintext') {
          const out = hl.codeToHtml(activeCode, {
            lang: hl.getLoadedLanguages().includes(activeLang as never) ? activeLang : 'text',
            theme: 'github-dark',
          });
          setHtml(out);
        } else {
          setHtml(`<pre class="shiki"><code>${escapeHtml(activeCode)}</code></pre>`);
        }
      })
      .catch(() => {
        if (!cancelled) setHtml(`<pre class="shiki"><code>${escapeHtml(activeCode)}</code></pre>`);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCode, activeLang]);

  if (!items || items.length === 0) return null;

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
      <pre className="code-card-pre overflow-auto p-4 text-[13px] leading-[1.7]">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}
