# Registry over experiment-specific conditionals

The registry separates **who chooses a value** from **how the page renders that value**. An experiment or rule claims decision paths and emits a patch; JSX reads those paths. Avoid writing `if (experimentId === 'arrival-flow')` in every section: that duplicates assignment logic, couples sections to rollout names, and makes cross-section changes hard to audit.

Two registries play different roles:

1. `createDecisionRegistry(experiments, ruleEffects)` in `src/decisions/experiments.ts` validates known page paths, IDs, typed patches and rule trees once, then indexes owners by page and allocation by surface. Experiments on the same surface may share a path if their half-open allocation intervals do not overlap; cross-surface ownership and any rule ownership collision are rejected even for empty patches. `assignPageExperiments` selects at most one slot per surface from its global table before page filtering; `resolveDecisions` also rejects two active writes.
2. `cardRegistry` in `src/pages/destinations/cards.tsx` maps `DecisionValues['destinationCard.layout']` to the actual React component (`image: ImageCard`, `compact: CompactCard`). `DestinationGrid` selects by `useDecision('destinationCard.layout')` and throws for an unknown layout. Both home and index reuse the same grid. `Record<CardLayout, ComponentType<CardProps>>` makes missing component mappings a type error when adding a layout value.

```ts
// The renderer knows the selected value, not which experiment selected it.
const layout = useDecision("destinationCard.layout");
const Card = cardRegistry[layout];
```

Not every conditional needs a registry. Home JSX gates offers using `offers.visible`; `PlanningPrompt` checks visibility and selects brief/expanded copy; `Hero` positions a single search form according to `search.layout`. The rule is **no experiment-ID checks in render sites**, not “replace every boolean with a lookup table.” Reach for a typed component registry when a value selects among interchangeable components with the same props. Keep known sections as ordinary JSX.

To introduce a new card layout, extend the decision value union and default/patch validation as appropriate, add its component to `cardRegistry`, and verify both routes. To introduce a new decision owner, declare its ownership in the engine first; a duplicate claim fails at registration instead of relying on `if/else` ordering. For the complete extension path, see [Experimentation](experimentation.md).
