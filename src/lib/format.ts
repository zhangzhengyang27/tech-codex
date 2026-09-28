/** 知识库页面共享的展示格式化工具。 */

export function fmtSize(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("zh-CN", { hour12: false });
}

export function statusText(status: string): string {
  if (status === "INDEXED") return "已索引";
  if (status === "PENDING") return "处理中";
  if (status === "FAILED") return "失败";
  return status;
}

/** 状态徽章配色（与文档管理同约定）。 */
export function statusBadgeCls(status: string): string {
  if (status === "INDEXED") return "bg-emerald-500/10 text-emerald-600";
  if (status === "PENDING") return "bg-amber-500/10 text-amber-600";
  if (status === "FAILED") return "bg-red-500/10 text-red-500";
  return "bg-muted text-foreground/60";
}
