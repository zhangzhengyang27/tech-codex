// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";

// vitest 默认不注入全局 afterEach，RTL 的自动清理不会生效；
// 手动清理，否则同一文件里的多次 render 会累积成多个 button，getByRole 直接报重复匹配
afterEach(cleanup);

describe("Button", () => {
  it("默认 type=button，放在 form 里不会误触发提交", () => {
    render(<Button>确定</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("默认变体是 secondary 而非 primary", () => {
    // primary 的定位是「当前页面唯一主操作」，默认值必须是次要，
    // 否则每个按钮都会抢视觉焦点
    const { container } = render(<Button>取消</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("bg-background");
    expect(btn).not.toHaveClass("bg-accent");
    expect(container.querySelector(".bg-accent")).toBeNull();
  });

  it("primary 变体使用 accent 底色", () => {
    render(<Button variant="primary">提交</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent");
    expect(screen.getByRole("button")).toHaveClass("text-white");
  });

  it("loading 时禁用并渲染 spinner", () => {
    render(<Button loading>保存</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg")).not.toBeNull();
  });

  it("点击触发 onClick", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>刷新</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
