"use client";

import { getToken } from "./auth";
import { flattenPaged } from "./paged";

/* ===== 与 rag-knowledge-hub /admin/kb/users、/admin/kb/quotas 契约的类型 ===== */

export interface UserView {
  id: number;
  username: string;
  nickname: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  libraryId: string | null;
  /** 个人库限额覆盖（null=跟随全局默认） */
  docLimit: number | null;
  retrievalLimit: number | null;
  chatLimit: number | null;
  createdDate: string | null;
}

export interface PagedUsers {
  content: UserView[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface UserQuotaRow {
  userId: number;
  username: string;
  nickname: string | null;
  status: "ACTIVE" | "DISABLED";
  docUsed: number;
  docLimit: number;
  docLimitCustom: boolean;
  retrievalUsed: number;
  retrievalLimit: number;
  retrievalLimitCustom: boolean;
  chatUsed: number;
  chatLimit: number;
  chatLimitCustom: boolean;
}

export interface PagedQuotas {
  content: UserQuotaRow[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

const usersFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const token = getToken();
  const res = await fetch(`/kb-admin${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error((await res.text()) || `请求失败（${res.status}）`);
  return res;
};

/** 用户分页（keyword 模糊匹配用户名/昵称）：GET /admin/kb/users */
export async function listUsers(keyword: string | undefined, page = 0, size = 20): Promise<PagedUsers> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword && keyword.trim()) qs.set("keyword", keyword.trim());
  const res = await usersFetch(`/users?${qs.toString()}`);
  return flattenPaged(await res.json());
}

/** 变更用户角色：PUT /admin/kb/users/{id}/role */
export async function updateUserRole(id: number, role: "USER" | "ADMIN"): Promise<UserView> {
  const res = await usersFetch(`/users/${id}/role?role=${role}`, { method: "PUT" });
  return (await res.json()) as UserView;
}

/** 变更用户状态（DISABLED 后登录与既有 token 均失效）：PUT /admin/kb/users/{id}/status */
export async function updateUserStatus(id: number, status: "ACTIVE" | "DISABLED"): Promise<UserView> {
  const res = await usersFetch(`/users/${id}/status?status=${status}`, { method: "PUT" });
  return (await res.json()) as UserView;
}

/** 管理员重置用户密码：PUT /admin/kb/users/{id}/password（表单体，避免密码进 URL） */
export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  await usersFetch(`/users/${id}/password`, {
    method: "PUT",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ newPassword }),
  });
}

/** 用户配额一览：GET /admin/kb/quotas */
export async function listQuotas(keyword: string | undefined, page = 0, size = 20): Promise<PagedQuotas> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (keyword && keyword.trim()) qs.set("keyword", keyword.trim());
  const res = await usersFetch(`/quotas?${qs.toString()}`);
  return flattenPaged(await res.json());
}

/**
 * 调整用户个人库限额：PUT /admin/kb/quotas/{userId}。
 * body 语义：key 不存在=不变更；-1=清除覆盖（跟随默认）；>=0=设置值（0=不限制）。
 */
export async function updateUserLimits(
  userId: number,
  limits: { docLimit?: number; retrievalLimit?: number; chatLimit?: number },
): Promise<UserQuotaRow> {
  const res = await usersFetch(`/quotas/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(limits),
  });
  return (await res.json()) as UserQuotaRow;
}
