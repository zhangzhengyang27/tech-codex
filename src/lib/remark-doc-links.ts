import path from 'node:path';
import type { Link, Root } from 'mdast';
import { allCategories } from './docs-config';

/** 分类按 dir 长度降序（最长前缀优先），模块级常量——避免每条链接重排 */
const CATEGORIES_BY_DIR_DEPTH = [...allCategories].sort((a, b) => b.dir.length - a.dir.length);

/**
 * 站内文档相对链接重写。
 *
 * docs/ 内大量文章使用相对链接互引(如 ./01-xxx.md 或 ../04-数组)。
 * 站点路由为 /docs/[category]/[...slug],直接渲染相对 href 会 404。
 * DB-only 分支没有文件系统可探测，目标是否存在改由调用方传入的已发布路径集合判断；
 * 外链、锚点、绝对路径与解析不到目标的链接保持原样。
 */

/** 解析单个链接,返回站内路由;无法解析时返回 null */
export function resolveDocHref(
  docRelativePath: string,
  href: string,
  knownPaths: ReadonlySet<string>
): string | null {
  if (!href || href.startsWith('#') || href.startsWith('/') ||
      /^(https?|mailto|data):/i.test(href)) return null;

  const [urlPath, hash] = href.split('#');
  if (!urlPath) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const docDir = path.posix.dirname(docRelativePath);
  const resolved = path.posix.normalize(path.posix.join(docDir, decoded));
  // 相对链接跳出了 docs/ 目录,不处理
  if (resolved.startsWith('..')) return null;

  // 链接可能带或不带 .md 后缀,依次在数据库已发布路径集合里查找
  const candidates = [resolved, `${resolved}.md`];
  const hit = candidates.find((c) => knownPaths.has(c));
  if (!hit) return null;

  // 找到该文件所属的最具体分类(与 docs-reader buildIndex 的最长前缀归属一致)
  const owner = CATEGORIES_BY_DIR_DEPTH.find((c) => hit === c.dir || hit.startsWith(`${c.dir}/`));
  if (!owner) return null;

  let rest = hit.slice(owner.dir.length).replace(/^\//, '');
  // index.md 作为目录说明页,未注册路由
  if (rest === 'index.md' || rest.endsWith('/index.md')) return null;
  rest = rest.replace(/\.md$/, '');

  // 逐段编码,保留 / 分隔;锚点单独拼接
  const encodedPath = rest.split('/').map(encodeURIComponent).join('/');
  return `/docs/${owner.slug}/${encodedPath}${hash ? `#${encodeURIComponent(hash)}` : ''}`;
}

function visitLinks(
  node: Root['children'][number],
  docRel: string,
  knownPaths: ReadonlySet<string>,
  rewrites: [Link, string][]
): void {
  if (node.type === 'link') {
    const target = resolveDocHref(docRel, node.url, knownPaths);
    if (target) rewrites.push([node, target]);
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) visitLinks(child, docRel, knownPaths, rewrites);
  }
}

/** 工厂:绑定当前文档路径与已发布路径集合的 remark 插件(attacher 返回 transformer) */
export function remarkDocLinks(docRelativePath: string, knownPaths: ReadonlySet<string>) {
  return () => (tree: Root) => {
    const rewrites: [Link, string][] = [];
    for (const child of tree.children) visitLinks(child, docRelativePath, knownPaths, rewrites);
    for (const [node, target] of rewrites) node.url = target;
  };
}