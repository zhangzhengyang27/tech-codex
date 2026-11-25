import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MarkdownAsync as ReactMarkdown } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { getCategoryBySlug } from '@/lib/docs-config';
import { getDocContent, getDocPaths, getSections } from '@/lib/docs-reader';
import { docHref, flattenDocFiles, neighborsOf } from '@/lib/doc-neighbors';
import { excerptOf } from '@/lib/site';
import { relatedDocs } from '@/lib/related-docs';
import { Toc } from '@/components/ui/toc';
import { extractToc } from '@/lib/toc';
import { CodeCard } from '@/components/ui/code-card';
import { MermaidBlock } from '@/components/ui/mermaid-block';
import { VpContainer } from '@/components/ui/vp-container';
import { CodeGroup } from '@/components/ui/code-group';
import { DocAskPanel } from '@/components/docs/doc-ask';
import { LearningGuideButton } from '@/components/docs/learning-guide';
import { FavoriteButton } from '@/components/docs/favorite-button';
import { remarkVitepressContainers, normalizeVitepressContainers } from '@/lib/remark-vitepress-containers';
import { remarkDocLinks } from '@/lib/remark-doc-links';
import type { Components } from 'react-markdown';

/** 正文与站内链接目标都来自数据库，构建期无内容源，必须运行时渲染。 */
export const dynamic = 'force-dynamic';

/** 重型交互组件按需分包：仅当文档真实出现 html/vue 代码块时才加载对应 chunk。
 *  注意：预览弹窗组件内部依赖 React 状态，必须保留 SSR（不能 ssr:false），
 *  否则会因服务端/客户端渲染结果不一致报 hydration 错误。 */
const HtmlPreview = nextDynamic(
  () => import('@/components/ui/html-preview').then((m) => m.HtmlPreview),
  { ssr: true }
);
const VuePreview = nextDynamic(
  () => import('@/components/ui/vue-preview').then((m) => m.VuePreview),
  { ssr: true }
);

/** 从 code 节点的 className 提取语言标识（react-markdown 默认为 language-xxx 形式） */
function getLangFromClassName(className?: string): string {
  if (!className) return '';
  const m = /language-([\w-]+)/.exec(className);
  return m ? m[1] : '';
}

/** 自定义渲染：所有代码块统一为深色卡片风格，右上角悬浮控件（html 预览 / js 运行 / 其他复制）。
 *  不再使用服务端 rehype-pretty-code 高亮：code 节点保持纯文本，展示交给 LazyCodeBlock 懒高亮。 */
