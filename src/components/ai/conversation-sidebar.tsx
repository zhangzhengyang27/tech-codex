'use client';

/** 会话侧边栏：新建对话 + 会话列表（标题、消息数、删除）。 */
import type { ReactNode } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import type { ChatConversation } from '@/lib/auth';

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
}

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
}: ConversationSidebarProps) {
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
        {conversations.length === 0 ? (
          <p className="px-2 pt-4 text-center text-xs text-foreground/35">
            暂无历史对话
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((c) => (
              <li key={c.conversationId}>
                <div
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 transition-colors ${
                    activeId === c.conversationId
                      ? 'bg-accent/10 text-foreground'
                      : 'text-foreground/70 hover:bg-muted'
                  }`}
                  onClick={() => onSelect(c.conversationId)}
                >
                  <MessageSquare size={14} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] leading-tight">{c.title}</p>
                    <p className="text-[11px] text-foreground/35">
                      {c.messageCount} 条 · {formatTime(c.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.conversationId);
                    }}
                    className="shrink-0 rounded p-1 text-foreground/30 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                    title="删除会话"
                    aria-label="删除会话"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div className="h-full w-72 border-r border-border bg-background">{children}</div>
      <div className="flex-1 bg-black/30" onClick={onClose} />
    </div>
  );
}