"use client";

import { getToken } from "./auth";

/* ===== 与 rag-knowledge-hub /admin/kb/alerts、/admin/kb/security 契约的类型 ===== */

export interface KbAlertItem {
  id: number;
  libraryId: string | null;
  type: string;
  severity: string;
  message: string;
  detail: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  createdDate: string | null;
}

export interface PagedAlerts {
  content: KbAlertItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface LockedAccountItem {
  username: string;
  failureCount: number;
  remainingSeconds: number;
}

const opsFetch = async (path: string, init?: RequestInit): Promise<Response> => {
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

/** 未处理告警（管理总览页）：GET /admin/kb/alerts/open */
export async function listOpenAlerts(): Promise<KbAlertItem[]> {
  const res = await opsFetch(`/alerts/open`);
  return (await res.json()) as KbAlertItem[];
}

/** 告警分页（resolved 可选过滤）：GET /admin/kb/alerts */
export async function listAlerts(resolved: boolean | undefined, page = 0, size = 20): Promise<PagedAlerts> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (resolved !== undefined) qs.set("resolved", String(resolved));
  const res = await opsFetch(`/alerts?${qs.toString()}`);
  return (await res.json()) as PagedAlerts;
}

/** 处理告警：PUT /admin/kb/alerts/{id}/resolve */
export async function resolveAlert(id: number): Promise<void> {
  await opsFetch(`/alerts/${id}/resolve`, { method: "PUT" });
}

/** 当前登录锁定中的账号：GET /admin/kb/security/logins */
export async function listLockedAccounts(): Promise<LockedAccountItem[]> {
  const res = await opsFetch(`/security/logins`);
  return (await res.json()) as LockedAccountItem[];
}

/** 解锁登录锁定账号：DELETE /admin/kb/security/logins/{username} */
export async function unlockAccount(username: string): Promise<void> {
  await opsFetch(`/security/logins/${encodeURIComponent(username)}`, { method: "DELETE" });
}
