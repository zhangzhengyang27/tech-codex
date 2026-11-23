import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateDocsCache } from "@/lib/docs-reader";

/**
 * CMS 管理代理：浏览器 → Next(/api/admin/cms/*) → Spring(/admin/kb/cms/*)。
 *
 * 为什么不让浏览器直连后端：
 * 1) 发布后必须清掉 Next 进程内的内容索引快照，并让首页/分类页/SEO 路由重算；
 * 2) DB-only 模式下正文走 /content/** fetch 缓存，必须同时 revalidateTag 才能读到新内容；
 * 3) 代理层是唯一能同时触达后端写入与 Next 缓存失效的位置，避免后端反向调用前端。
 *
 * 边界：只代理 CMS 路由；鉴权头原样透传，后端仍是 ADMIN 权限的唯一裁决方。
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND = process.env.KB_BACKEND_ORIGIN ?? "http://localhost:8081";

async function forward(req: NextRequest, path: string[], method: string): Promise<NextResponse> {
  const suffix = path.map((p) => encodeURIComponent(p)).join("/");
  const url = `${BACKEND}/admin/kb/cms/${suffix}${req.nextUrl.search}`;
  const authorization = req.headers.get("authorization");
  const contentType = req.headers.get("content-type");

  const init: RequestInit = {
    method,
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      ...(contentType ? { "Content-Type": contentType } : {}),
    },
    cache: "no-store",
  };
  if (method !== "GET" && method !== "DELETE") {
    // 空 body 的 POST（如版本回滚）也原样透传，后端不依赖 body
    init.body = await req.text();
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch (e) {
    return NextResponse.json(
      { message: `CMS 后端不可达：${e instanceof Error ? e.message : "请求失败"}` },
      { status: 502 },
    );
  }

  const text = await upstream.text();
  if (upstream.ok && method !== "GET") {
    // 先清模块级内容缓存，再让静态页按需重算；顺序不能反，否则重算时仍读旧缓存
    invalidateDocsCache();
    revalidateTag("docs-content", "max");
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
    revalidatePath("/feed.xml");
  }

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "GET");
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "POST");
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "PUT");
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return forward(req, path, "DELETE");
}