const markdownComponents: Components = {
  // 外层 pre 脱壳（避免 .prose-doc pre 深色背景），统一包装为卡片
  pre({ children, node: _node, ...props }) {
    const child = Array.isArray(children) ? children[0] : children;
    if (child && typeof child === 'object' && 'props' in child) {
      const childProps = child as { props: Record<string, unknown>; children?: React.ReactNode };
      const lang = getLangFromClassName(childProps.props.className as string | undefined);
      // 纯文本 code：去掉末尾换行（markdown 围栏内的首个换行）
      const codeText = extractCodeText(childProps.props.children as React.ReactNode).replace(/\n$/, '');
      // html/vue 代码块 → code 组件会返回预览组件，直接脱壳透传
      if (lang === 'html' || lang === 'vue') return <>{children}</>;
      // mermaid 代码块 → 渲染为图表
      if (lang === 'mermaid') {
        return <MermaidBlock code={codeText} />;
      }
      // 其他代码块 → 统一深色卡片（传入纯文本供复制/运行/懒高亮）
      return <CodeCard lang={lang || 'code'} code={codeText} />;
    }
    return <pre {...props}>{children}</pre>;
  },
  code({ className, children, node: _node, ...props }) {
    const lang = getLangFromClassName(className);
    // html 代码块渲染为预览组件（code 传纯文本用于 iframe 与懒高亮展示）
    if (lang === 'html') {
      const codeText = extractCodeText(children).replace(/\n$/, '');
      return <HtmlPreview code={codeText} />;
    }
    // vue 代码块渲染为 SFC 实时预览组件
    if (lang === 'vue') {
      const codeText = extractCodeText(children).replace(/\n$/, '');
      return <VuePreview code={codeText} />;
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  // VitePress 自定义容器与代码组（由 remarkVitepressContainers 插件生成的自定义节点）
  vpcontainer: VpContainer,
  vpcodegroup: CodeGroup,
} as Components;

/** 提取 code 节点的纯文本（无高亮时 children 为字符串，这里做防御性兼容） */
function extractCodeText(children: React.ReactNode): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractCodeText).join('');
  if (typeof children === 'object' && 'props' in children) {
    return extractCodeText((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return '';
}

/** 详情页 SEO 元数据：标题取文档标题，摘要取正文首段纯文本（正文 heading 之外的段落）。 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string[] }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) return {};
  // Next.js(Turbopack)传入的 catch-all 参数为 percent-encoded 原始段，须解码；
  // try/catch 容错：URL 里未编码的裸 % 序列不再导致 500，按原文处理
  const slugPath = slug.map((s) => { try { return decodeURIComponent(s); } catch { return s; } }).join('/');
  const doc = await getDocContent(`${cat.dir}/${slugPath}.md`);
  // 不存在的文档在 metadata 阶段就判 404：docs 路由有 loading.tsx 会提前流式输出，
  // 等 page 体再调 notFound() 时响应头已发出 200，状态码改不回来（页面内容仍是 404）。
  if (!doc) notFound();
  const description = excerptOf(doc.content) || `${cat.title} · ${doc.title}`;
  return {
    title: doc.title,
    description,
    alternates: { canonical: `/docs/${category}/${slugPath}` },
    openGraph: {
      title: doc.title,
      description,
      type: 'article',
      url: `/docs/${category}/${slugPath}`,
    },
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ category: string; slug: string[] }>;
}) {
  const { category, slug } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) notFound();

  // Next.js(Turbopack)传入的 catch-all 参数为 percent-encoded 原始段，须解码；
  // try/catch 容错：URL 里未编码的裸 % 序列不再导致 500，按原文处理
  const slugPath = slug.map((s) => { try { return decodeURIComponent(s); } catch { return s; } }).join('/');
  const relativePath = `${cat.dir}/${slugPath}.md`;
  const doc = await getDocContent(relativePath);
  if (!doc) notFound();

  const tocItems = extractToc(doc.content);
  // 相对链接重写需要“哪些路径真实存在”，DB-only 下用数据库已发布路径集合判断
  const knownPaths = await getDocPaths();
  // 相关文档：同分类内标题词元重叠度 top3（复用内容索引缓存，无额外 IO）
  const related = await relatedDocs(category, slugPath, doc.title);
  // 上一篇/下一篇：分类内按侧栏顺序线性排列，连续阅读不必回目录找下一节。
  // getSections 与侧栏共用同一份快照缓存，这里不产生额外数据库请求。
  const { prev, next } = neighborsOf(flattenDocFiles(await getSections(category)), relativePath);

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-10">
      {/* 文档正文 */}
      <main className="min-w-0 flex-1 px-1 py-6 lg:px-0 lg:py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/60">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-0.5">/</span>
          <Link href={`/docs/${category}`} className="hover:text-accent">
            {cat.title}
          </Link>
          <span className="mx-0.5">/</span>
          <span className="text-foreground">{doc.title}</span>
          {/* 收藏星标：仅登录用户且文档已入知识库时可见（内部自判断） */}
          <FavoriteButton docPath={relativePath} />
          <LearningGuideButton docPath={relativePath} docTitle={doc.title} />
        </nav>

        <article className="prose-doc">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkVitepressContainers, remarkDocLinks(relativePath, knownPaths)]}
            rehypePlugins={[rehypeSlug]}
            components={markdownComponents}
          >
            {normalizeVitepressContainers(doc.content)}
          </ReactMarkdown>
        </article>

        {/* 相邻篇章：与侧栏同一顺序，首/末篇各缺一侧时用空占位保持两列不塌陷 */}
        {(prev || next) && (
          <nav className="mt-12 grid gap-3 border-t border-border pt-6 sm:grid-cols-2" aria-label="相邻文档">
            {prev ? (
              <Link
                href={docHref(category, cat.dir, prev.path)}
                className="group rounded-lg border border-border p-4 transition-colors hover:border-accent/40"
              >
                <span className="text-xs text-foreground/60">上一篇</span>
                <p className="mt-1 line-clamp-1 text-sm font-medium group-hover:text-accent">{prev.title}</p>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={docHref(category, cat.dir, next.path)}
                className="group rounded-lg border border-border p-4 text-right transition-colors hover:border-accent/40"
              >
                <span className="text-xs text-foreground/60">下一篇</span>
                <p className="mt-1 line-clamp-1 text-sm font-medium group-hover:text-accent">{next.title}</p>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {related.length > 0 && (
          <section className="mt-12 border-t border-border pt-6">
            <h2 className="text-sm font-semibold text-foreground/70">相关文档</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group rounded-lg border border-border bg-muted/30 p-3 text-sm transition-colors hover:border-accent/40"
                >
                  <span className="line-clamp-2 group-hover:text-accent">{r.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 目录栏 */}
      <aside className="hidden xl:block w-56 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-10">
          <Toc items={tocItems} />
        </div>
      </aside>

      {/* 问这篇文档：检索范围锁定当前文档的悬浮问答面板 */}
      <DocAskPanel docPath={relativePath} docTitle={doc.title} />
    </div>
  );
}
