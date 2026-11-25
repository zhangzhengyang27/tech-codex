import type { DocFile, DocSection } from "./docs-reader";

export interface DocLink {
  title: string;
  href: string;
}

/**
 * 按侧栏阅读顺序把章节树拍平成一维序列：先当前节的文件，再递归子节。
 *
 * 顺序必须与 DocsSidebar 的渲染顺序一致，否则"上一篇/下一篇"会和用户看到的目录错位。
 * 根目录文件在树里已由"概述"（slug _root）单独成节并排在最前，这里无需特判。
 */
export function flattenDocFiles(sections: DocSection[]): DocFile[] {
  return sections.flatMap((section) => [...section.files, ...flattenDocFiles(section.children)]);
}

/**
 * 在一维阅读序列里找当前文档的相邻项。
 *
 * 找不到当前文档时返回空对象而不是猜测位置：路径不在索引里说明文档已下线，
 * 按邻近位置给链接会把用户带到与内容无关的篇章。
 */
export function neighborsOf(files: DocFile[], currentPath: string): { prev?: DocFile; next?: DocFile } {
  const index = files.findIndex((file) => file.path === currentPath);
  if (index < 0) return {};
  return {
    prev: index > 0 ? files[index - 1] : undefined,
    next: index < files.length - 1 ? files[index + 1] : undefined,
  };
}

/** 索引路径 → 站内阅读地址：去掉分类根目录前缀与 .md 后缀，与分类页链接口径一致。 */
export function docHref(categorySlug: string, categoryDir: string, filePath: string): string {
  const rel = filePath.startsWith(`${categoryDir}/`) ? filePath.slice(categoryDir.length + 1) : filePath;
  return `/docs/${categorySlug}/${rel.replace(/\.md$/, "")}`;
}
