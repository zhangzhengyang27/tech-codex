import { afterEach, describe, expect, it, vi } from 'vitest';

import { isHighlightStale, scheduleLazyHighlight, type HighlightEntry } from './lazy-code-block';

/**
 * LazyCodeBlock 状态机单测（node 环境模拟，无 DOM）：
 * 直接驱动导出的 scheduleLazyHighlight / isHighlightStale，按 React effect 语义
 * （依赖变化 = 先 cleanup 旧 effect 再运行新 effect）模拟，验证：
 *  - 进入视口前不高亮、可见后高亮成功（entry 记录对应 code/lang）；
 *  - code/lang 变化后旧 entry 立即判定过期（渲染回退纯文本）并重新调度高亮；
 *  - 旧调度的异步响应在 cleanup 后晚到时不得覆盖新值（P0-2 流式截断/跨文档残留场景）。
 */

interface HlLike {
  getLoadedLanguages(): string[];
  codeToHtml(code: string, options: { lang: string; theme: string }): string;
}

function fakeHl(loaded: string[]): HlLike {
  return {
    getLoadedLanguages: () => loaded,
    // entry.html 是 Shiki 输出 <code> 的内部片段，故把所用语言编码进内容便于断言
    codeToHtml: (code, opts) =>
      `<pre class="shiki"><code>[lang=${opts.lang}]${code}</code></pre>`,
  };
}

const fakeEl = {} as Element;

function makeHarness() {
  let entry: HighlightEntry | null = null;
  const entries: HighlightEntry[] = [];
  const setEntry = (e: HighlightEntry) => {
    entry = e;
    entries.push(e);
  };
  // 手动触发可见性的假 IntersectionObserver（vi.stubGlobal 使 typeof 检查成立）
  let visibleCb: (() => void) | null = null;
  const observe = (_el: Element, cb: () => void) => {
    visibleCb = cb;
    return () => {
      visibleCb = null;
    };
  };
  return {
    setEntry,
    getEntry: () => entry,
    entries,
    becomeVisible: () => visibleCb?.(),
    observe,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isHighlightStale', () => {
  it('无 entry / code 或 lang 不一致时判定过期', () => {
    const entry: HighlightEntry = { code: 'a', lang: 'js', html: 'x' };
    expect(isHighlightStale(null, 'a', 'js')).toBe(true);
    expect(isHighlightStale(entry, 'a', 'js')).toBe(false);
    expect(isHighlightStale(entry, 'b', 'js')).toBe(true);
    expect(isHighlightStale(entry, 'a', 'ts')).toBe(true);
  });
});

