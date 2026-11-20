"use client";

/** 内容缺口中心 API：列表 / 聚类 / 状态流转 / 转评测 / CSV 导出。 */
import { getToken, type Paged } from "./auth";
import { apiFetch, apiErrorMessage, handleUnauthorized } from "./fetch-helpers";
import { flattenPaged } from "./paged";

export type GapStatus = "OPEN" | "TRIAGED" | "PLANNED" | "RESOLVED" | "IGNORED";

export interface ContentGapItem {
  id: number;
  question: string;
  normalized: string | null;
  frequency: number;
  status: GapStatus;
  signalSummary: string | null;
  clusterKey: string | null;
  clusterLabel: string | null;
  relatedDocIds: string | null;
  sampleConversationId: string | null;
  evalCaseId: number | null;
  note: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  createdDate: string | null;
}

export interface ContentGapEvent {
  id: number;
  signalType: string;
  conversationId: string | null;
  feedbackId: number | null;
  detail: string | null;
  createdDate: string | null;
}

export interface ContentGapDetail {
  gap: ContentGapItem;
  events: ContentGapEvent[];
}

export interface ContentGapSummary {
  total: number;
  open: number;
  triaged: number;
  planned: number;
  resolved: number;
  last7Days: number;
}

export interface ContentGapCluster {
  key: string;
  label: string;
  size: number;
  lastSeen: string | null;
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export async function listGaps(
  opts: { status?: GapStatus | ""; keyword?: string; page?: number; size?: number } = {}
): Promise<Paged<ContentGapItem>> {
  const res = await apiFetch(
    `/kb-admin/gaps${query({ status: opts.status, keyword: opts.keyword, page: opts.page ?? 0, size: opts.size ?? 20 })}`,
    { headers: authHeaders() }
  );
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期或非管理员，请重新登录");
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return flattenPaged<ContentGapItem>(await res.json());
}

export async function topGaps(limit = 10): Promise<ContentGapItem[]> {
  const res = await apiFetch(`/kb-admin/gaps/top?limit=${limit}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as ContentGapItem[];
}

export async function gapSummary(): Promise<ContentGapSummary> {
  const res = await apiFetch("/kb-admin/gaps/summary", { headers: authHeaders() });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as ContentGapSummary;
}

export async function gapClusters(): Promise<ContentGapCluster[]> {
  const res = await apiFetch("/kb-admin/gaps/clusters", { headers: authHeaders() });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as ContentGapCluster[];
}

export async function gapDetail(id: number): Promise<ContentGapDetail> {
  const res = await apiFetch(`/kb-admin/gaps/${id}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as ContentGapDetail;
}

export async function updateGapStatus(id: number, status: GapStatus, note?: string): Promise<ContentGapItem> {
  const res = await apiFetch(`/kb-admin/gaps/${id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeaders() },
    body: new URLSearchParams({ status, ...(note !== undefined ? { note } : {}) }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as ContentGapItem;
}

export async function batchGapStatus(ids: number[], status: GapStatus): Promise<{ updated: number }> {
  const res = await apiFetch("/kb-admin/gaps/batch-status", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeaders() },
    body: new URLSearchParams({ ids: ids.join(","), status }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as { updated: number };
}

export async function convertGap(id: number, expectedKeywords: string, note?: string): Promise<{ caseId: number }> {
  const res = await apiFetch(`/kb-admin/gaps/${id}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...authHeaders() },
    body: new URLSearchParams({ expectedKeywords, ...(note ? { note } : {}) }),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as { caseId: number };
}

/** 导出当前筛选结果：走后端鉴权，前端拿 blob 后触发下载，避免把 token 拼进 URL。 */
export async function downloadGapCsv(status?: GapStatus | "", keyword?: string): Promise<void> {
  const res = await apiFetch(`/kb-admin/gaps/export.csv${query({ status, keyword })}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "content-gaps.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
