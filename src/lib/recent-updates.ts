import { getAllContentIndex } from '@/lib/docs-reader';
import { getCategoryBySlug } from './docs-config';

export interface RecentUpdate {
  type: 'new' | 'modified';
  /** 所属模块标签（分类标题兜底） */
  module: string;
  /** 文档标题 */
  title: string;
  /** 变更说明（CMS 摘要，缺省时用固定文案） */
  description: string;
  /** 可跳转的文档链接 */
  href?: string;
}

/**
 * “最近更新”流（DB-only 版）。
 *
 * 旧实现从 git log 提取提交说明；容器内没有 .git，且内容现在由 CMS 在线发布，
 * git 历史不再是内容真相。改为按数据库 updatedDate/publishedAt 排序，说明取 CMS description。
 * 数据库没有稳定的“首次发布”标记，统一标记为 modified，避免为展示文案引入额外版本表扫描。
 */
export async function getRecentUpdates(limit = 12): Promise<RecentUpdate[]> {
  const docs = await getAllContentIndex();
  const entries: (RecentUpdate & { date: number })[] = [];

  for (const doc of docs) {
    if (!doc.categorySlug || !doc.path) continue;
    const cat = getCategoryBySlug(doc.categorySlug);
    if (!cat || !doc.path.startsWith(`${cat.dir}/`)) continue;
    const rel = doc.path.slice(cat.dir.length + 1).replace(/\.md$/, '');
    const date = Date.parse(doc.updatedDate ?? doc.publishedAt ?? doc.createdDate ?? '');
    if (Number.isNaN(date)) continue;
    entries.push({
      type: 'modified',
      module: cat.title,
      title: doc.title?.trim() || rel.split('/').pop() || rel,
      description: doc.description?.trim() || '内容已更新',
      href: `/docs/${cat.slug}/${rel.split('/').map(encodeURIComponent).join('/')}`,
      date,
    });
  }

  entries.sort((a, b) => b.date - a.date);
  return entries.slice(0, limit).map(({ date: _date, ...u }) => u);
}
