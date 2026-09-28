"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, RotateCcw, Save, Settings, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { listConfig, updateConfig, type ConfigItem } from "@/lib/config";

const errText = (e: unknown): string => (e instanceof Error ? e.message : "保存失败");

/** 编辑中的单项目状态：留空=未改动；支持显式恢复默认（发空串）。 */
interface DraftState {
  value: string;
  /** true 表示用户点了「恢复默认」，保存时发送空串清除覆盖 */
  restoreDefault: boolean;
}

export default function AdminConfigPage() {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();

  const [items, setItems] = useState<ConfigItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftState>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login?from=/admin/config");
  }, [isLoggedIn, hydrated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listConfig();
      setItems(data);
      setDrafts({});
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !isAdmin) return;
    void load();
  }, [load, hydrated, isAdmin]);

  const setDraft = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: { value, restoreDefault: false } }));
  };

  const restoreDefault = (key: string) => {
    setDrafts((prev) => ({ ...prev, [key]: { value: "", restoreDefault: true } }));
  };

  /** 分组（保持后端返回顺序）。 */
  const categories = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ConfigItem[]>();
    for (const it of items) {
      if (!map.has(it.category)) {
        map.set(it.category, []);
        order.push(it.category);
      }
      map.get(it.category)!.push(it);
    }
    return order.map((c) => ({ category: c, items: map.get(c)! }));
  }, [items]);

  const dirtyKeys = Object.keys(drafts).filter((k) => drafts[k] !== undefined);

  const onSave = async () => {
    if (dirtyKeys.length === 0) {
      setMsg("没有待保存的修改");
      return;
    }
    setSaving(true);
    setError("");
    setMsg("");
    try {
      const values: Record<string, string> = {};
      for (const k of dirtyKeys) {
        values[k] = drafts[k].restoreDefault ? "" : drafts[k].value;
      }
      const changed = await updateConfig(values);
      setMsg(changed.length > 0 ? `已更新 ${changed.length} 项，立即生效：${changed.join("，")}` : "无实际变更");
      await load();
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || !isLoggedIn) {
    return <div className="mx-auto max-w-[1440px] px-4 py-24 text-center text-sm text-foreground/40">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-3 px-4 py-24 text-center">
        <ShieldAlert size={36} className="text-foreground/30" />
        <p className="text-sm text-foreground/60">该页面需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Settings size={20} />
            系统配置
          </h1>
          <p className="mt-1 text-[13px] text-foreground/50">
            检索参数 / 个人库配额 / 内容安全在线调整，保存后即时生效、无需重启；未自定义的项跟随部署默认值
          </p>
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="max-w-md truncate text-xs text-emerald-600" title={msg}>{msg}</span>}
          {error && <span className="max-w-md truncate text-xs text-red-500" title={error}>{error}</span>}
          <button
            onClick={() => void onSave()}
            disabled={saving || loading || dirtyKeys.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-[13px] font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存{dirtyKeys.length > 0 ? `（${dirtyKeys.length} 项修改）` : ""}
          </button>
        </div>
      </div>

      {loading && items.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-foreground/40">
          <Loader2 size={16} className="animate-spin" /> 加载中…
        </div>
      )}

      <div className="space-y-5">
        {categories.map(({ category, items: group }) => (
          <div key={category} className="overflow-hidden rounded-xl border border-border bg-background">
            <div className="border-b border-border bg-muted/40 px-4 py-2.5 text-[13px] font-medium">
              {category}
              <span className="ml-2 text-xs font-normal text-foreground/40">{group.length} 项</span>
            </div>
            <div className="divide-y divide-border/60">
              {group.map((it) => {
                const draft = drafts[it.key];
                const effective = draft
                  ? draft.restoreDefault
                    ? it.defaultValue
                    : draft.value
                  : it.value;
                const changed = !!draft && (draft.restoreDefault ? effective !== it.value : draft.value !== it.value);
                return (
                  <div key={it.key} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/70">
                          {it.key}
                        </code>
                        {it.overridden && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">已自定义</span>}
                        {changed && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-600">待保存</span>}
                      </div>
                      <p className="mt-1 text-xs text-foreground/50">{it.description}</p>
                      {!it.overridden && (
                        <p className="mt-0.5 font-mono text-[11px] text-foreground/30">默认：{it.defaultValue || "（空）"}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {it.type === "BOOL" ? (
                        <div className="flex h-8 overflow-hidden rounded-md border border-border">
                          {[
                            { v: "true", label: "开" },
                            { v: "false", label: "关" },
                          ].map((o) => (
                            <button
                              key={o.v}
                              onClick={() => setDraft(it.key, o.v)}
                              className={clsx(
                                "px-3 text-[12px] transition-colors",
                                effective === o.v ? "bg-accent text-white" : "bg-background text-foreground/50 hover:bg-muted",
                              )}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      ) : it.type === "TEXT" ? (
                        <textarea
                          value={effective}
                          onChange={(e) => setDraft(it.key, e.target.value)}
                          rows={2}
                          className="w-72 resize-y rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
                        />
                      ) : (
                        <input
                          type="number"
                          step={it.type === "DOUBLE" ? "0.01" : "1"}
                          value={effective}
                          onChange={(e) => setDraft(it.key, e.target.value)}
                          className="h-8 w-28 rounded-md border border-border bg-muted/40 px-2 font-mono text-[13px] outline-none focus:border-accent"
                        />
                      )}
                      {it.overridden && (
                        <button
                          onClick={() => restoreDefault(it.key)}
                          title="清除自定义覆盖，恢复跟随部署默认值"
                          className="flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs text-foreground/50 hover:bg-muted hover:text-foreground"
                        >
                          <RotateCcw size={12} />
                          恢复默认
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
