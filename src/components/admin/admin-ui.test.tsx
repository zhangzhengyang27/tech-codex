// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { FileText, Inbox } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";

import { AdminEmptyState, AdminMetricCard, AdminPageHeader } from "./admin-ui";

afterEach(cleanup);

describe("AdminMetricCard", () => {
  it("渲染指标值、口径说明与图标", () => {
    const { container } = render(
      <AdminMetricCard label="文档总数" value="4,684" hint="公共库 default" icon={FileText} tone="blue" />,
    );

    expect(screen.getByText("文档总数")).toBeInTheDocument();
    expect(screen.getByText("4,684")).toBeInTheDocument();
    expect(screen.getByText("公共库 default")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("非状态语义的 tone 使用中性色条，只有红/黄编码异常", () => {
    // 色条的意义是"状态编码"而不是装饰：一排卡出现五种颜色时，用户读不出任何含义
    const blue = render(<AdminMetricCard label="已索引" value="4,684" icon={FileText} tone="blue" />);
    const blueBar = blue.container.querySelector('[class*="h-0.5"]');
    expect(blueBar?.className).toContain("bg-slate-300");

    cleanup();

    const red = render(<AdminMetricCard label="失败" value="0" icon={FileText} tone="red" />);
    const redBar = red.container.querySelector('[class*="h-0.5"]');
    expect(redBar?.className).toContain("bg-red-500");
  });
});

describe("AdminEmptyState", () => {
  it("同时渲染现状、原因说明与动作", () => {
    render(
      <AdminEmptyState
        icon={Inbox}
        title="暂无文档"
        description="同步任务完成后，文档会出现在这里。"
        action={<button type="button">立即同步</button>}
      />,
    );

    expect(screen.getByText("暂无文档")).toBeInTheDocument();
    expect(screen.getByText("同步任务完成后，文档会出现在这里。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即同步" })).toBeInTheDocument();
  });
});

describe("AdminPageHeader", () => {
  it("未显式传 eyebrow 时不再重复渲染“管理工作台”", () => {
    // 一级导航已经有了"管理工作台"，页面头再挂同名小字属于同屏重复编码（D-17）
    render(<AdminPageHeader icon={FileText} title="管理总览" description="公共知识库运行状态" />);

    expect(screen.getByText("管理总览")).toBeInTheDocument();
    expect(screen.queryByText("管理工作台")).toBeNull();
  });

  it("显式传入 eyebrow 时保留该小字，供需要的页面做二级分类", () => {
    render(<AdminPageHeader icon={FileText} eyebrow="质量与检索" title="RAG 评测" />);

    expect(screen.getByText("质量与检索")).toBeInTheDocument();
  });
});
