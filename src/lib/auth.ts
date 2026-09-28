"use client";

/* ===== 与 lostsystem 知识库后端契约的类型 ===== */

import { flattenPaged } from "./paged";

export const TOKEN_KEY = "techcodex_token";
export const USER_KEY = "techcodex_user";

export interface AuthRequest {
  username: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  username: string;
  nickname?: string;
  role: "USER" | "ADMIN";
  libraryId: string;
}

export interface ChatHistoryItem {
  role: "user" | "ai";
  content: string;
  createdDate: string;
}

/**
 * 检索范围（用户私有知识库 F1）：
 * - public 仅站内公共文档（default 租户，缺省值，与既有行为一致）
 * - mine   仅当前用户私有知识库（token 中的个人租户）
 * - all    公共文档 + 私有库合并检索
 */
export type KbScope = "public" | "mine" | "all";

export interface Paged<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** 检索命中片段：附带文档溯源信息，供回答引用 */
export interface KbChunkHit {
  docId: number | null;
  chunkIndex: number | null;
  title: string;
  filePath: string;
  text: string;
  score: number | null;
  /** frontmatter slug（相对 /docs/ 的跳转标识，多数字段为空串） */
  siteSlug?: string;
}

/** SSE 流式事件类型 */
export type ChatEventType =
  | "phase"
  | "sources"
  | "intention"
  | "conversation"
  | "token"
  | "done"
  | "error";
export interface ChatStreamEvent {
  type: ChatEventType;
  data: string;
}

/** 对话（会话）元信息：后端 /api/kb/conversations 返回 */
export interface ChatConversation {
  conversationId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/* ===== 会话存储 ===== */

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

export function setSession(res: AuthResponse): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, res.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(res));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/* ===== 认证 API（经 /kb-auth rewrite → lostsystem /auth） ===== */

interface ApiErrorBody {
  message?: string;
}

export async function apiRegister(body: AuthRequest): Promise<AuthResponse> {
  const res = await fetch("/kb-auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await errorMessage(res)) ?? `请求失败（${res.status}）`);
  return (await res.json()) as AuthResponse;
}

export async function apiLogin(body: AuthRequest): Promise<AuthResponse> {
  const res = await fetch("/kb-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await errorMessage(res)) ?? `请求失败（${res.status}）`);
  return (await res.json()) as AuthResponse;
}

async function errorMessage(res: Response): Promise<string | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as ApiErrorBody;
    return typeof parsed.message === "string" ? parsed.message : null;
  } catch {
    return null;
  }
}

/* ===== 知识库 API（经 /kb-api rewrite → lostsystem /api/kb） ===== */

