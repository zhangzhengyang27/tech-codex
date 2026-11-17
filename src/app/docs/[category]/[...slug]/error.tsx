'use client';

import { useEffect } from 'react';

/** 文档详情页错误边界：正文渲染/加载失败时展示错误信息并提供重试 */
export default function DocError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[docs] 文档渲染错误:', error);
  }, [error]);

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-10">
      <main className="min-w-0 flex-1 px-1 py-6 lg:px-0 lg:py-10">
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <p className="text-sm font-medium text-red-500">文档加载出错</p>
          <p className="break-all px-6 text-sm text-foreground/60">
            {error.message || '发生了未知错误，请稍后重试'}
          </p>
          <button
            onClick={reset}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            重试
          </button>
        </div>
      </main>
    </div>
  );
}
