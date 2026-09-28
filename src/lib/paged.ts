"use client";

/**
 * 归一化后端分页响应：Spring 的 PagedModel 把分页元数据嵌在 page 对象里
 * （{ content, page: { size, number, totalElements, totalPages } }），
 * 而站点各管理页按顶层字段读取——统一在此拍平，避免「共 0 条」与翻页失效。
 */
export function flattenPaged<T>(raw: unknown): {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
} {
  const r = (raw ?? {}) as Record<string, unknown>;
  const p = (r.page ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return {
    content: Array.isArray(r.content) ? (r.content as T[]) : [],
    totalElements: num(p.totalElements ?? r.totalElements),
    totalPages: num(p.totalPages ?? r.totalPages),
    number: num(p.number ?? r.number),
    size: num(p.size ?? r.size, 20),
  };
}
