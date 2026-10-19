/* eslint-disable react-refresh/only-export-components -- context module exports its provider, hook and helper together */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { tokenStore, setUnauthorizedHandler } from "../lib/api";

const AuthContext = createContext(null);

/** Where a signed-in user belongs. */
export function homeFor(session) {
  const u = session?.user;
  if (!u) return "/login";
  if (u.role === "admin") return "/admin";
  if (u.role === "ambassador") return "/ambassador";
  if (u.role === "owner" && !u.onboardingCompleted) return "/onboarding";
  return "/app";
}

export function AuthProvider({ children }) {
  // session = { user, business, ambassador } | null
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));
  const [bootError, setBootError] = useState("");

  const applySession = useCallback((data) => {
    if (data?.token) tokenStore.set(data.token);
    setSession({ user: data.user, business: data.business || null, ambassador: data.ambassador || null });
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    applySession(data);
    return data;
  }, [applySession]);

  useEffect(() => {
    setUnauthorizedHandler(() => setSession(null));
    if (!tokenStore.get()) return;
    let alive = true;
    api
      .get("/auth/me")
      .then(({ data }) => alive && applySession(data))
      .catch((e) => {
        if (!alive) return;
        if (e.response?.status === 401 || e.response?.status === 403) tokenStore.clear();
        else setBootError("Could not reach the Bizula server to restore your session.");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [applySession]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    applySession(data);
    return data;
  }, [applySession]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    applySession(data);
    return data;
  }, [applySession]);

  const logout = useCallback(() => {
    tokenStore.clear();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, user: session?.user || null, loading, bootError, login, register, logout, refresh, applySession }),
    [session, loading, bootError, login, register, logout, refresh, applySession]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
