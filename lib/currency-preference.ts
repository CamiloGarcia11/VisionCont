"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "gestion_preferred_currency";
const EVENT_NAME = "gestion-currency-change";

export function getPreferredCurrency(): string {
  if (typeof window === "undefined") return "COP";
  return window.localStorage.getItem(STORAGE_KEY) || "COP";
}

export function setPreferredCurrency(currency: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, currency);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: currency }));
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(EVENT_NAME, callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(EVENT_NAME, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

export function usePreferredCurrency(): [string, (c: string) => void] {
  const currency = useSyncExternalStore(
    subscribe,
    getPreferredCurrency,
    () => "COP"
  );

  const update = useCallback((next: string) => {
    setPreferredCurrency(next);
  }, []);

  return [currency, update];
}
