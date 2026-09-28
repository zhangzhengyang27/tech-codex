import { NextResponse } from "next/server";
import { allCategories } from "@/lib/docs-config";

/** 目录越深越具体，优先匹配最长前缀（与 docs-reader 的文件归属规则一致） */
const cats = [...allCategories].sort((a, b) => b.dir.length - a.dir.length);

/**
 * 知识库溯源的「相对 docs/ 路径」→ 「站点完整文档 URL」反查。
 * 站点文档 URL = /docs/{英文slug}/{相对该分类目录(category.dir)的路径 去.md}，
 * 因此需要先按 dir 最长前缀找到归属分类，再由 slug 拼出可访问的详情页地址。
 * 无法归属（如 docs/ 根目录元文件）或指向目录索引页时返回 null。
 */
function resolveDocUrl(rel: string): string | null {
  const owner = cats.find((c) => rel === c.dir || rel.startsWith(`${c.dir}/`));
  if (!owner) return null;
  const rest = rel.slice(owner.dir.length).replace(/^\/+/, "");
  if (!rest) return null; // 分类目录本身，站内无独立详情页
  return `/docs/${owner.slug}/${rest}`;
}

export async function POST(req: Request) {
  let rawPaths: unknown;
  try {
    rawPaths = (await req.json())?.paths;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!Array.isArray(rawPaths)) {
    return NextResponse.json({ error: "paths must be an array" }, { status: 400 });
  }

  const urls: Record<string, string | null> = {};
  for (const raw of rawPaths) {
    if (typeof raw !== "string") {
      urls[String(raw)] = null;
      continue;
    }
    const normalized = raw
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\.md$/i, "");
    urls[raw] = resolveDocUrl(normalized);
  }
  return NextResponse.json({ urls });
}