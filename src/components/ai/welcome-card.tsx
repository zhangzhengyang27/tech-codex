'use client';

/** 空状态引导卡：问候语 + 常用提问建议（点击即发送）。 */
import { Bot, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  '什么是依赖注入？',
  'MySQL 索引失效的场景有哪些？',
  'Vue3 组合式 API 怎么使用？',
  'React 生命周期函数有哪些？',
];

export function WelcomeCard({
  onAsk,
  isNewChat,
}: {
  onAsk: (q: string) => void;
  isNewChat: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 text-center px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Bot size={28} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">
            {isNewChat ? '开始一段新对话' : '知识库 AI 助手'}
          </h2>
          <p className="mt-1 flex items-center justify-center gap-1 text-xs text-foreground/45">
            <Sparkles size={12} />
            基于全部 docs 文档的智能问答 · RAG 检索 · 支持多轮上下文
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-left text-[13px] text-foreground/75 transition-colors hover:border-accent/50 hover:bg-accent/5 hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}