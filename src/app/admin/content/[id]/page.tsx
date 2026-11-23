import { notFound } from "next/navigation";
import { CmsEditor } from "@/components/admin/cms-editor";

/** 编辑 CMS 内容：id 必须是正整数，非法路由直接 404，避免把错误参数带到后端。 */
export default async function AdminContentEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) notFound();
  return <CmsEditor docId={numeric} />;
}
