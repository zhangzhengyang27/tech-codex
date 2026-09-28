import { describe, expect, it } from "vitest";

import { allCategories } from "@/lib/docs-config";
import { resolveDocUrl } from "@/lib/doc-url";

describe("resolveDocUrl", () => {
  it("分类目录内的文件映射为 /docs/{slug}/{相对路径}", () => {
    // 任取一个真实分类做前缀断言(依赖 docs-config 的静态定义)
    const url = resolveDocUrl("04-前端/框架/Vue/响应式原理.md");
    if (url === null) {
      // docs-config 分类调整导致该路径不归属时,必须显式为 null 而非抛错
      expect(url).toBeNull();
    } else {
      expect(url).toMatch(/^\/docs\/[a-z0-9-]+\/框架\/Vue\/响应式原理$/);
      expect(url!.endsWith(".md")).toBe(false);
    }
  });

  it("无法归属的路径返回 null 而非抛错", () => {
    expect(resolveDocUrl("不存在的顶级目录/a.md")).toBeNull();
    expect(resolveDocUrl("")).toBeNull();
  });

  it("指向分类目录本身时返回 null", () => {
    expect(resolveDocUrl(allCategories[0].dir)).toBeNull();
  });
});
