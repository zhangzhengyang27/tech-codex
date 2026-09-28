import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCategoryBySlug, allCategories } from '@/lib/docs-config';
import { getSections } from '@/lib/docs-reader';
import type { DocSection } from '@/lib/docs-reader';

export function generateStaticParams() {
  return allCategories.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) return {};
  return {
    title: cat.title,
    description: cat.description || `${cat.title} 分类下的全部技术文档`,
    alternates: { canonical: `/docs/${category}` },
  };
}

/** 递归渲染章节（含嵌套子章节） */
function SectionBlock({
  section,
  category,
  depth,
}: {
  section: DocSection;
  category: string;
  depth: number;
}) {
  const headingCls =
    depth === 0
      ? 'mb-3 border-b border-border pb-2 text-lg font-semibold'
      : depth === 1
        ? 'mb-2 text-base font-semibold text-foreground/90'
        : 'mb-2 text-sm font-medium text-foreground/70';

  return (
    <section>
      {section.files.length > 0 && (
        <>
          <h2 className={headingCls}>{section.title}</h2>
          <ul className="grid gap-1">
            {section.files.map((file) => (
              <li key={file.slug}>
                <Link
                  href={`/docs/${category}/${section.slug === '_root' ? '' : section.slug + '/'}${file.slug}`}
                  className="block rounded-lg px-4 py-2 text-sm transition-colors hover:bg-muted hover:text-accent"
                >
                  {file.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {section.children.length > 0 && (
        <div className={depth === 0 ? 'mt-5 space-y-6' : 'mt-4 space-y-5 border-l border-border pl-4'}>
          {section.children.map((child) => (
            <SectionBlock key={child.slug} section={child} category={category} depth={depth + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) notFound();

  const sections = getSections(category);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground/50">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-0.5">/</span>
        <span className="text-foreground">{cat.title}</span>
      </nav>

      <header className="mb-10">
        <h1 className="text-3xl font-bold">
          <span className="mr-3">{cat.icon}</span>
          {cat.title}
        </h1>
        <p className="mt-2 text-foreground/60">{cat.description}</p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <SectionBlock key={section.slug} section={section} category={category} depth={0} />
        ))}
      </div>
    </main>
  );
}
