import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { DecisionValues } from "./types";

const DecisionContext = createContext<StoreApi<DecisionValues> | null>(null);

export function DecisionProvider({
  values,
  children,
}: {
  values: DecisionValues;
  children: ReactNode;
}) {
  const store = useMemo(() => createStore<DecisionValues>(() => values), [values]);
  return <DecisionContext.Provider value={store}>{children}</DecisionContext.Provider>;
}

export function useDecision<K extends keyof DecisionValues>(path: K): DecisionValues[K] {
  const store = useContext(DecisionContext);
  if (!store) throw new Error("useDecision requires a DecisionProvider");
  return useStore(store, (values) => values[path]);
}
