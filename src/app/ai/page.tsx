"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2, PanelLeft, Plus, Loader2, X } from "lucide-react";
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
import { SESSION_INVALIDATED_EVENT } from "@/lib/fetch-helpers";
import { Button } from "@/components/ui/button";

/** 流式中断（后端 error/异常/空闲超时）时提交的部分回答尾部提示 */
const PARTIAL_SUFFIX = "（连接中断，以上为部分回答）";

/** 知识库无相关内容时的兜底文案：与后端落库文案保持一致，刷新后看起来是同一段回答 */
const REJECT_TEXT =
  "知识库中未检索到与您问题明确相关的内容。请尝试换个更具体的说法，或联系管理员补充文档。";

/** 会话消息的稳定 ID：不依赖数组下标，前插历史/重生成时组件状态不会串位 */
const newMessageId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

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
  /** 流式请求错误（展示在输入框上方） */
  const [error, setError] = useState("");
  /** 操作类错误（清空/删除/加载更早等），展示在消息区顶部，避免用户在底部看不到 */
  const [actionError, setActionError] = useState("");
  /** 会话列表加载失败（展示在侧栏） */
  const [conversationsError, setConversationsError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  /** 检索范围：默认公共文档，与既有访客行为一致（scope 随每次提问携带） */
  const [scope, setScope] = useState<KbScope>("public");
  /** 课程分类过滤（frontmatter category，空串=不过滤；随每次提问携带） */
  const [category, setCategory] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  /** 消息区滚动容器：滚动定位/跟随都直接操作它（scrollIntoView 对内部滚动容器不可靠） */
  const messagesRef = useRef<HTMLDivElement | null>(null);
  /** 用户当前是否贴近底部：上滚查看历史时，流式内容不再强行把他拽回底部 */
  const atBottomRef = useRef(true);
  /** 「加载更早」前记录的滚动位置：前插后按高度差补偿，保持当前阅读位置不动 */
  const restoreScrollRef = useRef<{ height: number; top: number } | null>(null);
  /** 溯源 filePath → 完整文档 URL（未请求/未命中为 null），用于来源链接 */
  const [urlMap, setUrlMap] = useState<Record<string, string | null>>({});
  /** 已发起反查的 filePath，避免重复请求 */
  const requestedRef = useRef<Set<string>>(new Set());
  /** 会话历史分页：当前已加载到的页码（后端 id 倒序，页码越大越早） */
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  /** 会话历史加载失败（区别于流式请求错误，展示在消息区） */
  const [historyError, setHistoryError] = useState("");

  /** 把当前会话 ID 同步到地址栏：刷新或分享后仍能回到同一会话 */
  const syncUrl = useCallback((id: string | null) => {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", id ? `/ai?c=${encodeURIComponent(id)}` : "/ai");
  }, []);

  // 初始化：?q= 预填问题（不自动发送），?c= 恢复上次会话；预填参数用完即从地址栏移除
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = params.get("q");
    const cid = params.get("c");
    if (initial) setInput(initial);
    if (cid) setActiveId(cid);
    if (initial) {
      window.history.replaceState(null, "", cid ? `/ai?c=${encodeURIComponent(cid)}` : "/ai");
    }
  }, []);

  // activeId 变化后同步 URL（新建会话回到 /ai，打开会话带 ?c=）
  useEffect(() => {
    syncUrl(activeId);
  }, [activeId, syncUrl]);

  // 打字机泵：SSE token 高速进缓冲（零渲染），渲染层按肉眼可读节奏逐帧放出
  const pumpRef = useRef<TypewriterPump | null>(null);
  const [streamText, setStreamText] = useState("");
  /** 流式期间内容增长的节流信号：驱动自动滚动跟随而不逐帧触发 smooth scroll */
  const [streamTick, setStreamTick] = useState(0);
  const lastTickAtRef = useRef(0);
  const getPump = () => {
    if (!pumpRef.current) {
      const pump = new TypewriterPump();
      pump.subscribe((text) => {
        setStreamText(text);
        // 节流（≤4 次/秒）：流式回答增长时让消息区跟随滚动
        const now = Date.now();
        if (now - lastTickAtRef.current >= 250) {
          lastTickAtRef.current = now;
          setStreamTick((t) => t + 1);
        }
      });
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

  // 任意 API 返回 401 时 lib 层会清会话并广播事件：统一跳登录重新认证
  useEffect(() => {
    const onInvalidated = () => router.replace("/login?from=/ai");
    window.addEventListener(SESSION_INVALIDATED_EVENT, onInvalidated);
    return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, onInvalidated);
  }, [router]);

  const loadConversations = useCallback(() => {    listConversations()
      .then((list) => {
        setConversations(list);
        setConversationsError("");
      })
      .catch((e) => {
        // 侧栏加载失败不再静默：给出可见提示与重试入口
        setConversationsError(e instanceof Error ? e.message : "会话列表加载失败");
      });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // 加载会话列表
  useEffect(() => {
    if (!isLoggedIn) return;
    loadConversations();
  }, [isLoggedIn, loadConversations]);

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
      setHistoryError("");
      setHistoryPage(0);
      try {
        if (activeId == null) {
          setMessages([]);
          setHasMoreHistory(false);
          return;
        }
        const paged = await kbHistory(0, 100, activeId);
        // 后端按 id 倒序分页，翻转为时间正序供自上而下渲染；
        // 旧数据里拒答可能落库为空串，这里补兜底文案，避免打开历史就是永久"加载中"骨架
        setMessages(
          paged.content
            .slice()
            .reverse()
            .map((h, i) => ({
              role: h.role,
              content: h.role === "ai" && !h.content ? REJECT_TEXT : h.content,
              id: `${h.createdDate}-${i}`,
            }))
        );
        setHistoryPage(paged.number ?? 0);
        setHasMoreHistory((paged.number ?? 0) + 1 < paged.totalPages);
      } catch (e) {
        // 历史加载失败：给出可见错误态而不是静默吞掉
        setMessages([]);
        setHasMoreHistory(false);
        setHistoryError(e instanceof Error ? e.message : "历史加载失败，请重试");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoggedIn, activeId]);

  // 滚动到底部：直接操作消息容器（scrollIntoView 在内部滚动容器里不生效，长会话会停在最旧一条）
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  /** 消息区滚动：记录用户是否贴近底部，供流式自动跟随判断 */
  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // 历史加载完成 / 切换会话后定位到最新消息
  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => scrollToBottom("auto"));
    return () => cancelAnimationFrame(raf);
  }, [loading, activeId, scrollToBottom]);

  // 新增消息（发送/流结束提交）时跟随到底部；加载更早消息由 restoreScrollRef 单独处理
  const prevLenRef = useRef(0);
  useEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = messages.length;
    if (restoreScrollRef.current) return;
    if (messages.length > prev && atBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages.length, scrollToBottom]);

  // 「加载更早」前插完成后补偿滚动位置：必须在 DOM 更新后同步读取最新 scrollHeight，
  // 用 rAF 会晚于浏览器滚动锚定，实测会停在新增内容中间而不是原阅读位置
  useLayoutEffect(() => {
    const restore = restoreScrollRef.current;
    const el = messagesRef.current;
    if (!restore || !el) return;
    const apply = () => {
      el.scrollTop = el.scrollHeight - restore.height + restore.top;
    };
    // 立即补偿一次（DOM 已更新，多数情况足够）
    apply();
    // 历史区内容较多时布局可能分帧完成，第一次赋值会被当时的 scrollHeight 截断，
    // 80ms 后再按最终高度补一次，随后释放标记（避免影响后续发送滚动）
    const timer = setTimeout(() => {
      apply();
      restoreScrollRef.current = null;
    }, 80);
    return () => clearTimeout(timer);
  }, [messages]);

  // 流式期间内容增长时跟随（用户上滚查看历史时不打扰）
  useEffect(() => {
    if (atBottomRef.current) scrollToBottom("auto");
  }, [streamTick, scrollToBottom]);

  // 清理 AbortController
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // 确认弹窗打开期间支持 Esc 关闭
  useEffect(() => {
    if (!confirmState) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmState(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmState]);

  // 收集当前所有引用来源的 filePath，批量反查完整 URL（已请求的跳过）
  useEffect(() => {
    const paths = messages.flatMap((m) => (m.sources ?? []).map((s) => s.filePath));
    const pending = paths.filter((p) => !requestedRef.current.has(p));
    if (pending.length === 0) return;
    pending.forEach((p) => requestedRef.current.add(p));
    let cancelled = false;
    fetchDocUrls(pending)
      .then((urls) => {
        if (!cancelled) setUrlMap((prev) => ({ ...prev, ...urls }));
      })
      .catch(() => {
        // 反查失败只降级为纯文本来源（无链接），不影响回答阅读
      });
    return () => {
      cancelled = true;
    };
  }, [messages]);

  /** 切换会话/新对话时清空上一会话的文档 URL 映射，避免映射常驻内存 */
  const resetDocUrls = () => {
    requestedRef.current.clear();
    setUrlMap({});
  };

  const newChat = () => {
    // 先摘除当前流再中止：中断回调里的"已停止"守卫（abortRef.current === controller）
    // 因此不再匹配，不会把旧流状态残留到新会话
    const live = abortRef.current;
    abortRef.current = null;
    live?.abort();
    setActiveId(null);
    setMessages([]);
    setInput("");
    setError("");
    setActionError("");
    setPhase("");
    resetDocUrls();
    atBottomRef.current = true;
    setMobileOpen(false);
  };

  const selectConversation = (id: string) => {
    const live = abortRef.current;
    abortRef.current = null;
    live?.abort();
    setActiveId(id);
    setInput("");
    setError("");
    setActionError("");
    // 清掉上一会话残留的"已停止"等阶段文案，避免串到新会话
    setPhase("");
    resetDocUrls();
    atBottomRef.current = true;
    setMobileOpen(false);
  };

  /** 追加一条空的 AI 占位并流式填充回答；question 仅在请求中携带，不重复插入用户消息（供发送与重生成共用）。
   *  渲染期间消息列表的末条内容保持空串，展示取打字机泵的 streamText；泵排空后一次性提交完整文本。
   *  流式中断（后端 error 事件 / 请求异常 / 空闲超时）时提交已生成的部分文本并追加截断提示（PARTIAL_SUFFIX），
   *  完全无内容则移除占位气泡——避免中断导致整条回答丢失或留下空串气泡。
   *  regenerate=true 时后端先删除上一轮问答再落库，保证历史不出现重复问答。 */
  const streamAnswer = async (question: string, opts?: { regenerate?: boolean }) => {
    setError("");
    setActionError("");
    setMessages((prev) => [...prev, { role: "ai", content: "", id: newMessageId() }]);
    setBusy(true);
    setPhase("检索中…");

    const pump = getPump();
    pump.reset();
    setStreamText("");
    // 流式中途出错（后端 error 事件 / 异常 / 空闲超时）：onFinish 提交时追加截断提示
    let errored = false;

    /** 出错收尾：有部分文本则提交并追加提示，空则移除占位气泡 */
    const commitInterrupted = () => {
      const full = pump.current;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role !== "ai") return next;
        if (last.content !== "") return next; // 已提交过（onFinish 路径），不覆盖
        if (full) last.content = full + PARTIAL_SUFFIX;
        else next.pop(); // 无任何内容：移除空气泡
        return next;
      });
    };

    pump.onFinish((full) => {
      liveConvRef.current = null;
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "ai" && last.content === "") {
          last.content = errored && full ? full + PARTIAL_SUFFIX : full;
          if (errored && !full) next.pop();
        }
        return next;
      });
      setBusy(false);
      setPhase(errored ? "" : "完成");
      // 多轮上下文已产生新消息，刷新会话列表（消息数/时间）；activeId 取 ref 实时值
      if (activeIdRef.current) loadConversations();
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        question,
        activeId ?? undefined,
        (ev: ChatStreamEvent) => {
          if (ev.type === "conversation") {
            // 后端已生成/确认对话ID：记录为当前会话并刷新列表
            liveConvRef.current = ev.data;
            setActiveId((prev) => prev ?? ev.data);
            loadConversations();
          } else if (ev.type === "phase") {
            setPhase(ev.data);
          } else if (ev.type === "intention") {
            // 意图路由/拒答信号：知识库无相关内容时无条件给出兜底文案。
            // 后端拒答分支不再下发 sources，这里同时清掉可能存在的低分来源，
            // 避免把不相关片段展示成"引用来源"
            if (ev.data === "knowledge_not_found") {
              pump.push(REJECT_TEXT);
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai") last.sources = undefined;
                return next;
              });
            }
          } else if (ev.type === "sources") {
            try {
              const parsed = JSON.parse(ev.data) as KbChunkHit[];
              if (Array.isArray(parsed)) {
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
            // 后端错误/空闲超时事件：不再当作正常完成，改为提交部分回答 + 截断提示
            errored = true;
            setError(ev.data);
          }
        },
        controller.signal,
        undefined,
        scope,
        category,
        opts?.regenerate === true
      );
      // 流正常结束（或经 error 事件标记的中断）：泵排空剩余缓冲，onFinish 完成提交与收尾
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
          if (last?.role === "ai" && last.content === "") {
            if (full) last.content = full;
            else next.pop();
          }
          return next;
        });
        setBusy(false);
        // "已停止"仅当本次中止仍对应当前活跃流时写入——
        // 用户已切会话/新对话（phase 已被重置）时不得把旧状态残留回来
        if (abortRef.current === controller) setPhase("已停止");
      } else {
        pump.flush();
        errored = true;
        setError(err instanceof Error ? err.message : "请求失败");
        commitInterrupted();
        setBusy(false);
        setPhase("");
      }
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || busy) return;
    if (!textOverride) setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text, id: newMessageId() }]);
    await streamAnswer(text);
  };

  // 重生成：移除末尾 AI 回答，并对同一用户问题重新发起请求。
  // regenerate=true 让后端先删除上一轮问答再落库（此前只截本地列表，历史里会留两份）
  const regenerate = async () => {
    if (busy) return;
    const last = messages[messages.length - 1];
    const prevMsg = messages[messages.length - 2];
    if (!last || last.role !== "ai" || !prevMsg || prevMsg.role !== "user") return;
    setMessages((prev) => prev.slice(0, -1));
    await streamAnswer(prevMsg.content, { regenerate: true });
  };

  const clearHistory = () => {
    // 按钮只在有当前会话时展示；无会话时"清空"实际会删除该用户全部历史，属于越权操作
    if (!activeId) return;
    setConfirmState({
      title: "清空当前会话",
      description: "将删除该会话下的全部问答记录，操作不可恢复。",
      confirmLabel: "清空",
      danger: true,
      onConfirm: async () => {
        try {
          await kbClearHistory(activeId);
          setMessages([]);
          loadConversations();
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "清空失败");
        }
      },
    });
  };

  const removeConversation = (id: string) => {
    const target = conversations.find((c) => c.conversationId === id);
    setConfirmState({
      title: "删除会话",
      description: `将删除「${target?.title || "该会话"}」的全部消息，操作不可恢复。`,
      confirmLabel: "删除",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteConversation(id);
          setConversations((prev) => prev.filter((c) => c.conversationId !== id));
          if (activeId === id) newChat();
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  /** 提交问答反馈（点赞/点踩），成功后回填该条消息的反馈状态；
   *  失败抛回给反馈行做局部提示，不占用页面级错误区 */
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
    } catch (e) {
      throw e instanceof Error ? e : new Error("反馈提交失败");
    }
  };

  // "加载更早"：按页拉取更早的历史（后端 id 倒序，下一页 = 更早的消息），前插到列表头并保持视口位置
  const loadOlderHistory = async () => {
    if (!activeId || loadingOlder || !hasMoreHistory) return;
    setLoadingOlder(true);
    const el = messagesRef.current;
    // 记录前插前的滚动状态，交给 useLayoutEffect 在 DOM 更新后精确补偿
    restoreScrollRef.current = {
      height: el?.scrollHeight ?? 0,
      top: el?.scrollTop ?? 0,
    };
    try {
      const paged = await kbHistory(historyPage + 1, 100, activeId);
      const older = paged.content
        .slice()
        .reverse()
        .map((h, i) => ({
          role: h.role,
          content: h.role === "ai" && !h.content ? REJECT_TEXT : h.content,
          id: `${h.createdDate}-older-${i}`,
        } as ChatMessageData));
      setMessages((prev) => [...older, ...prev]);
      setHistoryPage(paged.number ?? historyPage + 1);
      setHasMoreHistory((paged.number ?? historyPage + 1) + 1 < paged.totalPages);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "加载更早的消息失败");
    } finally {
      setLoadingOlder(false);
    }
  };

  if (!isLoggedIn) return null;

  // 末尾为 AI 回答（且上一句为用户提问）时才可"重新生成"
  const lastMsg = messages[messages.length - 1];
  const prevMsg = messages[messages.length - 2];
  const canRegenerate =
    !busy && !!lastMsg && lastMsg.role === "ai" && !!prevMsg && prevMsg.role === "user";

  /** 空态文案随检索范围变化，避免固定写"全部文档"与实际范围不符 */
  const scopeLabel =
    scope === "mine" ? "我的知识库文档" : scope === "all" ? "公共文档与我的文档" : "全部公共文档";

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      activeId={activeId}
      onSelect={selectConversation}
      onNewChat={newChat}
      onDelete={removeConversation}
      loadError={conversationsError}
      onRetry={loadConversations}
    />
  );

  return (
    <main aria-label="AI 知识库问答" className="flex h-[calc(100vh-3.5rem)]">
      <h1 className="sr-only">AI 知识库问答</h1>
      {/* 桌面端会话栏 */}
      <div className="hidden w-72 shrink-0 lg:block">{sidebar}</div>
      <MobileConversationList open={mobileOpen} onClose={closeMobile}>
        {sidebar}
      </MobileConversationList>

      {/* 右侧聊天区 */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部工具行 */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(true)}
              className="px-1.5 lg:hidden"
              aria-label="打开会话列表"
            >
              <PanelLeft size={18} />
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={newChat} className="px-2">
                <Plus size={13} />
                新对话
              </Button>
              {activeId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="px-2"
                  title="清空当前对话"
                >
                  <Trash2 size={13} />
                  清空
                </Button>
              )}
              {canRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={regenerate}
                  className="px-2"
                  title="重新生成当前回答"
                >
                  <RotateCcw size={13} />
                  重新生成
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScopeSwitcher value={scope} onChange={setScope} disabled={busy} />
            <CategorySwitcher value={category} onChange={setCategory} disabled={busy} />
            {/* 阶段提示：busy 期间也要显示（此前刻意隐藏，等待时界面毫无反馈） */}
            {phase && phase !== "完成" && (
              <span aria-live="polite" className="text-xs text-foreground/40">
                {phase}
              </span>
            )}
            {busy && (
              <button
                onClick={() => abortRef.current?.abort()}
                aria-label="停止生成"
                className="text-xs text-foreground/40 hover:text-foreground"
              >
                停止
              </button>
            )}
          </div>
        </div>

        {/* 消息区 */}
        <div
          ref={messagesRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="对话消息"
          onScroll={handleScroll}
          // 关闭浏览器滚动锚定：前插历史由加载逻辑精确补偿，两者同时介入会互相覆盖位置
          style={{ overflowAnchor: "none" }}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-8"
        >
          {actionError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              <span className="min-w-0 flex-1">{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError("")}
                aria-label="关闭提示"
                className="shrink-0 rounded p-0.5 text-red-400 hover:text-red-600"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-foreground/40">
              加载中…
            </div>
          ) : historyError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-foreground/40">
              <span className="text-red-500">{historyError}</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  // 重新拉取当前会话历史：先置 null 再恢复以触发历史加载 effect
                  const id = activeId;
                  setActiveId(null);
                  requestAnimationFrame(() => id && setActiveId(id));
                }}
              >
                重试
              </Button>
            </div>
          ) : messages.length === 0 ? (
            <WelcomeCard onAsk={send} isNewChat={activeId == null} scopeLabel={scopeLabel} />
          ) : (
            <>
              {hasMoreHistory && !busy && (
                <div className="flex justify-center">
                  <button
                    onClick={() => void loadOlderHistory()}
                    disabled={loadingOlder}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground/60 hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {loadingOlder && <Loader2 size={12} className="animate-spin" />}
                    加载更早的消息
                  </button>
                </div>
              )}
              {messages.map((m, i) => (
                <ChatMessage
                  key={m.id ?? i}
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
              ))}
            </>
          )}
        </div>

        {/* 输入区：底栏留白比顶部多 4px，让输入框与下方免责声明之间有明显呼吸区，
            避免打字时视线直接撞上说明文字 */}
        <div className="border-t border-border px-4 pb-4 pt-3 md:px-8">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={() => send()}
            onStop={() => abortRef.current?.abort()}
            busy={busy}
            placeholder={activeId ? "继续追问…（带上下文）" : "输入你的问题…"}
            error={error}
            onDismissError={() => setError("")}
          />
          <p className="mt-3 text-center text-xs text-foreground/50">
            AI 回答基于知识库文档检索，支持多轮上下文；内容仅供参考
          </p>
        </div>
      </div>

      {/* 确认弹窗：替代原生 confirm，与全站弹层风格一致，并支持 Esc 关闭 */}
      {confirmState && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmState(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-sm font-semibold text-foreground">
              {confirmState.title}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-foreground/60">
              {confirmState.description}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                autoFocus
                onClick={() => setConfirmState(null)}
              >
                取消
              </Button>
              <Button
                variant={confirmState.danger ? "danger" : "primary"}
                size="sm"
                onClick={() => {
                  const run = confirmState.onConfirm;
                  setConfirmState(null);
                  void run();
                }}
              >
                {confirmState.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
