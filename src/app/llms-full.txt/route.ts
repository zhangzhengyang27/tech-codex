import { buildLlmsFull, buildLlmsFullIndex, llmsFullTooLarge } from '@/lib/llms';

/**
 * 全量正文入口。
 * 文档总量超过 20MB 时不拼接全文，改为返回分类全文索引，避免几百 MB 响应拖垮进程。
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const body = llmsFullTooLarge() ? buildLlmsFullIndex() : buildLlmsFull();
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
