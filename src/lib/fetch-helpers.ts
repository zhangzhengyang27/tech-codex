"use client";

import { clearSession } from "./auth";

/* ===== 统一 fetch 包装：请求超时 / 后端错误消息解析 / 401 登录态清理 ===== */

/** 默认请求超时：普通 JSON API 足够；流式（SSE）不经此包装 */
const DEFAULT_TIMEOUT_MS = 15_000;

/** 超时文案：AbortSignal.timeout 触发的 TimeoutError 与中止映射到它 */
export const TIMEOUT_MESSAGE = "请求超时，请稍后重试";

/**
 * 带 15s 超时的 fetch 包装：
 * - 调用方未传 signal 时注入 AbortSignal.timeout(15000)；
 * - 已传 signal 时用 AbortSignal.any 合并（取消/超时任一触发即中止；
 *   不支持 AbortSignal.any 的旧浏览器降级为只沿用调用方 signal）。
 * - 超时异常统一转换为「请求超时，请稍后重试」（调用方自己的 abort 保持
 *   AbortError 原样抛出，供停止按钮等场景识别）。
 */
export async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const { signal, ...rest } = init ?? {};
  const timeoutSignal = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const merged = signal
    ? typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeoutSignal])
      : signal
    : timeoutSignal;
  try {
    return await fetch(url, { ...rest, signal: merged });
  } catch (e) {
    // 非 TimeoutError 形态的兜底：个别引擎把超时映射为 AbortError。
    // 调用方 signal 已 abort 时保持 AbortError 原样抛出（停止按钮依赖该判定）。
    const abortLike = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    if (abortLike && !signal?.aborted) throw new Error(TIMEOUT_MESSAGE);
    throw e;
  }
}

/**
 * 非 2xx 响应 → 用户可读错误消息。
 * 优先解析 JSON 的 message 字段（后端统一错误体），失败回退响应原文，再回退状态码文案。
 * 参照 auth.ts 既有 errorMessage 做法，收敛为公共 helper。
 */
export async function apiErrorMessage(
  res: Response,
  fallback = `请求失败（${res.status}）`
): Promise<string> {
  let text = "";
  try {
    text = await res.text();
  } catch {
    return fallback;
  }
  if (!text) return fallback;
  try {
    const parsed = JSON.parse(text) as { message?: unknown };
    if (typeof parsed.message === "string" && parsed.message) return parsed.message;
  } catch {
    /* 非 JSON 体，回退原文 */
  }
  return text;
}

/** 超时（AbortSignal.timeout → TimeoutError）时返回 true；调用方主动 abort 是 AbortError，不算 */
export function isTimeoutOrAbort(e: unknown): boolean {
  return e instanceof Error && e.name === "TimeoutError";
}

/** 捕获 fetch 异常时统一映射超时文案，其余异常回退调用方给出的默认文案 */
export function timeoutOr(e: unknown, fallback: string): string {
  return isTimeoutOrAbort(e) ? TIMEOUT_MESSAGE : fallback;
}

/* ===== 401 统一清理（P2-17）===== */

/**
 * 401 时统一清理动作：
 * - clearSession 清除 TOKEN_KEY/USER_KEY（其他标签页经真实 storage 事件同步）；
 * - 本页 dispatch 自定义事件，供页面级监听（如 AI 页跳转登录）与 AuthContext
 *   侧的会话同步机制衔接（事件名对齐 storage 事件机制的约定）。
 * 仅在非 2xx 且 status===401 的 API 错误分支调用；登录/注册接口的 401（密码错误）
 * 不属于会话失效，不触发。
 */
export const SESSION_INVALIDATED_EVENT = "techcodex:session-invalidated";

export function handleUnauthorized(): void {
  if (typeof window === "undefined") return;
  clearSession();
  window.dispatchEvent(new CustomEvent(SESSION_INVALIDATED_EVENT));
}
