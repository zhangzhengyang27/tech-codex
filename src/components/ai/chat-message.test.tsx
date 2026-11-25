// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatMessage } from "./chat-message";

afterEach(cleanup);

describe("ChatMessage 反馈链路", () => {
  it("用户消息原样渲染，不出现反馈入口", () => {
    const onFeedback = vi.fn();
    render(<ChatMessage message={{ role: "user", content: "什么是 CSP？" }} onFeedback={onFeedback} />);

    expect(screen.getByText("什么是 CSP？")).toBeInTheDocument();
    expect(screen.queryByTitle("回答有帮助")).toBeNull();
  });

  it("AI 消息点赞直接提交 UP", () => {
    const onFeedback = vi.fn();
    render(<ChatMessage message={{ role: "ai", content: "内容安全策略。" }} onFeedback={onFeedback} />);

    fireEvent.click(screen.getByTitle("回答有帮助"));
    expect(onFeedback).toHaveBeenCalledWith("UP", undefined);
  });

  it("点踩先展开评语，提交时带上评语", () => {
    const onFeedback = vi.fn();
    render(<ChatMessage message={{ role: "ai", content: "内容安全策略。" }} onFeedback={onFeedback} />);

    fireEvent.click(screen.getByTitle("回答没帮上忙"));
    fireEvent.change(screen.getByPlaceholderText("哪里没帮上忙？（可选）"), {
      target: { value: "没有给出示例" },
    });
    fireEvent.click(screen.getByText("提交"));

    expect(onFeedback).toHaveBeenCalledWith("DOWN", "没有给出示例");
  });

  it("已反馈的消息不再显示按钮，改为结果文案", () => {
    render(<ChatMessage message={{ role: "ai", content: "内容安全策略。", feedback: "UP" }} onFeedback={vi.fn()} />);

    expect(screen.getByText("已反馈，谢谢")).toBeInTheDocument();
    expect(screen.queryByTitle("回答有帮助")).toBeNull();
  });

  it("流式输出期间不显示反馈入口，避免半截回答被评价", () => {
    render(<ChatMessage message={{ role: "ai", content: "正在生成" }} streaming onFeedback={vi.fn()} />);

    expect(screen.queryByTitle("回答有帮助")).toBeNull();
  });
});
