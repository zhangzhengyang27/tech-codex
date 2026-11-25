import { NextResponse, type NextRequest } from "next/server";

import exactMap from "./redirects/exact-map.json";
import inlineMap from "./redirects/inline-map.json";
import wildcardRules from "./redirects/wildcard-rules.json";

/**
 * 旧链接承接：两段式命中，顺序与原 next.config 的 redirects() 完全一致。
 *
 * 1. 精确规则先查（原 next.config 里 REFACTOR/DATA_SCIENCE/ARCH/… 的字面量 + 早期迁出的 JSON 明细）；
 * 2. 通配规则再按顺序做前缀匹配（RENUMBER、legacy slug、目录改名、Python 组名归一化）。
 *
 * 为什么全部挪到这里：next.config 的 redirects() 每条都会在启动时编进路由表，超过 1000 条
 * 会触发构建警告并拖慢启动；而 config 内的规则整体先于 proxy 执行，只要精确与通配分居两处，
 * 就会打乱原本"精确优先"的顺序（通配先命中会把旧编号原样透传，精确目标永远轮不到）。
 * 统一收进 proxy 才能既降低路由表体积，又保持命中顺序。
 */
const EXACT: Record<string, string> = {};
const RAW_RULES: Record<string, string> = {
  ...(exactMap as Record<string, string>),
  // 后展开的 inlineMap 覆盖同名 key：原 next.config 的具体条目优先级高于早期 JSON 明细
  ...(inlineMap as Record<string, string>),
};

/**
 * 同一条路径在链路里有两种写法：浏览器发出的 URL 是百分号编码，
 * 而 curl、部分代理或手工输入可能把中文原样送到服务端。这里为每个 key 同时登记
 * 编码与解码两种形态，避免"线上能跳、本地测试不跳"这类只在某种客户端复现的漏跳。
 */
function variants(path: string): string[] {
  const out = [path];
  try {
    const decoded = decodeURIComponent(path);
    if (decoded !== path) out.push(decoded);
  } catch {
    // 非法百分号序列保持原样，不能因为它让整个 proxy 抛错
  }
  return out;
}

for (const [source, destination] of Object.entries(RAW_RULES)) {
  for (const key of variants(source)) {
    EXACT[key] = destination;
    // 百分号编码的十六进制大小写不固定（浏览器发大写、Next 内部规范化后可能是小写），
    // 统一再登记一份小写索引，避免同一路径只因 %E5 / %e5 之差漏跳。
    EXACT[key.toLowerCase()] = destination;
  }
}

const WILDCARDS = wildcardRules as { source: string; destination: string }[];
const PATH_MARKER = ":path*";

/**
 * 通配源里的中文段要转成 URL 编码才能和 nextUrl.pathname 比较；
 * 已编码段（如 %E6%95%B0）必须原样保留，否则会把 % 再编码成 %25 导致永不命中。
 */
function encodeSegments(path: string): string {
  return path
    .split("/")
    .map((segment) => (/[^\x00-\x7F]/.test(segment) ? encodeURIComponent(segment) : segment))
    .join("/");
}

function redirect(req: NextRequest, destination: string) {
  const url = new URL(destination, req.nextUrl.origin);
  // 301：这些源都是已下线文档的旧编号，属于永久迁移。
  // 查询串保留，避免带 ?... 的旧外链丢参数。
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url, 301);
}

export const config = {
  // 只对 /docs 生效：其余路由不经过 proxy，避免全站每个请求都过一次中间件
  matcher: ["/docs/:path*"],
};

export default function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  for (const candidate of variants(pathname)) {
    const exact = EXACT[candidate] ?? EXACT[candidate.toLowerCase()];
    if (exact) return redirect(req, exact);
  }

  const lowerPath = pathname.toLowerCase();

  for (const rule of WILDCARDS) {
    const markerAt = rule.source.indexOf(PATH_MARKER);
    if (markerAt < 0) continue;
    const rawPrefix = rule.source.slice(0, markerAt);
    // 通配源里的中文段准备"原样"与"百分号编码"两种前缀，覆盖不同客户端送来的 pathname 形态
    for (const prefix of [rawPrefix, encodeSegments(rawPrefix)]) {
      const normalized = prefix.toLowerCase();
      // 编码前缀的大小写变化不改变长度，可直接用它切剩余路径
      if (!lowerPath.startsWith(normalized)) continue;
      const rest = pathname.slice(normalized.length);
      return redirect(req, rule.destination.replace(PATH_MARKER, rest));
    }
  }

  return NextResponse.next();
}
