import { NextResponse, type NextRequest } from "next/server";

import { getCategoryBySlug } from "./lib/docs-config";
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

/**
 * 存在性预检：/docs 的 404 必须在响应头发送前决定。
 *
 * 页面里的 notFound() 发生在流式渲染中，那时响应头已经是 200；之前只能靠删掉 loading.tsx
 * 让 Next 等到判定完成。这里把判定提前到 proxy：详情页按分类 dir 反推 filePath 向后端要一次存在性，
 * 分类页按 56 个 slug 静态判定。后端 5xx/超时一律放行——宁可让页面自己 404，
 * 也不能因为后端抖动把整站文档误判为不存在。
 */
const BACKEND_ORIGIN = process.env.KB_BACKEND_ORIGIN ?? "http://127.0.0.1:8084";
const EXIST_TTL_MS = 60_000;
const EXIST_CACHE_MAX = 500;
const existCache = new Map<string, { ok: boolean; at: number }>();

const DOC_CATEGORY = /^\/docs\/([^/]+)\/?$/;
const DOC_DETAIL = /^\/docs\/([^/]+)\/(.+?)\/?$/;

/** pathname 可能是编码形态（含中文段），解码失败时按原样使用，不能因此抛错。 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function remember(filePath: string, ok: boolean) {
  // 只缓存明确结论（存在/不存在）；超时与 5xx 不进缓存，下次请求重新判定。
  if (existCache.size >= EXIST_CACHE_MAX) {
    const oldest = existCache.keys().next().value;
    if (oldest) existCache.delete(oldest);
  }
  existCache.set(filePath, { ok, at: Date.now() });
}

async function docExists(filePath: string): Promise<boolean | null> {
  const cached = existCache.get(filePath);
  if (cached && Date.now() - cached.at < EXIST_TTL_MS) return cached.ok;
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/content/doc?path=${encodeURIComponent(filePath)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (res.status === 404) {
      remember(filePath, false);
      return false;
    }
    if (res.ok) {
      remember(filePath, true);
      return true;
    }
    return null;
  } catch {
    return null;
  }
}

/** rewrite 到站点自己的 404 页并显式带 404 状态；返回空响应会丢掉导航与文案。 */
function missingPage(req: NextRequest) {
  return NextResponse.rewrite(new URL("/not-found", req.url), { status: 404 });
}

export default async function proxy(req: NextRequest) {
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

  // 旧链接已在上面的重定向里处理，剩下的是"当前 URL 是否真有这页"
  const decoded = safeDecode(pathname);

  const categoryOnly = DOC_CATEGORY.exec(decoded);
  if (categoryOnly && !getCategoryBySlug(categoryOnly[1])) return missingPage(req);

  const detail = DOC_DETAIL.exec(decoded);
  if (detail) {
    const category = getCategoryBySlug(detail[1]);
    const rest = detail[2].replace(/\/+$/, "");
    if (!category || !rest) return missingPage(req);
    // URL 相对分类目录的部分补回 .md，即后端 filePath
    const exists = await docExists(`${category.dir}/${rest}.md`);
    if (exists === false) return missingPage(req);
  }

  return NextResponse.next();
}
