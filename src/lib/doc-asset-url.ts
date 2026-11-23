const DOC_ASSET_PREFIX = "/docs-assets";

/**
 * 把文档正文里的相对图片地址映射到 public/docs-assets 下的静态资源。
 *
 * DB-only 模式下没有可读取的 docs/ 目录，图片也不能再依赖文档同级路径；
 * 迁移时保留了 docs 内的相对路径结构，因此这里只做路径归一化和 URL 编码。
 * 外链、根路径、data URI 与越出文档根目录的路径保持原样（返回 null）。
 */
export function resolveDocAssetUrl(docRelativePath: string, src: string): string | null {
  if (!src || src.startsWith("#") || src.startsWith("/") ||
      /^(https?:|mailto:|data:)/i.test(src)) {
    return null;
  }

  const [urlPath, hash] = src.split("#");
  if (!urlPath) return null;

  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }

  const stack = docRelativePath.split("/").filter(Boolean).slice(0, -1);
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (stack.length === 0) return null;
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  if (stack.length === 0) return null;

  return `${DOC_ASSET_PREFIX}/${stack.map(encodeURIComponent).join("/")}${hash ? `#${encodeURIComponent(hash)}` : ""}`;
}
