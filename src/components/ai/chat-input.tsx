"use client";

/**
 * AI 输入区：多行文本框 + 发送/停止按钮。
 * Enter 发送，Shift+Enter 换行；流式回答期间输入框仍可编辑（便于提前写下一个问题），
 * 右侧按钮切换为「停止」。
 */
import { type FormEvent, useRef } from "react";
import { Send, Square, X } from "lucide-react";

/** 输入长度上限：超长文本会让 SSE 请求体过大并拖慢检索，前端先做硬限制 */
export const MAX_INPUT_LENGTH = 4000;
/** 接近上限时显示计数，避免用户写到一半突然被截断 */
const COUNTDOWN_THRESHOLD = 3600;

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  /** 发送当前输入（仅内容非空时触发由父组件自行兜底）。 */
  onSubmit: () => void;
  /** 停止正在进行的流式回答。 */
  onStop: () => void;
  busy: boolean;
  placeholder?: string;
  error?: string;
  /** 关闭当前错误提示 */
  onDismissError?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  placeholder,
  error,
  onDismissError,
}: ChatInputProps) {
  // 中文输入法选词阶段按 Enter 只是确认候选词，不能当作发送：
  // isComposing 是标准信号，keyCode 229 是部分 IME/旧浏览器的兜底信号。
  // 用 ref 记录 composition 状态，避免 React 事件对象在异步/合成事件池里的取值差异。
  const composingRef = useRef(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // 点击发送/表单提交与输入法组合无关，不能因 composing 状态残留而静默丢弃；
    // IME 回车拦截只在 keydown 分支处理
    onSubmit();
  };

  const overLimit = value.length > MAX_INPUT_LENGTH;

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="mb-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          <span className="min-w-0 flex-1">{error}</span>
          {onDismissError && (
            <button
              type="button"
              onClick={onDismissError}
              aria-label="关闭错误提示"
              className="shrink-0 rounded p-0.5 text-red-400 hover:text-red-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
      <form onSubmit={submit} className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            aria-label="输入对话内容"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            // 部分输入法在失焦时补发/漏发 compositionend：失焦一律按组合结束处理，
            // 否则残留的组合标记会一直拦截 Enter 发送
            onBlur={() => {
              composingRef.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              // 输入法组合期间的 Enter 属于选词确认，交还给 IME
              if (composingRef.current || e.nativeEvent.isComposing || e.keyCode === 229) return;
              e.preventDefault();
              onSubmit();
            }}
            placeholder={placeholder}
            maxLength={MAX_INPUT_LENGTH}
            rows={1}
            className="max-h-40 min-h-[48px] w-full resize-y rounded-lg border border-border px-4 py-2.5 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
          />
          {value.length >= COUNTDOWN_THRESHOLD && (
            <span
              className={`pointer-events-none absolute bottom-1.5 right-2 text-2xs ${
                overLimit ? "text-red-500" : "text-foreground/40"
              }`}
            >
              {value.length}/{MAX_INPUT_LENGTH}
            </span>
          )}
        </div>
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="停止"
          >
            <Square size={15} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim() || overLimit}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="发送"
          >
            <Send size={16} />
          </button>
        )}
      </form>
    </div>
  );
}
