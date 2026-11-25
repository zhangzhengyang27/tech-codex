// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./page";

// 登录页直接依赖 AuthContext 与路由；这里替换成可控的假状态，
// 避免测试去读 localStorage 或真的触发跳转。
const auth = vi.hoisted(() => ({
  isLoggedIn: false,
  user: null as null | {
    token: string;
    tokenType: string;
    username: string;
    nickname?: string;
    role: "USER" | "ADMIN";
    libraryId: string;
  },
  setAuth: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("from=/admin"),
}));

beforeEach(() => {
  auth.isLoggedIn = false;
  auth.user = null;
  auth.setAuth.mockClear();
  auth.logout.mockClear();
});

afterEach(cleanup);

describe("登录页", () => {
  it("未登录时渲染登录表单", async () => {
    render(<LoginPage />);

    expect(await screen.findByText("登录 Tech Codex")).toBeInTheDocument();
    expect(screen.getByLabelText(/用户名/)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/)).toBeInTheDocument();
    // 底部要说明"文档站无需登录"，否则用户会以为必须注册才能看文档
    expect(screen.getByRole("link", { name: /文档站无需登录/ })).toHaveAttribute("href", "/docs");
  });

  it("已登录时默认展示账号面板，而不是继续渲染登录表单", async () => {
    auth.isLoggedIn = true;
    auth.user = {
      token: "t",
      tokenType: "Bearer",
      username: "admin",
      nickname: "管理员",
      role: "ADMIN",
      libraryId: "u-admin",
    };

    render(<LoginPage />);

    expect(await screen.findByText("欢迎回来")).toBeInTheDocument();
    expect(screen.getByText(/admin · 管理员/)).toBeInTheDocument();
    // 账号态下不应再出现密码输入框，这是 D-10 的核心断言
    expect(screen.queryByLabelText(/密码/)).toBeNull();
  });

  it("点击切换账号会清空会话并展开表单", async () => {
    auth.isLoggedIn = true;
    auth.user = {
      token: "t",
      tokenType: "Bearer",
      username: "admin",
      nickname: "管理员",
      role: "ADMIN",
      libraryId: "u-admin",
    };

    render(<LoginPage />);
    fireEvent.click(await screen.findByText("切换账号"));

    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByText("登录 Tech Codex")).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/)).toBeInTheDocument();
  });
});
