import type { DecisionValues } from "../decisions";

type PlanningPromptProps = {
  values: Pick<DecisionValues, "planningGuide.visible" | "planningGuide.detail">;
  brief: string;
  expanded: string;
};

export function PlanningPrompt({ values, brief, expanded }: PlanningPromptProps) {
  if (!values["planningGuide.visible"]) return null;
  return (
    <span className={`planning-prompt planning-prompt-${values["planningGuide.detail"]}`}>
      <span className="planning-prompt-label">PLAN AHEAD</span>{" "}
      {values["planningGuide.detail"] === "expanded" ? expanded : brief}
    </span>
  );
}
