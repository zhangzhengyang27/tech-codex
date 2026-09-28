import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { allCategories, getCategoryBySlug } from './docs-config';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

export interface DocSection {
  title: string;
  slug: string;
  files: DocFile[];
  /** 嵌套子章节（支持任意深度的目录结构，如 Vue/vue3文档/1-核心基础） */
  children: DocSection[];
}

export interface DocFile {
  title: string;
  slug: string;
  path: string;
}

/** 从文件名提取侧边栏文件标题：保留序号前缀（如 "01-前端框架概述"） */
function extractFileTitle(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/^(README|index)$/, '概述')
    .trim();
}

/** 从目录名提取章节标题：去掉序号前缀（"0-基础入门" → "基础入门"） */
function extractSectionTitle(name: string): string {
  return name
    .replace(/^[\d.]+-\s*/, '')
    .replace(/^[\d.]+$/, '')
    .trim() || name;
}

/** 分组索引文件名：作为目录/章节的说明页，不计入侧边栏文件列表。
 *  仅排除 index.md——README.md 在全站多被用作真实正文文件名，不可排除。 */
const INDEX_FILES = new Set(['index.md']);

/** 读取单文件 frontmatter 的 title（用于目录标题回退） */
function readFrontmatterTitle(relativePath: string): string | null {
  const filePath = path.join(DOCS_ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;
  try {
    const { data } = matter(fs.readFileSync(filePath, 'utf-8'));
    return (data.title as string) || null;
  } catch {
    return null;
  }
}

/** 对文件按序号排序 */
function sortByName(a: string, b: string): number {
  const numA = parseInt(a.match(/^(\d+)/)?.[1] ?? '999', 10);
  const numB = parseInt(b.match(/^(\d+)/)?.[1] ?? '999', 10);
  if (numA !== numB) return numA - numB;
  return a.localeCompare(b, 'zh-CN');
}

/** 获取某个分类下的所有章节和文件（递归构建嵌套树，支持任意深度目录） */
export function getSections(categorySlug: string): DocSection[] {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return [];

  const categoryDir = path.join(DOCS_ROOT, category.dir);
  if (!fs.existsSync(categoryDir)) return [];

  const entries = fs.readdirSync(categoryDir, { withFileTypes: true });
  const sections: DocSection[] = [];

  // 根目录下的 md 文件作为“概述”章节（排除 index/README 索引文件）
  const rootFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !INDEX_FILES.has(e.name))
    .map((e) => e.name)
    .sort(sortByName);

  if (rootFiles.length > 0) {
    sections.push({
      title: '概述',
      slug: '_root',
      files: rootFiles.map((f) => ({
        title: extractFileTitle(f),
        slug: f.replace(/\.md$/, ''),
        path: path.join(category.dir, f),
      })),
      children: [],
    });
  }

  // 子目录递归构建为章节（含其下级子目录）
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort(sortByName);

  for (const dir of dirs) {
    const section = buildSection(
      path.join(categoryDir, dir),
      path.join(category.dir, dir),
      dir
    );
    if (section) sections.push(section);
  }

  return sections;
}

/** 递归构建单个章节：收集当前目录的 md 文件，并递归处理子目录 */
function buildSection(absDir: string, relDir: string, relSlug: string): DocSection | null {
  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  const mdFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.md') && !INDEX_FILES.has(e.name))
    .map((e) => e.name)
    .sort(sortByName);

  const subDirs = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort(sortByName);

  const children: DocSection[] = [];
  for (const sub of subDirs) {
    const child = buildSection(
      path.join(absDir, sub),
      path.join(relDir, sub),
      `${relSlug}/${sub}`
    );
    if (child) children.push(child);
  }

  // 既无文件又无子节点的目录跳过
  if (mdFiles.length === 0 && children.length === 0) return null;

  // 优先用 index/README 的 frontmatter title 作为章节标题，否则回退到目录名
  const indexTitle =
    readFrontmatterTitle(`${relDir}/index.md`) ??
    readFrontmatterTitle(`${relDir}/README.md`);
  const sectionTitle = indexTitle ?? extractSectionTitle(path.basename(relSlug));

  return {
    title: sectionTitle,
    slug: relSlug,
    files: mdFiles.map((f) => ({
      title: extractFileTitle(f),
      slug: f.replace(/\.md$/, ''),
      path: path.join(relDir, f),
    })),
    children,
  };
}

/** 读取单篇文档内容 */
export function getDocContent(relativePath: string): { title: string; content: string } | null {
  const filePath = path.join(DOCS_ROOT, relativePath);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  let title: string;
  let content: string;
  try {
    const { data, content: body } = matter(raw);
    title = (data.title as string) || extractSectionTitle(path.basename(relativePath));
    content = body;
  } catch {
    // frontmatter 解析失败时回退：整个文件作为正文，标题取自文件名，避免单篇文档缺陷导致整站构建失败
    title = extractSectionTitle(path.basename(relativePath));
    content = raw;
  }

  return { title, content };
}

/** 获取分类下所有文件路径（用于 generateStaticParams） */
export function getAllDocPaths(categorySlug: string): string[] {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return [];

  const categoryDir = path.join(DOCS_ROOT, category.dir);
  if (!fs.existsSync(categoryDir)) return [];

  const paths: string[] = [];

  function walk(dir: string, prefix: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walk(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      } else if (entry.isFile() && entry.name.endsWith('.md') && !INDEX_FILES.has(entry.name)) {
        paths.push(`${prefix}${entry.name.replace(/\.md$/, '')}`);
      }
    }
  }

  walk(categoryDir, '');
  return paths;
}

