"use client";

import { getToken } from "./auth";

/* ===== 与 rag-knowledge-hub /admin/kb/config 契约的类型 ===== */

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
  const res = await fetch(`/kb-admin${path}`, {
    ...rest,
    headers: {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...rest.headers,
    },
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error((await res.text()) || `请求失败（${res.status}）`);
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
