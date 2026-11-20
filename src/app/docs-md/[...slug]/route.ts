import { getCategoryBySlug } from '@/lib/docs-config';
import { getDocContent } from '@/lib/docs-reader';

/**
 * 页面 Markdown 镜像：/docs-md/{category}/{path}.md。
 * - path 是相对分类目录的文档路径（不含 .md 后缀）；
 * - 返回经过 frontmatter 剥离后的纯 Markdown 正文，供 AI Agent 直接抓取；
 * - 路径越界防护复用 getDocContent（docs/ 根目录内解析 + 元文件过滤）。
 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  if (!slug || slug.length < 2) {
    return new Response('Not Found', { status: 404 });
  }
  const category = slug[0];
  const cat = getCategoryBySlug(category);
  if (!cat) {
    return new Response('Not Found', { status: 404 });
  }

  // URL 段可能被前端编码，逐段解码；无法解码时保留原文，交给 getDocContent 做存在性判断
  const relParts = slug.slice(1).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  const relPath = relParts.join('/').replace(/\.md$/i, '');
  const doc = getDocContent(`${cat.dir}/${relPath}.md`);
  if (!doc) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response(doc.content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Doc-Title': encodeURIComponent(doc.title),
    },
  });
}
