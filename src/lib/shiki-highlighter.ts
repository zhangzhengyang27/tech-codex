import type { Highlighter } from 'shiki';

/** 文档站实际用到的语言白名单（服务端与客户端共用，避免 shiki 加载全部语言） */
export const SHIKI_LANGS = [
  'javascript',
  'typescript',
  // 常用别名/衍生语言：tsx、jsx、scss、xml、nginx 均为 shiki 内置 id（json 已在列），
  // 围栏标记写成 ```tsx / ```xml 等时无需回退纯文本
  'tsx',
  'jsx',
  'scss',
  'xml',
  'nginx',
  'html',
  'css',
  'json',
  'bash',
  'shell',
  'markdown',
  'yaml',
  'python',
  'java',
  'sql',
  'vue',
  'plaintext',
] as const;

/** 常用别名 → 白名单内规范 id 的归一化表（小写键） */
const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  python3: 'python',
  sh: 'bash',
  shell: 'bash',
  'shell-script': 'bash',
  zsh: 'bash',
  'shell-session': 'bash',
  console: 'bash',
  yml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  json5: 'json',
  jsonc: 'json',
  jsonl: 'json',
  htm: 'html',
  xhtml: 'html',
};

/**
 * 语言标识归一化：小写去空白后按别名表映射。
 * 不在白名单的语言由调用方回退纯文本（Shiki 'text'），不抛错。
 */
export function normalizeShikiLang(lang: string): string {
  const l = lang.trim().toLowerCase();
  return LANG_ALIASES[l] ?? l;
}

/**
 * 懒加载的 Shiki highlighter 单例。
 * 用动态 import() 避免 shiki 运行时被同步打进首屏 chunk，仅当页面真实需要高亮时才下载。
 * 多个组件（LazyCodeBlock / CodeGroup）共享同一实例，避免重复初始化与重复下载语言包。
 */
let highlighterPromise: Promise<Highlighter> | null = null;
export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import('shiki').then(
      ({ createHighlighter, createJavaScriptRegexEngine }) =>
        createHighlighter({
          themes: ['github-dark'],
          langs: [...SHIKI_LANGS],
          // shiki v4 的 engine 必填；使用纯 JS 正则引擎，避免 WASM 在浏览器端加载失败导致高亮静默失效
          engine: createJavaScriptRegexEngine(),
        })
    );
  }
  return highlighterPromise;
}
