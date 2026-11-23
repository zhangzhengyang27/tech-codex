import { allCategories, docGroups, getCategoryBySlug } from './docs-config';
import { getCategoryDocs, getDocsStats } from './docs-reader';
import { SITE_URL } from './site';

/**
 * llms.txt / llms-full.txt 生成器（DB-only 版）。
 *
 * 设计边界：
 * - llms.txt 只做「站点级导航」：分组、分类、文档数、分类链接和单分类全文入口。
 *   不把 4.5k 篇文档逐条塞进索引，避免文件膨胀成上兆的链接墙；逐篇内容由 llms-full 承接。
 * - llms-full.txt 在总字节数可控时输出全文；超过 20MB 时退化为分类全文索引。
 * - 正文来自 /content/category 一次拉取整个分类，不再逐篇读本地文件或逐篇发 HTTP。
 * - 所有读取只在服务端执行，路由用 Node runtime；不引入额外依赖。
 */
const FULL_LIMIT_BYTES = 20 * 1024 * 1024;
const CATEGORY_FULL_CACHE = new Map<string, { text: string; at: number }>();
const CATEGORY_FULL_TTL_MS = 5 * 60 * 1000;

function categoryUrl(slug: string): string {
  return `${SITE_URL}/docs/${encodeURIComponent(slug)}`;
}

function categoryFullUrl(catSlug: string): string {
  return `${SITE_URL}/llms-full/${encodeURIComponent(catSlug)}.txt`;
}

/** 生成 llms.txt：标准 llms.txt 的标题/摘要/分组/链接结构。 */
export async function buildLlmsIndex(): Promise<string> {
  const stats = await getDocsStats();
  const groupOf = new Map<string, string>();
  for (const group of docGroups) {
    for (const cat of group.categories) groupOf.set(cat.slug, group.id);
  }
  const lines: string[] = [
    '# Tech Codex 技术文档库',
    '',
    `> ${stats.total} 篇中文技术文档，覆盖前端、框架、后端、Python、工程化与实战课程。`,
    `> 完整内容入口：${SITE_URL}/llms-full.txt；单分类全文见各分类链接。`,
    '',
  ];

  for (const group of docGroups) {
    const cats = allCategories.filter((c) => groupOf.get(c.slug) === group.id);
    if (cats.length === 0) continue;
    lines.push(`## ${group.title}`, '', `> ${group.description}`, '');
    for (const cat of cats) {
      const count = stats.byDir[cat.dir] ?? 0;
      lines.push(
        `- [${cat.title}](${categoryUrl(cat.slug)}): ${cat.description}（${count} 篇）`,
        `  - 全文：[${cat.slug}.txt](${categoryFullUrl(cat.slug)})`
      );
    }
    lines.push('');
  }

  lines.push(
    '## 其他入口',
    '',
    `- [全量全文](${SITE_URL}/llms-full.txt): 全部文档正文拼接（超过 20MB 时自动转为分类全文索引）`,
    `- [页面 Markdown 镜像](${SITE_URL}/docs-md/html5/00-HTML5概览.md): /docs-md/{category}/{path}.md 返回原始 Markdown`,
    ''
  );
  return lines.join('\n');
}

/** 单分类全文：保留标题与正文，文档之间用分隔线隔开。 */
export async function buildCategoryFull(catSlug: string): Promise<string | null> {
  const cat = getCategoryBySlug(catSlug);
  if (!cat) return null;
  const now = Date.now();
  const hit = CATEGORY_FULL_CACHE.get(cat.slug);
  if (hit && now - hit.at < CATEGORY_FULL_TTL_MS) return hit.text;

  const docs = await getCategoryDocs(cat.slug);
  const lines: string[] = [`# ${cat.title}`, '', `> ${cat.description}`, ''];
  for (const doc of docs) {
    const source = doc.path.startsWith(`${cat.dir}/`) ? doc.path.slice(cat.dir.length + 1) : doc.path;
    lines.push(`## ${doc.title}`, '', `<!-- source: ${source} -->`, '', doc.content.trim(), '', '---', '');
  }
  const text = lines.join('\n');
  CATEGORY_FULL_CACHE.set(cat.slug, { text, at: now });
  return text;
}

/** llms-full.txt 超过 20MB 时的安全退化：只返回分类全文链接，避免一次响应几百 MB。 */
export async function buildLlmsFullIndex(): Promise<string> {
  const stats = await getDocsStats();
  const lines: string[] = [
    '# Tech Codex 技术文档库 · 全文索引',
    '',
    `> 全量正文超过 20MB，已按分类拆分。请按需抓取下列分类全文。`,
    '',
  ];
  for (const group of docGroups) {
    lines.push(`## ${group.title}`, '');
    for (const cat of group.categories) {
      lines.push(
        `- [${cat.title}](${categoryFullUrl(cat.slug)}): ${cat.description}（${stats.byDir[cat.dir] ?? 0} 篇）`
      );
    }
    lines.push('');
  }
  return lines.join('\n');
}

/** 总字节预算判断：给路由层决定返回全文还是索引。 */
export async function llmsFullTooLarge(): Promise<boolean> {
  return (await getDocsStats()).totalBytes > FULL_LIMIT_BYTES;
}

/** 全量全文（仅当总字节数 <= 20MB 时调用；否则路由不会生成它）。 */
export async function buildLlmsFull(): Promise<string> {
  const lines: string[] = [
    '# Tech Codex 技术文档库 · 全文',
    '',
    `> 全部文档正文拼接，来源：${SITE_URL}`,
    '',
  ];
  for (const cat of allCategories) {
    lines.push(`# ${cat.title}`, '', `> ${cat.description}`, '');
    for (const doc of await getCategoryDocs(cat.slug)) {
      const source = doc.path.startsWith(`${cat.dir}/`) ? doc.path.slice(cat.dir.length + 1) : doc.path;
      lines.push(`## ${doc.title}`, '', `<!-- source: ${source} -->`, '', doc.content.trim(), '', '---', '');
    }
  }
  return lines.join('\n');
}
