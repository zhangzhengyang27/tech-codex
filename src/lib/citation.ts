import type { KbChunkHit } from '@/lib/auth';
import { resolveDocUrl } from '@/lib/doc-url';

/**
 * 引用编号 → 可点击文档锚点。
 *
 * 后端 V4 之后 anchor 是 slug；旧索引里 anchor 还是标题文本。这里按「无空格/无标点」
 * 判断是否已经是 slug，否则退化为与 rehype-slug 接近的 slug 生成规则。重复标题的
 * -1/-2 只有文档页 extractToc 知道；后端下一次重建索引后会写入精确 anchor。
 */
export function anchorFromHeading(heading?: string): string {
  const text = (heading ?? '').trim();
  if (!text) return '';
  // 已经是无空格、无标点的 slug（中文/字母/数字/连字符）就直接使用
  if (/^[\p{L}\p{N}-]+$/u.test(text)) return text;
  return text
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]+/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\- ]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** 单条来源的跳转地址：文档 URL + #heading 锚点；没有文档 URL 时返回 null。 */
export function sourceHref(
  source: KbChunkHit,
  urlMap: Record<string, string | null> = {}
): string | null {
  const base = urlMap[source.filePath] ?? resolveDocUrl(source.filePath);
  if (!base) return null;
  const anchor = source.anchor?.trim() || anchorFromHeading(source.heading);
  if (!anchor) return base;
  return `${base.split('#')[0]}#${encodeURIComponent(anchor)}`;
}

/**
 * 把回答正文里的 [n] 转成 Markdown 链接 [n](doc#anchor)。
 * 只处理围栏代码之外的文本，避免改坏代码示例；编号不在 sources 中时原样保留。
 */
export function linkifyCitations(
  markdown: string,
  sources: KbChunkHit[] | undefined,
  urlMap: Record<string, string | null> = {}
): string {
  if (!sources || sources.length === 0) return markdown;
  const byNumber = new Map<number, KbChunkHit>();
  sources.forEach((s, i) => {
    const n = Number(s.citationId ?? i + 1);
    if (Number.isFinite(n) && n > 0) byNumber.set(n, s);
  });

  // 与 ChatMarkdown 的 normalizeAtxHeadings 相同的围栏分段策略：奇数段是代码，跳过
  const parts = markdown.split(/(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$))/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part;
      return part.replace(/\[(\d{1,2})\]/g, (raw, numText: string) => {
        const n = Number(numText);
        const source = byNumber.get(n);
        const href = source ? sourceHref(source, urlMap) : null;
        return href ? `[[${n}]](${href})` : raw;
      });
    })
    .join('');
}
