'use client';

import { useState } from 'react';
import { ListTree, X } from 'lucide-react';
import type { DocSection } from '@/lib/docs-reader';
import { DocsSidebar } from './docs-sidebar';

interface MobileDocsDrawerProps {
  categorySlug: string;
  categoryTitle: string;
  sections: DocSection[];
}

export function MobileDocsDrawer({
  categorySlug,
  categoryTitle,
  sections,
}: MobileDocsDrawerProps) {
  const [open, setOpen] = useState(false);

  // 点击抽屉内任意文档链接后关闭抽屉
  const handlePanelClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('a')) {
      setOpen(false);
    }
  };

  return (
    <>
      {/* 移动端目录按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="my-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground/70 lg:hidden"
      >
        <ListTree size={15} className="text-accent" />
        目录
      </button>

      {/* 抽屉遮罩 + 面板 */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="absolute left-0 top-0 h-full w-[82%] max-w-xs overflow-y-auto border-r border-border bg-background px-3 py-4 shadow-xl"
            onClick={handlePanelClick}
          >
            <div className="mb-3 flex items-center justify-between px-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
                {categoryTitle} · 目录
              </span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-foreground/50 hover:bg-muted"
                aria-label="关闭目录"
              >
                <X size={16} />
              </button>
            </div>
            <DocsSidebar categorySlug={categorySlug} sections={sections} />
          </div>
        </div>
      )}
    </>
  );
}
