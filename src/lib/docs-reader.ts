import { allCategories, getCategoryBySlug } from './docs-config';

/**
 * 站点内容读取层（DB-only 分支）。
 *
 * 旧实现用 fs 扫描 docs/ 并解析 frontmatter；现在内容真相在 MySQL 的 kb_document，
 * Spring 通过 /content/index、/content/doc、/content/category 暴露只读内容。
 * 前端不再依赖构建产物或容器挂载的 Markdown 文件。
 *
 * 缓存边界：
 * - 模块级快照缓存避免每次页面渲染都拉 4.5k 条索引；CMS 代理写操作后调用
 *   invalidateDocsCache() + revalidateTag('docs-content') 立即失效。
 * - dev 环境 TTL 更短，便于本地改库后尽快看到变化；生产 TTL 60s 作为兜底。
 */

const BACKEND = process.env.KB_BACKEND_ORIGIN ?? 'http://localhost:8081';
const DEV_TTL_MS = 30_000;
const PROD_TTL_MS = 60_000;

/** 后端 /content/index 的条目（与 ContentIndexItem 对齐）。 */
export interface ContentIndexItem {
  id: number;
  title: string | null;
  description: string | null;
  categorySlug: string | null;
  categoryDir: string | null;
  docSlug: string | null;
  path: string;
  fileSize: number | null;
  createdDate: string | null;
  updatedDate: string | null;
  publishedAt: string | null;
  revision: number | null;
}

interface ContentIndexResponse {
  total: number;
  generatedAt: string;
  docs: ContentIndexItem[];
}

/** 后端 /content/doc 的响应。 */
interface ContentDocResponse {
  title: string;
  description: string | null;
  path: string;
  categorySlug: string;
  categoryDir: string;
  docSlug: string;
  body: string;
  frontmatter: string;
  revision: number | null;
  publishedAt: string | null;
  updatedDate: string | null;
}

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

export interface DocsStats {
  /** 全站 .md 文件总数 */
  total: number;
  /** 按分类目录名（DocCategory.dir）索引的文档数 */
  byDir: Record<string, number>;
  /** 全站 Markdown 原始字节总数（llms-full 体积预算用） */
  totalBytes: number;
}

export interface CategoryFileItem {
  title: string;
  /** 相对分类目录的路径（去 .md 后缀，含子目录前缀），用于构造详情页链接 */
  slug: string;
}

/** 单次拉取后在进程内复用的派生索引。 */
interface DocsSnapshot {
  docs: ContentIndexItem[];
  /** docs 相对路径 → 条目，O(1) 判断文档是否存在（相对链接重写用） */
  byPath: Map<string, ContentIndexItem>;
  /** 分类 slug（精确归属）→ 扁平文件列表 */
  bySlug: Map<string, CategoryFileItem[]>;
  /** 分类 slug → 侧边栏章节树（懒构建） */
  sectionsBySlug: Map<string, DocSection[]>;
  stats: DocsStats;
  at: number;
}

let snapshot: DocsSnapshot | null = null;
let snapshotPromise: Promise<DocsSnapshot> | null = null;

function cacheTtl(): number {
  return process.env.NODE_ENV === 'production' ? PROD_TTL_MS : DEV_TTL_MS;
}

function fresh(entry: DocsSnapshot | null): entry is DocsSnapshot {
  return Boolean(entry && Date.now() - entry.at < cacheTtl());
}

/** 从文件名提取侧边栏文件标题（数据库标题缺失时的兜底） */
function extractFileTitle(filename: string): string {
  return filename.replace(/\.md$/, '').replace(/^(README|index)$/, '概述').trim();
}