export async function kbSearch(
  query: string,
  k = 5,
  path?: string,
  scope?: KbScope,
  category?: string
): Promise<KbChunkHit[]> {
  const token = getToken();
  const pathQs = path ? `&path=${encodeURIComponent(path)}` : "";
  const scopeQs = scope ? `&scope=${encodeURIComponent(scope)}` : "";
  const categoryQs = category ? `&category=${encodeURIComponent(category)}` : "";
  const res = await fetch(
    `/kb-api/search?query=${encodeURIComponent(query)}&k=${k}${pathQs}${scopeQs}${categoryQs}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return (await res.json()) as KbChunkHit[];
}

/** 问答反馈：rating=UP 点赞 / DOWN 点踩；question/answer 为反馈时刻的快照 */
export async function kbFeedback(
  rating: "UP" | "DOWN",
  opts: { conversationId?: string; question?: string; answer?: string; comment?: string } = {}
): Promise<{ id: number; rating: string }> {
  const token = getToken();
  const body = new URLSearchParams({ rating });
  if (opts.conversationId) body.set("conversationId", opts.conversationId);
  if (opts.question) body.set("question", opts.question);
  if (opts.answer) body.set("answer", opts.answer);
  if (opts.comment) body.set("comment", opts.comment);
  const res = await fetch("/kb-api/feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return (await res.json()) as { id: number; rating: string };
}

/** 管理端：单条问答反馈 */
export interface ChatFeedbackItem {
  id: number;
  userId: string;
  conversationId: string | null;
  rating: "UP" | "DOWN";
  question: string | null;
  answer: string | null;
  comment: string | null;
  createdDate: string;
}

/** 管理端：问答反馈分页（rating 可选过滤，点踩条目用于回流评测集） */
export async function kbFeedbackList(
  rating: "UP" | "DOWN" | undefined,
  page = 0,
  size = 20
): Promise<Paged<ChatFeedbackItem>> {
  const token = getToken();
  const ratingQs = rating ? `&rating=${rating}` : "";
  const res = await fetch(`/kb-admin/feedback?page=${page}&size=${size}${ratingQs}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return flattenPaged(await res.json());
}

export async function kbHistory(
  page = 0,
  size = 50,
  conversationId?: string,
): Promise<Paged<ChatHistoryItem>> {
  const token = getToken();
  const cid = conversationId ? `&conversationId=${encodeURIComponent(conversationId)}` : "";
  const res = await fetch(`/kb-api/history?page=${page}&size=${size}${cid}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return flattenPaged(await res.json());
}

export async function kbClearHistory(conversationId?: string): Promise<void> {
  const token = getToken();
  const params = conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : "";
  const res = await fetch(`/kb-api/clear-history${params}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
}

/** 当前用户的对话（会话）列表 */
export async function listConversations(): Promise<ChatConversation[]> {
  const token = getToken();
  const res = await fetch("/kb-api/conversations", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return (await res.json()) as ChatConversation[];
}

/** 删除指定对话 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const token = getToken();
  const res = await fetch(`/kb-api/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
}

/* ===== SSE 流式问答（POST /api/kb/chat-stream，form body） ===== */

export async function streamChat(
  message: string,
  conversationId: string | undefined,
  onEvent: (ev: ChatStreamEvent) => void,
  signal?: AbortSignal,
  docPath?: string,
  scope?: KbScope,
  category?: string
): Promise<void> {
  const token = getToken();
  const body = new URLSearchParams({ message });
  if (conversationId) body.set("conversationId", conversationId);
  if (docPath) body.set("docPath", docPath);
  if (scope) body.set("scope", scope);
  if (category) body.set("category", category);
  const res = await fetch("/kb-api/chat-stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
    signal,
  });
  if (res.status === 401) throw new Error("登录已过期，请重新登录");
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  if (!res.body) throw new Error("浏览器不支持流式响应");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf("\n\n")) >= 0) {
      const frame = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      const ev = parseFrame(frame);
      if (ev) onEvent(ev);
    }
  }
  // 流结束：处理可能缺少 \n\n 结尾的残留帧，避免末尾 token/done 事件丢失
  if (buffer) {
    const ev = parseFrame(buffer);
    if (ev) onEvent(ev);
  }
}

function parseFrame(frame: string): ChatStreamEvent | null {
  let type: ChatStreamEvent["type"] = "token";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) {
      const v = line.slice(6).trim() as ChatStreamEvent["type"];
      if (v) type = v;
    } else if (line.startsWith("data:")) {
      // 后端（Spring SSE）写的是 data: + payload，不加协议空格——payload 必须原样保留。
      // 此前这里按规范多剥一个前导空格，导致代码 token（" default"、" {"）丢空格、
      // 纯空格 token 被清空丢弃，AI 回答里的代码块全部单词粘连（如 exportdefault）。
      data += line.slice(5) + "\n";
    }
  }
  data = data.replace(/\n$/, "");
  if (!data) return null;
  return { type, data };
}

/* ===== 管理端：RAG 检索质量评测（经 /kb-admin rewrite → lostsystem /admin/kb） ===== */

/** 单个评测用例的明细（含失败归因：缺失关键字 + Top 片段标题） */
export interface EvalCaseResult {
  caseId: number | null;
  question: string;
  expectedKeywords: string;
  hit: boolean;
  returnedCount: number;
  firstHitRank: number;
  topTitles: string[];
  ndcg: number;
  missingKeywords: string[];
}

/** 单组评测汇总 */
export interface KbEvalResult {
  total: number;
  hit: number;
  miss: number;
  hitRate: number;
  mrr: number;
  ndcg: number;
  cases: EvalCaseResult[];
}

/** 检索 A/B 对比结果（差值 = 变体 − 基线，正值表示变体更优） */
export interface KbEvalAbResult {
  baselineLabel: string;
  variantLabel: string;
  baseline: KbEvalResult;
  variant: KbEvalResult;
  hitRateDiff: number;
  mrrDiff: number;
  ndcgDiff: number;
}

