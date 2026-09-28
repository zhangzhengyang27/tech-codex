'use client';

import { useState } from 'react';
import { Check, Copy, Play } from 'lucide-react';
import { LazyCodeBlock } from './lazy-code-block';

/** 支持「运行」的语言（在右上角显示播放图标） */
const RUNNABLE = new Set(['js', 'javascript']);

/** 在隔离的 Web Worker 中执行 JS，避免在页面主线程用 new Function 直接执行文档代码 */
function buildRunWorkerSource(): string {
  return `const formatArg = (a) => {
  if (typeof a === 'string') return a;
  try { return JSON.stringify(a); } catch { return String(a); }
};
self.onmessage = (e) => {
  const out = [];
  const fakeConsole = {
    log: (...a) => out.push(a.map(formatArg).join(' ')),
    info: (...a) => out.push(a.map(formatArg).join(' ')),
    warn: (...a) => out.push(a.map(formatArg).join(' ')),
    error: (...a) => out.push(a.map(formatArg).join(' ')),
  };
  try {
    new Function('console', e.data.code)(fakeConsole);
  } catch (err) {
    out.push('Error: ' + (err && err.message ? err.message : String(err)));
  }
  self.postMessage(out);
};`;
}

interface CodeCardProps {
  /** 代码语言（来自 markdown 围栏） */
  lang: string;
  /** 纯文本代码（用于复制 / 运行 / 懒高亮展示） */
  code: string;
}

/** 通用代码块：深色主题 + 右上角悬浮控件（复制 / 运行），代码内容由 LazyCodeBlock 懒高亮 */
export function CodeCard({ lang, code }: CodeCardProps) {
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<string[] | null>(null);
  const runnable = RUNNABLE.has(lang.toLowerCase());

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };

  const handleRun = () => {
    try {
      const blob = new Blob([buildRunWorkerSource()], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);
      worker.onmessage = (e: MessageEvent<string[]>) => {
        setLogs(e.data);
        worker.terminate();
        URL.revokeObjectURL(url);
      };
      worker.onerror = () => {
        setLogs(['Error: 脚本执行失败']);
        worker.terminate();
        URL.revokeObjectURL(url);
      };
      worker.postMessage({ code });
    } catch (e) {
      setLogs([`Error: ${(e as Error).message}`]);
    }
  };

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117]">
      {/* 右上角悬浮控件：语言标识 + 复制 + 运行（仅 JS） */}
      <div className="absolute right-4 top-[11px] z-10 flex items-center gap-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#6e7681]">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          title="复制代码"
          aria-label="复制代码"
          className="text-[#6e7681] transition-colors hover:text-[#e6edf3]"
        >
          {copied ? <Check className="h-[15px] w-[15px] text-[#3fb950]" /> : <Copy className="h-[15px] w-[15px]" />}
        </button>
        {runnable && (
          <button
            type="button"
            onClick={handleRun}
            title="运行"
            aria-label="运行"
            className="text-[#6e7681] transition-colors hover:text-[#e6edf3]"
          >
            <Play className="h-[15px] w-[15px] fill-current" />
          </button>
        )}
      </div>

      {/* 代码区：高度由内容撑开，不设最大值 */}
      <LazyCodeBlock code={code} lang={lang} className="code-card-pre overflow-auto p-4 text-[13px] leading-[1.7]" />

      {/* 运行结果控制台（点击运行后展开） */}
      {logs && (
        <div className="border-t border-[#21262d] bg-[#010409] px-4 py-2.5 font-mono text-[12.5px]">
          <div className="mb-1 text-[11px] uppercase tracking-[0.5px] text-[#6e7681]">Console</div>
          {logs.length === 0 ? (
            <div className="text-[#6e7681]">（无输出）</div>
          ) : (
            logs.map((line, i) => (
              <div key={i} className="whitespace-pre-wrap text-[#e6edf3]">
                <span className="text-[#3fb950]">› </span>
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
