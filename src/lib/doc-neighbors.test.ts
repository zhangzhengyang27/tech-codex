import { describe, expect, it } from "vitest";

import { docHref, flattenDocFiles, neighborsOf } from "./doc-neighbors";
import type { DocSection } from "./docs-reader";

/** 三节两级树：根概述 → A 节两个文件 → A 节子目录一个文件 → B 节一个文件 */
const tree: DocSection[] = [
  {
    title: "概述",
    slug: "_root",
    files: [{ title: "概览", slug: "00-概览", path: "04-前端/00-概览.md" }],
    children: [],
  },
  {
    title: "HTML5",
    slug: "02-HTML5",
    files: [
      { title: "语义化", slug: "01-语义化", path: "04-前端/02-HTML5/01-语义化.md" },
      { title: "表单", slug: "02-表单", path: "04-前端/02-HTML5/02-表单.md" },
    ],
    children: [
      {
        title: "进阶",
        slug: "02-HTML5/03-进阶",
        files: [{ title: "Canvas", slug: "01-Canvas", path: "04-前端/02-HTML5/03-进阶/01-Canvas.md" }],
        children: [],
      },
    ],
  },
  {
    title: "CSS",
    slug: "03-CSS",
    files: [{ title: "选择器", slug: "01-选择器", path: "04-前端/03-CSS/01-选择器.md" }],
    children: [],
  },
];

describe("flattenDocFiles", () => {
  it("按侧栏顺序拍平：当前节文件在前，子节在后", () => {
    const files = flattenDocFiles(tree).map((f) => f.path);

    expect(files).toEqual([
      "04-前端/00-概览.md",
      "04-前端/02-HTML5/01-语义化.md",
      "04-前端/02-HTML5/02-表单.md",
      "04-前端/02-HTML5/03-进阶/01-Canvas.md",
      "04-前端/03-CSS/01-选择器.md",
    ]);
  });
});

describe("neighborsOf", () => {
  const files = flattenDocFiles(tree);

  it("中间项同时有上一篇和下一篇", () => {
    const { prev, next } = neighborsOf(files, "04-前端/02-HTML5/02-表单.md");

    expect(prev?.title).toBe("语义化");
    // 子节紧跟在父节文件之后，符合侧栏自上而下的阅读顺序
    expect(next?.title).toBe("Canvas");
  });

  it("首项没有上一篇，末项没有下一篇", () => {
    expect(neighborsOf(files, "04-前端/00-概览.md").prev).toBeUndefined();
    expect(neighborsOf(files, "04-前端/03-CSS/01-选择器.md").next).toBeUndefined();
  });

  it("文档不在索引里时返回空，不猜测相邻位置", () => {
    // 文档被下线后仍可能被旧链接访问，此时给邻接会指向无关篇章
    expect(neighborsOf(files, "04-前端/02-HTML5/99-已下线.md")).toEqual({});
  });
});

describe("docHref", () => {
  it("剥掉分类根目录与 .md 后缀", () => {
    expect(docHref("frontend", "04-前端", "04-前端/02-HTML5/01-语义化.md")).toBe(
      "/docs/frontend/02-HTML5/01-语义化",
    );
  });
});
