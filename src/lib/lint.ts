"use client";

import { getToken } from "./auth";
import { apiFetch, apiErrorMessage, handleUnauthorized } from "./fetch-helpers";

export type LintIssueType = "BROKEN_LINK" | "DUPLICATE_TITLE";

export interface LintIssue {
  docId: number;
  type: LintIssueType;
  title: string;
  filePath: string;
  detail: string;
  suggestion: string;
  owner: string | null;
}

export interface LintReport {
  libraryId: string;
  docCount: number;
  linkCount: number;
  brokenLinkCount: number;
  duplicateTitleCount: number;
  /** 断链按团队队列聚合，如 { "frontend-team": 12, "UNASSIGNED": 3 } */
  brokenByOwner: Record<string, number>;
  issues: LintIssue[];
  prSummary: string;
  scannedAt: string;
}

/** 全站内容 Lint：断链与同名标题；只读扫描，不会改文档。 */
export async function contentLint(limit = 200): Promise<LintReport> {
  const token = getToken();
  const res = await apiFetch(`/kb-admin/lint?limit=${limit}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期或非管理员，请重新登录");
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as LintReport;
}
