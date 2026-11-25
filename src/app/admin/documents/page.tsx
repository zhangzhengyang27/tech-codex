"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ArrowRight,
  Database,
  Eye,
  FileText,
  FileUp,
  FolderOpen,
  FolderSync,
  Link2,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { AdminCard, AdminPageHeader, AdminPagination, adminBtn } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { isPageAllSelected, toggleId, togglePage } from "@/lib/bulk-selection";
import {
  adminDocument,
  deleteAdminDocument,
  importDirectory,
  importUrl,
  listDocuments,
  rebuildIndex,
  reindexAdminDocument,
  uploadAdminDocument,
  type AdminTaskView,
  type KbDocumentView,
} from "@/lib/documents";
import { usePagedList } from "@/lib/use-paged-list";
import { TaskProgress } from "@/components/admin/task-progress";
import { DocViewer } from "@/components/kb/doc-viewer";
import { DocEditor } from "@/components/admin/doc-editor";

const errText = (e: unknown): string => (e instanceof Error ? e.message : "操作失败");

const ACCEPT = ".md,.markdown,.txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.html,.htm";
const PAGE_SIZE = 20;

/** 状态筛选（对应后端 KbDocumentStatus）。 */
const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "INDEXED", label: "已索引" },
  { value: "PENDING", label: "处理中" },
  { value: "FAILED", label: "失败" },
];

