"use client";

import { getToken } from "./auth";
import { flattenPaged } from "./paged";

/* ===== 与 rag-knowledge-hub /admin/kb/audit 文档契约的类型 ===== */

export interface AuditLogView {
  id: number;
  libraryId: string | null;
  operator: string | null;
  action: string | null;
  targetType: string | null;
  targetId: number | null;
  detail: string | null;
  createdDate: string | null;
}

export interface PagedAudit {
  content: AuditLogView[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** 操作类型中文映射（用于表格列展示与过滤）。 */
export const AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: "UPLOAD", label: "上传文档" },
  { value: "IMPORT_URL", label: "URL 导入" },
  { value: "IMPORT_DIR", label: "目录导入" },
  { value: "DELETE", label: "删除文档" },
  { value: "REBUILD_INDEX", label: "重建索引" },
  { value: "REINDEX", label: "重试索引" },
  { value: "DOCS_SYNC", label: "docs 同步" },
  { value: "USER_ROLE", label: "角色变更" },
  { value: "USER_STATUS", label: "启用/禁用" },
  { value: "USER_RESET_PWD", label: "重置密码" },
  { value: "UPDATE_QUOTA", label: "更新配额" },
  { value: "EDIT", label: "编辑文档" },
  { value: "CONFIG_UPDATE", label: "系统配置" },
  { value: "ALERT_RESOLVE", label: "处理告警" },
  { value: "USER_UNLOCK", label: "解锁账号" },
];

export function auditActionLabel(action: string | null): string {
  if (!action) return "-";
  return AUDIT_ACTIONS.find((a) => a.value === action)?.label ?? action;
}

const auditFetch = async (path: string): Promise<Response> => {
  const token = getToken();
  const res = await fetch(`/kb-admin/audit/logs${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (res.status === 401) throw new Error("登录已过期或非管理员，请重新登录");
  if (!res.ok) throw new Error((await res.text()) || `请求失败（${res.status}）`);
  return res;
};

/** 审计日志分页：/admin/kb/audit/logs?page&size&action&libraryId（libraryId 留空查全部空间） */
export async function listAuditLogs(
  page = 0,
  size = 20,
  action?: string,
  libraryId?: string,
): Promise<PagedAudit> {
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (action && action.trim()) qs.set("action", action.trim());
  if (libraryId && libraryId.trim()) qs.set("libraryId", libraryId.trim());
  const res = await auditFetch(`?${qs.toString()}`);
  return flattenPaged(await res.json());
}
