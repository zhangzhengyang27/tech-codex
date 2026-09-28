'use client';

import { useEffect, useRef, useState } from 'react';
import { getHighlighter } from '@/lib/shiki-highlighter';

/**
 * 统一的客户端懒高亮代码块。
 *
 * 背景：服务端若用 rehype-pretty-code 给每个 token 生成 <span>，重型文档 HTML 可达数 MB。
 * 改为服务端只输出纯文本，客户端用 IntersectionObserver 在代码块进入视口时才做 Shiki 高亮，
 * 既大幅降低首屏 HTML 体积与 DOM 节点数，又不牺牲滚动到代码时的彩色高亮。
 *
 * 说明：
 * - SSR 阶段输出纯文本 <pre><code>{code}</code></pre>，与首帧一致，避免 hydration 报错；
 * - 进入视口后调用 Shiki，得到的高亮 html 提取出 <code> 内部片段，经 dangerouslySetInnerHTML 渲染，
 *   让 React 完全接管高亮结果，避免手动 DOM 操作与 React 重渲染冲突。
 */

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
  // null 表示尚未高亮（渲染纯文本），字符串表示高亮后的 <code> 内部 html
  const [codeHtml, setCodeHtml] = useState<string | null>(null);

  useEffect(() => {
    const el = preRef.current;
    if (!el || codeHtml !== null) return;

    let done = false;
    let observer: IntersectionObserver | null = null;

    const run = () => {
      if (done) return;
      done = true;
      observer?.disconnect();
      getHighlighter()
        .then((hl) => {
          const loaded = hl.getLoadedLanguages().includes(lang as never);
          const out = hl.codeToHtml(code, { lang: loaded ? lang : 'text', theme: 'github-dark' });
          // Shiki 输出为 <pre class="shiki"><code>…</code></pre>，提取 <code> 内部 html
          const m = /<code[^>]*>([\s\S]*?)<\/code>/.exec(out);
          setCodeHtml(m ? m[1] : escapeHtml(code));
        })
        .catch(() => setCodeHtml(escapeHtml(code)));
    };

    if (typeof IntersectionObserver === 'undefined') {
      run();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) run();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);

    return () => observer?.disconnect();
  }, [code, lang, codeHtml]);

  return (
    <pre ref={preRef} className={className}>
      {codeHtml === null ? (
        <code>{code}</code>
      ) : (
        <code dangerouslySetInnerHTML={{ __html: codeHtml }} />
      )}
    </pre>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
