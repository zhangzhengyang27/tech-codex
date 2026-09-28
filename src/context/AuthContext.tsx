"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import type { AuthResponse } from "@/lib/auth";
import { getToken, getUser, setSession, clearSession, TOKEN_KEY, USER_KEY } from "@/lib/auth";

interface AuthContextValue {
  user: AuthResponse | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  libraryId: string | null;
  setAuth: (res: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* 模块级缓存，避免 useSyncExternalStore 每次返回新对象导致无限重渲染 */
let cachedUser: AuthResponse | null | undefined;
function snapshotUser(): AuthResponse | null {
  if (cachedUser === undefined) cachedUser = getUser();
  return cachedUser;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // 多标签页同步：其他标签页登录/登出时，清空缓存并触发本页重渲染。
  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY || e.key === USER_KEY || e.key === null) {
      cachedUser = undefined;
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore + getServerSnapshot 返回 null，规避 SSR 水合不一致与
  // "setState in effect" 级联渲染问题。登录态变化经由 setAuth/logout 手动更新缓存。
  const user = useSyncExternalStore(
    subscribe,
    snapshotUser,
    () => null,
  );

  const setAuth = useCallback((res: AuthResponse) => {
    setSession(res);
    cachedUser = res;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    cachedUser = null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoggedIn: !!user && !!getToken(),
      isAdmin: user?.role === "ADMIN",
      libraryId: user?.libraryId ?? null,
      setAuth,
      logout,
    }),
    [user, setAuth, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return ctx;
}
