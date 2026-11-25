"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Loader2, RotateCcw, Save, Settings, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { listConfig, updateConfig, type ConfigItem } from "@/lib/config";
import { AdminCard, AdminMetricCard, AdminPageHeader, adminBtn } from "@/components/admin/admin-ui";
import { Field } from "@/components/ui/field";

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
    // delayed setState：延后一拍发起加载，避免 effect 内同步 setState 级联渲染
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
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

  /** 放弃本轮全部草稿，回到服务端当前值。 */
  const onDiscard = () => {
    setDrafts({});
    setMsg("");
    setError("");
  };

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
    return <div className="w-full py-16 text-center text-sm text-slate-400">加载中…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex w-full flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert size={36} className="text-slate-300" />
        <p className="text-sm text-slate-500">该页面需要管理员权限</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={Settings}
        title="系统配置"
        description="在线调整检索参数、个人库配额与内容安全策略；保存后即时生效，无需重启服务。"
        meta={
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-caption text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {items.length} 个配置项
            </span>
            <span>{items.filter((it) => it.overridden).length} 项自定义覆盖</span>
            {dirtyKeys.length > 0 && <span className="text-amber-600">{dirtyKeys.length} 项待保存</span>}
            {msg && <span className="text-emerald-600">{msg}</span>}
            {error && <span className="text-red-500">{error}</span>}
          </>
        }
        actions={
          <button
            onClick={() => void onSave()}
            disabled={saving || loading || dirtyKeys.length === 0}
            className={adminBtn("primary")}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            保存{dirtyKeys.length > 0 ? `（${dirtyKeys.length} 项）` : ""}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <AdminMetricCard label="配置项" value={String(items.length)} hint="按部署默认值生效" icon={Settings} tone="blue" />
        <AdminMetricCard label="已自定义" value={String(items.filter((it) => it.overridden).length)} hint="覆盖部署默认值" icon={SlidersHorizontal} tone="violet" />
        <AdminMetricCard className="col-span-2 md:col-span-1" label="待保存" value={String(dirtyKeys.length)} hint={dirtyKeys.length > 0 ? "保存后立即生效" : "当前没有未保存修改"} icon={Save} tone={dirtyKeys.length > 0 ? "amber" : "emerald"} />
      </div>

      {loading && items.length === 0 && (
        <div className="mt-5 flex items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-white py-20 text-sm text-slate-400">
          <Loader2 size={16} className="animate-spin" /> 加载配置…
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {categories.map(({ category, items: group }) => (
          <AdminCard
            key={category}
            title={category}
            description={`${group.length} 个配置项 · 未修改项跟随部署默认值`}
            icon={Settings}
            contentClassName="divide-y divide-slate-100"
          >
            {group.map((it) => {
              const draft = drafts[it.key];
              const effective = draft
                ? draft.restoreDefault
                  ? it.defaultValue
                  : draft.value
                : it.value;
              const changed = !!draft && (draft.restoreDefault ? effective !== it.value : draft.value !== it.value);
              return (
                <div key={it.key} className="px-4 py-3.5">
                  {/* 键名 + 状态徽标作为 Field 标签，说明与默认值走 hint，控件独占一行 */}
                  <Field
                    size="sm"
                    label={
                      <span className="flex flex-wrap items-center gap-1.5">
                        <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-caption font-normal text-slate-600">
                          {it.key}
                        </code>
                        {it.overridden && <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-2xs font-medium text-blue-600 ring-1 ring-blue-100">已自定义</span>}
                        {changed && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-2xs font-medium text-amber-600 ring-1 ring-amber-100">待保存</span>}
                      </span>
                    }
                    htmlFor={it.type === "BOOL" ? undefined : `cfg-${it.key}`}
                    hint={
                      <>
                        {it.description}
                        {!it.overridden && (
                          <span className="ml-1.5 font-mono text-2xs text-slate-400">默认：{it.defaultValue || "（空）"}</span>
                        )}
                      </>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {it.type === "BOOL" ? (
                        <div role="group" aria-label={it.key} className="flex h-8 overflow-hidden rounded-lg border border-slate-200 bg-white">
                          {[
                            { v: "true", label: "开" },
                            { v: "false", label: "关" },
                          ].map((o) => (
                            <button
                              key={o.v}
                              onClick={() => setDraft(it.key, o.v)}
                              aria-pressed={effective === o.v}
                              className={clsx(
                                "px-3.5 text-xs transition-colors",
                                effective === o.v ? "bg-accent text-white" : "text-slate-500 hover:bg-slate-50",
                              )}
                            >
                              {o.label}
                            </button>
                          ))}
                        </div>
                      ) : it.type === "TEXT" ? (
                        <textarea
                          id={`cfg-${it.key}`}
                          value={effective}
                          onChange={(e) => setDraft(it.key, e.target.value)}
                          rows={2}
                          className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 font-mono text-caption outline-none focus:border-accent focus:bg-white"
                        />
                      ) : (
                        <input
                          id={`cfg-${it.key}`}
                          type="number"
                          step={it.type === "DOUBLE" ? "0.01" : "1"}
                          value={effective}
                          onChange={(e) => setDraft(it.key, e.target.value)}
                          className="h-8 w-32 rounded-lg border border-slate-200 bg-slate-50/70 px-2 font-mono text-xs outline-none focus:border-accent focus:bg-white"
                        />
                      )}
                      {it.overridden && (
                        <button
                          onClick={() => restoreDefault(it.key)}
                          title="清除自定义覆盖，恢复跟随部署默认值"
                          className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-caption text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                        >
                          <RotateCcw size={12} />
                          恢复默认
                        </button>
                      )}
                    </div>
                  </Field>
                </div>
              );
            })}
          </AdminCard>
        ))}
      </div>

      {dirtyKeys.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-white/95 px-4 py-3 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.45)] backdrop-blur">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
            <SlidersHorizontal size={15} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-slate-700">{dirtyKeys.length} 项修改待保存</div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {dirtyKeys.slice(0, 3).map((key) => (
                <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-2xs text-slate-500">{key}</span>
              ))}
              {dirtyKeys.length > 3 && <span className="px-1 text-2xs text-slate-400">+{dirtyKeys.length - 3}</span>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={onDiscard} disabled={saving} className={adminBtn("ghost", "sm")}>
              放弃修改
            </button>
            <button onClick={() => void onSave()} disabled={saving} className={adminBtn("primary", "sm")}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              保存并生效
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
