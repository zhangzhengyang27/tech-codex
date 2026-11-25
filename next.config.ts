import type { NextConfig } from "next";

/**
 * /docs 的旧链接承接已全部下沉到 src/proxy.ts：
 * - 精确规则 3066 条（原 JSON 2409 + 原字面量 657）走 Map 查表；
 * - 通配规则 47 条（目录改编号、Python 分组归一化等）按顺序前缀匹配。
 *
 * 为什么不留在这里：redirects() 的每条规则都会编进启动路由表，超过 1000 条会告警并拖慢启动；
 * 而且 config 内的规则整体先于 proxy 执行，精确与通配分居两处会打乱"精确优先"的原始顺序。
 */

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Vue 预览 iframe 使用 sandbox="allow-scripts"（无 allow-same-origin），
        // 本地模块导入需跨源，放开 CORS 使 /vue.esm-browser.js 可被模块脚本加载。
        source: '/vue.esm-browser.js',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
  // 代理到 lostsystem 知识库 RAG 后端（认证 / 问答 / 检索），绕开浏览器跨域。
  // /kb-auth/*    → /auth/*      （登录、注册）
  // /kb-api/*     → /api/kb/*    （SSE 问答、混合检索、历史、清空历史）
  // /kb-admin/*   → /admin/kb/*  （管理：文档导入、统计，需 ADMIN）
  // 后端地址经环境变量 KB_BACKEND_ORIGIN 配置（部署时必填），本地开发回落 8081。
  async rewrites() {
    const backend = process.env.KB_BACKEND_ORIGIN ?? "http://localhost:8081";
    return [
      { source: "/kb-auth/:path*", destination: `${backend}/auth/:path*` },
      { source: "/kb-api/:path*", destination: `${backend}/api/kb/:path*` },
      { source: "/kb-admin/:path*", destination: `${backend}/admin/kb/:path*` },
    ];
  },


  async redirects() {
    // 只保留不属于 /docs 的产品路径承接；文档站规则见 src/proxy.ts
    return [
      { source: "/admin/my-tenant", destination: "/my/kb", permanent: false },
    ];
  },
};

export default nextConfig;
