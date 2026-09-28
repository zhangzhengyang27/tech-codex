"use client";

import { useCallback, useRef, useState } from "react";

/**
 * 拍平后的分页响应形状（与 lib/paged.ts flattenPaged 输出一致）。
 */
export interface FlatPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * 分页列表通用状态钩子：items/分页/loading/error + 请求序守卫——
 * 慢的旧响应（改筛选/快速翻页后仍返回）不覆盖新结果，也不用旧请求把 loading 卡住。
 *
 * 用法：组件持有筛选状态并定义 `fetchPage = useCallback((pg) => listX(filters, pg, size), [filters])`，
 * 翻页/查询时调用 `load(pg, fetchPage)`（钩子会把目标页码传给 fetcher）。
 * 返回的 setError 允许页面把动作错误展示在同一位置。
 */
export function usePagedList<T>() {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const seqRef = useRef(0);

  const load = useCallback(
    async (pg: number, fetch: (page: number) => Promise<FlatPage<T>>) => {
      const seq = ++seqRef.current;
      setLoading(true);
      setError("");
      try {
        const r = await fetch(pg);
        if (seq !== seqRef.current) return; // 已有更新的请求接管渲染
        setItems(r.content ?? []);
        setPage(r.number ?? pg);
        setTotalElements(r.totalElements ?? 0);
        setTotalPages(r.totalPages ?? 0);
      } catch (e) {
        if (seq !== seqRef.current) return;
        setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (seq === seqRef.current) setLoading(false);
      }
    },
    [],
  );

  return { items, page, totalElements, totalPages, loading, error, setError, load };
}
