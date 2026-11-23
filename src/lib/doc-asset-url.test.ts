import { describe, expect, it } from "vitest";

import { resolveDocAssetUrl } from "@/lib/doc-asset-url";

describe("resolveDocAssetUrl", () => {
  it("把正文相对图片映射到 public/docs-assets", () => {
    // 文档迁移到 DB 后，图片仍按 docs 内的目录结构存放
    const url = resolveDocAssetUrl(
      "07-架构与工程/12-技术通识/14-分层架构.md",
      "images/88309/6bfe53c81c92634f81765870181b63d9.jpg"
    );
    expect(url).not.toBeNull();
    expect(decodeURIComponent(url!)).toBe(
      "/docs-assets/07-架构与工程/12-技术通识/images/88309/6bfe53c81c92634f81765870181b63d9.jpg"
    );
  });

  it("处理 ./ 与 ../，但不允许跳出文档根目录", () => {
    const normalized = resolveDocAssetUrl(
      "07-架构与工程/12-技术通识/14-分层架构.md",
      "./images/a.png"
    );
    expect(normalized).not.toBeNull();
    expect(decodeURIComponent(normalized!)).toContain(
      "/docs-assets/07-架构与工程/12-技术通识/images/a.png"
    );
    expect(
      resolveDocAssetUrl(
        "07-架构与工程/12-技术通识/14-分层架构.md",
        "../../../outside.png"
      )
    ).toBeNull();
  });

  it("外链、根路径与 data URI 保持原样", () => {
    expect(resolveDocAssetUrl("a/b.md", "https://example.com/a.png")).toBeNull();
    expect(resolveDocAssetUrl("a/b.md", "/static/a.png")).toBeNull();
    expect(resolveDocAssetUrl("a/b.md", "data:image/png;base64,xxx")).toBeNull();
  });
});
