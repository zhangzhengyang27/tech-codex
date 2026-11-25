import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * 三档尺寸对齐的是现有页面的三处真实高度，而不是设计稿上的理想档位：
 * sm 28px（表格行内操作）、md 36px（工具栏）、lg 40px（表单主操作）。
 * 不引入 44px 以上的第四档——当前代码里没有这种按钮，多一档只会增加选择成本。
 */
const SIZE: Record<ButtonSize, string> = {
  sm: "h-7 gap-1 px-2.5 text-xs",
  md: "h-9 gap-1.5 px-3 text-sm",
  lg: "h-10 gap-2 px-5 text-sm",
};

/**
 * 四个变体收敛自全站 12 种以上的按钮写法。
 * 语义约定：primary 只用于"当前页面的主操作"，同一屏最多一个；
 * danger 必须配二次确认，组件本身不负责确认。
 */
const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent/90",
  secondary: "border border-border bg-background text-foreground hover:bg-muted",
  ghost: "text-foreground/70 hover:bg-muted hover:text-foreground",
  danger: "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
};

/**
 * 只要样式、不要 <button> 的场景（例如 Next Link、菜单项）用这个函数，
 * 避免为了"看起来像按钮"而把链接包一层按钮导致语义错误。
 */
export function buttonClass(
  options: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    fullWidth?: boolean;
    className?: string;
  } = {},
): string {
  const { variant = "secondary", size = "md", fullWidth, className } = options;
  return clsx(
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
    // 键盘焦点与鼠标 hover 分开：鼠标点击不出现焦点环，键盘导航必须可见（WCAG 2.4.7）
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    "disabled:cursor-not-allowed disabled:opacity-50",
    SIZE[size],
    VARIANT[variant],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /**
   * 只控制图标与禁用态，不接管点击逻辑。
   * 重入保护由调用方按自己的请求语义决定，组件不替它做判断。
   */
  loading?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth,
  loading,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      // 默认 type="button"：避免被误放在 <form> 中时回车触发提交
      type={type}
      disabled={disabled || loading}
      className={buttonClass({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" />}
      {children}
    </button>
  );
}
