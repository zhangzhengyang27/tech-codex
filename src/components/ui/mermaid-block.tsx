'use client';

import { useEffect, useId, useState } from 'react';

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

/** mermaid v11 兼容性预处理：
 * 1. HTML 自闭合标签 <br/> 改为 Mermaid 支持的 <br />
 * 2. flowchart 系图中，节点/边/菱形标签里的易碎字符（() @ = : ; ? 等）未加引号时
 *    会导致 v11 lexer 报错——统一双引号包裹；已在双引号内的内容不动，
 *    规则只作用于 flowchart/graph（sequence/class 等其他图型语法不适用）。 */
function sanitizeMermaid(code: string): string {
  let s = code.replace(/<br\s*\/?>/gi, '<br />');

  // 图表可能携带 YAML frontmatter（--- ... ---）——frontmatter 原样保留，规则只作用于其后的正文
  let frontLines: string[] = [];
  if (s.startsWith('---')) {
    const lines = s.split('\n');
    const close = lines.slice(1).findIndex((l) => l.trim() === '---');
    if (close !== -1) {
      frontLines = lines.slice(0, close + 2);
      s = lines.slice(close + 2).join('\n');
    }
  }

  if (!/^\s*(flowchart|graph)\b/.test(s.trimStart())) {
    return frontLines.length ? [...frontLines, s].join('\n') : s;
  }

  // 逐行做引号感知分段：仅对双引号外的片段应用标签修复规则
  const fixSegment = (seg: string): string =>
    seg
      // [] 节点标签：含 () 或 @（如 [@PostConstruct]）→ 引号包裹
      .replace(/\[([^\][\n]*)\]/g, (match, label: string) => {
        const t = label.trim();
        if (!/[()@]/.test(t)) return match;
        return `["${t}"]`;
      })
      // |...| 边标签：含易碎字符（如 |put() 写入数据|）→ 引号包裹
      .replace(/\|([^|\n]*)\|/g, (match, label: string) => {
        const t = label.trim();
        if (!/[()@=:;?]/.test(t)) return match;
        return `|"${t}"|`;
      })
      // {...} 菱形标签：含易碎字符（如 {target === toRaw(x)?}）→ 引号包裹；@{...} 声明语法不动
      .replace(/\{([^{}\n]*)\}/g, (match, label: string, offset: number, full: string) => {
        const t = label.trim();
        if (!/[()@=:;?[\]]/.test(t)) return match;
        if (offset > 0 && full[offset - 1] === '@') return match;
        return `{"${t}"}`;
      });

  const fixed = s
    .split('\n')
    .map((line) => {
      let out = '';
      let buf = '';
      let inQuote = false;
      for (const ch of line) {
        if (ch === '"') {
          out += inQuote ? buf : fixSegment(buf);
          buf = '';
          out += ch;
          inQuote = !inQuote;
        } else {
          buf += ch;
        }
      }
      out += inQuote ? buf : fixSegment(buf);
      return out;
    })
    .join('\n');

  return frontLines.length ? [...frontLines, fixed].join('\n') : fixed;
}

/** 渲染结果 / 失败信息都记录其对应源码，用于派生判断是否仍匹配当前 code */
interface RenderResult {
  code: string;
  svg: string;
}
interface RenderFailure {
  code: string;
  message: string;
}

/** Mermaid 图表渲染组件：将 mermaid 源码渲染为 SVG，失败时回退显示源码 */
export function MermaidBlock({ code }: { code: string }) {
  const [result, setResult] = useState<RenderResult | null>(null);
  const [failure, setFailure] = useState<RenderFailure | null>(null);
  // React useId 含特殊字符（:r0: / «r0»），不能直接用作 SVG id / querySelector 参数，去除非字母数字
  const renderId = useId().replace(/[^a-zA-Z0-9]/g, '');

  useEffect(() => {
    let cancelled = false;
    loadMermaid()
      .then((mod) => {
        if (!configured) {
          // securityLevel 收紧为 strict：mermaid 会在输出 SVG 上自动做 DOMPurify 消毒
          // （非 loose 级别均走 sanitize 路径），已验证 <br /> 换行在 strict 下仍生效
          mod.default.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict' });
          configured = true;
        }
        return mod.default.render(renderId, sanitizeMermaid(code));
      })
      .then(({ svg: rendered }) => {
        if (!cancelled) setResult({ code, svg: rendered });
      })
      .catch((err: unknown) => {
        if (!cancelled) setFailure({ code, message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, [code, renderId]);

  // code 变化期间（含跨文档复用实例）：渲染结果不再匹配当前 code 时一律展示占位，
  // 避免旧图残留；异步回调经 cancelled 标志防止旧渲染结果覆盖新值。
  const failureForCurrentCode = failure !== null && failure.code === code;

  // 渲染失败：回退显示源码
  if (failureForCurrentCode) {
    return (
      <div className="overflow-hidden rounded bg-[#f6f8fa]">
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-2">
          <span className="text-xs font-medium text-gray-500">MERMAID</span>
          <span className="text-xs text-red-400" title={failure.message}>渲染失败</span>
        </div>
        <pre className="code-card-pre max-h-[480px] overflow-auto p-4 text-[13px] leading-[1.7]">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  const resultForCurrentCode = result !== null && result.code === code;

  // 渲染完成：显示图表
  if (resultForCurrentCode) {
    return (
      <div className="overflow-x-auto rounded bg-[#f6f8fa] p-4">
        <div className="mermaid-svg flex justify-center" dangerouslySetInnerHTML={{ __html: result.svg }} />
      </div>
    );
  }

  // 渲染中：占位
  return <div className="rounded bg-[#f6f8fa] p-4 text-xs text-gray-400">图表渲染中…</div>;
}
