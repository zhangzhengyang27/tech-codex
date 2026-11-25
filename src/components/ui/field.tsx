import clsx from "clsx";
import type { ReactNode } from "react";

export interface FieldProps {
  /**
   * 标签内容。放开成 ReactNode 是为了配置页的 key（需要等宽 code 样式）这类场景，
   * 不必为此再做一个字段组件；纯文本调用方式不受影响。
   */
  label: ReactNode;
  htmlFor?: string;
  /** 常驻说明：与 error 互斥，有 error 时优先显示 error，避免两条提示同时出现 */
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /**
   * 密度：md 用于面向读者的表单（登录、上传）；sm 用于管理台密集表单。
   * 原因：管理台正文普遍 text-xs，md 的 14px label 会盖过内容；也不该为管理台再抄一份组件。
   */
  size?: "md" | "sm";
  children: ReactNode;
  className?: string;
}

/**
 * 表单字段容器：把 label、控件、说明与错误收进同一块。
 *
 * 存在的理由：全站 44 个 input 各自手写 label 与错误文案，导致同一页内
 * 标签字号、上下间距、错误颜色都不一致。这里固定一套垂直节奏，
 * 新增字段不再需要记忆间距值。
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  size = "md",
  children,
  className,
}: FieldProps) {
  const dense = size === "sm";
  return (
    <div className={clsx(dense ? "space-y-1" : "space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className={clsx(
          "flex items-center gap-1 font-medium text-foreground",
          dense ? "text-xs" : "text-sm",
        )}
      >
        {label}
        {required && (
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {error ? (
        // role="alert"：错误通常是提交后新增的，需要立即播报而不是等用户再次聚焦
        <p className={clsx("text-red-600", dense ? "text-[11px]" : "text-xs")} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={clsx("text-foreground/60", dense ? "text-[11px]" : "text-xs")}>{hint}</p>
      ) : null}
    </div>
  );
}
