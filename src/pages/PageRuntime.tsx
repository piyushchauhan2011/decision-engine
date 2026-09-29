import type { ReactNode } from "react";
import type { DecisionResult } from "../decisions";
import { DecisionProvider } from "../decisions/DecisionStore";
import { Inspector } from "../inspector/Inspector";
import type { PageSearch } from "../search";

export function PageRuntime({
  decisions,
  search,
  children,
}: {
  decisions: DecisionResult & { ignored: Record<string, string> };
  search: PageSearch;
  children: ReactNode;
}) {
  return (
    <>
      <DecisionProvider values={decisions.values}>{children}</DecisionProvider>
      {import.meta.env.DEV && <Inspector result={decisions} search={search} />}
    </>
  );
}
