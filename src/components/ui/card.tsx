import clsx from "clsx";
import type { HTMLAttributes } from "react";

export type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  /**
   * 分层阴影：默认不加阴影。
   * 全站卡片都默认带阴影会让层级失去意义，只有浮在页面之上（如登录卡、弹层）才开启。
   */
  elevated?: boolean;
}

/**
 * 卡片容器：全站出现最多的视觉单元。
 *
 * 存在的理由：现有代码里 `rounded-lg border p-4 shadow-[...]` 这类完整类名串
 * 被手工复制了多次，任何一次圆角或边框调整都要全站搜索替换。
 * 这里固定圆角与边框，把内边距收敛为四档。
 */
export function Card({ padding = "md", elevated, className, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-background",
        elevated && "shadow-xl shadow-black/5",
        PADDING[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
