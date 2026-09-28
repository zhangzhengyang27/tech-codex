import { docGroups, type DocGroup } from '@/lib/docs-config';
import { getDocsSnapshot, type CategoryFileItem } from '@/lib/docs-reader';
import { getRecentUpdates } from '@/lib/recent-updates';
import { HomeExplorer } from '@/components/home/home-explorer';

/** 带文件列表的首页分组结构 */
export interface HomeGroup extends DocGroup {
  categories: (DocGroup['categories'][number] & { files: CategoryFileItem[] })[];
}

export default function HomePage() {
  const { stats, filesBySlug } = getDocsSnapshot();
  const updates = getRecentUpdates(12);

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
