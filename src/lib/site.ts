/** 站点级常量与通用工具（SEO 用，服务端/客户端均可引用）。 */

/** 站点对外地址：用于 sitemap/robots/RSS/OG 的绝对 URL；部署到其他域名时用环境变量覆盖。 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://docs.zhangzhengyang.com"
).replace(/\/+$/, "");

/**
 * 从 Markdown 正文提取一段纯文本摘要（generateMetadata/OG/RSS 共用）：
 * 跳过标题行与代码围栏，剥除行内语法，压缩空白后截断。
 */
export function excerptOf(markdown: string, max = 120): string {
  const withoutFences = markdown.replace(/```[\s\S]*?```/g, " ").replace(/~~~[\s\S]*?~~~/g, " ");
  const paragraph = withoutFences
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith("#") && !p.startsWith("<"));
  if (!paragraph) return "";
  const text = paragraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`>#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
