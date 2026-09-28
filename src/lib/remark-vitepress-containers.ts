import type { Root, Parent, Paragraph, Code, RootContent } from 'mdast';

/**
 * 预处理 Markdown 文本：在 ::: 容器边界行前后补空行，
 * 使 remark 将标记行解析为独立段落（很多 VitePress 文档标记行后紧跟内容、没有空行）。
 * 通过跟踪代码围栏（``` / ~~~）状态，避免误改代码块内的 ::: 示例。
 */
export function normalizeVitepressContainers(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let fenceLen = 0; // 当前代码围栏长度，0 表示不在围栏内
  let fenceChar = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trimStart();
    const fm = /^(`{3,}|~{3,})/.exec(trimmed);

    // 代码围栏开/关判定（闭合围栏长度需 >= 开启长度且仅含围栏字符）
    if (fm) {
      const chars = fm[1];
      if (fenceLen === 0) {
        fenceLen = chars.length;
        fenceChar = chars[0];
      } else if (chars[0] === fenceChar && chars.length >= fenceLen && trimmed.replace(/\s/g, '') === chars) {
        fenceLen = 0;
      }
      out.push(line);
      continue;
    }

    // 仅处理代码围栏外、顶格的容器边界行
    if (fenceLen === 0 && /^:{3,}/.test(line)) {
      if (out.length > 0 && out[out.length - 1].trim() !== '') out.push('');
      out.push(line);
      if (i + 1 < lines.length && lines[i + 1].trim() !== '') out.push('');
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

/** 提取段落的纯文本（容器标记均为纯文本节点） */
function paragraphText(node: Paragraph): string {
  let s = '';
  for (const c of node.children) {
    if (c.type === 'text') s += c.value;
  }
  return s;
}

/** 若段落是闭合围栏（仅由 3+ 个冒号组成），返回冒号数量，否则返回 null */
function closingFenceLen(node: Paragraph): number | null {
  const m = /^(:{3,})$/.exec(paragraphText(node).trim());
  return m ? m[1].length : null;
}

interface CodeGroupItem {
  lang: string;
  label: string;
  code: string;
}

/** 根据容器类型构建自定义 mdast 节点 */
function buildContainer(type: string, title: string, inner: Parent['children']) {
  // 代码组：提取每个代码块的 语言 / 标签 / 源码，交由 CodeGroup 组件渲染标签页
  if (type === 'code-group') {
    const items: CodeGroupItem[] = inner
      .filter((n): n is Code => n.type === 'code')
      .map((n) => {
        const m = /\[([^\]]+)\]/.exec(n.meta || '');
        return {
          lang: n.lang || 'text',
          label: m ? m[1] : n.lang || 'text',
          code: n.value,
        };
      });
    return {
      type: 'vpCodeGroup',
      // 复杂数据用 JSON 字符串经 data-* 属性传递（数组/对象会被 hast 序列化为字符串）
      data: { hName: 'vpcodegroup', hProperties: { 'data-items': JSON.stringify(items) } },
      children: [],
    } as unknown as Parent;
  }

  // 提示容器（tip/warning/danger/info/note/important/caution/details）
  return {
    type: 'vpContainer',
    data: {
      hName: 'vpcontainer',
      hProperties: { containerType: type, containerTitle: title },
    },
    children: inner,
  } as unknown as Parent;
}

/** 递归处理父节点的 children，识别并重组 ::: 容器 */
function processParent(parent: Parent) {
  const children = parent.children;
  const result: Parent['children'] = [];
  let i = 0;

  while (i < children.length) {
    const node = children[i];

    if (node.type === 'paragraph') {
      const text = paragraphText(node).trim();
      const openM = /^(:{3,})\s*([a-zA-Z][\w-]*)?[ \t]*([\s\S]*)$/.exec(text);
      // 起始标记：3+ 冒号 + 类型/标题（纯冒号行是闭合标记，不在此处理）
      if (openM && /^:{3,}\s*\S/.test(text)) {
        const fenceLen = openM[1].length;
        const type = (openM[2] || 'tip').toLowerCase();
        const title = (openM[3] || '').trim();

        // 向后查找闭合标记（冒号数 >= 起始围栏）
        const inner: Parent['children'] = [];
        let j = i + 1;
        let closed = false;
        while (j < children.length) {
          const cand = children[j];
          if (cand.type === 'paragraph') {
            const cl = closingFenceLen(cand);
            if (cl !== null && cl >= fenceLen) {
              closed = true;
              break;
            }
          }
          inner.push(cand);
          j++;
        }

        if (closed) {
          // v-pre：仅去除容器包裹，内容原样渲染
          if (type === 'v-pre') {
            for (const n of inner) result.push(n);
          } else {
            const container = buildContainer(type, title, inner);
            processParent(container); // 支持嵌套容器
            result.push(container as unknown as RootContent);
          }
          i = j + 1;
          continue;
        }
      }
    }

    // 普通节点：若为父节点则递归处理其内部
    if ('children' in node && Array.isArray(node.children)) {
      processParent(node as Parent);
    }
    result.push(node);
    i++;
  }

  parent.children = result;
}

/** remark 插件：将 VitePress 风格的 ::: 自定义容器转换为可渲染的自定义节点 */
export function remarkVitepressContainers() {
  return (tree: Root) => {
    processParent(tree);
  };
}
