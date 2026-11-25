'use client';

/** 引用来源卡：编号角标 + 标题/小节 + 可点击文档锚点。AI 页与「问这篇文档」共用。 */
import Link from 'next/link';
import { FileText } from 'lucide-react';
import type { KbChunkHit } from '@/lib/auth';
import { sourceHref } from '@/lib/citation';

export function SourceList({
  sources,
  urlMap = {},
}: {
  sources: KbChunkHit[];
  urlMap?: Record<string, string | null>;
}) {
  if (!sources.length) return null;
  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground/60">
        <FileText size={12} />
        引用来源
      </p>
      <ul className="space-y-1">
        {sources.map((s, idx) => {
          const href = sourceHref(s, urlMap);
          const label = s.title || s.filePath;
          const section = s.headingPath?.trim();
          const meta = section
            ? s.chunkType === 'code'
              ? `代码 · ${s.codeLang || 'code'} · ${section}`
              : s.chunkType === 'table'
                ? `表格${s.tableHeader ? ` · ${s.tableHeader}` : ''} · ${section}`
                : section
            : null;
          return (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded bg-accent/10 px-1 text-2xs font-medium text-accent">
                {s.citationId ?? idx + 1}
              </span>
              {href ? (
                <Link href={href} className="block min-w-0 text-xs text-accent hover:underline">
                  <span className="line-clamp-1">{label}</span>
                  {meta && (
                    <span className="mt-0.5 block line-clamp-1 text-2xs font-normal text-foreground/45">
                      {meta}
                    </span>
                  )}
                </Link>
              ) : (
                <span className="block min-w-0 text-xs text-foreground/60">
                  <span className="line-clamp-1">{label}</span>
                  {meta && (
                    <span className="mt-0.5 block line-clamp-1 text-2xs text-foreground/45">
                      {meta}
                    </span>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
