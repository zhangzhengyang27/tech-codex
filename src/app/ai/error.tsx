'use client';

import { useEffect } from 'react';

/** /ai 页错误边界：渲染失败时展示错误信息并提供重试（reset 重新渲染错误分段） */
export default function AiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[ai] 页面渲染错误:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-sm font-medium text-red-500">AI 助手页面加载出错</p>
      <p className="break-all text-sm text-foreground/60">
        {error.message || '发生了未知错误，请稍后重试'}
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        重试
      </button>
    </div>
  );
}
