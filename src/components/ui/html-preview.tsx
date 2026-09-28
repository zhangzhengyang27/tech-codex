'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X, Check, Copy } from 'lucide-react';
import { LazyCodeBlock } from './lazy-code-block';

/** 注入默认样式：仅在 <head> 中已有 <style> 时不强插，避免覆盖用户自定义。
 *  完整文档场景下大多数示例没有自定义样式，注入通用兜底可大幅改善可读性。 */
function buildBaseStyle(): string {
  return `<style>
  /* 兜底样式：仅在用户未定义同名前提下生效（通过 :where() 实现 0 specificity）*/
  :where(body) {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #1f2328;
    background: #ffffff;
  }
  :where(*, *::before, *::after) { box-sizing: border-box; }
  :where(input, button, select, textarea) { font: inherit; }
  :where(input[type="text"], input[type="number"], input[type="search"], input:not([type])) {
    padding: 4px 10px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #ffffff;
    transition: border-color 0.15s;
  }
  :where(input:focus) {
    outline: none;
    border-color: #218bff;
    box-shadow: 0 0 0 3px rgba(33, 139, 255, 0.15);
  }
  /* 让常见 Vue/React 示例根容器使用垂直布局，避免 {{message}} 和 input 挤一行 */
  :where(#app, #root, .app, .container) {
    display: inline-block;
    max-width: 720px;
  }
  :where(#app, #root, .app, .container) > * {
    display: block;
    margin-bottom: 8px;
  }
  :where(#app, #root, .app, .container) > :where(input, button, select, textarea) {
    width: auto;
    max-width: 360px;
  }
  /* 让标题、段落、列表保持自然块级排版 */
  :where(h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote, pre, table, hr, br) {
    margin: 0;
  }
  :where(p, ul, ol) { margin-bottom: 8px; }
  :where(ul, ol) { padding-left: 24px; }
  :where(button) {
    padding: 4px 12px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #f6f8fa;
    color: #1f2328;
    cursor: pointer;
    transition: background 0.15s;
  }
  :where(button:hover) { background: #eef1f4; }
</style>`;
}

/** 将 html 代码片段包装成完整文档，注入自适应高度脚本 */
function buildSrcDoc(code: string): string {
  // 若代码本身已是完整文档则直接使用
  const isFullDoc = /<html[\s>]/i.test(code);
  const heightScript = `
<script>
  var lastH = 0;
  function reportHeight() {
    // 只测量 body 的内容高度（body 已强制 height:auto，不随视口拉伸），
    // 避免用 documentElement.scrollHeight（会返回视口高度）导致"调高→重报→再调高"的反馈循环
    var h = document.body ? document.body.scrollHeight : 0;
    if (h > 0 && h !== lastH) {
      lastH = h;
      parent.postMessage({ type: 'html-preview-resize', height: h }, '*');
    }
  }
  // 强制 html/body 高度为 auto，确保测得的是内容高度而非视口高度
  document.documentElement.style.setProperty('height', 'auto', 'important');
  if (document.body) document.body.style.setProperty('height', 'auto', 'important');
  window.addEventListener('load', function () {
    reportHeight();
    // 内容变化（图片加载、字体、宽度重排）时自动重报，无需监听 window resize
    if (window.ResizeObserver && document.body) {
      new ResizeObserver(reportHeight).observe(document.body);
    }
  });
</script>`;

  if (isFullDoc) {
    // 完整文档：在 <head> 中注入默认样式（如尚未存在），再把高度脚本插到 </body> 前
    const baseStyle = buildBaseStyle();
    let result = code;
    if (/<head[\s>]/i.test(result)) {
      result = result.replace(/<head([^>]*)>/i, `<head$1>${baseStyle}`);
    } else {
      // 极少见：没有 <head>，则在 <html> 后补一个
      result = result.replace(/<html([^>]*)>/i, `<html$1><head>${baseStyle}</head>`);
    }
    if (/<\/body>/i.test(result)) {
      result = result.replace(/<\/body>/i, `${heightScript}</body>`);
    } else {
      result = result + heightScript;
    }
    return result;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
${buildBaseStyle()}
</head>
<body>
${code}
${heightScript}
</body>
</html>`;
}

interface HtmlPreviewProps {
  /** 纯文本代码（用于 iframe 预览与懒高亮展示） */
  code: string;
}

export function HtmlPreview({ code }: HtmlPreviewProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [height, setHeight] = useState(240);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => buildSrcDoc(code), [code]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用时静默失败 */
    }
  };

  // iframe 高度自适应：仅在弹窗打开时监听，避免多个实例串扰
  useEffect(() => {
    if (!open) return;
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data && e.data.type === 'html-preview-resize') {
        const h = Number(e.data.height);
        if (h > 0) setHeight(Math.min(h + 2, 800));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open]);

  // ESC 关闭 + 锁定背景滚动
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      {/* 代码块（深色主题 + 右上角悬浮控件：复制 + 预览） */}
      <div className="group relative my-4 overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117]">
        <div className="absolute right-4 top-[11px] z-10 flex items-center gap-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#6e7681]">html</span>
          <button
            type="button"
            onClick={handleCopy}
            title="复制代码"
            aria-label="复制代码"
            className="text-[#6e7681] transition-colors hover:text-[#e6edf3]"
          >
            {copied ? <Check className="h-[15px] w-[15px] text-[#3fb950]" /> : <Copy className="h-[15px] w-[15px]" />}
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            title="预览"
            aria-label="预览"
            className="text-[#6e7681] transition-colors hover:text-[#e6edf3]"
          >
            <Eye className="h-[15px] w-[15px]" />
          </button>
        </div>
        <LazyCodeBlock code={code} lang="html" className="html-preview-pre overflow-auto p-4 text-[13px] leading-[1.7]" />
      </div>

      {/* 预览弹窗 */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="HTML 预览"
          >
            {/* 遮罩 */}
            <div
              className="html-preview-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            {/* 对话框 */}
            <div className="html-preview-dialog relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)]">
              <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-white to-gray-50/80 px-5 py-3 dark:from-gray-900 dark:to-gray-950/90">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 14h4v2H4v-2zm0-4h4v2H4v-2zm0-4h4v2H4V6zm8 8h8v2h-8v-2zm0-4h8v2h-8v-2zm0-4h8v2h-8V6z" opacity="0.4"/><path d="M1 3h22v18H1V3zm2 2v14h18V5H3z"/></svg>
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">HTML 预览</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="关闭预览"
                  className="rounded-lg p-1.5 text-foreground/40 transition-all duration-200 hover:bg-red-500/10 hover:text-red-500 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-auto rounded-b-2xl bg-white">
                <iframe
                  ref={iframeRef}
                  title="HTML 预览"
                  srcDoc={srcDoc}
                  sandbox="allow-scripts"
                  className="block min-h-[200px] w-full border-0"
                  style={{ height }}
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
