import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AI 知识库问答",
  description: "基于知识库文档的 AI 问答：检索增强、多轮上下文、引用溯源。",
  alternates: { canonical: "/ai" },
};

export default function AiLayout({ children }: { children: ReactNode }) {
  return children;
}
