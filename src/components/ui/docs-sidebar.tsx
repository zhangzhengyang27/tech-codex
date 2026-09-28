'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import type { DocSection } from '@/lib/docs-reader';

interface DocsSidebarProps {
  categorySlug: string;
  sections: DocSection[];
}

export function DocsSidebar({ categorySlug, sections }: DocsSidebarProps) {
  const pathname = usePathname();
  // 默认展开包含当前页面的章节
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const buildHref = (section: DocSection, fileSlug: string) =>
    `/docs/${categorySlug}/${section.slug === '_root' ? '' : section.slug + '/'}${fileSlug}`;

  // 判断章节（含其子孙）是否包含当前页面
  const isTreeActive = (section: DocSection): boolean =>
    section.files.some((f) => pathname === buildHref(section, f.slug)) ||
    // index.md 作为章节说明页：访问 .../index 时也视为该章节激活
    pathname === buildHref(section, 'index') ||
    section.children.some(isTreeActive);

  // 统计章节（含子孙）的文件总数
  const countFiles = (section: DocSection): number =>
    section.files.length + section.children.reduce((sum, c) => sum + countFiles(c), 0);

  const toggle = (slug: string) =>
    setCollapsed((prev) => ({ ...prev, [slug]: !prev[slug] }));

  const renderSection = (section: DocSection, depth: number) => {
    const active = isTreeActive(section);
    // 顶层章节默认展开（数量少时）；嵌套章节默认折叠（除非包含当前页面）
    const isCollapsed = collapsed[section.slug] ?? (!active && (depth > 0 || sections.length > 6));

    return (
      <div key={section.slug}>
        <button
          onClick={() => toggle(section.slug)}
          className={clsx(
            'flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left font-medium transition-colors',
            active ? 'text-foreground' : 'text-foreground/60 hover:text-foreground hover:bg-muted/60'
          )}
        >
          <ChevronRight
            size={14}
            className={clsx('shrink-0 transition-transform', !isCollapsed && 'rotate-90')}
          />
          <span className="truncate">{section.title}</span>
          <span className="ml-auto text-[11px] text-foreground/40">{countFiles(section)}</span>
        </button>

        {!isCollapsed && (
          <ul className="ml-4 border-l border-border pl-2.5 py-0.5 space-y-0.5">
            {section.files.map((file) => {
              const href = buildHref(section, file.slug);
              const current = pathname === href;
              return (
                <li key={file.slug}>
                  <Link
                    href={href}
                    className={clsx(
                      'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] leading-snug transition-colors',
                      current
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'text-foreground/55 hover:text-foreground hover:bg-muted/60'
                    )}
                  >
                    <FileText size={13} className="shrink-0" />
                    <span className="truncate">{file.title}</span>
                  </Link>
                </li>
              );
            })}
            {/* 嵌套子章节递归渲染 */}
            {section.children.map((child) => (
              <li key={child.slug}>{renderSection(child, depth + 1)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <nav className="space-y-1 text-sm">
      {sections.map((section) => renderSection(section, 0))}
    </nav>
  );
}