/** 从目录名提取章节标题：去掉序号前缀（"0-基础入门" → "基础入门"） */
function extractSectionTitle(name: string): string {
  return (
    name
      .replace(/^[\d.]+-\s*/, '')
      .replace(/^[\d.]+$/, '')
      .trim() || name
  );
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

function isRenderableBasename(name: string): boolean {
  return name.endsWith('.md') && name !== 'index.md' && !name.startsWith('_');
}

/** 把 docs 相对路径切成路径段；非法/无法归属的路径直接丢弃。 */
function relativeSlugOf(item: ContentIndexItem, categoryDir: string): string | null {
  const docPath = item.path?.replace(/\\/g, '/');
  if (!docPath || !docPath.startsWith(`${categoryDir}/`)) return null;
  const rel = docPath.slice(categoryDir.length + 1).replace(/\.md$/, '');
  const basename = rel.split('/').pop() ?? rel;
  if (!isRenderableBasename(`${basename}.md`)) return null;
  return rel;
}

/** 拉取后端索引并构建首页/侧栏/链接判断所需的所有派生结构。 */
async function loadSnapshot(): Promise<DocsSnapshot> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND}/content/index`, {
      headers: { Accept: 'application/json' },
      ...(process.env.NODE_ENV === 'production'
        ? { next: { revalidate: 60, tags: ['docs-content'] } }
        : { cache: 'no-store' as RequestCache }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new Error(`内容索引不可达（${BACKEND}/content/index）：${e instanceof Error ? e.message : '请求失败'}`);
  }
  if (!res.ok) {
    throw new Error(`内容索引返回 ${res.status}`);
  }
  const body = (await res.json()) as ContentIndexResponse;
  const docs = Array.isArray(body.docs) ? body.docs.filter((d) => d.path && d.categorySlug) : [];

  const byPath = new Map<string, ContentIndexItem>();
  const bySlug = new Map<string, CategoryFileItem[]>();
  const byDir: Record<string, number> = {};
  let totalBytes = 0;
  for (const cat of allCategories) {
    bySlug.set(cat.slug, []);
    byDir[cat.dir] = 0;
  }

  for (const item of docs) {
    byPath.set(item.path, item);
    totalBytes += item.fileSize ?? 0;
    const cat = item.categorySlug ? getCategoryBySlug(item.categorySlug) : undefined;
    if (!cat || !item.categoryDir) continue;
    const rel = relativeSlugOf(item, cat.dir);
    if (!rel) continue;
    bySlug.get(cat.slug)?.push({
      title: item.title?.trim() || extractFileTitle(rel.split('/').pop() ?? rel),
      slug: rel,
    });
    byDir[cat.dir] = (byDir[cat.dir] ?? 0) + 1;
  }

  for (const list of bySlug.values()) sortFileItems(list);

  return {
    docs,
    byPath,
    bySlug,
    sectionsBySlug: new Map(),
    stats: { total: docs.length, byDir, totalBytes },
    at: Date.now(),
  };
}

/** 获取进程内快照；并发请求共享同一个 Promise，避免缓存击穿。 */
async function getSnapshot(): Promise<DocsSnapshot> {
  if (snapshot && fresh(snapshot)) return snapshot;
  if (snapshotPromise) return snapshotPromise;
  snapshotPromise = loadSnapshot()
    .then((next) => {
      snapshot = next;
      return next;
    })
    .finally(() => {
      snapshotPromise = null;
    });
  return snapshotPromise;
}

/** 获取全站索引条目（供最近更新/RSS 等纯元数据场景复用同一份缓存）。 */
export async function getAllContentIndex(): Promise<ContentIndexItem[]> {
  return (await getSnapshot()).docs;
}

/** 获取某个分类下的所有章节和文件（递归构建嵌套树，支持任意深度目录）。 */
export async function getSections(categorySlug: string): Promise<DocSection[]> {
  const snap = await getSnapshot();
  const cached = snap.sectionsBySlug.get(categorySlug);
  if (cached) return cached;
  const sections = buildSections(categorySlug, snap.docs);
  snap.sectionsBySlug.set(categorySlug, sections);
  return sections;
}

interface TreeNode {
  dirs: Map<string, TreeNode>;
  files: ContentIndexItem[];
}

function newNode(): TreeNode {
  return { dirs: new Map(), files: [] };
}

/**
 * 用数据库索引还原旧文件系统的章节树。
 *
 * 归属规则与旧 getSections 对齐：父分类页面要包含子孙分类目录下的文档，
 * 所以这里按 category.dir 前缀收集，而不是只取 categorySlug 精确相等的那批；
 * 首页的扁平列表（getCategoryFiles）仍按最具体分类归属，避免父子页面重复计数。
 */
function buildSections(categorySlug: string, docs: ContentIndexItem[]): DocSection[] {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return [];

  const rootNode = newNode();
  const descendants = docs
    .filter((d) => d.path?.replace(/\\/g, '/').startsWith(`${category.dir}/`))
    .sort((a, b) => a.path.localeCompare(b.path, 'zh-CN'));

  for (const item of descendants) {
    const rel = relativeSlugOf(item, category.dir);
    if (!rel) continue;
    const parts = rel.split('/');
    let node = rootNode;
    for (const dir of parts.slice(0, -1)) {
      let child = node.dirs.get(dir);
      if (!child) {
        child = newNode();
        node.dirs.set(dir, child);
      }
      node = child;
    }
    node.files.push(item);
  }

  const children = buildChildSections(rootNode, '');
  const rootFiles = rootNode.files.sort((a, b) => sortPath(a.path, b.path));
  if (rootFiles.length > 0) {
    children.unshift({
      title: '概述',
      slug: '_root',
      files: rootFiles.map((item) => toDocFile(item)),
      children: [],
    });
  }
  return children;
}

function sortPath(a: string, b: string): number {
  const na = parseInt(a.split('/').pop()?.match(/^(\d+)/)?.[1] ?? '999', 10);
  const nb = parseInt(b.split('/').pop()?.match(/^(\d+)/)?.[1] ?? '999', 10);
  if (na !== nb) return na - nb;
  return a.localeCompare(b, 'zh-CN');
}

function buildChildSections(node: TreeNode, basePath: string): DocSection[] {
  const sections: DocSection[] = [];
  const dirs = [...node.dirs.entries()].sort(([a], [b]) => sortPath(a, b));

  for (const [dir, child] of dirs) {
    const relDir = basePath ? `${basePath}/${dir}` : dir;
    const files = child.files.sort((a, b) => sortPath(a.path, b.path)).map((item) => toDocFile(item));
    const children = buildChildSections(child, relDir);
    if (files.length === 0 && children.length === 0) continue;

    // 目录说明页（README/index）的标题优先作为章节标题，否则回退到去编号的目录名
    const readme = child.files.find((f) => /(^|\/)(README|index)\.md$/.test(f.path));
    sections.push({
      title: readme?.title?.trim() || extractSectionTitle(dir),
      slug: relDir,
      files,
      children,
    });
  }
  return sections;
}

function toDocFile(item: ContentIndexItem): DocFile {
  const basename = item.path.split('/').pop() ?? item.path;
  const slug = basename.replace(/\.md$/, '');
  return {
    title: item.title?.trim() || extractFileTitle(basename),
    slug,
    path: item.path,
  };
}

/** 全站文档统计（一次索引拉取，不访问文件系统） */
export async function getDocsStats(): Promise<DocsStats> {
  return (await getSnapshot()).stats;
}

/** 首页一次性快照：全站统计 + 每个分类的扁平文件列表。 */
export async function getDocsSnapshot(): Promise<{
  stats: DocsStats;
  filesBySlug: Map<string, CategoryFileItem[]>;
}> {
  const snap = await getSnapshot();
  return { stats: snap.stats, filesBySlug: snap.bySlug };
}

/** 获取某分类目录下全部文档的扁平列表（每个文件只归属其最具体分类）。 */
export async function getCategoryFiles(categorySlug: string): Promise<CategoryFileItem[]> {
  const snap = await getSnapshot();
  return snap.bySlug.get(categorySlug) ?? [];
}

/** 全部已发布文档的 docs 相对路径集合（remark 相对链接重写用）。 */
export async function getDocPaths(): Promise<Set<string>> {
  return new Set((await getSnapshot()).byPath.keys());
}

/**
 * 读取单篇文档内容。
 *
 * 404 表示数据库里没有这篇已发布文档，返回 null 交给页面 notFound；
 * 网络/5xx 则抛错，避免把后端故障伪装成“文章不存在”。
 * 返回值保持旧接口的 {title, content} 形状，减少调用方改动。
 */
export async function getDocContent(relativePath: string): Promise<{ title: string; content: string } | null> {
  const docPath = relativePath.replace(/\\/g, '/').replace(/^\//, '');
  if (!docPath || docPath.split('/').pop()?.startsWith('_')) return null;

  let res: Response;
  try {
    res = await fetch(`${BACKEND}/content/doc?path=${encodeURIComponent(docPath)}`, {
      headers: { Accept: 'application/json' },
      ...(process.env.NODE_ENV === 'production'
        ? { next: { revalidate: 60, tags: ['docs-content'] } }
        : { cache: 'no-store' as RequestCache }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    throw new Error(`文档内容不可达（${docPath}）：${e instanceof Error ? e.message : '请求失败'}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`文档内容返回 ${res.status}（${docPath}）`);

  const doc = (await res.json()) as ContentDocResponse;
  return {
    title: doc.title?.trim() || extractFileTitle(docPath.split('/').pop() ?? docPath),
    content: doc.body ?? '',
  };
}

