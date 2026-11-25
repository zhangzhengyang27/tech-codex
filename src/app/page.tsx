import { docGroups, type DocGroup } from '@/lib/docs-config';
import { getDocsSnapshot, type CategoryFileItem } from '@/lib/docs-reader';
import { getRecentUpdates } from '@/lib/recent-updates';
import { HomeExplorer } from '@/components/home/home-explorer';

/** 首页索引来自数据库，构建期无内容源，必须运行时渲染。 */
export const dynamic = 'force-dynamic';

/** 带文件列表的首页分组结构 */
export interface HomeGroup extends DocGroup {
  categories: (DocGroup['categories'][number] & { files: CategoryFileItem[] })[];
}

export default async function HomePage() {
  const { stats, filesBySlug } = await getDocsSnapshot();
  // 首页只留最近 8 篇：更多内容交给 /docs 总览，让首页保持"入口"而不是列表页
  const updates = await getRecentUpdates(8);

  const groups: HomeGroup[] = docGroups.map((g) => ({
    ...g,
    categories: g.categories.map((c) => ({
      ...c,
      files: filesBySlug.get(c.slug) ?? [],
    })),
  }));

  return (
    <main>
      <HomeExplorer groups={groups} stats={stats} updates={updates} />
    </main>
  );
}