/** 全站文档统计（真实扫描 docs/，构建/请求期执行，不在客户端运行） */
export interface DocsStats {
  /** 全站 .md 文件总数（含 hidden 子分类，排除 docs/ 根目录元文件） */
  total: number;
  /** 按分类目录名（DocCategory.dir）索引的文档数（每个文件只归属其最具体分类） */
  byDir: Record<string, number>;
}

/** 首页索引用的扁平文件条目 */
export interface CategoryFileItem {
  title: string;
  /** 相对分类目录的路径（去 .md 后缀，含子目录前缀），用于构造详情页链接 */
  slug: string;
}

/** 单遍扫描 docs/ 建好的全站索引 */
interface DocsIndex {
  total: number;
  byDir: Record<string, number>;
  /** 每个分类的扁平文件列表（按最具体分类归属，父分类不重复包含 hidden 子分类文件） */
  bySlug: Map<string, CategoryFileItem[]>;
}

/** 按序号 + 中文本地化排序（与旧 getCategoryFiles 行为一致） */
function sortFileItems(items: CategoryFileItem[]): void {
  items.sort((a, b) => {
    const na = parseInt(a.slug.match(/^(\d+)/)?.[1] ?? '999', 10);
    const nb = parseInt(b.slug.match(/^(\d+)/)?.[1] ?? '999', 10);
    if (na !== nb) return na - nb;
    return a.slug.localeCompare(b.slug, 'zh-CN');
  });
}

/** 单遍遍历 docs/，把每个文件归属到目录前缀最长的分类（避免父分类与 hidden 子分类重复） */
function buildIndex(): DocsIndex {
  // 按 dir 长度降序，保证最长前缀优先匹配
  const cats = [...allCategories].sort((a, b) => b.dir.length - a.dir.length);
  const bySlug = new Map<string, CategoryFileItem[]>();
  const byDir: Record<string, number> = {};
  for (const c of cats) {
    bySlug.set(c.slug, []);
    byDir[c.dir] = 0;
  }

  const files: string[] = []; // 相对 docs/ 的路径（去 .md 后缀）

  function walk(dir: string, prefix: string, isRoot: boolean) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        walk(path.join(dir, entry.name), `${prefix}${entry.name}/`, false);
      } else if (!isRoot && entry.isFile() && entry.name.endsWith('.md')) {
        files.push(`${prefix}${entry.name.replace(/\.md$/, '')}`);
      }
    }
  }
  walk(DOCS_ROOT, '', true);

  for (const rel of files) {
    const owner = cats.find((c) => rel === c.dir || rel.startsWith(`${c.dir}/`));
    if (!owner) continue;

    const slug = rel.slice(owner.dir.length).replace(/^\//, '');
    const basename = rel.split('/').pop() ?? rel;
    bySlug.get(owner.slug)!.push({ title: extractFileTitle(basename), slug });
    byDir[owner.dir]++;
  }

  for (const list of bySlug.values()) sortFileItems(list);

  return { total: files.length, byDir, bySlug };
}

let cachedIndex: DocsIndex | null = null;
let cachedIndexAt = 0;
/** dev 环境索引缓存 TTL：dev 下每请求全量重扫 3994 篇（首页/阅读页/相关文档都要用索引），
 *  长时间运行会累积导致 Node 堆 OOM；30s TTL 内直接复用，新增文档最多延迟 30s 可见。 */
const DEV_INDEX_TTL_MS = 30_000;

/** 获取索引：生产环境永久缓存（构建/运行期只扫一次）；dev 环境按 TTL 缓存以便即时反映新增文档 */
function getDocsIndex(): DocsIndex {
  const now = Date.now();
  if (cachedIndex && (process.env.NODE_ENV === 'production' || now - cachedIndexAt < DEV_INDEX_TTL_MS)) {
    return cachedIndex;
  }
  cachedIndex = buildIndex();
  cachedIndexAt = now;
  return cachedIndex;
}

/**
 * 首页一次性快照：单遍扫描得到全站统计 + 每个分类的扁平文件列表，
 * 供首页全量索引展示，链接格式与 docs/[category]/page.tsx 一致。
 */
export function getDocsSnapshot(): { stats: DocsStats; filesBySlug: Map<string, CategoryFileItem[]> } {
  const idx = getDocsIndex();
  return { stats: { total: idx.total, byDir: idx.byDir }, filesBySlug: idx.bySlug };
}

/**
 * 获取某分类目录下全部 .md 文件的扁平列表（每个文件只归属其最具体分类）。
 * 供首页全量索引展示，链接格式与 docs/[category]/page.tsx 一致。
 */
export function getCategoryFiles(categorySlug: string): CategoryFileItem[] {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return [];
  return getDocsIndex().bySlug.get(category.slug) ?? [];
}

/**
 * 递归统计每个分类目录下的 .md 文件数量（每个文件只归属其最具体分类）。
 * total 直接遍历 docs/ 全目录统计，天然排除 docs/ 根目录散落的元文件。
 */
export function getDocsStats(): DocsStats {
  const idx = getDocsIndex();
  return { total: idx.total, byDir: idx.byDir };
}
