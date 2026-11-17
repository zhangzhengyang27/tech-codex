import { getRecentDocs } from '@/lib/recent-files';
import { SITE_URL } from '@/lib/site';

/** RSS 2.0 订阅源：最近更新的 50 篇文档。按小时 revalidate 避免每次请求全量 stat。 */
export const revalidate = 3600;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 文档 URL：中文 slug 逐段 percent-encode（保留 / 分隔符）后整体做 XML 转义 */
function docUrl(d: { category: string; slug: string }): string {
  const path = d.slug.split('/').map(encodeURIComponent).join('/');
  return escapeXml(`${SITE_URL}/docs/${d.category}/${path}`);
}

export function GET(): Response {
  const docs = getRecentDocs(50);
  const items = docs
    .map(
      (d) => `    <item>
      <title>${escapeXml(d.title)}</title>
      <link>${docUrl(d)}</link>
      <guid isPermaLink="true">${docUrl(d)}</guid>
      <pubDate>${new Date(d.updatedAt).toUTCString()}</pubDate>
      <description>${escapeXml(d.summary)}</description>
    </item>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tech Codex - 开发者笔记</title>
    <link>${SITE_URL}</link>
    <description>开发者技术笔记与知识管理：最近更新的文档</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
