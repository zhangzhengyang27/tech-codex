import { describe, expect, it } from "vitest";

import { isPageAllSelected, toggleId, togglePage } from "./bulk-selection";

describe("toggleId", () => {
  it("加入未选中的 id", () => {
    expect([...toggleId(new Set(), 7)]).toEqual([7]);
  });

  it("移除已选中的 id", () => {
    expect([...toggleId(new Set([7, 8]), 7)]).toEqual([8]);
  });

  it("返回新集合，不修改入参", () => {
    const prev = new Set([1]);
    const next = toggleId(prev, 2);
    expect(prev.has(2)).toBe(false);
    expect(next).not.toBe(prev);
  });
});

describe("isPageAllSelected", () => {
  it("当前页全部选中返回 true", () => {
    expect(isPageAllSelected(new Set([1, 2]), [1, 2])).toBe(true);
  });

  it("跨页累计时仍按当前页判定，而不是按集合大小", () => {
    // 集合有 4 项，当前页只有 2 项：用 size 比较会误判为未全选
    expect(isPageAllSelected(new Set([1, 2, 3, 4]), [1, 2])).toBe(true);
  });

  it("空页返回 false", () => {
    expect(isPageAllSelected(new Set([1]), [])).toBe(false);
  });

  it("缺一项返回 false", () => {
    expect(isPageAllSelected(new Set([1]), [1, 2])).toBe(false);
  });
});

describe("togglePage", () => {
  it("未全选时补齐当前页", () => {
    expect([...togglePage(new Set([9]), [1, 2])].sort()).toEqual([1, 2, 9]);
  });

  it("已全选时只移除当前页，保留其他页的选中", () => {
    const prev = new Set([1, 2, 9]);
    expect([...togglePage(prev, [1, 2])]).toEqual([9]);
  });

  it("空页不改变集合", () => {
    const prev = new Set([1]);
    expect([...togglePage(prev, [])]).toEqual([1]);
  });
});
