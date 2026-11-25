"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import {
  CheckCircle2,
  FileText,
  FileUp,
  MessageSquareText,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { myQuota, uploadMyDocument, type KbQuota } from "@/lib/kb";
import { fmtSize } from "@/lib/format";
import type { KbDocumentView } from "@/lib/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

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
      <div className="rounded-lg border border-border bg-background p-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
            dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/50",
          )}
        >
          <FileUp size={28} className="text-foreground/30" />
          <p className="text-sm text-foreground/60">拖拽文件到这里，或</p>
          <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()}>
            选择文件
          </Button>
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
              <div className="truncate text-compact font-medium">{file.name}</div>
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

        {/* 标题 + 提交：改成纵向 Field，横向排布下 label 无处安放 */}
        <div className="mt-3 space-y-3">
          <Field
            label="文档标题"
            htmlFor="upload-title"
            hint="可选，留空时用文件名作为标题"
          >
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：Redis 持久化机制"
            />
          </Field>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={onUpload}
              disabled={!file}
              loading={uploading}
              className="px-5"
            >
              {!uploading && <FileUp size={14} />}
              {uploading ? "上传解析中…" : "上传"}
            </Button>
          </div>
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
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-compact font-medium text-emerald-700">
            <CheckCircle2 size={16} />
            已上传《{result.title}》，分块 {result.chunkCount ?? 0} 条，索引处理中…
          </div>
          <p className="mt-1.5 text-xs text-emerald-600/80">
            索引完成后即可在 AI 问答中检索到该文档。
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/my/kb/documents"
              className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-compact text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <FileText size={13} />
              查看文档列表
            </Link>
            <Link
              href="/ai"
              className="flex items-center gap-1.5 rounded-md border border-emerald-300 px-3 py-1.5 text-compact text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <MessageSquareText size={13} />
              去 AI 问答
            </Link>
            <button
              onClick={() => setResult(null)}
              className="rounded-md px-3 py-1.5 text-compact text-emerald-700/70 hover:text-emerald-700"
            >
              再传一个
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
