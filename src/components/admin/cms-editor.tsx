"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  History,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useHydrated } from "@/lib/use-hydrated";
import { AdminCard, AdminPageHeader, adminBtn } from "@/components/admin/admin-ui";
import {
  createCmsDocument,
  deleteCmsDocument,
  getCmsDocument,
  listCmsVersions,
  restoreCmsVersion,
  updateCmsDocument,
  type CmsDocumentDetail,
  type CmsVersion,
} from "@/lib/cms";
import { allCategories } from "@/lib/docs-config";
import { resolveDocAssetUrl } from "@/lib/doc-asset-url";
import { resolveDocUrl } from "@/lib/doc-url";

const CATEGORY_BY_DIR = new Map(allCategories.map((c) => [c.dir, c]));

const errText = (e: unknown): string => (e instanceof Error ? e.message : "操作失败");

/**
 * CMS 编辑器：单管理员直接发布。
 * 元数据（标题/分类/slug/摘要）与正文分离编辑；frontmatter 由后端保留并合并，
 * 避免作者在正文里误改 YAML。预览复用站点的 react-markdown + prose-doc 样式。
 */
export function CmsEditor({ docId }: { docId?: number }) {
  const router = useRouter();
  const { isLoggedIn, isAdmin } = useAuth();
  const hydrated = useHydrated();
  const isNew = docId == null;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  const [detail, setDetail] = useState<CmsDocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryDir, setCategoryDir] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [docSlug, setDocSlug] = useState("");
  const [body, setBody] = useState("");
  const [frontmatter, setFrontmatter] = useState("");
  const [expectedRevision, setExpectedRevision] = useState<number | null>(null);
  const [versions, setVersions] = useState<CmsVersion[]>([]);

  const applyDetail = (doc: CmsDocumentDetail) => {
    setDetail(doc);
    setTitle(doc.title ?? "");
    setDescription(doc.description ?? "");
    setCategoryDir(doc.categoryDir ?? "");
    setCategorySlug(doc.categorySlug ?? "");
    setDocSlug(doc.docSlug ?? "");
    setBody(doc.body ?? "");
    setFrontmatter(doc.frontmatter ?? "");
    setExpectedRevision(doc.revision ?? 1);
  };

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace(`/login?from=${encodeURIComponent(window.location.pathname)}`);
    if (!isLoggedIn || !isAdmin || isNew) return;
    let cancelled = false;
    // loading 初值已按「编辑=加载中 / 新建=不加载」设置；effect 内只做异步结果回填。
    void (async () => {
      try {
        const [doc, versionList] = await Promise.all([getCmsDocument(docId!), listCmsVersions(docId!)]);
        if (cancelled) return;
        applyDetail(doc);
        setVersions(versionList);
      } catch (e) {
        if (!cancelled) setError(errText(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // applyDetail 是稳定 setter 组合，不需要进依赖；docId 变化时重新拉取
  }, [docId, hydrated, isAdmin, isLoggedIn, isNew, router]);

  const onCategoryChange = (dir: string) => {
    setCategoryDir(dir);
    setCategorySlug(CATEGORY_BY_DIR.get(dir)?.slug ?? "");
  };

  const onSave = async () => {
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    if (!categoryDir || !categorySlug) {
      setError("请选择分类");
      return;
    }
    if (!docSlug.trim()) {
      setError("slug 不能为空");
      return;
    }
    if (!body.trim()) {
      setError("正文不能为空");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const input = {
        title,
        description,
        categoryDir,
        categorySlug,
        docSlug,
        body,
        frontmatter,
        expectedRevision,
        changeNote: isNew ? "新建并发布" : "在线编辑并发布",
      };
      const saved = isNew
        ? await createCmsDocument(input)
        : await updateCmsDocument(docId!, input);
      applyDetail(saved);
      setMessage(isNew ? "已创建并发布" : "已发布，内容与索引已更新");
      if (isNew) {
        router.replace(`/admin/content/${saved.id}`);
      } else {
        setVersions(await listCmsVersions(saved.id));
      }
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!detail) return;
    if (!window.confirm(`确定删除《${detail.title}》？数据库记录、分块与向量会清理，且不可恢复。`)) return;
    setSaving(true);
    setError("");
    try {
      await deleteCmsDocument(detail.id);
      router.push("/admin/content");
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  const onRestore = async (version: CmsVersion) => {
    if (!detail) return;
    if (!window.confirm(`回滚到 r${version.revision}？会生成一个新版本，历史不会丢。`)) return;
    setSaving(true);
    setError("");
    try {
      const restored = await restoreCmsVersion(detail.id, version.id);
      applyDetail(restored);
      setVersions(await listCmsVersions(detail.id));
      setMessage(`已回滚到 r${version.revision}，并生成新版本`);
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
        <AlertTriangle size={36} className="text-slate-300" />
        <p className="text-sm text-slate-500">该页面需要管理员权限</p>
      </div>
    );
  }

  const publicUrl = categoryDir && docSlug ? resolveDocUrl(`${categoryDir}/${docSlug}.md`) : null;

  return (
    <div className="w-full">
      <AdminPageHeader
        icon={BookOpen}
        title={isNew ? "新建内容" : detail?.title ?? "编辑内容"}
        description={isNew ? "选择分类并写入 Markdown 正文，发布后写入数据库并重建索引。" : "修改元数据或正文后直接发布，数据库版本与索引同步更新。"}
        meta={
          <Link href="/admin/content" className="inline-flex items-center gap-1 text-caption text-slate-500 hover:text-accent">
            <ArrowLeft size={12} /> 返回内容中心
            {detail && <span className="ml-2 font-mono text-slate-400">r{detail.revision ?? 1}</span>}
          </Link>
        }
        actions={
          <>
            {publicUrl && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className={adminBtn("secondary")}>
                <ExternalLink size={14} /> 查看线上
              </a>
            )}
            {!isNew && (
              <button onClick={() => void onDelete()} disabled={saving} className={adminBtn("danger")}>
                <Trash2 size={14} /> 删除
              </button>
            )}
            <button onClick={() => void onSave()} disabled={saving || loading} className={adminBtn("primary")}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {isNew ? "创建并发布" : "发布"}
            </button>
          </>
        }
      />

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-600">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {message && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-compact text-slate-400">
          <Loader2 size={18} className="mr-2 animate-spin" /> 正在加载内容…
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="order-2 min-w-0 xl:order-1 xl:row-span-2">
            <AdminCard
              title="正文"
              description="Markdown 正文（不含 frontmatter）；保存后自动合并原元数据"
              actions={
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {(["edit", "preview"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={
                        tab === t
                          ? "rounded-md bg-white px-3 py-1 text-caption font-medium text-slate-800 shadow-sm"
                          : "rounded-md px-3 py-1 text-caption text-slate-500 hover:text-slate-800"
                      }
                    >
                      {t === "edit" ? "编辑" : "预览"}
                    </button>
                  ))}
                </div>
              }
              contentClassName="p-3"
            >
              {tab === "edit" ? (
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  spellCheck={false}
                  placeholder="# 标题&#10;&#10;正文…"
                  className="min-h-[62vh] w-full resize-y rounded-lg border border-slate-200 bg-slate-50/60 p-4 font-mono text-xs leading-relaxed text-slate-700 outline-none transition-colors focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/20"
                />
              ) : (
                <div className="prose-doc min-h-[62vh] overflow-auto rounded-lg border border-slate-200 bg-white p-6">
                  {body.trim() ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      urlTransform={(url, key) =>
                        key === "src" ? (resolveDocAssetUrl(detail?.filePath ?? "", url) ?? url) : url
                      }
                    >
                      {body}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm text-slate-400">正文为空，暂无预览</p>
                  )}
                </div>
              )}
            </AdminCard>
          </div>

          <AdminCard className="order-1 xl:order-2" title="元数据" description="分类与 slug 决定线上 URL" contentClassName="space-y-3 p-4">
              <Field label="标题">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 text-compact outline-none focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/20"
                />
              </Field>
              <Field label="摘要">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs leading-5 outline-none focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/20"
                  placeholder="用于列表与 SEO，可空"
                />
              </Field>
              <Field label="分类">
                <select
                  value={categoryDir}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-600 outline-none focus:border-accent"
                >
                  <option value="">请选择分类</option>
                  {allCategories.map((c) => (
                    <option key={c.slug} value={c.dir}>
                      {c.title} · {c.dir}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Slug">
                <input
                  value={docSlug}
                  onChange={(e) => setDocSlug(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 font-mono text-xs outline-none focus:border-accent focus:bg-white focus:ring-1 focus:ring-accent/20"
                  placeholder="如 01-快速开始"
                />
                {categorySlug && (
                  <p className="mt-1 break-all font-mono text-2xs text-slate-400">
                    /docs/{categorySlug}/{docSlug || "…"}
                  </p>
                )}
              </Field>
              {!isNew && (
                <p className="text-caption leading-5 text-slate-400">
                  修改 slug 会改变线上 URL，旧链接不会自动重定向；如需保留旧链接，请在 next.config.ts 增加 redirect。
                </p>
              )}
            </AdminCard>

            <AdminCard
              className="order-3 xl:order-2"
              title="版本历史"
              description={detail ? `当前 r${detail.revision ?? 1}` : "发布后自动生成快照"}
              icon={History}
              contentClassName="p-3"
            >
              {versions.length === 0 ? (
                <p className="px-1 py-2 text-caption text-slate-400">暂无版本记录</p>
              ) : (
                <ul className="max-h-[36vh] space-y-1 overflow-auto">
                  {versions.map((v) => (
                    <li key={v.id} className="rounded-lg px-1.5 py-1.5 hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-caption font-medium text-slate-600">r{v.revision}</span>
                        {detail && v.revision !== detail.revision && (
                          <button
                            onClick={() => void onRestore(v)}
                            disabled={saving}
                            className="rounded px-1.5 py-0.5 text-2xs text-accent hover:bg-blue-50 disabled:opacity-50"
                          >
                            回滚
                          </button>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-2xs text-slate-400">
                        {fmtDate(v.createdDate)} · {v.createdBy ?? "-"}
                      </div>
                      {v.changeNote && <div className="mt-0.5 truncate text-2xs text-slate-500">{v.changeNote}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-medium uppercase tracking-[0.08em] text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("zh-CN", { hour12: false });
}
