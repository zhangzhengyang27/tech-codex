'use client';

/** 单条会话消息气泡：用户消息 / AI 消息（含 Markdown 渲染与溯源来源）。 */
import { memo, useState } from 'react';
import { Bot, Check, Copy, User, ThumbsUp, ThumbsDown } from 'lucide-react';
import { SourceList } from '@/components/ai/source-list';
import { ChatMarkdown } from '@/components/ai/chat-markdown';
import type { KbChunkHit } from '@/lib/auth';
import { Button } from '@/components/ui/button';

export interface ChatMessageData {
  role: 'user' | 'ai';
  content: string;
  /** 稳定 key：流式/重生成/前插历史时避免按下标复用组件状态 */
  id?: string;
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
  onFeedback?: (rating: 'UP' | 'DOWN', comment?: string) => void | Promise<void>;
}

function ChatMessageBase({ message, streaming, urlMap = {}, onFeedback }: ChatMessageProps) {
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
        className={`max-w-[78%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
          message.role === 'user'
            ? 'bg-accent text-white'
            : 'border border-border bg-muted/50'
        }`}
      >
        {message.role === 'ai' ? (
          message.content ? (
            <>
              <ChatMarkdown
                content={message.content}
                sources={message.sources}
                urlMap={urlMap}
              />
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

        {message.role === 'ai' && message.sources && (
          <SourceList sources={message.sources} urlMap={urlMap} />
        )}

        {message.role === 'ai' && !streaming && onFeedback && message.content && (
          <FeedbackRow
            rating={message.feedback}
            content={message.content}
            onRate={onFeedback}
          />
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

/**
 * 记忆化：流式时父组件每个 token 都会重渲染，历史消息的 props 不变，
 * 不 memo 会让所有历史气泡重新解析 Markdown，长会话明显卡顿。
 * onFeedback 是父层每次渲染新建的闭包，只比较「是否有反馈入口」而不比较函数引用。
 */
export const ChatMessage = memo(
  ChatMessageBase,
  (prev, next) =>
    prev.message === next.message &&
    prev.streaming === next.streaming &&
    prev.urlMap === next.urlMap &&
    Boolean(prev.onFeedback) === Boolean(next.onFeedback)
);

/** 消息反馈行：👍 直接提交；👎 展开可选评语后提交；另有「复制回答」。 */
function FeedbackRow({
  rating,
  content,
  onRate,
}: {
  rating?: 'UP' | 'DOWN';
  content: string;
  onRate: (rating: 'UP' | 'DOWN', comment?: string) => void | Promise<void>;
}) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      // 2s 后恢复，避免一直显示"已复制"掩盖按钮语义
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动选择文本复制');
    }
  };

  if (rating) {
    return (
      <div className="mt-2 flex items-center gap-1 text-xs text-foreground/40">
        {rating === 'UP' ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
        已反馈，谢谢
      </div>
    );
  }

  const rate = async (r: 'UP' | 'DOWN') => {
    setSubmitting(true);
    setError('');
    try {
      // 等待请求真正完成：此前同步置回 submitting，连点会重复提交反馈
      await onRate(r, r === 'DOWN' ? comment.trim() || undefined : undefined);
      setShowComment(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => void rate('UP')}
          disabled={submitting}
          title="回答有帮助"
          aria-label="回答有帮助"
          className="rounded p-1 text-foreground/40 transition-colors hover:bg-accent/10 hover:text-accent disabled:opacity-50"
        >
          <ThumbsUp size={13} />
        </button>
        <button
          onClick={() => setShowComment((v) => !v)}
          disabled={submitting}
          title="回答没帮上忙"
          aria-label="回答没帮上忙"
          className="rounded p-1 text-foreground/40 transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
        >
          <ThumbsDown size={13} />
        </button>
        <button
          onClick={() => void copy()}
          title="复制回答"
          aria-label="复制回答"
          className="rounded p-1 text-foreground/40 transition-colors hover:bg-muted hover:text-foreground"
        >
          {copied ? <Check size={13} className="text-accent" /> : <Copy size={13} />}
        </button>
        <span className="text-caption text-foreground/30">
          {copied ? '已复制到剪贴板' : '这条回答对你有帮助吗？'}
        </span>
      </div>
      {showComment && (
        <div className="mt-2">
          <textarea
            aria-label="填写反馈说明"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="哪里没帮上忙？（可选）"
            className="w-full rounded-lg border border-border bg-background p-2 text-xs outline-none placeholder:text-foreground/30 focus:border-accent"
          />
          <div className="mt-1 flex justify-end gap-2 text-xs">
            <Button variant="primary" size="sm" onClick={() => void rate('DOWN')} disabled={submitting}>
              {submitting ? '提交中…' : '提交'}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-1 text-2xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
