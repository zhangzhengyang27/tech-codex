import fs from 'node:fs';
import path from 'node:path';
import type { Link, Root } from 'mdast';
import { allCategories } from './docs-config';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

/**
 * 站内文档相对链接重写。
 *
 * docs/ 内大量文章使用相对链接互引(如 ./01-xxx.md 或 ../04-数组)。
 * 站点路由为 /docs/[category]/[...slug],直接渲染相对 href 会 404。
 * 本插件把"目标文件真实存在"的相对链接重写为对应站内路由;
 * 外链、锚点、绝对路径与解析不到目标的链接保持原样。
 */

/** 解析单个链接,返回站内路由;无法解析时返回 null */
export function resolveDocHref(docRelativePath: string, href: string): string | null {
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

  // 链接可能带或不带 .md 后缀,依次尝试
  const candidates = [resolved, `${resolved}.md`];
  const hit = candidates.find(
    (c) => fs.existsSync(path.join(DOCS_ROOT, c)) && fs.statSync(path.join(DOCS_ROOT, c)).isFile()
  );
  if (!hit) return null;

  // 找到该文件所属的最具体分类(与 docs-reader buildIndex 的最长前缀归属一致)
  const owner = [...allCategories]
    .sort((a, b) => b.dir.length - a.dir.length)
    .find((c) => hit === c.dir || hit.startsWith(`${c.dir}/`));
  if (!owner) return null;

  let rest = hit.slice(owner.dir.length).replace(/^\//, '');
  // index.md 作为目录说明页,未注册路由
  if (rest === 'index.md' || rest.endsWith('/index.md')) return null;
  rest = rest.replace(/\.md$/, '');

  // 逐段编码,保留 / 分隔;锚点单独拼接
  const encodedPath = rest.split('/').map(encodeURIComponent).join('/');
  return `/docs/${owner.slug}/${encodedPath}${hash ? `#${encodeURIComponent(hash)}` : ''}`;
}

function visitLinks(node: Root['children'][number], docRel: string, rewrites: [Link, string][]): void {
  if (node.type === 'link') {
    const target = resolveDocHref(docRel, node.url);
    if (target) rewrites.push([node, target]);
  }
  if ('children' in node && Array.isArray(node.children)) {
    for (const child of node.children) visitLinks(child, docRel, rewrites);
  }
}

/** 工厂:绑定当前文档路径的 remark 插件(attacher 返回 transformer) */
export function remarkDocLinks(docRelativePath: string) {
  return () => (tree: Root) => {
    const rewrites: [Link, string][] = [];
    for (const child of tree.children) visitLinks(child, docRelativePath, rewrites);
    for (const [node, target] of rewrites) node.url = target;
  };
}