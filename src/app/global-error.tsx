"use client";

/**
 * 全局兜底错误页：只在根布局自身抛错时渲染。
 * 此时项目 CSS 与自定义组件可能都不可用，所以样式全部内联，
 * 不 import Tailwind 类名、不依赖 lucide 图标，保证最低限度可读。
 *
 * 两个出口的差别：reset 只重挂当前渲染树，适合偶发错误；
 * 数据或配置本身有问题时 reset 会反复失败，因此同时给出「回首页」。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#f6f8fa",
          color: "#1f2328",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              margin: "0 auto 14px",
              borderRadius: "50%",
              border: "1px solid #d1d9e0",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              color: "#cf222e",
            }}
          >
            !
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            页面出了点问题
          </h1>

          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "#656d76",
              margin: "0 0 4px",
            }}
          >
            错误发生在应用最外层，可能是样式或配置加载失败。
          </p>

          {error.digest && (
            <p style={{ fontSize: 12, color: "#656d76", margin: "0 0 4px" }}>
              错误编号：{error.digest}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginTop: 22,
            }}
          >
            <button
              onClick={reset}
              style={{
                height: 36,
                padding: "0 18px",
                borderRadius: 6,
                border: "1px solid #2264d6",
                background: "#2264d6",
                color: "#fff",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              重试
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 全局错误边界可能拿不到 router context，这里必须用原生跳转 */}
            <a
              href="/"
              style={{
                height: 36,
                padding: "0 18px",
                borderRadius: 6,
                border: "1px solid #d1d9e0",
                background: "#fff",
                color: "#1f2328",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              回到首页
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
