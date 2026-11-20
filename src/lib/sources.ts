"use client";

import { getToken } from "./auth";
import { apiFetch, apiErrorMessage, handleUnauthorized } from "./fetch-helpers";

export interface GitSyncResult {
  repoUrl: string;
  branch: string;
  path: string;
  localPath: string;
  taskId: string;
}

export interface ImportTask {
  taskId: string;
  status: "RUNNING" | "DONE" | "FAILED" | string;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

const authHeaders = (): HeadersInit => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** 触发 GitHub 浅克隆/增量同步；返回导入任务 ID。 */
export async function syncGithub(repoUrl: string, branch: string, path: string): Promise<GitSyncResult> {
  const body = new URLSearchParams({ repoUrl, branch, path });
  const res = await apiFetch("/kb-admin/sources/github/sync", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期或非管理员，请重新登录");
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as GitSyncResult;
}

/** 查询目录/GitHub 导入任务进度（复用现有导入任务接口）。 */
export async function fetchImportTask(taskId: string): Promise<ImportTask> {
  const res = await apiFetch(`/kb-admin/tasks/${encodeURIComponent(taskId)}`, { headers: authHeaders() });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期或非管理员，请重新登录");
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as ImportTask;
}
