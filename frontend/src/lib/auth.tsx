"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, AUTH_EXPIRED_EVENT } from "@/lib/api";

// Who is logged in. The session itself is an httpOnly cookie set by the backend,
// so the browser can't read it: we ask GET /api/users/me instead.

export type User = { id: number; name: string; email: string; currency: string };

type Status = "loading" | "authenticated" | "anonymous";

type AuthContext = {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const Context = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<User | null>(null);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    setStatus("authenticated");
  }, []);

  const clear = useCallback(() => {
    setUserState(null);
    setStatus("anonymous");
  }, []);

  // Check the session once when the app opens
  useEffect(() => {
    api<User>("/api/users/me")
      .then(setUser)
      .catch(clear);
  }, [setUser, clear]);

  // Any API call answering 401 means the session expired
  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, clear);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, clear);
  }, [clear]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setUser(data.user);
    },
    [setUser]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const data = await api<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setUser(data.user);
    },
    [setUser]
  );

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      clear();
    }
  }, [clear]);

  return (
    <Context.Provider value={{ status, user, login, register, logout, setUser }}>{children}</Context.Provider>
  );
}

export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
