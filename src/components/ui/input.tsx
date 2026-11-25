import clsx from "clsx";
import type { InputHTMLAttributes } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * 校验失败态：只换边框与 focus ring，不改高度与内边距，
   * 这样错误出现/消失时表单不会跳动。
   */
  invalid?: boolean;
}

export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors",
        "placeholder:text-foreground/35 focus:outline-none focus:ring-1",
        invalid
          ? "border-red-300 focus:border-red-400 focus:ring-red-200"
          : "border-border focus:border-accent focus:ring-accent/25",
        className,
      )}
      // 与视觉错误态同步给辅助技术，否则只有视力正常用户能看到红框
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}
