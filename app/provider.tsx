"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

function Provider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();

  // Service worker: production only. In dev, wipe any old one + its caches.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
      caches?.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }, []);

  // Sync the Clerk user into your DB once signed in.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/user", { method: "POST" }).catch((error) => {
      console.error("Failed to create user", error);
    });
  }, [isLoaded, isSignedIn]);

  return <>{children}</>;
}

export default Provider;