/** 评测趋势点（每日一条） */
export interface EvalTrendPoint {
  date: string;
  caseCount: number;
  hitRate: number;
  mrr: number;
  ndcg: number;
}

/** 跑单组评测：/admin/kb/eval/run */
export async function kbEvalRun(limit?: number, topK?: number): Promise<KbEvalResult> {
  const token = getToken();
  const params = new URLSearchParams();
  if (limit && limit > 0) params.set("limit", String(limit));
  if (topK && topK > 0) params.set("topK", String(topK));
  const qs = params.toString();
  const res = await fetch(`/kb-admin/eval/run${qs ? `?${qs}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return (await res.json()) as KbEvalResult;
}

/** 检索 A/B 对比入参：未填的字段沿用全局检索配置 */
export interface EvalAbParams {
  limit?: number;
  topK?: number;
  baseRerank?: boolean;
  baseBm25?: boolean;
  baseTopK?: number;
  varRerank?: boolean;
  varBm25?: boolean;
  varTopK?: number;
}

/** 检索 A/B 对比：/admin/kb/eval/ab */
export async function kbEvalAb(p: EvalAbParams): Promise<KbEvalAbResult> {
  const token = getToken();
  const params = new URLSearchParams();
  if (p.limit && p.limit > 0) params.set("limit", String(p.limit));
  if (p.topK && p.topK > 0) params.set("topK", String(p.topK));
  (["baseRerank", "baseBm25", "baseTopK", "varRerank", "varBm25", "varTopK"] as const).forEach((key) => {
    const v = p[key];
    if (v !== undefined && v !== null) params.set(key, String(v));
  });
  const qs = params.toString();
  const res = await fetch(`/kb-admin/eval/ab${qs ? `?${qs}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return (await res.json()) as KbEvalAbResult;
}

/** 查询最近 N 天评测趋势：/admin/kb/eval/trend */
export async function kbEvalTrend(days = 30): Promise<EvalTrendPoint[]> {
  const token = getToken();
  const res = await fetch(`/kb-admin/eval/trend?days=${days}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error(`请求失败（${res.status}）`);
  return (await res.json()) as EvalTrendPoint[];
}

/* ===== 管理端：Golden Set 用例维护 ===== */

/** 评测用例（Golden Set）定义 */
export interface KbEvalCase {
  id: number;
  question: string;
  expectedKeywords: string;
  expectedDocIds: string | null;
  note: string | null;
  createdBy: string | null;
  createdDate: string | null;
}

const adminFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  const token = getToken();
  const res = await fetch(`/kb-admin${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error((await res.text()) || `请求失败（${res.status}）`);
  return res;
};

/** 评测用例分页（新增倒序）：GET /admin/kb/eval/cases */
export async function kbEvalCases(page = 0, size = 20): Promise<Paged<KbEvalCase>> {
  const res = await adminFetch(`/eval/cases?page=${page}&size=${size}`);
  return flattenPaged(await res.json());
}

/** 新增评测用例：POST /admin/kb/eval/cases */
export async function kbEvalAddCase(p: {
  question: string;
  expectedKeywords: string;
  expectedDocIds?: string;
  note?: string;
}): Promise<{ id: number }> {
  const body = new URLSearchParams({ question: p.question, expectedKeywords: p.expectedKeywords });
  if (p.expectedDocIds?.trim()) body.set("expectedDocIds", p.expectedDocIds.trim());
  if (p.note?.trim()) body.set("note", p.note.trim());
  const res = await adminFetch(`/eval/cases`, { method: "POST", body });
  return (await res.json()) as { id: number };
}

/** 删除评测用例：DELETE /admin/kb/eval/cases/{id} */
export async function kbEvalDeleteCase(id: number): Promise<void> {
  await adminFetch(`/eval/cases/${id}`, { method: "DELETE" });
}

/** 点踩反馈一键回流为评测用例：POST /admin/kb/eval/cases/from-feedback */
export async function kbEvalCaseFromFeedback(p: {
  feedbackId: number;
  expectedKeywords: string;
  note?: string;
}): Promise<{ id: number }> {
  const body = new URLSearchParams({
    feedbackId: String(p.feedbackId),
    expectedKeywords: p.expectedKeywords,
  });
  if (p.note?.trim()) body.set("note", p.note.trim());
  const res = await adminFetch(`/eval/cases/from-feedback`, { method: "POST", body });
  return (await res.json()) as { id: number };
}
