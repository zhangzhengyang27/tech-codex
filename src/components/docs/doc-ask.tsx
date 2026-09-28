'use client';

/**
 * 阅读页"问这篇文档"面板：悬浮按钮 + 迷你问答卡片。
 * 问答经 /kb-api/chat-stream 传入 docPath，后端把检索范围锁定到当前文档（filePath 过滤）。
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { streamChat, type ChatStreamEvent } from '@/lib/auth';
import { ChatMarkdown } from '@/components/ai/chat-markdown';
import { TypewriterPump } from '@/components/ai/typewriter';

interface AskMessage {
  role: 'user' | 'ai';
  content: string;
}

export function DocAskPanel({ docPath, docTitle }: { docPath: string; docTitle: string }) {
  const { isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** 本面板会话ID（后端 conversation 事件下发；关闭面板即弃用，重开为新会话） */
  const cidRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  /** 打字机泵：流式回答按肉眼可读节奏逐帧放出（与 /ai 同一体验） */
  const pumpRef = useRef<TypewriterPump | null>(null);
  const [streamText, setStreamText] = useState('');
  const getPump = () => {
    if (!pumpRef.current) {
      const pump = new TypewriterPump();
      pump.subscribe(setStreamText);
      pumpRef.current = pump;
    }
    return pumpRef.current;
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const close = () => {
    abortRef.current?.abort();
    setOpen(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    if (!isLoggedIn) return;
    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: text }, { role: 'ai', content: '' }]);
    setBusy(true);

    const pump = getPump();
    pump.reset();
    setStreamText('');

    const controller = new AbortController();
    abortRef.current = controller;

    const commit = () => {
      const full = pump.current;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'ai' && last.content === '') last.content = full;
        return next;
      });
      setBusy(false);
    };
    pump.onFinish(() => commit());

    try {
      await streamChat(
        text,
        cidRef.current,
        (ev: ChatStreamEvent) => {
          if (ev.type === 'conversation') {
            cidRef.current = ev.data;
          } else if (ev.type === 'token') {
            pump.push(ev.data);
          } else if (ev.type === 'error') {
            setError(ev.data);
          }
        },
        controller.signal,
        docPath
      );
      // 流结束：泵排空缓冲，onFinish 完成提交
      pump.end();
      abortRef.current = null;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        pump.flush();
        commit();
      } else {
        pump.flush();
        commit();
        setError(err instanceof Error ? err.message : '请求失败');
      }
      abortRef.current = null;
    }
  };

  return (
    <>
      {/* 悬浮入口 */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-accent/25 transition-transform hover:scale-105"
        >
          <Sparkles size={16} />
          <span className="hidden sm:inline">问这篇文档</span>
        </button>
      )}

      {/* 问答面板 */}
      {open && (
        <div className="fixed bottom-6 right-4 z-40 flex h-[540px] max-h-[75vh] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          {/* 头部 */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles size={15} className="shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">问这篇文档</p>
                <p className="truncate text-[11px] text-foreground/40">{docTitle}</p>
              </div>
            </div>
            <button
              onClick={close}
              className="rounded p-1 text-foreground/40 hover:bg-muted hover:text-foreground"
              aria-label="关闭"
            >
              <X size={16} />
            </button>
          </div>

          {!isLoggedIn ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <Sparkles size={24} className="text-foreground/30" />
              <p className="text-sm text-foreground/50">登录后可基于本文档内容提问</p>
              <Link
                href="/login"
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
              >
                去登录
              </Link>
            </div>
          ) : (
            <>
              {/* 消息区 */}
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
                    <Sparkles size={20} className="text-accent/60" />
                    <p className="text-sm text-foreground/50">针对本文档提问</p>
                    <p className="text-xs text-foreground/35">
                      检索范围限定在这篇文档内，例如「总结要点」「举个例子」
                    </p>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    // 流式中的末条 AI 消息展示打字机泵的可见文本
                    const content =
                      busy && i === messages.length - 1 && m.role === 'ai'
                        ? streamText
                        : m.content;
                    return (
                      <div
                        key={i}
                        className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-accent text-white'
                              : 'border border-border bg-muted/50'
                          }`}
                        >
                          {m.role === 'ai' ? (
                            content ? (
                              <ChatMarkdown content={content} />
                            ) : (
                              <span className="inline-block h-4 w-8 animate-pulse rounded bg-foreground/15 align-middle" />
                            )
                          ) : (
                            <div className="whitespace-pre-wrap text-left">{m.content}</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* 输入区 */}
              <div className="border-t border-border px-3 py-2.5">
                {error && <p className="mb-1.5 text-xs text-red-500">{error}</p>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder="针对本文档提问…"
                    className="max-h-24 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-foreground/35 focus:border-accent"
                  />
                  <button
                    onClick={send}
                    disabled={busy || !input.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-opacity disabled:opacity-40"
                    aria-label="发送"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
