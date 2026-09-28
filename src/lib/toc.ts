import GithubSlugger from 'github-slugger';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * 将标题行内的 Markdown 行内语法还原为纯文本，尽可能与 rehype-slug 使用的
 * hast-util-to-string 结果一致：行内代码取内容、链接取链接文本、图片不贡献文本、
 * 加粗/斜体/删除线只保留内容。
 */
function inlineHeadingText(md: string): string {
  // 1. 保护行内代码，避免其中的 [] () * _ 被误处理
  const codeSpans: string[] = [];
  let s = md.replace(/`([^`]*)`/g, (_, content: string) => {
    codeSpans.push(content);
    return `\u0000${codeSpans.length - 1}\u0000`;
  });

  // 2. 图片不贡献文本（hast-util-to-string 对 <img> 返回空串）
  s = s.replace(/!\[[^\]]*\]\([^)]*\)/g, '');

  // 3. 链接取链接文本（含空文本链接 `[](#anchor)` → 空）
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // 4. 去掉加粗/斜体/删除线标记
  s = s.replace(/[*_~]+/g, '');

  // 5. 还原行内代码内容
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codeSpans[Number(i)] ?? '');

  return s;
}

/**
 * 从 Markdown 原文提取标题目录。
 * id 使用 github-slugger（与 rehype-slug 完全一致，含重复标题的 -1/-2 去重），
 * text 为还原后的纯文本，用于目录展示。
 */
export function extractToc(markdown: string): TocItem[] {
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  const slugger = new GithubSlugger();
  let inCodeBlock = false;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = inlineHeadingText(match[2]);
      const id = slugger.slug(text);
      items.push({ id, text, level });
    }
  }

  return items;
}
