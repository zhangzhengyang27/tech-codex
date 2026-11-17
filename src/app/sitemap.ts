import type { MetadataRoute } from 'next';

import { allCategories } from '@/lib/docs-config';
import { getCategoryFiles } from '@/lib/docs-reader';
import { SITE_URL } from '@/lib/site';

/**
 * 全站 sitemap：首页 + 全部分类落地页 + 全部文档详情页（约 4000 条，远低于 5 万条/文件上限）。
 * 分类页 SSG、详情页 SSR，构建期与运行期均可安全读取 docs/ 索引。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
  ];
  for (const cat of allCategories) {
    entries.push({ url: `${SITE_URL}/docs/${cat.slug}`, changeFrequency: 'weekly', priority: 0.7 });
    for (const file of getCategoryFiles(cat.slug)) {
      entries.push({
        // 中文 slug 逐段 percent-encode（保留 / 分隔符），否则生成的 URL 含非法裸字符
        url: `${SITE_URL}/docs/${cat.slug}/${encodeDocPath(file.slug)}`,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
    }
  }
  return entries;
}

/** 文档子路径逐段 percent-encode（保留 / 分隔符），与 remark-doc-links 的链接重写一致 */
function encodeDocPath(slugPath: string): string {
  return slugPath.split('/').map(encodeURIComponent).join('/');
}
