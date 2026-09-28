import { getCategoryFiles } from "@/lib/docs-reader";

/**
 * 相关文档（服务端计算，纯内容重叠度 v1）：
 * 以"标题词元重叠度"在同分类内找相近文档——ASCII 按词、CJK 按二元组（bigram），
 * 无需向量库与网络调用；语义级升级路径见 DECISIONS.md #14。
 */
export interface RelatedDoc {
  title: string;
  /** 详情页路由路径（/docs/<slug>/<子路径>） */
  href: string;
}

/** 提取标题词元：ASCII 词（≥2 字符）+ CJK 连续段二元组 */
function titleTokens(title: string): Set<string> {
  const tokens = new Set<string>();
  for (const w of title.toLowerCase().matchAll(/[a-z][a-z0-9.+#-]{1,}/g)) {
    tokens.add(w[0]);
  }
  for (const run of title.matchAll(/[\u4e00-\u9fa5]{2,}/g)) {
    const s = run[0];
    for (let i = 0; i < s.length - 1; i++) tokens.add(s.slice(i, i + 2));
  }
  return tokens;
}

/**
 * 在 category 分类下为 currentPath（相对分类目录、去 .md）的文档找 top N 相关文档。
 * currentTitle 为当前文档标题；无重叠时返回空数组。
 */
export function relatedDocs(
  categorySlug: string,
  currentPath: string,
  currentTitle: string,
  limit = 3
): RelatedDoc[] {
  const files = getCategoryFiles(categorySlug);
  if (files.length <= 1) return [];
  const cur = titleTokens(currentTitle);
  if (cur.size === 0) return [];

  const scored: { item: (typeof files)[number]; score: number }[] = [];
  for (const f of files) {
    if (f.slug === currentPath) continue;
    const t = titleTokens(f.title);
    let score = 0;
    for (const tok of t) if (cur.has(tok)) score++;
    if (score > 0) scored.push({ item: f, score });
  }
  scored.sort(
    (a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug, "zh-CN")
  );
  return scored.slice(0, limit).map((s) => ({
    title: s.item.title,
    href: `/docs/${categorySlug}/${s.item.slug}`,
  }));
}
