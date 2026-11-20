"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Command, CornerDownLeft, Loader2, Search, Sparkles, X } from "lucide-react";
import { kbSearch, type KbChunkHit } from "@/lib/auth";

/** 全局询问入口：⌘K / Ctrl+K 打开，先给检索结果，再带着问题去 AI 追问。 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<KbChunkHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open || !q.trim()) {
      setHits([]);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      kbSearch(q.trim(), 8)
        .then((list) => {
          if (cancelled) return;
          // 同一篇文档只留最相关的一条，避免 8 条结果全被一篇长文占满
          const seen = new Set<number>();
          const deduped = list.filter((h) => {
            if (h.docId == null) return true;
            if (seen.has(h.docId)) return false;
            seen.add(h.docId);
            return true;
          });
          setHits(deduped.slice(0, 6));
          setError("");
          setActiveIndex(0);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "检索失败");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, q]);

  const close = () => setOpen(false);

  const openDoc = (hit: KbChunkHit) => {
    close();
    if (hit.siteSlug) router.push(`/docs/${hit.siteSlug}`);
    else router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const askAi = () => {
    if (!q.trim()) return;
    close();
    router.push(`/ai?q=${encodeURIComponent(q.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    }
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (hits[activeIndex]) openDoc(hits[activeIndex]);
      else askAi();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/40 px-4 pt-[12vh] backdrop-blur-[2px]" onClick={close}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <Search size={17} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="搜文档，或直接问 AI…"
            className="h-8 flex-1 bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
          />
          {loading ? <Loader2 size={15} className="animate-spin text-slate-400" /> : <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400">ESC</kbd>}
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {error && <p className="px-3 py-4 text-[12px] text-red-500">{error}</p>}
          {!q.trim() ? (
            <div className="px-3 py-5 text-[12px] text-slate-400">
              <p className="flex items-center gap-1.5"><Command size={12} /> ⌘K / Ctrl+K 任意页面唤起</p>
              <p className="mt-1.5 text-slate-300">输入关键词检索，或按 Enter 直接让 AI 回答。</p>
            </div>
          ) : hits.length === 0 && !loading ? (
            <div className="px-3 py-5 text-[12px] text-slate-400">没有检索结果，按 Enter 交给 AI 回答。</div>
          ) : (
            <ul className="space-y-0.5">
              {hits.map((h, i) => (
                <li key={`${h.docId}-${h.chunkIndex}-${i}`}>
                  <button
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => openDoc(h)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === activeIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}
                  >
                    <span className="mt-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">DOC</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-slate-700">{h.title}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-400">{h.heading || h.filePath}</span>
                    </span>
                    <ArrowUpRight size={13} className="mt-1 shrink-0 text-slate-300" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400"><CornerDownLeft size={12} />选中文档，或 Enter 问 AI</span>
          <button onClick={askAi} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-slate-700">
            <Sparkles size={12} />{q.trim() ? "让 AI 回答" : "打开 AI 问答"}
          </button>
        </div>
      </div>
    </div>
  );
}
