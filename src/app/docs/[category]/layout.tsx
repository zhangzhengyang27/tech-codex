import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/docs-config';
import { getSections } from '@/lib/docs-reader';
import { DocsSidebar } from '@/components/ui/docs-sidebar';
import { MobileDocsDrawer } from '@/components/ui/mobile-docs-drawer';

export default async function CategoryLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategoryBySlug(category);
  if (!cat) notFound();

  const sections = getSections(category);

  return (
    <div className="flex flex-col gap-0 px-4 md:flex-row md:gap-8 md:px-8 lg:pr-8 xl:pr-12">
      {/* 侧边栏 */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-8 pr-2">
          <p className="mb-3 px-2.5 text-xs font-semibold uppercase tracking-wider text-foreground/40">
            {cat.icon} {cat.title}
          </p>
          <DocsSidebar categorySlug={category} sections={sections} />
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="min-w-0 flex-1">
        <MobileDocsDrawer
          categorySlug={category}
          categoryTitle={`${cat.icon} ${cat.title}`}
          sections={sections}
        />
        {children}
      </div>
    </div>
  );
}
