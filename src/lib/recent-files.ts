import { getAllContentIndex } from '@/lib/docs-reader';
import { getCategoryBySlug } from '@/lib/docs-config';

export interface RecentDoc {
  /** 分类 slug（URL 第一段） */
  category: string;
  /** 相对分类目录的路径（去 .md，构造 URL 用） */
  slug: string;
  title: string;
  summary: string;
  /** 最近更新时间（ISO 字符串） */
  updatedAt: string;
}

function timeOf(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * 最近更新的文档（RSS 用）。
 *
 * DB-only 后不再 stat 文件 mtime，也不依赖容器内 .git（生产镜像没有 .git）；
 * 直接按数据库索引里的 updatedDate/publishedAt 排序，摘要取 CMS 的结构化 description。
 * CMS 每次发布都会刷新 updatedDate，因此能反映在线编辑。
 */
export async function getRecentDocs(limit = 50): Promise<RecentDoc[]> {
  const docs = await getAllContentIndex();
  const candidates = docs
    .filter((d) => d.categorySlug && d.path)
    .map((d) => {
      const cat = getCategoryBySlug(d.categorySlug!);
      if (!cat || !d.path.startsWith(`${cat.dir}/`)) return null;
      const rel = d.path.slice(cat.dir.length + 1).replace(/\.md$/, '');
      const updatedAt = d.updatedDate ?? d.publishedAt ?? d.createdDate ?? null;
      return {
        category: cat.slug,
        slug: rel,
        title: d.title?.trim() || rel.split('/').pop() || rel,
        summary: d.description?.trim() || `${cat.title} · 内容更新`,
        updatedAt,
      };
    })
    .filter((d): d is NonNullable<typeof d> => Boolean(d && d.updatedAt));

  candidates.sort((a, b) => timeOf(b.updatedAt) - timeOf(a.updatedAt));
  return candidates.slice(0, limit).map((d) => ({
    ...d,
    updatedAt: new Date(d.updatedAt!).toISOString(),
  }));
}
