import { useDecision } from "../decisions/DecisionStore";

type PlanningPromptProps = {
  brief: string;
  expanded: string;
};

export function PlanningPrompt({ brief, expanded }: PlanningPromptProps) {
  const visible = useDecision("planningGuide.visible");
  const detail = useDecision("planningGuide.detail");
  if (!visible) return null;
  return (
    <span className={`planning-prompt planning-prompt-${detail}`}>
      <span className="planning-prompt-label">PLAN AHEAD</span>{" "}
      {detail === "expanded" ? expanded : brief}
    </span>
  );
}
