"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FilePlus2,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { useRouter } from "next/navigation";
import { AdminPageHeader, AdminPagination, adminBtn } from "@/components/admin/admin-ui";
import { usePagedList } from "@/lib/use-paged-list";
import {
  listCmsDocuments,
  type CmsDocumentSummary,
} from "@/lib/cms";
import { allCategories } from "@/lib/docs-config";
import { resolveDocUrl } from "@/lib/doc-url";

const PAGE_SIZE = 20;

const CATEGORY_BY_DIR = new Map(allCategories.map((c) => [c.dir, c]));

export default function AdminContentPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();
  const { items, page, totalElements, totalPages, loading, error, load } =
    usePagedList<CmsDocumentSummary>();

  const [keyword, setKeyword] = useState("");
  const [categoryDir, setCategoryDir] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/content");
  }, [isLoggedIn, hydrated, router]);

  const fetchPage = useCallback(
    (pg: number) => listCmsDocuments({ keyword, categoryDir: categoryDir || undefined, page: pg, size: PAGE_SIZE }),
    [keyword, categoryDir],
  );

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    // 仅挂载首载；筛选变化由控件显式触发，避免每次输入都请求
    void load(0, () => listCmsDocuments({ page: 0, size: PAGE_SIZE }));
  }, [load, hydrated, isLoggedIn]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(0, fetchPage);
  };

  if (!hydrated || !isLoggedIn) {
    return <div className="w-full py-16 text-center text-sm text-slate-400">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert size={36} className="text-slate-300" />
        <p className="text-sm text-slate-500">该页面需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={BookOpen}
        title="内容中心"
        description="数据库是唯一内容源；编辑发布后站点与 RAG 索引同步更新，不再生成 Markdown 文件。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-caption text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              CMS 内容源
            </span>
            <span>共 {totalElements.toLocaleString("zh-CN")} 篇</span>
            <span>每页 {PAGE_SIZE} 条</span>
          </>
        }
        actions={
          <Link href="/admin/content/new" className={adminBtn("primary")}>
            <FilePlus2 size={14} />
            新建内容
          </Link>
        }
      />

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <BookOpen size={14} />
            </span>
            <div>
              <h2 className="text-compact font-semibold tracking-tight text-slate-800">站点文档</h2>
              <p className="text-caption text-slate-400">按标题、路径与分类筛选</p>
            </div>
          </div>
          <form onSubmit={onSearch} className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative w-full max-w-xs flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题或路径"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-compact outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/25"
              />
            </div>
            <select
              value={categoryDir}
              onChange={(e) => {
                setCategoryDir(e.target.value);
                void load(0, () =>
                  listCmsDocuments({
                    keyword,
                    categoryDir: e.target.value || undefined,
                    page: 0,
                    size: PAGE_SIZE,
                  }),
                );
              }}
              className="h-9 max-w-[220px] rounded-lg border border-slate-200 bg-white px-2.5 text-compact text-slate-600 outline-none focus:border-accent"
            >
              <option value="">全部分类</option>
              {allCategories.map((c) => (
                <option key={c.slug} value={c.dir}>
                  {c.title} · {c.dir}
                </option>
              ))}
            </select>
            <button type="submit" className={adminBtn("secondary", "sm")}>搜索</button>
          </form>
          <span className="rounded-full bg-slate-50 px-2.5 py-1 font-mono text-2xs text-slate-400">
            {totalElements.toLocaleString("zh-CN")} 篇
          </span>
          <button
            onClick={() => void load(page, fetchPage)}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="刷新"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
        </div>

        {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-compact">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-caption uppercase tracking-[0.06em] text-slate-400">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">标题</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium lg:table-cell">分类</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">Slug</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">版本</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">索引</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">更新时间</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-14 text-center text-xs text-slate-400">
                    <Loader2 size={18} className="mx-auto mb-2 animate-spin" /> 正在加载内容…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <BookOpen size={22} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-compact text-slate-500">还没有 CMS 内容</p>
                    <p className="mt-1 text-caption text-slate-400">
                      点击右上角「新建内容」创建第一篇；历史 Markdown 已迁移到数据库，不再从 docs 目录导入
                    </p>
                  </td>
                </tr>
              )}
              {items.map((doc) => {
                const cat = doc.categoryDir ? CATEGORY_BY_DIR.get(doc.categoryDir) : undefined;
                const publicUrl = doc.filePath ? resolveDocUrl(doc.filePath.replace(/\.md$/i, "")) : null;
                return (
                  <tr key={doc.id} className="border-b border-slate-100/80 last:border-b-0 hover:bg-slate-50/60">
                    <td className="max-w-[320px] px-4 py-2.5">
                      <Link href={`/admin/content/${doc.id}`} className="block truncate font-medium text-slate-700 hover:text-accent">
                        {doc.title}
                      </Link>
                      <div className="mt-0.5 truncate font-mono text-2xs text-slate-400" title={doc.filePath ?? ""}>
                        {doc.filePath ?? "-"}
                      </div>
                    </td>
                    <td className="hidden max-w-[180px] truncate px-3 py-2.5 text-xs text-slate-500 lg:table-cell">
                      {cat?.title ?? doc.categoryDir ?? "-"}
                    </td>
                    <td className="hidden max-w-[220px] truncate px-3 py-2.5 font-mono text-caption text-slate-400 xl:table-cell">
                      {doc.docSlug ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-caption text-slate-500">r{doc.revision ?? 1}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span
                        className={
                          doc.status === "INDEXED"
                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-2xs font-medium text-emerald-600 ring-1 ring-emerald-100"
                            : "rounded-full bg-amber-50 px-2 py-0.5 text-2xs font-medium text-amber-600 ring-1 ring-amber-100"
                        }
                      >
                        {doc.status === "INDEXED" ? "已索引" : "待索引"}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-2.5 text-caption text-slate-400 xl:table-cell">
                      {fmtDate(doc.updatedDate)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <Link
                        href={`/admin/content/${doc.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      >
                        编辑
                      </Link>
                      {publicUrl && (
                        <a
                          href={publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <ExternalLink size={12} /> 查看
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={PAGE_SIZE}
          unit="篇"
          loading={loading}
          onPrev={() => void load(Math.max(0, page - 1), fetchPage)}
          onNext={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
        />
      </div>

      <div className="mt-4 flex items-start gap-2 text-caption leading-5 text-slate-400">
        <ArrowRight size={13} className="mt-1 shrink-0" />
        <p>
          发布顺序：事务写库与版本 → 重建向量 → 清缓存并重算首页/分类页。
          索引失败不回滚内容，列表会标记「待索引」，可在文档管理中重试。
        </p>
      </div>
    </div>
  );
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("zh-CN", { hour12: false });
}
