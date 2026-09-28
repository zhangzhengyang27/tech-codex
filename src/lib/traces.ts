"use client";

import { getToken } from "./auth";
import { flattenPaged } from "./paged";

/* ===== 与 rag-knowledge-hub /admin/kb/traces 契约的类型 ===== */

export interface RetrievalTraceView {
  id: number;
  libraryId: string | null;
  userId: string | null;
  originalQuery: string;
  searchQuery: string;
  keywordUsed: boolean | null;
  vectorCount: number | null;
  keywordCount: number | null;
  fusedCount: number | null;
  reranked: boolean | null;
  rerankModelAvailable: boolean | null;
  resultCount: number | null;
  elapsedMs: number | null;
  /** 命中片段摘要（docId#chunkIndex，逗号分隔） */
  hitSummary: string | null;
  pathFilter: string | null;
  createdDate: string | null;
}

export interface PagedTraces {
  content: RetrievalTraceView[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** 检索 Trace 分页（时间倒序，libraryId/userId/keyword 均可选过滤） */
export async function listTraces(
  filters: { libraryId?: string; userId?: string; keyword?: string },
  page = 0,
  size = 20,
): Promise<PagedTraces> {
  const token = getToken();
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (filters.libraryId?.trim()) qs.set("libraryId", filters.libraryId.trim());
  if (filters.userId?.trim()) qs.set("userId", filters.userId.trim());
  if (filters.keyword?.trim()) qs.set("keyword", filters.keyword.trim());
  const res = await fetch(`/kb-admin/traces?${qs.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return flattenPaged(await res.json());
}
