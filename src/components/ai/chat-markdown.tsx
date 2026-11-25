'use client';

/**
 * AI 回答的 Markdown 渲染器。
 * 复用文档站的 prose-doc 排版样式与 LazyCodeBlock 懒高亮，暂不启用重型交互组件（vp-container/代码组等）。
 */
import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LazyCodeBlock } from '@/components/ui/lazy-code-block';
import { linkifyCitations } from '@/lib/citation';
import type { KbChunkHit } from '@/lib/auth';

/** 类名是否带语言标识（language-xxx / lang-xxx） */
function resolveLang(className?: string): string | undefined {
  if (!className) return undefined;
  const m = /\b(?:language-|lang-)([\w+-]+)/.exec(className);
  return m ? m[1] : undefined;
}

/**
 * 兼容 LLM 中文输出的 ATX 标题缺空格问题：`###一、概念说明` 这类写法
 * 按 CommonMark 不是标题（`#` 后必须有空格），会整行以裸 `###` 文本渲染。
 * 这里在 `#` 与紧随的非空白字符之间补一个空格。
 * 代码围栏内不动（bash 注释等以 # 开头的内容是代码本身），未闭合的尾部围栏也算围栏内。
 */
export function normalizeAtxHeadings(md: string): string {
  const parts = md.split(/(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$))/g);
  return parts
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/^(#{1,6})(?=[^\s#])/gm, '$1 ')))
    .join('');
}

/** 流式渲染节流阈值：距上次实际渲染 ≥120ms 或内容增量 ≥80 字符才重新全量 reparse */
const THROTTLE_MS = 120;
const THROTTLE_MIN_DELTA = 80;

export function ChatMarkdown({
  content,
  sources,
  urlMap,
}: {
  content: string;
  /** 本轮引用来源；传入后把正文 [n] 渲染为可点击角标 */
  sources?: KbChunkHit[];
  /** 来源 filePath → 文档 URL（由父组件批量反查） */
  urlMap?: Record<string, string | null>;
}) {
  // 流式回答约每 33ms 追加一个 token，逐帧全量 reparse markdown 开销大：
  // 对传给 react-markdown 的文本做节流（时间或增量达标才更新），流结束后由尾帧
  // 定时器强制渲染最终值，最终渲染结果不变。
  const [renderText, setRenderText] = useState(content);
  const lastFlushRef = useRef({ text: content, len: content.length, at: 0 });

  useEffect(() => {
    if (content === lastFlushRef.current.text) return;
    const sinceFlush = Date.now() - lastFlushRef.current.at;
    const delta = content.length - lastFlushRef.current.len;
    // 内容回退/重置（如新一轮回答清空）立即渲染，不节流
    const flushNow =
      sinceFlush >= THROTTLE_MS ||
      Math.abs(delta) >= THROTTLE_MIN_DELTA ||
      content.length < lastFlushRef.current.len;
    const timer = setTimeout(
      () => {
        lastFlushRef.current = { text: content, len: content.length, at: Date.now() };
        setRenderText(content);
      },
      flushNow ? 0 : THROTTLE_MS - sinceFlush
    );
    return () => clearTimeout(timer);
  }, [content]);

  return (
    <div className="prose-doc !text-[13.5px] leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 引用角标/普通 Markdown 链接：统一 accent 色。
          // 新窗口打开：回答里的链接多为站内文档，同页跳转会卸载对话页、丢失当前会话上下文
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="mx-0.5 text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                {children}
              </a>
            );
          },
          // 代码块：用深色容器包裹，交给 LazyCodeBlock 懒高亮。
          // 高亮主题是 github-dark（浅色 token），必须配深色底否则文字压白底看不清，
          // 与文档站 CodeCard 的深色卡片一致。
          pre({ children }) {
            const codeEl = (children as unknown as { props?: { children?: unknown; className?: string } })
              ?.props;
            const code = typeof codeEl?.children === 'string' ? codeEl.children : '';
            return (
              <div className="my-2.5 overflow-hidden rounded-lg border border-code-border bg-code-bg">
                <LazyCodeBlock
                  code={code}
                  lang={resolveLang(codeEl?.className) ?? 'plaintext'}
                  className="code-card-pre overflow-auto p-3.5 text-[12.5px] leading-[1.7]"
                />
              </div>
            );
          },
        }}
      >
        {linkifyCitations(normalizeAtxHeadings(renderText), sources, urlMap)}
      </Markdown>
    </div>
  );
}
