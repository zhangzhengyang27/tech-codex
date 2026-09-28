'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { TocItem } from '@/lib/toc';

export function Toc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav className="text-[13px]">
      <p className="mb-3 font-semibold text-foreground/70">目录</p>
      <ul className="space-y-0.5 border-l border-border">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                setActiveId(item.id);
              }}
              className={clsx(
                'block border-l-2 -ml-px py-1 leading-snug transition-colors',
                item.level === 2 && 'pl-3',
                item.level === 3 && 'pl-6',
                item.level === 4 && 'pl-9',
                activeId === item.id
                  ? 'border-accent text-accent font-medium'
                  : 'border-transparent text-foreground/50 hover:text-foreground'
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
