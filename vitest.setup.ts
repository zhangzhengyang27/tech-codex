// 把 jest-dom 的断言（toBeDisabled / toHaveClass 等）注册进 vitest 的 expect，
// 否则只有 DOM 查询能力、没有 DOM 断言。
import "@testing-library/jest-dom/vitest";
