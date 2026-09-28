"use client";

import { getToken } from "./auth";
import type { KbDocumentView, PagedDocuments } from "./documents";

/* ===== 用户私有知识库 API（F1）=====
 *
 * 契约（后端待实现，详见仓库根 PRIVATE_KB_API_CONTRACT.md）：
 * 经 /kb-api rewrite → 后端 /api/kb/**（登录即可，租户一律由后端从 Bearer token 解析，
 * 前端不传空间标识——个人知识库（u-{username}）在注册时即确定）。
 * 后端接口上线前以下函数会抛「请求失败（404/403）」，页面按错误态降级展示。
 */

const kbFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const token = getToken();
  const res = await fetch(`/kb-api${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new Error("登录已过期，请重新登录");
  if (!res.ok) throw new Error((await res.text()) || `请求失败（${res.status}）`);
  return res;
};

/* ===== 剩余配额 ===== */

/** 三项配额的当前值与上限；limit 为 0 表示不限制（后端语义：0=不限制） */
export interface KbQuota {
  docUsed: number;
  docLimit: number;
  retrievalUsed: number;
  retrievalDailyLimit: number;
  chatUsed: number;
  chatDailyLimit: number;
}

/** 查询当前租户（个人库）的配额使用情况 */
export async function myQuota(): Promise<KbQuota> {
  return (await kbFetch("/my/quota")).json();
}

/* ===== 私有文档管理 ===== */

const listQs = (keyword?: string, page = 0, size = 20): string => {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword && keyword.trim()) qs.set("keyword", keyword.trim());
  return qs.toString();
};

/** 分页查询我的私有文档：GET /api/kb/my/documents */
export async function myDocuments(keyword?: string, page = 0, size = 20): Promise<PagedDocuments> {
  return (await kbFetch(`/my/documents?${listQs(keyword, page, size)}`)).json();
}

/**
 * 上传文件到我的私有知识库：POST /api/kb/my/documents（multipart）
 * 注意：multipart 不能手动设置 Content-Type，须由浏览器生成 boundary。
 */
export async function uploadMyDocument(file: File, title?: string): Promise<KbDocumentView> {
  const body = new FormData();
  body.append("file", file);
  if (title && title.trim()) body.append("title", title.trim());
  return (await kbFetch("/my/documents", { method: "POST", body })).json();
}

/** 查看个人空间单文档详情（含解析后的 Markdown 原文，供阅读器渲染） */
export async function myDocument(id: number): Promise<KbDocumentView> {
  return (await kbFetch(`/my/documents/${id}`)).json();
}

/** 删除我的私有文档（连同分块与向量）：DELETE /api/kb/my/documents/{id} */
export async function deleteMyDocument(id: number): Promise<void> {
  await kbFetch(`/my/documents/${id}`, { method: "DELETE" });
}