describe('scheduleLazyHighlight', () => {
  it('可见后高亮成功，entry 记录对应 code/lang', async () => {
    vi.stubGlobal('IntersectionObserver', class {});
    const h = makeHarness();
    const resolvers: Array<(hl: HlLike) => void> = [];
    const getHl = () => new Promise<HlLike>((res) => resolvers.push(res));

    scheduleLazyHighlight({ code: 'const a = 1;', lang: 'javascript', el: fakeEl, setEntry: h.setEntry, getHighlighter: getHl, observe: h.observe });

    // 未进入视口：不高亮
    expect(h.getEntry()).toBeNull();
    h.becomeVisible();
    expect(resolvers).toHaveLength(1);
    resolvers[0](fakeHl(['javascript']));
    await Promise.resolve();
    await Promise.resolve();

    const entry = h.getEntry();
    expect(entry).not.toBeNull();
    expect(entry!.code).toBe('const a = 1;');
    expect(entry!.lang).toBe('javascript');
    expect(entry!.html).toContain('[lang=javascript]');
    expect(entry!.html).toContain('const a = 1;');
    // 高亮结果对当前 code/lang 有效
    expect(isHighlightStale(entry, 'const a = 1;', 'javascript')).toBe(false);
  });

  it('code 变化后重新高亮，旧响应晚到不覆盖（P0-2 核心场景）', async () => {
    vi.stubGlobal('IntersectionObserver', class {});
    const h = makeHarness();
    const resolvers: Array<(hl: HlLike) => void> = [];
    const getHl = () => new Promise<HlLike>((res) => resolvers.push(res));

    // 第一轮 effect（旧代码 A）
    let cleanup = scheduleLazyHighlight({ code: 'A', lang: 'javascript', el: fakeEl, setEntry: h.setEntry, getHighlighter: getHl, observe: h.observe });
    h.becomeVisible();
    expect(resolvers).toHaveLength(1);

    // 高亮尚未返回，代码已变为 B（流式追加 / 跨文档导航）：effect 重跑 = 先 cleanup 再调度
    cleanup();
    cleanup = scheduleLazyHighlight({ code: 'A,B', lang: 'javascript', el: fakeEl, setEntry: h.setEntry, getHighlighter: getHl, observe: h.observe });
    h.becomeVisible();
    expect(resolvers).toHaveLength(2);

    // 新调度（B）先完成
    resolvers[1](fakeHl(['javascript']));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.getEntry()!.code).toBe('A,B');
    expect(h.getEntry()!.html).toContain('[lang=javascript]');

    // 旧调度（A）的响应此后才晚到：必须被 cancelled 拦截，不得覆盖
    resolvers[0](fakeHl(['javascript']));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.getEntry()!.code).toBe('A,B');
    expect(h.entries).toHaveLength(1);

    cleanup();
  });

  it('lang 变化同样触发重新高亮', async () => {
    vi.stubGlobal('IntersectionObserver', class {});
    const h = makeHarness();
    const resolvers: Array<(hl: HlLike) => void> = [];
    const getHl = () => new Promise<HlLike>((res) => resolvers.push(res));

    const cleanup = scheduleLazyHighlight({ code: 'x', lang: 'js', el: fakeEl, setEntry: h.setEntry, getHighlighter: getHl, observe: h.observe });
    h.becomeVisible();
    resolvers[0](fakeHl(['javascript']));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.getEntry()!.lang).toBe('js');

    // lang 变化：旧 entry 过期，重新调度后以新 lang 高亮
    cleanup();
    scheduleLazyHighlight({ code: 'x', lang: 'bash', el: fakeEl, setEntry: h.setEntry, getHighlighter: getHl, observe: h.observe });
    h.becomeVisible();
    resolvers[1](fakeHl(['bash']));
    await Promise.resolve();
    await Promise.resolve();
    expect(h.getEntry()!.lang).toBe('bash');
    expect(h.getEntry()!.html).toContain('[lang=bash]');
  });

  it('语言未加载时回退 text，getHighlighter 拒绝时回退转义纯文本', async () => {
    vi.stubGlobal('IntersectionObserver', class {});
    const h = makeHarness();
    const resolvers: Array<(hl: HlLike) => void> = [];
    const getHl = () => new Promise<HlLike>((res) => resolvers.push(res));

    scheduleLazyHighlight({ code: '<a>', lang: 'cobol', el: fakeEl, setEntry: h.setEntry, getHighlighter: getHl, observe: h.observe });
    h.becomeVisible();
    resolvers[0](fakeHl(['javascript'])); // cobol 未加载 → 以 text 语言调用
    await Promise.resolve();
    await Promise.resolve();
    expect(h.getEntry()!.html).toContain('[lang=text]');

    // 高亮器加载失败：回退 HTML 转义后的纯文本
    const h2 = makeHarness();
    scheduleLazyHighlight({ code: '<a>', lang: 'js', el: fakeEl, setEntry: h2.setEntry, getHighlighter: () => Promise.reject(new Error('boom')), observe: h2.observe });
    h2.becomeVisible();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(h2.getEntry()!.html).toBe('&lt;a&gt;');
  });

  it('cleanup 后到达的可见触发不再发起新的高亮', async () => {
    vi.stubGlobal('IntersectionObserver', class {});
    const h = makeHarness();
    const resolvers: Array<(hl: HlLike) => void> = [];
    const getHl = () => new Promise<HlLike>((res) => resolvers.push(res));

    const cleanup = scheduleLazyHighlight({ code: 'A', lang: 'js', el: fakeEl, setEntry: h.setEntry, getHighlighter: getHl, observe: h.observe });
    cleanup();
    h.becomeVisible(); // 卸载后 observer 回调不应再生效
    expect(resolvers).toHaveLength(0);
  });
});
