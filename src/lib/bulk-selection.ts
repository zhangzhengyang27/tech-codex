/**
 * 批量选择的状态变换。抽成纯函数的原因：
 * 跨页累计后，"当前页是否全选"不能用 `size === 当前页条数` 判断，
 * 这类边界在 setState 回调里很难断言，独立出来才能直接单测。
 */

/** 切换单项：已选则移除，未选则加入。 */
export function toggleId(prev: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** 当前页是否已全选。空页返回 false，否则表头复选框在空列表上也会显示勾选。 */
export function isPageAllSelected(
  prev: ReadonlySet<number>,
  pageIds: readonly number[],
): boolean {
  return pageIds.length > 0 && pageIds.every((id) => prev.has(id));
}

/**
 * 切换当前页全选。
 * - 已全选：只移除当前页的 id，其他页已选中的项保留
 * - 未全选：补齐当前页所有 id，不覆盖其他页的选中
 */
export function togglePage(
  prev: ReadonlySet<number>,
  pageIds: readonly number[],
): Set<number> {
  const next = new Set(prev);
  if (isPageAllSelected(prev, pageIds)) {
    pageIds.forEach((id) => next.delete(id));
  } else {
    pageIds.forEach((id) => next.add(id));
  }
  return next;
}
