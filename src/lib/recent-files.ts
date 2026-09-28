import fs from 'node:fs';
import path from 'node:path';

import { allCategories } from '@/lib/docs-config';
import { getDocContent } from '@/lib/docs-reader';
import { excerptOf } from '@/lib/site';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

export interface RecentDoc {
  /** 分类 slug（URL 第一段） */
  category: string;
  /** 相对分类目录的路径（去 .md，构造 URL 用） */
  slug: string;
  title: string;
  summary: string;
  /** 文件修改时间（ISO 字符串；容器/挂载保留源 mtime） */
  updatedAt: string;
}

/**
 * 按文件 mtime 取最近更新的文档（RSS 用）。
 * 不依赖 git（生产容器内无 .git，recent-updates 的 git log 会静默失效），
 * 直接 stat 全部 md 文件按 mtime 排序后取前 N 篇，标题/摘要现读 frontmatter/正文。
 */
export function getRecentDocs(limit = 50): RecentDoc[] {
  const candidates: { category: string; slug: string; abs: string; mtime: number }[] = [];
  for (const cat of allCategories) {
    const base = path.join(DOCS_ROOT, cat.dir);
    if (!fs.existsSync(base)) continue;
    walk(base, (abs) => {
      const rel = path.relative(base, abs).replace(/\.md$/, '').split(path.sep).join('/');
      candidates.push({
        category: cat.slug,
        slug: rel,
        abs,
        mtime: fs.statSync(abs).mtimeMs,
      });
    });
  }
  candidates.sort((a, b) => b.mtime - a.mtime);

  const seen = new Set<string>();
  const result: RecentDoc[] = [];
  for (const c of candidates) {
    if (result.length >= limit) break;
    const key = `${c.category}/${c.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const doc = getDocContent(relPathOf(c));
    if (!doc) continue;
    result.push({
      category: c.category,
      slug: c.slug,
      title: doc.title,
      summary: excerptOf(doc.content, 160),
      updatedAt: new Date(c.mtime).toISOString(),
    });
  }
  return result;
}

/** 由绝对路径还原 docs/ 相对路径（供 getDocContent 使用） */
function relPathOf(c: { category: string; slug: string }): string {
  const cat = allCategories.find((x) => x.slug === c.category)!;
  return `${cat.dir}/${c.slug}.md`;
}

function walk(dir: string, onFile: (abs: string) => void): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      walk(path.join(dir, entry.name), onFile);
    } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
      onFile(path.join(dir, entry.name));
    }
  }
}