export default function AdminDocumentsPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();

  const {
    items: docs, page, totalElements: total, totalPages, loading, error, setError, load,
  } = usePagedList<KbDocumentView>();
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // URL 导入
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [importError, setImportError] = useState("");

  // 文件上传
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");

  // 目录导入
  const [dirOpen, setDirOpen] = useState(false);
  const [dirPath, setDirPath] = useState("");

  // 后台任务（重建 / 目录导入共用进度面板）
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);

  // 预览 / 编辑 / 删除
  const [viewId, setViewId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // 批量选择：跨页累计。批量条与全选框都按"当前页是否全部命中"判断，
  // 因此翻页不会清空已选，用户可以先在第 1 页选几篇、跳到第 2 页再补选。
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // 稳定的公共库详情加载器（供 DocViewer 复用）
  const adminLoader = useCallback((id: number) => adminDocument(id), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/documents");
  }, [isLoggedIn, hydrated, router]);

  /** 以当前筛选加载指定页（fetch 闭包在调用点捕获筛选，请求序守卫由 usePagedList 保证） */
  const fetchPage = useCallback(
    (pg: number) => listDocuments(keyword, statusFilter || undefined, pg, PAGE_SIZE),
    [keyword, statusFilter],
  );

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    // 仅挂载时首载；筛选变化由控件回调显式触发，避免每次键入都重查
    void load(0, () => listDocuments("", undefined, 0, PAGE_SIZE));
  }, [load, hydrated, isLoggedIn]);

  const onImport = async () => {
    const target = url.trim();
    if (!target) {
      setImportError("请输入要导入的 URL");
      return;
    }
    setImporting(true);
    setImportError("");
    setImportMsg("");
    try {
      const doc = await importUrl(target);
      setImportMsg(`已导入《${doc.title}》，分块 ${doc.chunkCount ?? 0} 条`);
      setUrl("");
      void load(0, fetchPage);
    } catch (e) {
      setImportError(errText(e));
    } finally {
      setImporting(false);
    }
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    setUploadMsg("");
    setActionError("");
    try {
      const doc = await uploadAdminDocument(file);
      setUploadMsg(`已上传《${doc.title}》，分块 ${doc.chunkCount ?? 0} 条`);
      void load(0, fetchPage);
    } catch (e) {
      setActionError(errText(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /** 启动一个后台任务（目录导入 / 重建索引），进度由 TaskProgress 轮询。 */
  const startTask = async (kind: "dir" | "rebuild") => {
    setStarting(true);
    setActionError("");
    try {
      if (kind === "dir") {
        const target = dirPath.trim();
        if (!target) {
          setActionError("请输入服务器上的目录绝对路径");
          return;
        }
        const { taskId: id } = await importDirectory(target);
        setTaskTitle("目录导入");
        setTaskId(id);
        setDirOpen(false);
        setDirPath("");
      } else {
        const { taskId: id } = await rebuildIndex();
        setTaskTitle("向量索引重建");
        setTaskId(id);
      }
    } catch (e) {
      setActionError(errText(e));
    } finally {
      setStarting(false);
    }
  };

  const onTaskDone = useCallback(
    (_t: AdminTaskView) => {
      void load(0, fetchPage);
    },
    [load, fetchPage],
  );

  const onDelete = async (d: KbDocumentView) => {
    if (!window.confirm(`确定删除文档《${d.title}》？将同时清理其全部分块与向量，不可恢复。`)) return;
    setBusyId(d.id);
    setError("");
    try {
      await deleteAdminDocument(d.id);
      // 删掉当前页最后一条且不在首页时回退一页，避免停留在空页
      const isLastItemOnPage = page > 0 && docs.length === 1;
      void load(isLastItemOnPage ? page - 1 : page, fetchPage);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusyId(null);
    }
  };

  /** 失败文档重试索引（同步执行，约几百毫秒/篇） */
  const onRetry = async (d: KbDocumentView) => {
    setBusyId(d.id);
    setError("");
    try {
      await reindexAdminDocument(d.id);
      void load(page, fetchPage);
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusyId(null);
    }
  };

  /** 当前页全选 / 取消全选（已跨页选中的其他项不受影响） */
  const toggleSelectAll = () => {
    setSelectedIds((prev) => togglePage(prev, docs.map((d) => d.id)));
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => toggleId(prev, id));
  };

  /**
   * 批量重建索引：逐条串行调用现有单条接口。
   *
   * 为什么串行而不是 Promise.all：重建会写向量索引并触发语义缓存失效，
   * 并发会把 Redis 与嵌入服务同时压满，且失败时无法定位具体是哪一篇。
   * 串行 + 进度是这里更安全的默认；真要提速应改后端批接口，而不是前端并发。
   */
  const onBulkReindex = async () => {
    if (selectedIds.size === 0 || bulkBusy) return;
    const ids = [...selectedIds];
    setBulkBusy(true);
    setError("");
    setBulkProgress({ done: 0, total: ids.length });
    const failed: number[] = [];
    try {
      for (const [index, id] of ids.entries()) {
        try {
          await reindexAdminDocument(id);
        } catch {
          failed.push(id);
        }
        setBulkProgress({ done: index + 1, total: ids.length });
      }
      setSelectedIds(new Set());
      void load(page, fetchPage);
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
    }
    if (failed.length > 0) {
      setError(`批量重建完成，${failed.length} 篇失败，可单独重试`);
    }
  };

  /** 批量删除：不可恢复，确认框必须写明总数与影响范围 */
  const onBulkDelete = async () => {
    if (selectedIds.size === 0 || bulkBusy) return;
    const ids = [...selectedIds];
    if (!window.confirm(
      `确定删除选中的 ${ids.length} 篇文档？将同时清理其全部分块与向量，不可恢复。`,
    )) return;

    setBulkBusy(true);
    setError("");
    setBulkProgress({ done: 0, total: ids.length });
    const failed: number[] = [];
    try {
      for (const [index, id] of ids.entries()) {
        try {
          await deleteAdminDocument(id);
        } catch {
          failed.push(id);
        }
        setBulkProgress({ done: index + 1, total: ids.length });
      }
      setSelectedIds(new Set());
      // 整页被删空时回退一页，避免停在空白页
      const emptiedCurrentPage = failed.length === 0 && docs.length === ids.length;
      void load(emptiedCurrentPage && page > 0 ? page - 1 : page, fetchPage);
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
    }
    if (failed.length > 0) {
      setError(`批量删除完成，${failed.length} 篇失败，已保留`);
    }
  };

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
        icon={FileText}
        title="文档管理"
        description="维护公共知识库的文档、分块与向量索引，支持文件上传、目录导入和 URL 抓取。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-caption text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              default 空间
            </span>
            <span>共 {total.toLocaleString("zh-CN")} 篇文档</span>
            <span>每页 {PAGE_SIZE} 条</span>
          </>
        }
        actions={
          <>
            <button onClick={() => void load(page, fetchPage)} className={adminBtn("secondary")}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              刷新列表
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || taskId !== null}
              className={adminBtn("primary")}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              上传文件
            </button>
          </>
        }
      />

      <input
        ref={fileRef}
        type="file"
        aria-label="选择要上传的文件"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onUpload(f);
        }}
      />

      <AdminCard
        title="导入与索引"
        description="上传文件、从服务器目录导入、抓取网页正文，或重建向量索引；内容统一写入数据库"
        icon={Database}
        contentClassName="p-4"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => setDirOpen((o) => !o)}
            disabled={taskId !== null}
            className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-left transition-colors hover:border-accent/30 hover:bg-white disabled:opacity-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-accent">
              <FolderOpen size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-slate-700">目录导入</span>
              <span className="mt-0.5 block text-2xs text-slate-400">一次性导入服务器目录</span>
            </span>
            <ArrowRight size={13} className="mt-2 shrink-0 text-slate-300 group-hover:text-accent" />
          </button>
          <button
            onClick={() => void startTask("rebuild")}
            disabled={starting || taskId !== null}
            className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-left transition-colors hover:border-accent/30 hover:bg-white disabled:opacity-50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 group-hover:text-accent">
              <RefreshCw size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-medium text-slate-700">重建向量索引</span>
              <span className="mt-0.5 block text-2xs text-slate-400">全量修复 · 本地嵌入</span>
            </span>
            <ArrowRight size={13} className="mt-2 shrink-0 text-slate-300 group-hover:text-accent" />
          </button>
        </div>
        <p className="mt-2.5 text-2xs leading-4 text-slate-400">
          目录导入只读取一次性指定的外部目录并写入数据库，不作为站点内容源；重建索引会重新切分并写入全部向量。
        </p>
        {dirOpen && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="服务器目录路径"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="服务器上的目录绝对路径，如 /data/import/java"
              className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-compact outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/25"
            />
            <button
              onClick={() => void startTask("dir")}
              disabled={starting}
              className={adminBtn("primary", "sm")}
            >
              {starting ? <Loader2 size={13} className="animate-spin" /> : <FolderSync size={13} />}
              开始导入
            </button>
          </div>
        )}

        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-2 flex items-center gap-2 text-caption font-medium text-slate-500">
            <Link2 size={13} className="text-accent" />
            URL 导入
            <span className="font-normal text-slate-400">抓取网页正文自动转为 Markdown 入库</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="导入来源 URL"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onImport()}
              placeholder="https://example.com/article"
              className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-compact outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/25"
            />
            <button onClick={onImport} disabled={importing} className={adminBtn("primary", "sm")}>
              {importing ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              导入
            </button>
          </div>
          {importMsg && <div className="mt-2 text-caption text-emerald-600">{importMsg}</div>}
          {importError && <div className="mt-2 text-caption text-red-500">{importError}</div>}
        </div>

        {uploadMsg && <div className="mt-2 text-caption text-emerald-600">{uploadMsg}</div>}
        {actionError && <div className="mt-2 text-caption text-red-500">{actionError}</div>}
        <TaskProgress taskId={taskId} title={taskTitle} onDone={onTaskDone} onDismiss={() => setTaskId(null)} />
      </AdminCard>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FileText size={14} />
            </span>
            <div>
              <h2 className="text-compact font-semibold tracking-tight text-slate-800">文档库</h2>
              <p className="text-caption text-slate-400">按标题、文件名和索引状态筛选</p>
            </div>
          </div>
          <form onSubmit={onSearch} className="ml-auto flex flex-1 items-center justify-end gap-2">
            <div className="relative w-full max-w-xs flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="搜索文档"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题或文件名"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-compact outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/25"
              />
            </div>
            <select
              aria-label="按状态筛选"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                void load(0, () => listDocuments(keyword, e.target.value || undefined, 0, PAGE_SIZE));
              }}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-compact text-slate-600 outline-none focus:border-accent"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button type="submit" className={adminBtn("secondary", "sm")}>搜索</button>
          </form>
          <span className="rounded-full bg-slate-50 px-2.5 py-1 font-mono text-2xs text-slate-400">
            {total.toLocaleString("zh-CN")} 篇
          </span>
          <button
            onClick={() => void load(page, fetchPage)}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            title="刷新"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-accent/20 bg-accent/5 px-4 py-2.5">
            <span className="text-xs text-slate-600">
              已选 <strong className="font-semibold text-slate-800">{selectedIds.size}</strong> 篇
              {bulkProgress && (
                <span className="ml-2 text-slate-500">
                  处理中 {bulkProgress.done}/{bulkProgress.total}
                </span>
              )}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={onBulkReindex}
                loading={bulkBusy}
              >
                批量重建索引
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={onBulkDelete}
                disabled={bulkBusy}
              >
                <Trash2 size={12} />
                批量删除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkBusy}
              >
                取消选择
              </Button>
            </div>
          </div>
        )}

        {error && <div className="border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-compact">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-caption uppercase tracking-[0.06em] text-slate-400">
                <th className="w-10 whitespace-nowrap px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={isPageAllSelected(selectedIds, docs.map((d) => d.id))}
                    onChange={toggleSelectAll}
                    aria-label="全选当前页"
                    className="h-3.5 w-3.5 cursor-pointer accent-accent"
                  />
                </th>
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">标题</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">来源</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">大小</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">分块</th>
                <th className="whitespace-nowrap px-3 py-2.5 font-medium">状态</th>
                <th className="hidden whitespace-nowrap px-3 py-2.5 font-medium xl:table-cell">导入时间</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && docs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center text-xs text-slate-400">
                    <Loader2 size={18} className="mx-auto mb-2 animate-spin" /> 正在加载文档…
                  </td>
                </tr>
              )}
              {!loading && docs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <FileText size={22} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-compact text-slate-500">暂无文档</p>
                    <p className="mt-1 text-caption text-slate-400">可通过右上角上传、URL 导入或目录导入添加</p>
                  </td>
                </tr>
              )}
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-slate-100/80 last:border-b-0 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(d.id)}
                      onChange={() => toggleSelectOne(d.id)}
                      aria-label={`选择文档 ${d.title}`}
                      className="h-3.5 w-3.5 cursor-pointer accent-accent"
                    />
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 font-medium text-slate-700" title={d.title}>{d.title}</td>
                  <td className="hidden max-w-[200px] truncate px-3 py-2.5 text-slate-500 xl:table-cell" title={d.filePath}>
                    {d.fileName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-caption text-slate-400">{fmtSize(d.fileSize)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-caption text-slate-400">{d.chunkCount ?? "-"}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-medium ring-1",
                        d.status === "INDEXED" && "bg-emerald-50 text-emerald-600 ring-emerald-100",
                        d.status === "PENDING" && "bg-amber-50 text-amber-600 ring-amber-100",
                        d.status === "FAILED" && "bg-red-50 text-red-600 ring-red-100",
                      )}
                    >
                      <span
                        className={clsx(
                          "h-1.5 w-1.5 rounded-full",
                          d.status === "INDEXED" && "bg-emerald-500",
                          d.status === "PENDING" && "bg-amber-500",
                          d.status === "FAILED" && "bg-red-500",
                        )}
                      />
                      {statusText(d.status)}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-caption text-slate-400 xl:table-cell">{fmtDate(d.createdDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <button
                      onClick={() => setViewId(d.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="查看原文"
                    >
                      <Eye size={13} />
                      查看
                    </button>
                    <button
                      onClick={() => setEditId(d.id)}
                      className="ml-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="编辑内容并重建索引"
                    >
                      <Pencil size={13} />
                      编辑
                    </button>
                    {d.status === "FAILED" && (
                      <button
                        onClick={() => void onRetry(d)}
                        disabled={busyId === d.id}
                        className="ml-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                        title="重建该文档的索引"
                      >
                        {busyId === d.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
                        重试
                      </button>
                    )}
                    <button
                      onClick={() => void onDelete(d)}
                      disabled={busyId === d.id}
                      className="ml-0.5 inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-red-500/80 hover:bg-red-50 disabled:opacity-50"
                      title="删除文档"
                      aria-label={`删除文档 ${d.title}`}
                    >
                      {busyId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AdminPagination
          page={page}
          totalPages={totalPages}
          totalElements={total}
          pageSize={PAGE_SIZE}
          unit="篇"
          loading={loading}
          onPrev={() => void load(Math.max(0, page - 1), fetchPage)}
          onNext={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
        />
      </div>

      <DocViewer docId={viewId} onClose={() => setViewId(null)} loader={adminLoader} />
      <DocEditor
        docId={editId}
        onClose={() => setEditId(null)}
        onSaved={() => void load(page, fetchPage)}
      />
    </div>
  );
}

function fmtSize(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("zh-CN", { hour12: false });
}

function statusText(status: string): string {
  if (status === "INDEXED") return "已索引";
  if (status === "PENDING") return "处理中";
  if (status === "FAILED") return "失败";
  return status;
}
