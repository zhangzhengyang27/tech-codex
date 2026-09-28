import { allCategories } from "@/lib/docs-config";

/** 目录越深越具体，优先匹配最长前缀（与 docs-reader 的文件归属规则一致） */
const cats = [...allCategories].sort((a, b) => b.dir.length - a.dir.length);

/**
 * 「相对 docs/ 路径」→「站点完整文档 URL」。
 * 站点文档 URL = /docs/{英文slug}/{相对该分类目录(category.dir)的路径 去.md}。
 * 无法归属（如 docs/ 根目录元文件）或指向分类目录本身时返回 null。
 * 纯函数（无 fs/网络），客户端与服务端均可使用。
 */
export function resolveDocUrl(rel: string): string | null {
  const owner = cats.find((c) => rel === c.dir || rel.startsWith(`${c.dir}/`));
  if (!owner) return null;
  const rest = rel.slice(owner.dir.length).replace(/^\/+/, "");
  if (!rest) return null;
  return `/docs/${owner.slug}/${rest}`;
}

/**
 * 批量反查文档 URL（走站内 /api/docs/url 路由）。
 * 用于无法直接引入 docs-config 的场景；客户端组件可直接用 resolveDocUrl。
 */
export async function fetchDocUrls(
  paths: string[]
): Promise<Record<string, string | null>> {
  try {
    const res = await fetch("/api/docs/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { urls?: Record<string, string | null> };
    return data.urls ?? {};
  } catch {
    return {};
  }
}
