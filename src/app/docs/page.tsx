import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronRight, FileText } from 'lucide-react';
import { categoryIcon } from '@/lib/category-icons';
import { docGroups } from '@/lib/docs-config';
import { getDocsStats } from '@/lib/docs-reader';

/**
 * 文档总览页（/docs）：补齐此前缺失的一级入口。
 *
 * 为什么必须存在：`/docs` 此前没有 page.tsx，直接访问会落到默认 notFound，
 * 而对外的旧链接、搜索引擎收录、以及用户手动截断 URL 都会命中这个路径。
 * 分类详情页（/docs/[category]）只能承接已知分类，接不住"我想从头看"的需求。
 *
 * 数据来源与首页一致（getDocsStats 走数据库），因此同样是运行时渲染，
 * 不能在构建期静态化，否则文档增删后计数会失真。
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '文档总览',
  description: '按技术方向浏览全部技术文档。',
  alternates: { canonical: '/docs' },
};

export default async function DocsIndexPage() {
  const stats = await getDocsStats();

  // hidden 分类只用于路由承接与站内导航，不在总览里出现，避免把"隐藏目录"重新暴露成入口。
  const groups = docGroups
    .map((group) => ({
      ...group,
      categories: group.categories.filter((category) => !category.hidden),
    }))
    .filter((group) => group.categories.length > 0);

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-8 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-xs text-foreground/60">
        <Link href="/" className="transition-colors hover:text-accent">
          首页
        </Link>
        <span>/</span>
        <span className="text-foreground/70">文档总览</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">文档总览</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/60">
          全站 {stats.total} 篇文档，按技术方向逐级进入；
          也可以回到首页用搜索直达具体文章。
        </p>
      </header>

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.id}>
            <div className="mb-4 border-b border-border pb-3">
              <h2 className="text-lg font-semibold">{group.title}</h2>
              {group.description && (
                <p className="mt-1 text-xs text-foreground/60">{group.description}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.categories.map((category) => {
                const count = stats.byDir[category.dir] ?? 0;
                const CategoryIcon = categoryIcon(category.slug);
                return (
                  <Link
                    key={category.slug}
                    href={`/docs/${category.slug}`}
                    className="group flex items-start gap-3 rounded-lg border border-border bg-background p-4 transition-colors hover:border-accent/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <CategoryIcon size={20} className="text-accent" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{category.title}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-foreground/60">
                          <FileText size={11} />
                          {count}
                        </span>
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-foreground/60">
                        {category.description}
                      </span>
                    </span>

                    <ChevronRight
                      size={16}
                      className="mt-1 shrink-0 text-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                    />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
