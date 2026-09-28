"use client";

import { getToken } from "./auth";

/* ===== 与 rag-knowledge-hub /admin/kb/usage 文档契约的类型 ===== */

export interface UsageTrendPoint {
  date: string;
  questions: number;
  tokens: number;
  avgLatencyMs: number;
  avgHitCount: number;
}

export interface UsageSummaryView {
  totalQuestions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  avgHitCount: number;
  trend: UsageTrendPoint[];
}

export interface ChatUsageView {
  id: number;
  userId: string;
  conversationId: string;
  question: string;
  answerCharCount: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  elapsedMs: number | null;
  hitCount: number | null;
  createdDate: string | null;
}

export interface PagedUsage {
  content: ChatUsageView[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** 用户维度用量排行（按问答数降序） */
export interface UserUsageRow {
  userId: string;
  questions: number;
  totalTokens: number;
  avgLatencyMs: number;
  avgHitCount: number;
  lastActiveAt: string | null;
}

const usageFetch = async (path: string): Promise<Response> => {
  const token = getToken();
  const res = await fetch(`/kb-admin/usage${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error((await res.text()) || `请求失败（${res.status}）`);
  return res;
};

/** 用量汇总 + 近 N 天日趋势：/admin/kb/usage/summary */
export async function usageSummary(days = 30): Promise<UsageSummaryView> {
  const res = await usageFetch(`/summary?days=${days}`);
  return (await res.json()) as UsageSummaryView;
}

/** 用量明细分页：/admin/kb/usage/recent */
export async function usageRecent(page = 0, size = 20): Promise<PagedUsage> {
  const res = await usageFetch(`/recent?page=${page}&size=${size}`);
  return (await res.json()) as PagedUsage;
}

/** 用户维度用量 Top 排行：/admin/kb/usage/users?days&limit */
export async function usageTopUsers(days = 7, limit = 10): Promise<UserUsageRow[]> {
  const res = await usageFetch(`/users?days=${days}&limit=${limit}`);
  return (await res.json()) as UserUsageRow[];
}
