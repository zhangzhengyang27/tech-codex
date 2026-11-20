import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

/** 所有 /admin/* 页面共享的管理工作台外壳：左侧导航、移动端抽屉和内容区。 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
