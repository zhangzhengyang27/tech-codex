"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Eye, X, Copy, Check } from "lucide-react";
import { LazyCodeBlock } from "./lazy-code-block";

interface VuePreviewProps {
  code: string;
}

// 将 SFC 源码拆分为 template / script / style 三段
function parseSfc(source: string) {
  const template = source.match(/<template>([\s\S]*?)<\/template>/i)?.[1]?.trim() ?? "";
  const scriptRaw = source.match(/<script\b[^>]*>([\s\S]*?)<\/script>/i)?.[1] ?? "";
  const style = source.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i)?.[1] ?? "";
  const isSetup = /<script\s+setup\b/i.test(source);
  return { template, scriptRaw, style, isSetup };
}

// 把 <script setup> 的顶层声明收集为 setup 返回值
function buildSetupFromScriptSetup(script: string): string {
  // 去掉 import 行（浏览器内无法解析裸模块 'vue'），改为从全局 Vue 取
  const cleaned = script
    .replace(/import\s*\{[^}]*\}\s*from\s*['"]vue['"];?/g, "")
    .replace(/import\s+\w+\s+from\s*['"]vue['"];?/g, "");
  // 匹配顶层 const/let/function 声明名
  const names = new Set<string>();
  const re = /(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) names.add(m[1]);
  const returnKeys = [...names].join(", ");
  return `const { ref, reactive, computed, onMounted, onUnmounted, watch, watchEffect, defineProps, defineEmits, defineExpose } = Vue;\n${cleaned}\nreturn { ${returnKeys} };`;
}

// 解析 export default {...} 选项式对象为 setup 返回（简易）
function buildSetupFromOptions(script: string): string {
  const cleaned = script
    .replace(/import\s*\{[^}]*\}\s*from\s*['"]vue['"];?/g, "")
    .replace(/import\s+\w+\s+from\s*['"]vue['"];?/g, "");
  // 提取 export default 后的对象字面量
  const idx = cleaned.indexOf("export default");
  if (idx === -1) return `const { ref, reactive, computed, onMounted, onUnmounted, watch, watchEffect } = Vue;\n${cleaned}\nreturn {};`;
  const after = cleaned.slice(idx + "export default".length);
  // 直接把整个 default 导出对象作为组件选项
  return `const { ref, reactive, computed, onMounted, onUnmounted, watch, watchEffect, createApp } = Vue;\nconst _opt = (${after.trim()});\nreturn typeof _opt.setup === 'function' ? _opt.setup() : (Object.keys(_opt).reduce((acc,k)=>{ if(['data','methods','computed','props','emits'].includes(k)) acc[k]=_opt[k]; return acc;},{}));`;
}

// 检测是否为 Vue 2 风格（new Vue({...}) 而非 export default / setup）
function isVue2Style(script: string): boolean {
  return /\bnew\s+Vue\s*\(/.test(script) && !/export\s+default/.test(script) && !/<script\s+setup/.test(script);
}

// 构建 Vue 2 风格 SFC 的 srcDoc（用 esm.sh @vue/compiler-dom 编译模板 + vue.esm-browser.js 运行时渲染）
function buildVue2SrcDoc(code: string): string {
  const { template, scriptRaw, style } = parseSfc(code);
  // 从 new Vue({...}) 中提取 options 对象
  const cleaned = scriptRaw
    .replace(/import\s*\{[^}]*\}\s*from\s*['"]vue['"];?/g, "")
    .replace(/import\s+\w+\s+from\s*['"]vue['"];?/g, "")
    .trim();
  // 提取 var/let/const app = new Vue(...) 中的参数部分
  const match = cleaned.match(/\bnew\s+Vue\s*\(\s*(\{[\s\S]*\})\s*\)/);
  if (!match) {
    return buildErrorSrcDoc('无法解析 Vue 实例定义');
  }
  const optsStr = match[1];

  // 提取所有 Vue.component() 全局注册，转为 app.component()
  const componentRegs: Array<{ name: string; def: string }> = [];
  const compRe = /Vue\.component\(\s*["']([^"']+)["']\s*,\s*(\{[\s\S]*?\n\})\s*\)/g;
  let cm: RegExpExecArray | null;
  while ((cm = compRe.exec(cleaned)) !== null) {
    componentRegs.push({ name: cm[1], def: cm[2] });
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script type="module">
import * as Vue from '/vue.esm-browser.js';
window.Vue = Vue;
window.__vueLoaded = true;
<\/script>
<style>
  body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2328; }
  ${style}
<\/style>
</head>
<body>
<div id="app"></div>
<script type="module">
await new Promise(r => setInterval(() => window.__vueLoaded && r(), 50));
const { createApp, h } = window.Vue;

// 动态加载 @vue/compiler-dom 用于模板编译
let compile;
try {
  const mod = await import('https://esm.sh/@vue/compiler-dom@3.5.13?bundle-deps');
  compile = mod.compile;
} catch(e) {
  document.body.innerHTML = '<pre style="color:#cf222e">编译器加载失败: ' + e.message + '</pre>';
  throw e;
}

try {
  const _opts = ${optsStr};
  delete _opts.el;
  if (_opts.data && typeof _opts.data !== 'function') {
    const _d = _opts.data;
    _opts.data = () => ({ ..._d });
  }
  const compiled = compile(\`${template.replace(/`/g, "\\`").replace(/\$\{/g, "\\${").replace(/<\/script>/g, "<\\/script>")}\`, { mode: 'function' });
  const renderFn = new Function(compiled.code)();
  _opts.render = renderFn.render || renderFn;
  const app = createApp(_opts);
  // 将 Vue 2 的全局组件注册迁移到当前 app 实例
  // 注意：vue.esm-browser.js 含编译器，app.component() 注册含 template 的对象时会自动编译，
  // 因此直接注册原始 def 即可，无需手动编译
  ${componentRegs.length > 0
    ? componentRegs.map(c => `app.component(${JSON.stringify(c.name)}, (${c.def}));`).join('\n  ')
    : '// no global components'}
  app.mount('#app');
} catch (e) {
  document.body.innerHTML = '<pre style="color:#cf222e;white-space:pre-wrap;">' + String(e && e.stack || e) + '<\\/pre>';
  console.error(e);
}
<\/script>
${VUE_HEIGHT_SCRIPT}</body>
</html>`;
}

function buildErrorSrcDoc(msg: string): string {
  return `<!DOCTYPE html><html><body style="padding:16px;color:#cf222e;font-family:monospace">${msg}</body></html>`;
}

/** iframe 内注入的自适应高度脚本：测量内容高度并经 postMessage 上报（无需 allow-same-origin） */
const VUE_HEIGHT_SCRIPT = `<script>
  var lastH = 0;
  function reportHeight() {
    var h = document.body ? document.body.scrollHeight : 0;
    if (h > 0 && h !== lastH) {
      lastH = h;
      parent.postMessage({ type: 'vue-preview-resize', height: h }, '*');
    }
  }
  document.documentElement.style.setProperty('height', 'auto', 'important');
  if (document.body) document.body.style.setProperty('height', 'auto', 'important');
  window.addEventListener('load', function () {
    reportHeight();
    if (window.ResizeObserver && document.body) {
      new ResizeObserver(reportHeight).observe(document.body);
    }
  });
<\/script>`;

function buildSrcDoc(code: string): string {
  const { template, scriptRaw, style, isSetup } = parseSfc(code);

  // Vue 2 风格（new Vue({...})）走专用路径
  if (isVue2Style(scriptRaw)) {
    return buildVue2SrcDoc(code);
  }

  const runtimeSetup = isSetup
    ? buildSetupFromScriptSetup(scriptRaw)
    : buildSetupFromOptions(scriptRaw);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script type="module">
import * as Vue from '/vue.esm-browser.js';
window.Vue = Vue;
window.__vueLoaded = true;
<\/script>
<style>
  body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1f2328; }
  ${style}
<\/style>
</head>
<body>
<div id="app"></div>
<script type="module">
await new Promise(r => setInterval(() => window.__vueLoaded && r(), 50));
const { createApp, h } = window.Vue;

// 动态加载 @vue/compiler-dom 用于模板编译
let compile;
try {
  const mod = await import('https://esm.sh/@vue/compiler-dom@3.5.13?bundle-deps');
  compile = mod.compile;
} catch(e) {
  document.body.innerHTML = '<pre style="color:#cf222e">编译器加载失败: ' + e.message + '</pre>';
  throw e;
}

try {
  const setupFn = new Function('Vue', \`${runtimeSetup.replace(/<\/script>/g, "<\\/script>")}\`);
  const bindings = setupFn(Vue);
  const compiled = compile(\`${template.replace(/`/g, "\\`").replace(/\$\{/g, "\\${").replace(/<\/script>/g, "<\\/script>")}\`, { mode: 'function' });
  const renderFn = new Function(compiled.code)();
  const app = createApp({
    setup() { return bindings; },
    render: renderFn.render || renderFn,
  });
  app.mount('#app');
} catch (e) {
  document.body.innerHTML = '<pre style="color:#cf222e;white-space:pre-wrap;">' + String(e && e.stack || e) + '<\\/pre>';
  console.error(e);
}
<\/script>
${VUE_HEIGHT_SCRIPT}</body>
</html>`;
}

export function VuePreview({ code }: VuePreviewProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [height, setHeight] = useState(420);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => buildSrcDoc(code), [code]);

  // 弹窗打开时禁止底层页面滚动
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  // 监听 iframe 内容高度（经 postMessage 上报，避免 allow-same-origin）
  useEffect(() => {
    if (!open) return;
    function onMessage(e: MessageEvent) {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.data && e.data.type === 'vue-preview-resize') {
        const h = Number(e.data.height);
        if (h > 0) setHeight(Math.min(Math.max(h + 32, 160), 720));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 忽略 */
    }
  };

  return (
    <>
      <div className="group relative my-4 overflow-hidden rounded-lg border border-[#30363d] bg-[#0d1117]">
        <div className="absolute right-4 top-[11px] z-10 flex items-center gap-3.5">
          <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[#6e7681]">Vue SFC</span>
          <button
            type="button"
            onClick={copy}
            title="复制"
            aria-label="复制"
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
        <LazyCodeBlock code={code} lang="vue" className="code-card-pre overflow-auto p-4 text-[13px] leading-[1.7]" />
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            role="dialog"
            aria-modal="true"
            aria-label="Vue 预览"
          >
            <div
              className="html-preview-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="html-preview-dialog relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_24px_80px_-12px_rgba(0,0,0,0.35)]">
              {/* 标题栏 */}
              <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-white to-gray-50/80 px-5 py-3 dark:from-gray-900 dark:to-gray-950/90">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M2 3h3.5L11 20.5h1.5l5.5-17.5H21v2h-2.04l-6 18H11L5.04 5H3V3zm4.23 0h2.57l4.7 14.74L18.2 3h2.56L13.45 21h-2.9L6.23 3z"/></svg>
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">Vue 预览</h3>
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
              {/* iframe 预览区 */}
              <div className="overflow-auto rounded-b-2xl">
                <iframe
                  ref={iframeRef}
                  title="Vue 预览"
                  srcDoc={srcDoc}
                  sandbox="allow-scripts"
                  className="block min-h-[200px] w-full border-0 bg-white"
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
