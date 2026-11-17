"use client";

import { getToken } from "./auth";
import { apiFetch, apiErrorMessage, handleUnauthorized } from "./fetch-helpers";

/* ===== 与 rag-knowledge-hub /admin/kb/config 契约的类型 ===== */

/* ===== 后端地址校验（P1-4）=====
 * 后端真实地址由 next.config.ts 的 rewrites 经环境变量 KB_BACKEND_ORIGIN 配置。
 * 历史默认值是 8081，与当前部署的实际端口（8082）不一致，且该默认值位于
 * next.config.ts（本代理不可改）。这里在 SSR 阶段做一次性显式校验：
 * 未显式配置 KB_BACKEND_ORIGIN 时打 warning，提示部署方确认后端地址。
 * 仅服务端执行（浏览器读不到该服务端环境变量，避免对访客控制台误报）。
 */
if (
  typeof window === "undefined" &&
  typeof process !== "undefined" &&
  process.env &&
  !process.env.KB_BACKEND_ORIGIN
) {
  // 模块级代码每个进程只执行一次，天然满足"console.warn 一次"
  console.warn(
    "KB_BACKEND_ORIGIN 未设置，使用默认值 http://localhost:8081（当前后端实际监听 8082，请在环境变量中显式配置）"
  );
}

export type ConfigType = "INT" | "LONG" | "DOUBLE" | "BOOL" | "TEXT";

export interface ConfigItem {
  key: string;
  /** 当前生效值（覆盖优先，回退默认） */
  value: string;
  defaultValue: string;
  overridden: boolean;
  type: ConfigType;
  category: string;
  description: string;
}

type ConfigInit = RequestInit & { json?: boolean };

const configFetch = async (path: string, init?: ConfigInit): Promise<Response> => {
  const token = getToken();
  const { json, ...rest } = init ?? {};
  const res = await apiFetch(`/kb-admin${path}`, {
    ...rest,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期或非管理员，请重新登录");
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res;
};

/** 全部可配置项（当前生效值 + 默认值 + 分组说明）：GET /admin/kb/config */
export async function listConfig(): Promise<ConfigItem[]> {
  const res = await configFetch(`/config`);
  return (await res.json()) as ConfigItem[];
}

/**
 * 批量更新配置：PUT /admin/kb/config。
 * 值为空串表示清除该键覆盖（恢复默认）；返回实际变更描述列表。
 */
export async function updateConfig(values: Record<string, string>): Promise<string[]> {
  const res = await configFetch(`/config`, { method: "PUT", json: true, body: JSON.stringify(values) });
  const body = (await res.json()) as { changed: string[] };
  return body.changed ?? [];
}
