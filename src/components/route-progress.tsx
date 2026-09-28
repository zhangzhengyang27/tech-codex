'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

/** 全局路由切换进度条（nprogress，App Router 版）。
 *  App Router 软导航底层走 history.pushState/replaceState，这里打补丁捕获「导航开始」；
 *  路由参数变化即视为导航完成。同一地址的 pushState（滚动恢复等）不触发，
 *  并带 10s 兜底强制收尾，防止导航被取消时进度条卡死。 */

let safetyTimer: ReturnType<typeof setTimeout> | null = null;

/** 归一化后比较，排除同地址操作；url 可能是相对路径，需基于当前地址解析 */
function isRealNavigation(url: unknown): boolean {
  if (typeof url !== 'string' || url === '') return false;
  try {
    return new URL(url, window.location.href).href !== window.location.href;
  } catch {
    return false;
  }
}

function begin() {
  if (NProgress.isStarted()) return;
  NProgress.start();
  if (safetyTimer) clearTimeout(safetyTimer);
  safetyTimer = setTimeout(() => NProgress.done(), 10_000);
}

function finish() {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
  NProgress.done();
}

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 路由参数变化 = 导航完成（含仅查询参数变化的导航）
  useEffect(() => {
    finish();
  }, [pathname, searchParams]);

  useEffect(() => {
    NProgress.configure({ showSpinner: false, minimum: 0.2, trickleSpeed: 120 });
    const history = window.history;
    const rawPush = history.pushState.bind(history);
    const rawReplace = history.replaceState.bind(history);

    history.pushState = function (state, unused, url, ...rest) {
      const nav = isRealNavigation(url);
      const result = rawPush(state, unused, url, ...rest);
      if (nav) begin();
      return result;
    };
    history.replaceState = function (state, unused, url, ...rest) {
      const nav = isRealNavigation(url);
      const result = rawReplace(state, unused, url, ...rest);
      if (nav) begin();
      return result;
    };
    window.addEventListener('popstate', begin);
    return () => {
      history.pushState = rawPush;
      history.replaceState = rawReplace;
      window.removeEventListener('popstate', begin);
      finish();
    };
  }, []);

  return null;
}