/** 单分类全量正文（llms 分类全文用，一次 HTTP 取完整个分类）。 */
export async function getCategoryDocs(categorySlug: string): Promise<{ title: string; path: string; content: string }[]> {
  let res: Response;
  try {
    res = await fetch(`${BACKEND}/content/category?slug=${encodeURIComponent(categorySlug)}`, {
      headers: { Accept: 'application/json' },
      ...(process.env.NODE_ENV === 'production'
        ? { next: { revalidate: 60, tags: ['docs-content'] } }
        : { cache: 'no-store' as RequestCache }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    throw new Error(`分类内容不可达（${categorySlug}）：${e instanceof Error ? e.message : '请求失败'}`);
  }
  if (!res.ok) throw new Error(`分类内容返回 ${res.status}（${categorySlug}）`);
  const docs = (await res.json()) as ContentDocResponse[];
  return docs.map((doc) => ({
    title: doc.title?.trim() || extractFileTitle(doc.path.split('/').pop() ?? doc.path),
    path: doc.path,
    content: doc.body ?? '',
  }));
}

/**
 * 管理端发布后清空内容缓存。
 *
 * 只清当前 Node 进程的模块级快照；Next 的 fetch data cache 由 CMS 代理路由
 * 额外调用 revalidateTag('docs-content') 失效，两者缺一不可。
 */
export function invalidateDocsCache(): void {
  snapshot = null;
  snapshotPromise = null;
}
