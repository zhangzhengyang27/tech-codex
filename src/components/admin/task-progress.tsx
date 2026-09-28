"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RotateCw, X } from "lucide-react";
import clsx from "clsx";
import { getAdminTask, type AdminTaskView } from "@/lib/documents";

/** 轮询期间网络错误的自动重试次数上限；超过后展示手动重试按钮。 */
const MAX_AUTO_RETRY = 3;
const AUTO_RETRY_DELAY_MS = 2000;

/**
 * 后台任务进度面板（目录导入 / docs 同步 / 重建索引共用）。
 * taskId 非空时自动轮询任务进度；任务结束后保留结果并回调 onDone 供父级刷新列表，
 * onDismiss 由父级清空 taskId 关闭面板。
 * 轮询中的瞬时网络错误自动重试（最多 MAX_AUTO_RETRY 次）；连续失败后提供手动重试。
 */
export function TaskProgress({
  taskId,
  title,
  onDone,
  onDismiss,
}: {
  taskId: string | null;
  title: string;
  onDone: (task: AdminTaskView) => void;
  onDismiss: () => void;
}) {
  const [task, setTask] = useState<AdminTaskView | null>(null);
  const [error, setError] = useState("");
  /** 网络错误计数与手动重试计数：attempt 变化触发整轮轮询重启 */
  const [attempt, setAttempt] = useState(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    setTask(null);
    setError("");
    if (!taskId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let consecutiveErrors = 0;

    const poll = async () => {
      try {
        const t = await getAdminTask(taskId);
        if (cancelled) return;
        consecutiveErrors = 0;
        setError("");
        setTask(t);
        if (t.status === "RUNNING") {
          timer = setTimeout(() => void poll(), 1500);
        } else {
          onDoneRef.current(t);
        }
      } catch (e) {
        if (cancelled) return;
        consecutiveErrors += 1;
        if (consecutiveErrors <= MAX_AUTO_RETRY) {
          // 瞬时网络错误：任务仍在后台跑，自动重试而不是放弃轮询
          timer = setTimeout(() => void poll(), AUTO_RETRY_DELAY_MS);
          return;
        }
        setError(e instanceof Error ? e.message : "任务进度查询失败");
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [taskId, attempt]);

  if (!taskId) return null;

  const running = task?.status === "RUNNING";
  const failed = task?.status === "FAILED";
  const done = task?.status === "DONE";
  // 轮询停止且出错（无论此前是否拉到过任务快照）都视为查询中断，提供手动重试
  const pollBroken = error !== "";
  const pct = task && task.total > 0 ? Math.round((task.processed / task.total) * 100) : null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-[13px] font-medium">
        {running && <Loader2 size={15} className="animate-spin text-accent" />}
        {done && !failed && <CheckCircle2 size={15} className="text-emerald-600" />}
        {(failed || error) && <AlertTriangle size={15} className="text-red-500" />}
        <span>{title}{running ? "进行中…" : ""}</span>
        {task && task.total > 0 && (
          <span className="font-mono text-xs text-foreground/50">
            {task.processed}/{task.total}
          </span>
        )}
        <button
          onClick={onDismiss}
          className="ml-auto rounded-md p-1 text-foreground/40 hover:bg-muted hover:text-foreground"
          aria-label="关闭进度"
        >
          <X size={14} />
        </button>
      </div>

      {running && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className={clsx("h-full rounded-full bg-accent transition-all", pct === null && "w-1/3 animate-pulse")}
            style={pct !== null ? { width: `${pct}%` } : undefined}
          />
        </div>
      )}

      {done && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/60">
          <span className="text-emerald-600">成功 {task?.succeeded ?? 0}</span>
          {(task?.failed ?? 0) > 0 && <span className="text-red-500">失败 {task?.failed}</span>}
          {(task?.failed ?? 0) === 0 && <span className="text-foreground/40">全部处理完成</span>}
        </div>
      )}

      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-500">
          {error}
          {pollBroken && (
            <button
              onClick={() => setAttempt((a) => a + 1)}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] text-foreground/60 hover:bg-muted hover:text-foreground"
            >
              <RotateCw size={11} />
              重试查询
            </button>
          )}
        </div>
      )}

      {task && task.errors.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-red-500/80">
            失败明细（前 {Math.min(task.errors.length, 20)} 条）
          </summary>
          <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto">
            {task.errors.slice(0, 20).map((e, i) => (
              <li key={i} className="break-all text-xs text-foreground/60">
                {e}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
