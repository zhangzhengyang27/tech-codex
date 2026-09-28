"use client";

import { getToken } from "./auth";
import { flattenPaged } from "./paged";

/* ===== 与 rag-knowledge-hub /admin/kb 文档契约的类型 ===== */

export interface KbDocumentView {
  id: number;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number | null;
  chunkCount: number | null;
  status: string;
  /** 来源类型：UPLOAD/URL/DIRECTORY/SYNC（SYNC 为 docs 同步受管，不支持在线编辑） */
  sourceType: string | null;
  importedBy: string;
  createdDate: string | null;
  /** 解析后的 Markdown 原文；仅详情接口返回（列表接口为 null） */
  content: string | null;
}

export interface PagedDocuments {
  content: KbDocumentView[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** 导入/同步/重建索引后台任务进度（与后端 KbImportTaskView 对齐） */
export interface AdminTaskView {
  taskId: string;
  status: "RUNNING" | "DONE" | "FAILED";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/** 知识库统计（与后端 KbStatsView 对齐） */
export interface KbStats {
  totalDocuments: number;
  totalChunks: number;
  indexedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  totalVectorCount: number;
}

const adminKbFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const token = getToken();
  // FormData 交给浏览器自动生成 multipart 边界，不能手动设置 Content-Type
  const isForm = init?.body instanceof FormData;
  const res = await fetch(`/kb-admin${path}`, {
    ...init,
    headers: {
      ...(init?.body && !isForm ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error((await res.text()) || `请求失败（${res.status}）`);
  return res;
};

const documentFetch = (path: string, init?: RequestInit): Promise<Response> =>
  adminKbFetch(`/documents${path}`, init);

/** 分页查询文档列表：/admin/kb/documents（status 可选：INDEXED/PENDING/FAILED） */
export async function listDocuments(
  keyword?: string,
  status?: string,
  page = 0,
  size = 20,
): Promise<PagedDocuments> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword && keyword.trim()) qs.set("keyword", keyword.trim());
  if (status && status.trim()) qs.set("status", status.trim());
  const res = await documentFetch(`?${qs.toString()}`);
  return flattenPaged(await res.json());
}

/** 重建单篇文档索引（同步执行，失败文档修复入口）：POST /admin/kb/documents/{id}/reindex */
export async function reindexAdminDocument(id: number): Promise<void> {
  await documentFetch(`/${id}/reindex`, { method: "POST" });
}

/** 在线编辑文档（可选标题）并重建索引：PUT /admin/kb/documents/{id}/content；SYNC 受管文档后端拒绝 */
export async function updateDocumentContent(
  id: number,
  content: string,
  title?: string,
): Promise<KbDocumentView> {
  const body = new URLSearchParams({ content });
  if (title && title.trim()) body.set("title", title.trim());
  const res = await documentFetch(`/${id}/content`, { method: "PUT", body });
  return (await res.json()) as KbDocumentView;
}

/** 文档详情（withContent=true 返回 Markdown 原文）：GET /admin/kb/documents/{id} */
export async function adminDocument(id: number, withContent = true): Promise<KbDocumentView> {
  const res = await documentFetch(`/${id}?content=${withContent}`);
  return (await res.json()) as KbDocumentView;
}

/** 单文件上传到公共知识库并索引：POST /admin/kb/documents */
export async function uploadAdminDocument(file: File, title?: string): Promise<KbDocumentView> {
  const form = new FormData();
  form.append("file", file);
  if (title && title.trim()) form.append("title", title.trim());
  const res = await documentFetch("", { method: "POST", body: form });
  return (await res.json()) as KbDocumentView;
}

/** URL 抓取导入：POST /admin/kb/documents/import-url */
export async function importUrl(url: string): Promise<KbDocumentView> {
  const qs = new URLSearchParams({ url });
  const res = await documentFetch(`/import-url?${qs.toString()}`, { method: "POST" });
  return (await res.json()) as KbDocumentView;
}

/** 服务器目录批量导入（异步任务）：POST /admin/kb/documents/import → taskId */
export async function importDirectory(path: string): Promise<{ taskId: string }> {
  const qs = new URLSearchParams({ path });
  const res = await documentFetch(`/import?${qs.toString()}`, { method: "POST" });
  return (await res.json()) as { taskId: string };
}

/** 删除公共库文档（连分块与向量一并清理）：DELETE /admin/kb/documents/{id} */
export async function deleteAdminDocument(id: number): Promise<void> {
  await documentFetch(`/${id}`, { method: "DELETE" });
}

/** 手动触发 docs 目录同步对账（异步任务）：POST /admin/kb/documents/sync → taskId */
export async function syncDocs(path?: string): Promise<{ taskId: string }> {
  const qs = path && path.trim() ? `?path=${encodeURIComponent(path.trim())}` : "";
  const res = await documentFetch(`/sync${qs}`, { method: "POST" });
  return (await res.json()) as { taskId: string };
}

/** 重建公共库向量索引（异步任务）：POST /admin/kb/index/rebuild → taskId */
export async function rebuildIndex(): Promise<{ taskId: string }> {
  const res = await adminKbFetch(`/index/rebuild`, { method: "POST" });
  return (await res.json()) as { taskId: string };
}

/** 查询导入/同步/重建任务进度：GET /admin/kb/tasks/{taskId} */
export async function getAdminTask(taskId: string): Promise<AdminTaskView> {
  const res = await adminKbFetch(`/tasks/${encodeURIComponent(taskId)}`);
  return (await res.json()) as AdminTaskView;
}

/** 知识库统计汇总：GET /admin/kb/stats */
export async function kbStats(): Promise<KbStats> {
  const res = await adminKbFetch(`/stats`);
  return (await res.json()) as KbStats;
}
