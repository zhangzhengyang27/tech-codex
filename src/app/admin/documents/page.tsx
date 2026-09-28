"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Eye,
  FileUp,
  Pencil,
  FolderSync,
  Link2,
  Loader2,
  RefreshCw,
  RotateCw,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import {
  adminDocument,
  deleteAdminDocument,
  importDirectory,
  importUrl,
  listDocuments,
  rebuildIndex,
  reindexAdminDocument,
  syncDocs,
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

  // 后台任务（同步 / 重建 / 目录导入共用进度面板）
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [actionError, setActionError] = useState("");
  const [starting, setStarting] = useState(false);

  // 预览 / 编辑 / 删除
  const [viewId, setViewId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  // 稳定的公共库详情加载器（供 DocViewer 复用）
  const adminLoader = useCallback((id: number) => adminDocument(id), []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/documents");
  }, [isLoggedIn, hydrated, router]);

  /** 以当前筛选加载指定页（fetch 闭包在调用点捕获筛选，请求序守卫由 usePagedList 保证） */
  const fetchPage = useCallback(
    (pg: number) => listDocuments(keyword, statusFilter || undefined, pg, 20),
    [keyword, statusFilter],
  );

  useEffect(() => {
    if (!hydrated || !isLoggedIn) return;
    // 仅挂载时首载；筛选变化由控件回调显式触发，避免每次键入都重查
    void load(0, () => listDocuments("", undefined, 0, 20));
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

  /** 启动一个后台任务（目录导入 / docs 同步 / 重建索引），进度由 TaskProgress 轮询。 */
  const startTask = async (kind: "dir" | "sync" | "rebuild") => {
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
      } else if (kind === "sync") {
        const { taskId: id } = await syncDocs();
        setTaskTitle("docs 内容同步");
        setTaskId(id);
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
      void load(page, fetchPage);
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

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void load(0, fetchPage);
  };

  if (!hydrated || !isLoggedIn) {
    return <div className="mx-auto max-w-6xl px-4 py-24 text-center text-sm text-foreground/40">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-24 text-center">
        <ShieldAlert size={36} className="text-foreground/30" />
        <p className="text-sm text-foreground/60">该页面需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <FileUp size={20} className="text-accent" />
        <h1 className="text-xl font-semibold tracking-tight">文档管理</h1>
        <span className="text-xs text-foreground/40">公共知识库（default 空间）</span>
      </div>

      {/* 运维操作区 */}
      <div className="mb-6 rounded-xl border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onUpload(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading || taskId !== null}
            className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            上传文件
          </button>
          <button
            onClick={() => setDirOpen((o) => !o)}
            disabled={taskId !== null}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-4 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-muted/60 disabled:opacity-60"
          >
            <FolderSync size={14} />
            目录导入
          </button>
          <button
            onClick={() => void startTask("sync")}
            disabled={starting || taskId !== null}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-4 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-muted/60 disabled:opacity-60"
          >
            {starting ? <Loader2 size={14} className="animate-spin" /> : <FolderSync size={14} />}
            同步 docs 内容
          </button>
          <button
            onClick={() => void startTask("rebuild")}
            disabled={starting || taskId !== null}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-4 text-[13px] font-medium text-foreground/70 transition-colors hover:bg-muted/60 disabled:opacity-60"
          >
            <RefreshCw size={14} />
            重建向量索引
          </button>
          <span className="text-xs text-foreground/40">
            同步对账 docs 目录（新增/更新/改名/删除），与文档站内容保持一致
          </span>
        </div>

        {dirOpen && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              placeholder="服务器上的目录绝对路径，如 /data/docs/java"
              className="h-9 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
            />
            <button
              onClick={() => void startTask("dir")}
              disabled={starting}
              className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white disabled:opacity-60"
            >
              {starting ? <Loader2 size={14} className="animate-spin" /> : <FolderSync size={14} />}
              开始导入
            </button>
          </div>
        )}

        {uploadMsg && <div className="mt-2 text-xs text-emerald-600">{uploadMsg}</div>}
        {actionError && <div className="mt-2 text-xs text-red-500">{actionError}</div>}

        <TaskProgress taskId={taskId} title={taskTitle} onDone={onTaskDone} onDismiss={() => setTaskId(null)} />
      </div>

      {/* URL 导入 */}
      <div className="mb-6 rounded-xl border border-border bg-background p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <Link2 size={15} className="text-accent" />
          URL 导入
          <span className="text-xs font-normal text-foreground/40">
            抓取网页正文自动转为 Markdown 入库
          </span>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onImport()}
            placeholder="https://example.com/article"
            className="h-9 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            onClick={onImport}
            disabled={importing}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-background disabled:opacity-60"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            导入
          </button>
        </div>
        {importMsg && <div className="mt-2 text-xs text-emerald-600">{importMsg}</div>}
        {importError && <div className="mt-2 text-xs text-red-500">{importError}</div>}
      </div>

      {/* 文档列表 */}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
          <form onSubmit={onSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground/40" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索标题或文件名"
                className="h-8 w-full rounded-md border border-border bg-muted/40 pl-8 pr-3 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                void load(0, () => listDocuments(keyword, e.target.value || undefined, 0, 20));
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-accent"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 rounded-md border border-border px-3 text-[13px] text-foreground/70 hover:bg-muted/60"
            >
              搜索
            </button>
          </form>
          <div className="text-xs text-foreground/40">
            共 {total} 篇
          </div>
          <button
            onClick={() => void load(page, fetchPage)}
            className="flex h-8 items-center gap-1 rounded-md border border-border px-2.5 text-[13px] text-foreground/60 hover:bg-muted/60"
            title="刷新"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            刷新
          </button>
        </div>

        {error && <div className="px-4 py-3 text-[13px] text-red-500">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">标题</th>
                <th className="px-3 py-2 font-medium">来源</th>
                <th className="px-3 py-2 font-medium">大小</th>
                <th className="px-3 py-2 font-medium">分块</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">导入时间</th>
                <th className="px-3 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {!loading && docs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-foreground/40">
                    暂无文档，可通过上传文件、URL 导入或「同步 docs 内容」添加
                  </td>
                </tr>
              )}
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-b-0 hover:bg-muted/30">
                  <td className="max-w-[260px] truncate px-4 py-2.5 font-medium" title={d.title}>{d.title}</td>
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-foreground/60" title={d.filePath}>
                    {d.fileName}
                  </td>
                  <td className="px-3 py-2.5 text-foreground/50">{fmtSize(d.fileSize)}</td>
                  <td className="px-3 py-2.5 text-foreground/50">{d.chunkCount ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={clsx(
                        "rounded-full px-2 py-0.5 text-xs",
                        d.status === "INDEXED" && "bg-emerald-500/10 text-emerald-600",
                        d.status === "PENDING" && "bg-amber-500/10 text-amber-600",
                        d.status === "FAILED" && "bg-red-500/10 text-red-500",
                      )}
                    >
                      {statusText(d.status)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-foreground/50">{fmtDate(d.createdDate)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right">
                    <button
                      onClick={() => setViewId(d.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-muted hover:text-foreground"
                      title="查看原文"
                    >
                      <Eye size={13} />
                      查看
                    </button>
                    <button
                      onClick={() => setEditId(d.id)}
                      className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-muted hover:text-foreground"
                      title="编辑内容并重建索引"
                    >
                      <Pencil size={13} />
                      编辑
                    </button>
                    {d.status === "FAILED" && (
                      <button
                        onClick={() => void onRetry(d)}
                        disabled={busyId === d.id}
                        className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                        title="重建该文档的索引"
                      >
                        {busyId === d.id ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
                        重试
                      </button>
                    )}
                    <button
                      onClick={() => void onDelete(d)}
                      disabled={busyId === d.id}
                      className="ml-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-500/80 hover:bg-red-50 disabled:opacity-50"
                      title="删除文档"
                    >
                      {busyId === d.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[13px] text-foreground/50">
            <span>第 {page + 1} / {totalPages} 页</span>
            <div className="flex gap-1">
              <button
                onClick={() => void load(Math.max(0, page - 1), fetchPage)}
                disabled={page <= 0}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                上一页
              </button>
              <button
                onClick={() => void load(Math.min(totalPages - 1, page + 1), fetchPage)}
                disabled={page >= totalPages - 1}
                className="rounded-md px-3 py-1 text-[13px] disabled:opacity-40 hover:bg-muted"
              >
                下一页
              </button>
            </div>
          </div>
        )}
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
