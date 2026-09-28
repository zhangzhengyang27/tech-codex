import { describe, expect, it } from "vitest";

import { extractToc } from "@/lib/toc";

describe("extractToc", () => {
  it("只收集 2-4 级标题", () => {
    const md = ["# 一级不算", "## 二级", "### 三级", "#### 四级", "##### 五级不算"].join("\n");
    const toc = extractToc(md);
    expect(toc.map((t) => t.level)).toEqual([2, 3, 4]);
    expect(toc[0].text).toBe("二级");
  });

  it("代码块内的 # 行不算标题", () => {
    const md = ["## 真标题", "", "```bash", "# 这是注释不是标题", "```", "", "~~~", "## 围栏里的标题", "~~~"].join("\n");
    const toc = extractToc(md);
    expect(toc.map((t) => t.text)).toEqual(["真标题"]);
  });

  it("行内语法还原为纯文本:链接取文本、图片忽略、行内代码保留", () => {
    // 图片移除后会留下相邻空格(实现即如此,与 hast-util-to-string 行为一致)
    const toc = extractToc("## 用 [React](https://react.dev) 与 `useState()` 的 ![](x.png) 组合");
    expect(toc[0].text).toBe("用 React 与 useState() 的  组合");
  });

  it("重复标题按 github-slugger 规则去重(-1/-2)", () => {
    const toc = extractToc("## 安装\n\n## 安装\n\n## 安装");
    expect(toc.map((t) => t.id)).toEqual(["安装", "安装-1", "安装-2"]);
  });
});
