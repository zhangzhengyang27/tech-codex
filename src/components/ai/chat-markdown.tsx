'use client';

/**
 * AI 回答的 Markdown 渲染器。
 * 复用文档站的 prose-doc 排版样式与 LazyCodeBlock 懒高亮，暂不启用重型交互组件（vp-container/代码组等）。
 */
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LazyCodeBlock } from '@/components/ui/lazy-code-block';

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

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="prose-doc !text-[13.5px] leading-relaxed">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 代码块：用深色容器包裹，交给 LazyCodeBlock 懒高亮。
          // 高亮主题是 github-dark（浅色 token），必须配深色底否则文字压白底看不清，
          // 与文档站 CodeCard 的深色卡片一致。
          pre({ children }) {
            const codeEl = (children as unknown as { props?: { children?: unknown; className?: string } })
              ?.props;
            const code = typeof codeEl?.children === 'string' ? codeEl.children : '';
            return (
              <div className="my-2.5 overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117]">
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
        {normalizeAtxHeadings(content)}
      </Markdown>
    </div>
  );
}