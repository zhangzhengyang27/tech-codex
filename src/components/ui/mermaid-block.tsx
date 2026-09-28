'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * mermaid 是成套图库，体积较大。改为「按需动态加载」：
 * 只有页面里真实出现 mermaid 代码块时才下载 mermaid chunk，
 * 绝大多数不带流程图的文档不再把整套库扛进客户端 bundle。
 * 模块级缓存避免同一页多个图表重复发网络请求，且 configure 只执行一次。
 */
let mermaidPromise: Promise<typeof import('mermaid')> | null = null;
let configured = false;
function loadMermaid(): Promise<typeof import('mermaid')> {
  if (!mermaidPromise) mermaidPromise = import('mermaid');
  return mermaidPromise;
}

let uid = 0;

/** mermaid v11 兼容性预处理：
 * 1. 节点标签内的 () 等特殊字符需用双引号包裹
 * 2. HTML 自闭合标签 <br/> 改为 Mermaid 支持的 <br /> */
function sanitizeMermaid(code: string): string {
  return code
    .replace(/<br\s*\/?>/gi, '<br />')
    .replace(/\[([^\]["]*)\]/g, (match, label: string) => {
      const trimmed = label.trim();
      if (!/[()]/.test(trimmed)) return match;
      return `["${trimmed}"]`;
    });
}

/** Mermaid 图表渲染组件：将 mermaid 源码渲染为 SVG，失败时回退显示源码 */
export function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${++uid}`);

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then((mod) => {
        if (!configured) {
          mod.default.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
          configured = true;
        }
        return mod.default.render(idRef.current, sanitizeMermaid(code));
      })
      .then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // 渲染失败：回退显示源码
  if (error) {
    return (
      <div className="overflow-hidden rounded bg-[#f6f8fa]">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-2">
          <span className="text-xs font-medium text-gray-500">MERMAID</span>
          <span className="text-xs text-red-400" title={error}>渲染失败</span>
        </div>
        <pre className="code-card-pre max-h-[480px] overflow-auto p-4 text-[13px] leading-[1.7]">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  // 渲染完成：显示图表
  if (svg) {
    return (
      <div className="overflow-x-auto rounded bg-[#f6f8fa] p-4">
        <div className="mermaid-svg flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
    );
  }

  // 渲染中：占位
  return <div className="rounded bg-[#f6f8fa] p-4 text-xs text-gray-400">图表渲染中…</div>;
}
