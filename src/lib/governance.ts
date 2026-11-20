"use client";

import { getToken } from "./auth";
import { apiFetch, apiErrorMessage, handleUnauthorized } from "./fetch-helpers";

/** 治理问题类型：重复 / 过期 / 缺责任人 / 空分块 */
export type GovernanceIssueType = "DUPLICATE" | "STALE" | "MISSING_OWNER" | "EMPTY_CHUNKS";

export interface GovernanceIssue {
  docId: number;
  type: GovernanceIssueType;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  filePath: string;
  detail: string;
  owner: string | null;
  reviewDueDate: string | null;
  updatedDate: string | null;
  healthScore: number;
}

export interface GovernanceDuplicateGroup {
  normalizedTitle: string;
  count: number;
  samplePath: string;
}

export interface GovernanceSummary {
  totalDocuments: number;
  avgHealthScore: number;
  duplicateDocuments: number;
  staleDocuments: number;
  missingOwnerDocuments: number;
  emptyChunkDocuments: number;
  duplicateGroups: GovernanceDuplicateGroup[];
}

const govFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const token = getToken();
  const res = await apiFetch(`/kb-admin${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期或非管理员，请重新登录");
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res;
};

export async function governanceSummary(staleDays = 180): Promise<GovernanceSummary> {
  const res = await govFetch(`/governance/summary?staleDays=${staleDays}`);
  return (await res.json()) as GovernanceSummary;
}

export async function governanceIssues(type?: GovernanceIssueType, staleDays = 180): Promise<GovernanceIssue[]> {
  const qs = new URLSearchParams({ staleDays: String(staleDays), limit: "300" });
  if (type) qs.set("type", type);
  const res = await govFetch(`/governance/issues?${qs.toString()}`);
  return (await res.json()) as GovernanceIssue[];
}

/** 更新责任人与复核日期；owner 传空字符串表示清空。 */
export async function updateGovernance(docId: number, owner: string, reviewDueDate: string): Promise<void> {
  const body = new URLSearchParams({ owner });
  if (reviewDueDate) body.set("reviewDueDate", reviewDueDate);
  await govFetch(`/governance/documents/${docId}`, { method: "PUT", body });
}
