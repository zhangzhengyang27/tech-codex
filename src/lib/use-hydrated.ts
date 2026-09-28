"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * 客户端 hydration 探测：SSR 渲染期间恒为 false，hydration 完成后为 true。
 * 替代 `useState(false) + useEffect(() => setState(true))` 写法（effect 内同步 setState
 * 会被 react-hooks/set-state-in-effect 规则拦截，且首帧多一次级联渲染）。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
