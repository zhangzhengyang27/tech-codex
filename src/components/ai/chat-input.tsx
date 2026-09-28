"use client";

import { type FormEvent } from "react";
import { Send, Square } from "lucide-react";

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
}

/**
 * AI 输入区：多行文本框 + 发送/停止按钮。
 * Enter 发送，Shift+Enter 换行；busy 时禁用输入并将发送切换为「停止」。
 */
export function ChatInput({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  placeholder,
  error,
}: ChatInputProps) {
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div>
      {error && (
        <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}
      <form onSubmit={submit} className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder={placeholder}
          disabled={busy}
          rows={1}
          className="max-h-40 min-h-[48px] flex-1 resize-y rounded-xl border border-border px-4 py-2.5 text-sm focus:border-accent focus:outline-none disabled:opacity-60"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border text-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            aria-label="停止"
          >
            <Square size={15} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            aria-label="发送"
          >
            <Send size={16} />
          </button>
        )}
      </form>
    </div>
  );
}