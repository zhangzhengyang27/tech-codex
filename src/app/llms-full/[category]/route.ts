import { buildCategoryFull } from '@/lib/llms';

/** 单分类全文：/llms-full/{category}.txt，供 llms.txt 与分类页引用。 */
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  const catSlug = category.replace(/\.txt$/i, '');
  const body = buildCategoryFull(catSlug);
  if (!body) {
    return new Response('Not Found', { status: 404 });
  }
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
