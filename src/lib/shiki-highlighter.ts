import type { Highlighter } from 'shiki';

/** 文档站实际用到的语言白名单（服务端与客户端共用，避免 shiki 加载全部语言） */
export const SHIKI_LANGS = [
  'javascript',
  'typescript',
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
