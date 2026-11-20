import { buildLlmsIndex } from '@/lib/llms';

/** 站点级 AI 可读索引：分组 / 分类 / 文档数 / 分类全文链接。 */
export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(buildLlmsIndex(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
