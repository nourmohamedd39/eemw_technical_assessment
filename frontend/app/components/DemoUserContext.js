"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const DemoUserContext = createContext(null);
const STORAGE_KEY = "unpile-demo-user-id";

export function DemoUserProvider({ children }) {
  const [demoUserId, setDemoUserId] = useState("1");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedUserId = window.localStorage.getItem(STORAGE_KEY);
    if (storedUserId) setDemoUserId(storedUserId);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, String(demoUserId));
  }, [demoUserId, hydrated]);

  const value = useMemo(() => ({ demoUserId, setDemoUserId }), [demoUserId]);
  return <DemoUserContext.Provider value={value}>{children}</DemoUserContext.Provider>;
}

export function useDemoUser() {
  const context = useContext(DemoUserContext);
  if (!context) throw new Error("useDemoUser must be used inside DemoUserProvider");
  return context;
}
