"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  MessageSquareText,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { myQuota, uploadMyDocument, type KbQuota } from "@/lib/kb";
import { fmtSize } from "@/lib/format";
import type { KbDocumentView } from "@/lib/documents";

function errText(e: unknown): string {
  return e instanceof Error ? e.message : "上传失败";
}

const ACCEPT = ".md,.markdown,.txt,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";

export default function MyKbUploadPage() {
  const { isLoggedIn } = useAuth();
  const hydrated = useHydrated();
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<KbDocumentView | null>(null);
  const [error, setError] = useState("");
  const [quota, setQuota] = useState<KbQuota | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refreshQuota = useCallback(() => {
    myQuota()
      .then(setQuota)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hydrated && isLoggedIn) refreshQuota();
  }, [hydrated, isLoggedIn, refreshQuota]);

  const pickFile = (f: File | null | undefined) => {
    setError("");
    setResult(null);
    if (f) setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const onUpload = async () => {
    if (!file) {
      setError("请先选择要上传的文件");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const doc = await uploadMyDocument(file, title || undefined);
      setResult(doc);
      clearFile();
      setTitle("");
      refreshQuota();
    } catch (e) {
      setError(errText(e));
    } finally {
      setUploading(false);
    }
  };

  if (!hydrated || !isLoggedIn) {
    return <div className="py-16 text-center text-sm text-foreground/40">加载中…</div>;
  }

  return (
    <div className="space-y-4">
      {/* 上传区 */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
            dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
          )}
        >
          <FileUp size={28} className="text-foreground/30" />
          <p className="text-sm text-foreground/60">拖拽文件到这里，或</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-md bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          >
            选择文件
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          <p className="mt-1 text-xs text-foreground/40">
            支持 Markdown / TXT / PDF / Word / Excel / PPT，解析分块后自动向量化
          </p>
        </div>

        {/* 已选文件预览 */}
        {file && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <FileText size={18} className="shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{file.name}</div>
              <div className="text-xs text-foreground/40">{fmtSize(file.size)}</div>
            </div>
            <button
              onClick={clearFile}
              disabled={uploading}
              className="rounded-md p-1 text-foreground/40 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              aria-label="移除已选文件"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* 标题 + 提交 */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文档标题（可选，默认取文件名）"
            className="h-9 flex-1 rounded-md border border-border bg-muted/40 px-3 text-[13px] outline-none focus:border-accent"
          />
          <button
            onClick={onUpload}
            disabled={uploading || !file}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md bg-accent px-5 text-[13px] font-medium text-white disabled:opacity-60"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
            {uploading ? "上传解析中…" : "上传"}
          </button>
        </div>

        {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
        {quota && (
          <p className="mt-2 text-xs text-foreground/40">
            文档配额：已用 {quota.docUsed} / {quota.docLimit || "不限"}
          </p>
        )}
      </div>

      {/* 上传成功引导 */}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-emerald-700">
            <CheckCircle2 size={16} />
            已上传《{result.title}》，分块 {result.chunkCount ?? 0} 条，索引处理中…
          </div>
          <p className="mt-1.5 text-xs text-emerald-600/80">
            索引完成后即可在 AI 问答中检索到该文档。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/my/kb/documents"
              className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[13px] text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <FileText size={13} />
              查看文档列表
            </Link>
            <Link
              href="/ai"
              className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-[13px] text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <MessageSquareText size={13} />
              去 AI 问答
            </Link>
            <button
              onClick={() => setResult(null)}
              className="rounded-md px-3 py-1.5 text-[13px] text-emerald-700/70 hover:text-emerald-700"
            >
              再传一个
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
