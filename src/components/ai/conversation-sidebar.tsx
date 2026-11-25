'use client';

/** 会话侧边栏：新建对话 + 会话列表（标题、消息数、删除）。 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { ChatConversation } from '@/lib/auth';

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  /** 会话列表加载失败信息（展示在列表顶部并提供重试） */
  loadError?: string;
  onRetry?: () => void;
}

/** 侧栏首屏展示的会话数：超出部分按「显示更多」分批展开，避免长列表一次铺满 */
const INITIAL_VISIBLE = 20;
const PAGE_SIZE = 20;

function formatTime(raw?: string): string {
  if (!raw) return '';
  const t = new Date(raw);
  if (Number.isNaN(t.getTime())) return '';
  const now = new Date();
  const sameDay = t.toDateString() === now.toDateString();
  const pad = (n: number) => String(n).padStart(2, '0');
  if (sameDay) return `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (t.toDateString() === yesterday.toDateString()) return '昨天';
  return `${t.getMonth() + 1}月${t.getDate()}日`;
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  loadError,
  onRetry,
}: ConversationSidebarProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const visible = conversations.slice(0, visibleCount);
  const remaining = conversations.length - visible.length;

  return (
    <aside className="flex h-full flex-col border-r border-border bg-background">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-accent px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Plus size={15} />
          新建对话
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loadError && (
          <div role="alert" className="mx-1 mb-2 rounded-lg bg-red-50 px-2.5 py-2 text-xs text-red-600">
            <p>{loadError}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 text-2xs text-red-500 underline hover:text-red-700"
              >
                重新加载
              </button>
            )}
          </div>
        )}
        {conversations.length === 0 ? (
          <p className="px-2 pt-4 text-center text-xs leading-5 text-foreground/60">
            还没有历史对话。提问后会自动保存在这里，方便下次接着聊。
          </p>
        ) : (
          <ul className="space-y-1">
            {visible.map((c) => (
              <li key={c.conversationId}>
                <div
                  className={`group flex items-center rounded-lg transition-colors ${
                    activeId === c.conversationId
                      ? 'bg-accent/10 text-foreground'
                      : 'text-foreground/70 hover:bg-muted'
                  }`}
                >
                  {/* 内容区用 button：会话项可 Tab 聚焦、可回车打开（此前 div onClick 键盘不可达） */}
                  <button
                    type="button"
                    onClick={() => onSelect(c.conversationId)}
                    aria-current={activeId === c.conversationId ? 'true' : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pl-2.5 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                  >
                    <MessageSquare size={14} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-compact leading-tight">{c.title}</p>
                      <p className="text-caption text-foreground/35">
                        {c.messageCount} 条 · {formatTime(c.updatedAt)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(c.conversationId)}
                    // 常显：触屏没有 hover，仅 hover 才出现的删除入口等于不可用
                    className="mr-1 shrink-0 rounded p-1 text-foreground/30 transition-colors hover:text-red-500 focus-visible:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                    title="删除会话"
                    aria-label={`删除会话：${c.title}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="mt-2 w-full rounded-lg py-1.5 text-xs text-foreground/50 hover:bg-muted hover:text-foreground"
          >
            显示更多（还有 {remaining} 个）
          </button>
        )}
      </div>
    </aside>
  );
}

export function MobileConversationList({
  children,
  open,
  onClose,
}: {
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // 打开时把焦点移入抽屉并支持 Esc 关闭；关闭后焦点归还触发元素（键盘用户不丢位置）
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="会话列表"
        tabIndex={-1}
        className="h-full w-72 border-r border-border bg-background focus:outline-none"
      >
        {children}
      </div>
      <div className="flex-1 bg-black/30" onClick={onClose} aria-hidden="true" />
    </div>
  );
}
