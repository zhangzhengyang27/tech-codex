import { CmsEditor } from "@/components/admin/cms-editor";

/** 新建 CMS 内容：不传 docId，编辑器走创建分支。 */
export default function AdminContentNewPage() {
  return <CmsEditor />;
}
