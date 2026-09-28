'use client';

/** 单条会话消息气泡：用户消息 / AI 消息（含 Markdown 渲染与溯源来源）。 */
import { useState } from 'react';
import Link from 'next/link';
import { Bot, User, FileText, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ChatMarkdown } from '@/components/ai/chat-markdown';
import type { KbChunkHit } from '@/lib/auth';

export interface ChatMessageData {
  role: 'user' | 'ai';
  content: string;
  sources?: KbChunkHit[];
  /** 用户反馈（点赞/点踩），提交成功后由父组件回填 */
  feedback?: 'UP' | 'DOWN';
}

interface ChatMessageProps {
  message: ChatMessageData;
  /** AI 消息是否仍在流式输出（用于展示光标） */
  streaming?: boolean;
  /** filePath → 完整文档 URL */
  urlMap?: Record<string, string | null>;
  /** 反馈回调（传入即启用消息底部 👍/👎） */
  onFeedback?: (rating: 'UP' | 'DOWN', comment?: string) => void;
}

export function ChatMessage({ message, streaming, urlMap = {}, onFeedback }: ChatMessageProps) {
  return (
    <div
      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      {message.role === 'ai' && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Bot size={15} />
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          message.role === 'user'
            ? 'bg-accent text-white'
            : 'border border-border bg-muted/50'
        }`}
      >
        {message.role === 'ai' ? (
          message.content ? (
            <>
              <ChatMarkdown content={message.content} />
              {streaming && (
                <span className="mt-1 inline-block h-4 w-[2px] animate-pulse rounded bg-accent align-middle" />
              )}
            </>
          ) : (
            <span className="inline-block h-4 w-10 animate-pulse rounded bg-foreground/15 align-middle" />
          )
        ) : (
          <div className="whitespace-pre-wrap text-left">{message.content}</div>
        )}

        {message.role === 'ai' && message.sources && message.sources.length > 0 && (
          <div className="mt-3 border-t border-border pt-2">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground/50">
              <FileText size={12} />
              引用来源
            </p>
            <ul className="space-y-1">
              {message.sources.map((s, idx) => {
                const href = urlMap[s.filePath] ?? null;
                const label = s.title || s.filePath;
                return (
                  <li key={idx}>
                    {href ? (
                      <Link
                        href={href}
                        className="line-clamp-1 text-xs text-accent hover:underline"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="line-clamp-1 text-xs text-foreground/50">{label}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {message.role === 'ai' && !streaming && onFeedback && message.content && (
          <FeedbackRow rating={message.feedback} onRate={onFeedback} />
        )}
      </div>
      {message.role === 'user' && (
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/60">
          <User size={15} />
        </div>
      )}
    </div>
  );
}

/** 消息反馈行：👍 直接提交；👎 展开可选评语后提交 */
function FeedbackRow({
  rating,
  onRate,
}: {
  rating?: 'UP' | 'DOWN';
  onRate: (rating: 'UP' | 'DOWN', comment?: string) => void;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (rating) {
    return (
      <div className="mt-2 flex items-center gap-1 text-xs text-foreground/40">
        {rating === 'UP' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
        已反馈，谢谢
      </div>
    );
  }

  const rate = (r: 'UP' | 'DOWN') => {
    setSubmitting(true);
    try {
      onRate(r, r === 'DOWN' ? comment.trim() || undefined : undefined);
      setShowComment(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => rate('UP')}
          disabled={submitting}
          title="回答有帮助"
          className="rounded p-1 text-foreground/40 transition-colors hover:bg-accent/10 hover:text-accent"
        >
          <ThumbsUp size={13} />
        </button>
        <button
          onClick={() => setShowComment((v) => !v)}
          disabled={submitting}
          title="回答没帮上忙"
          className="rounded p-1 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500"
        >
          <ThumbsDown size={13} />
        </button>
        <span className="text-[11px] text-foreground/30">这条回答对你有帮助吗？</span>
      </div>
      {showComment && (
        <div className="mt-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="哪里没帮上忙？（可选）"
            className="w-full rounded-lg border border-border bg-background p-2 text-xs outline-none placeholder:text-foreground/30 focus:border-accent"
          />
          <div className="mt-1 flex justify-end gap-2 text-xs">
            <button
              onClick={() => rate('DOWN')}
              className="rounded-md bg-accent px-2.5 py-1 text-white transition-opacity hover:opacity-90"
            >
              提交
            </button>
          </div>
        </div>
      )}
    </div>
  );
}