"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, PanelLeft, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  streamChat,
  kbHistory,
  kbClearHistory,
  kbFeedback,
  listConversations,
  deleteConversation,
  type ChatStreamEvent,
  type KbChunkHit,
  type ChatConversation,
  type KbScope,
} from "@/lib/auth";
import { fetchDocUrls } from "@/lib/doc-url";
import { useHydrated } from "@/lib/use-hydrated";
import { ChatMessage, type ChatMessageData } from "@/components/ai/chat-message";
import { TypewriterPump } from "@/components/ai/typewriter";
import {
  ConversationSidebar,
  MobileConversationList,
} from "@/components/ai/conversation-sidebar";
import { WelcomeCard } from "@/components/ai/welcome-card";
import { ChatInput } from "@/components/ai/chat-input";
import { ScopeSwitcher } from "@/components/kb/scope-switcher";
import { CategorySwitcher } from "@/components/kb/category-switcher";

export default function AiPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  /** 当前激活的对话ID；null 表示新对话（尚未由后端生成） */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  /** 检索范围：默认公共文档，与既有访客行为一致（scope 随每次提问携带） */
  const [scope, setScope] = useState<KbScope>("public");
  /** 课程分类过滤（frontmatter category，空串=不过滤；随每次提问携带） */
  const [category, setCategory] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  /** 溯源 filePath → 完整文档 URL（未请求/未命中为 null），用于来源链接 */
  const [urlMap, setUrlMap] = useState<Record<string, string | null>>({});
  /** 已发起反查的 filePath，避免重复请求 */
  const requestedRef = useRef<Set<string>>(new Set());

  // 打字机泵：SSE token 高速进缓冲（零渲染），渲染层按肉眼可读节奏逐帧放出
  const pumpRef = useRef<TypewriterPump | null>(null);
  const [streamText, setStreamText] = useState("");
  const getPump = () => {
    if (!pumpRef.current) {
      const pump = new TypewriterPump();
      pump.subscribe(setStreamText);
      pumpRef.current = pump;
    }
    return pumpRef.current;
  };
  /** 正在流式输出的会话ID：历史加载器遇它必须让路，否则会把流式中的消息列表整体覆盖 */
  const liveConvRef = useRef<string | null>(null);
  /** activeId 的实时引用：流结束回调注册于流开始时，捕获的 activeId 是旧值（新对话时为 null） */
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 客户端是否已挂载（SSR 期间恒为 false，hydration 后拿到真实登录态再判断）
  const hydrated = useHydrated();

  // 未登录跳转登录页
  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) {
      router.replace("/login?from=/ai");
    }
  }, [isLoggedIn, hydrated, router]);

  // 加载会话列表
  useEffect(() => {
    if (!isLoggedIn) return;
    listConversations()
      .then(setConversations)
      .catch(() => {});
  }, [isLoggedIn]);

  // 切换会话 / 新会话时加载对应历史。
  // 关键守卫：新对话第一条消息会经 conversation 事件把 activeId 从 null 变为真实会话ID，
  // 这会触发本 effect——若此刻流式仍在进行，用历史（空列表或已落库行）覆盖 messages
  // 会清掉正在打字的气泡并让流结束后的提交落空。故流式会话一律跳过加载。
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeId && activeId === liveConvRef.current) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        if (activeId == null) {
          setMessages([]);
          return;
        }
        const paged = await kbHistory(0, 100, activeId);
        // 后端按 id 倒序分页，翻转为时间正序供自上而下渲染
        setMessages(paged.content.slice().reverse().map((h) => ({ role: h.role, content: h.content })));
      } catch {
        /* 历史加载失败不阻断 */
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn, activeId]);

  // 滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  // 清理 AbortController
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // 收集当前所有引用来源的 filePath，批量反查完整 URL（已请求的跳过）
  useEffect(() => {
    const paths = messages.flatMap((m) => (m.sources ?? []).map((s) => s.filePath));
    const pending = paths.filter((p) => !requestedRef.current.has(p));
    if (pending.length === 0) return;
    pending.forEach((p) => requestedRef.current.add(p));
    let cancelled = false;
    fetchDocUrls(pending).then((urls) => {
      if (!cancelled) setUrlMap((prev) => ({ ...prev, ...urls }));
    });
    return () => {
      cancelled = true;
    };
  }, [messages]);

  const refreshConversations = () => {
    listConversations()
      .then(setConversations)
      .catch(() => {});
  };

  const newChat = () => {
    abortRef.current?.abort();
    setActiveId(null);
    setMessages([]);
    setError("");
    setPhase("");
    setMobileOpen(false);
  };

  const selectConversation = (id: string) => {
    abortRef.current?.abort();
    setActiveId(id);
    setMobileOpen(false);
  };

  /** 追加一条空的 AI 占位并流式填充回答；question 仅在请求中携带，不重复插入用户消息（供发送与重生成共用）。
   *  渲染期间消息列表的末条内容保持空串，展示取打字机泵的 streamText；泵排空后一次性提交完整文本。 */
  const streamAnswer = async (question: string) => {
    setError("");
    setMessages((prev) => [...prev, { role: "ai", content: "" }]);
    setBusy(true);
    setPhase("检索中…");

    const pump = getPump();
    pump.reset();
    setStreamText("");
    let sourcesCount = -1; // 意图路由/拒答兜底判断用（事件顺序到达，闭包内读取无竞态）

    pump.onFinish((full) => {
      liveConvRef.current = null;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "ai" && last.content === "") last.content = full;
        return next;
      });
      setBusy(false);
      setPhase("完成");
      // 多轮上下文已产生新消息，刷新会话列表（消息数/时间）；activeId 取 ref 实时值
      if (activeIdRef.current) refreshConversations();
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        question,
        activeId ?? undefined,
        (ev: ChatStreamEvent) => {          if (ev.type === "conversation") {
            // 后端已生成/确认对话ID：记录为当前会话并刷新列表
            liveConvRef.current = ev.data;
            setActiveId((prev) => prev ?? ev.data);
            refreshConversations();
          } else if (ev.type === "phase") {
            setPhase(ev.data);
          } else if (ev.type === "intention") {
            // 意图路由/拒答信号：知识库无相关内容且无来源时给出空态兜底文案（经泵输出保证渲染一致）
            if (ev.data === "knowledge_not_found" && sourcesCount <= 0) {
              pump.push(
                "知识库中未检索到与您问题明确相关的内容。请尝试换个更具体的说法，或联系管理员补充文档。"
              );
            }
          } else if (ev.type === "sources") {
            try {
              const parsed = JSON.parse(ev.data) as KbChunkHit[];
              if (Array.isArray(parsed)) {
                sourcesCount = parsed.length;
                setMessages((prev) => {
                  const next = [...prev];
                  const last = next[next.length - 1];
                  if (last?.role === "ai") last.sources = parsed;
                  return next;
                });
              }
            } catch {
              /* 忽略解析失败 */
            }
          } else if (ev.type === "token") {
            pump.push(ev.data);
          } else if (ev.type === "error") {
            setError(ev.data);
          }
        },
        controller.signal,
        undefined,
        scope,
        category,
      );
      // 流正常结束：泵排空剩余缓冲，onFinish 完成提交与收尾
      pump.end();
      abortRef.current = null;
    } catch (err) {
      liveConvRef.current = null;
      if (err instanceof Error && err.name === "AbortError") {
        pump.flush();
        const full = pump.current;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "ai" && last.content === "") last.content = full;
          return next;
        });
        setBusy(false);
        setPhase("已停止");
      } else {
        pump.flush();
        setError(err instanceof Error ? err.message : "请求失败");
        setBusy(false);
        setPhase("");
      }
      abortRef.current = null;
    }
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    if (!textOverride) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    await streamAnswer(text);
  };

  // 重生成：移除末尾 AI 回答，并对同一用户问题重新发起请求（后端会再次落库，可接受）
  const regenerate = async () => {
    if (busy) return;
    const last = messages[messages.length - 1];
    const prevMsg = messages[messages.length - 2];
    if (!last || last.role !== "ai" || !prevMsg || prevMsg.role !== "user") return;
    setMessages((prev) => prev.slice(0, -1));
    await streamAnswer(prevMsg.content);
  };

  const clearHistory = async () => {
    const isWhole = activeId == null;
    if (!confirm(isWhole ? "确定清空全部对话历史吗？" : "确定清空当前会话吗？")) return;
    try {
      await kbClearHistory(activeId ?? undefined);
      if (activeId) {
        // 清空当前会话消息，但保留会话
        setMessages([]);
        refreshConversations();
      } else {
        setMessages([]);
        setConversations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "清空失败");
    }
  };

  const removeConversation = async (id: string) => {
    if (!confirm("确定删除该会话吗？此操作不可恢复。")) return;
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.conversationId !== id));
      if (activeId === id) newChat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  /** 提交问答反馈（点赞/点踩），成功后回填该条消息的反馈状态 */
  const handleFeedback = async (
    index: number,
    rating: "UP" | "DOWN",
    comment?: string
  ) => {
    const msg = messages[index];
    if (!msg || msg.role !== "ai") return;
    const prev = messages[index - 1];
    const question = prev && prev.role === "user" ? prev.content : undefined;
    try {
      await kbFeedback(rating, {
        conversationId: activeId ?? undefined,
        question,
        answer: msg.content,
        comment,
      });
      setMessages((all) =>
        all.map((m, i) => (i === index ? { ...m, feedback: rating } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "反馈提交失败");
    }
  };

  if (!isLoggedIn) return null;

  // 末尾为 AI 回答（且上一句为用户提问）时才可"重新生成"
  const lastMsg = messages[messages.length - 1];
  const prevMsg = messages[messages.length - 2];
  const canRegenerate =
    !busy && !!lastMsg && lastMsg.role === "ai" && !!prevMsg && prevMsg.role === "user";

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      activeId={activeId}
      onSelect={selectConversation}
      onNewChat={newChat}
      onDelete={removeConversation}
    />
  );

  return (
    <main className="flex h-[calc(100vh-3.5rem)]">
      {/* 桌面端会话栏 */}
      <div className="hidden w-72 shrink-0 lg:block">{sidebar}</div>
      <MobileConversationList open={mobileOpen} onClose={() => setMobileOpen(false)}>
        {sidebar}
      </MobileConversationList>

      {/* 右侧聊天区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部工具行 */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-foreground/50 hover:bg-muted hover:text-foreground lg:hidden"
              aria-label="打开会话列表"
            >
              <PanelLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={newChat}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/60 hover:bg-muted hover:text-foreground"
              >
                <Plus size={13} />
                新对话
              </button>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/40 hover:bg-muted hover:text-foreground"
                title="清空当前对话"
              >
                <Trash2 size={13} />
                清空
              </button>
              {canRegenerate && (
                <button
                  onClick={regenerate}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-foreground/40 hover:bg-muted hover:text-foreground"
                  title="重新生成当前回答"
                >
                  <RotateCcw size={13} />
                  重新生成
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScopeSwitcher value={scope} onChange={setScope} disabled={busy} />
            <CategorySwitcher value={category} onChange={setCategory} disabled={busy} />
            {phase && !busy && phase !== "完成" && (
              <span className="text-xs text-foreground/40">{phase}</span>
            )}
            {busy && (
              <button
                onClick={() => abortRef.current?.abort()}
                className="text-xs text-foreground/40 hover:text-foreground"
              >
                停止
              </button>
            )}
          </div>
        </div>

        {/* 消息区 */}
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-8">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-foreground/40">
              加载中…
            </div>
          ) : messages.length === 0 ? (
            <WelcomeCard onAsk={send} isNewChat={activeId == null} />
          ) : (
            messages.map((m, i) => (
              <ChatMessage
                key={i}
                message={
                  busy && i === messages.length - 1 && m.role === "ai"
                    ? { ...m, content: streamText }
                    : m
                }
                streaming={busy && i === messages.length - 1}
                urlMap={urlMap}
                onFeedback={
                  m.role === "ai" && !(busy && i === messages.length - 1)
                    ? (rating, comment) => handleFeedback(i, rating, comment)
                    : undefined
                }
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* 输入区 */}
        <div className="border-t border-border px-4 py-3 md:px-8">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => send()}
            onStop={() => abortRef.current?.abort()}
            busy={busy}
            placeholder={activeId ? "继续追问…（带上下文）" : "输入你的问题…"}
            error={error}
          />
          <p className="mt-2 text-center text-xs text-foreground/30">
            AI 回答基于知识库文档检索，支持多轮上下文；内容仅供参考
          </p>
        </div>
      </div>
    </main>
  );
}