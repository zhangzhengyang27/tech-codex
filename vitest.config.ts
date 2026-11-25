import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // tsconfig 的 jsx 是 preserve（由 Next 编译），vitest 走 esbuild 需显式开启自动 JSX，
  // 否则 .test.tsx 中的 JSX 会被原样保留、运行时直接失败
  // @ts-expect-error vite 的 ESBuildOptions 类型没有暴露顶层 jsx，但运行时支持该字段；
  // 实际效果已由 button.test.tsx 验证（不加此配置 JSX 会原样保留、测试无法执行）
  esbuild: { jsx: "automatic" },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // DOM 环境按文件声明（.test.tsx 顶部写 @vitest-environment jsdom），
    // 纯逻辑测试继续跑 node 环境，避免全部都拖进 jsdom
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
