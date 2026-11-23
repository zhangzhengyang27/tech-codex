"use client";

import { getToken } from "./auth";
import { apiFetch, apiErrorMessage, handleUnauthorized } from "./fetch-helpers";
import { flattenPaged } from "./paged";

/** CMS 文档列表项（后端 KbDocumentView 的子集）。 */
export interface CmsDocumentSummary {
  id: number;
  title: string;
  description: string | null;
  categorySlug: string | null;
  categoryDir: string | null;
  docSlug: string | null;
  filePath: string | null;
  publishStatus: string | null;
  revision: number | null;
  updatedDate: string | null;
  chunkCount: number | null;
  status: string;
}

/** 编辑器详情：正文与 frontmatter 分离。 */
export interface CmsDocumentDetail extends CmsDocumentSummary {
  publishedAt: string | null;
  publishedBy: string | null;
  body: string;
  frontmatter: string;
}

export interface CmsSaveInput {
  title: string;
  description: string;
  categoryDir: string;
  categorySlug: string;
  docSlug: string;
  body: string;
  frontmatter: string;
  expectedRevision?: number | null;
  changeNote?: string;
}

export interface CmsVersion {
  id: number;
  revision: number;
  title: string;
  description: string | null;
  changeNote: string | null;
  createdBy: string | null;
  createdDate: string | null;
}

export interface CmsCategory {
  slug: string;
  dir: string;
}

export interface CmsImportResult {
  scanned: number;
  adopted: number;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const authHeaders = (): HeadersInit => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * CMS 代理统一入口：全部走 Next 的 /api/admin/cms/*，
 * 由该路由在写操作成功后清 docs 缓存并 revalidatePath，页面无需感知。
 */
async function cmsFetch(path: string, init?: RequestInit, timeoutMs?: number): Promise<Response> {
  const headers: HeadersInit = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...authHeaders(),
    ...(init?.headers ?? {}),
  };
  const request: RequestInit = { ...init, headers };

  let res: Response;
  if (timeoutMs) {
    // 导入 4.5k 篇 docs 可能超过普通接口 15s 上限，单独放宽；其余仍用统一超时。
    try {
      res = await fetch(`/api/admin/cms/${path}`, {
        ...request,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new Error("操作超时，请查看后端日志或稍后重试");
      }
      throw e;
    }
  } else {
    res = await apiFetch(`/api/admin/cms/${path}`, request);
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("登录已过期或非管理员，请重新登录");
  }
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res;
}

export interface CmsDocumentPage {
  content: CmsDocumentSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export async function listCmsDocuments(params: {
  keyword?: string;
  categoryDir?: string;
  page?: number;
  size?: number;
}): Promise<CmsDocumentPage> {
  const qs = new URLSearchParams({
    page: String(params.page ?? 0),
    size: String(params.size ?? 20),
  });
  if (params.keyword?.trim()) qs.set("keyword", params.keyword.trim());
  if (params.categoryDir) qs.set("categoryDir", params.categoryDir);
  const res = await cmsFetch(`documents?${qs.toString()}`);
  return flattenPaged<CmsDocumentSummary>(await res.json());
}

export async function getCmsDocument(id: number): Promise<CmsDocumentDetail> {
  const res = await cmsFetch(`documents/${id}`);
  return (await res.json()) as CmsDocumentDetail;
}

export async function createCmsDocument(input: CmsSaveInput): Promise<CmsDocumentDetail> {
  const res = await cmsFetch("documents", { method: "POST", body: JSON.stringify(input) });
  return (await res.json()) as CmsDocumentDetail;
}

export async function updateCmsDocument(id: number, input: CmsSaveInput): Promise<CmsDocumentDetail> {
  const res = await cmsFetch(`documents/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return (await res.json()) as CmsDocumentDetail;
}

export async function deleteCmsDocument(id: number): Promise<void> {
  await cmsFetch(`documents/${id}`, { method: "DELETE" });
}

export async function listCmsVersions(id: number): Promise<CmsVersion[]> {
  const res = await cmsFetch(`documents/${id}/versions`);
  return (await res.json()) as CmsVersion[];
}

export async function restoreCmsVersion(id: number, versionId: number): Promise<CmsDocumentDetail> {
  const res = await cmsFetch(`documents/${id}/versions/${versionId}/restore`, { method: "POST" });
  return (await res.json()) as CmsDocumentDetail;
}

export async function importCmsDocs(
  categories: CmsCategory[],
  options: { force?: boolean; indexNew?: boolean } = {},
): Promise<CmsImportResult> {
  const res = await cmsFetch(
    "import",
    { method: "POST", body: JSON.stringify({ categories, ...options }) },
    10 * 60 * 1000,
  );
  return (await res.json()) as CmsImportResult;
}
