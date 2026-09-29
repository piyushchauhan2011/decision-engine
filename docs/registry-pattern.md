# Registry over experiment-specific conditionals

The registry separates **who chooses a value** from **how the page renders that value**. An experiment or rule claims decision paths and emits a patch; JSX reads those paths. Avoid writing `if (experimentId === 'arrival-flow')` in every section: that duplicates assignment logic, couples sections to rollout names, and makes cross-section changes hard to audit.

Three registries play different roles:

1. `createDecisionRegistry(experiments, ruleEffects)` in `src/decisions/experiments.ts` checks configuration. Each owner declares `owns`; both variant patches and rule patches must use known paths, valid values, and only paths they own. Registration rejects duplicate IDs, duplicate/overlapping ownership across experiments and rules, and malformed rules. Conflicts name the path and owners. Even an empty control cannot reserve a path claimed by another owner. `resolveDecisions` also rejects two active writes, so no order-dependent override silently wins.
2. `blockRegistry` in `src/pages/blocks.tsx` maps page block names to typed React sections. Routes and pages build ordered `PageBlock[]` arrays; `PageZone` renders them and can gate a block on a boolean decision path. The layout is code, not a remote or admin-managed schema; see [Page composition](page-composition.md).
3. `cardRegistry` in `src/pages/destinations/cards.tsx` maps `DecisionValues['destinationCard.layout']` to the actual React component (`image: ImageCard`, `compact: CompactCard`). `DestinationGrid` selects by `useDecision('destinationCard.layout')` and throws for an unknown layout. Both home and index reuse the same grid. `Record<CardLayout, ComponentType<CardProps>>` makes missing component mappings a type error when adding a layout value.

```ts
// The renderer knows the selected value, not which experiment selected it.
const layout = useDecision("destinationCard.layout");
const Card = cardRegistry[layout];
```

Not every conditional needs a registry. `PageZone` gates offers using `offers.visible`; `PlanningPrompt` checks visibility and selects brief/expanded copy; `Hero` positions a single search form according to `search.layout`. The rule is **no experiment-ID checks in render sites**, not “replace every boolean with a lookup table.” Reach for a typed component registry when a value selects among interchangeable components with the same props. Keep known sections as ordinary JSX within block components.

To introduce a new card layout, extend the decision value union and default/patch validation as appropriate, add its component to `cardRegistry`, and verify both routes. To introduce a new decision owner, declare its ownership in the engine first; a duplicate claim fails at registration instead of relying on `if/else` ordering. For the complete extension path, see [Experimentation](experimentation.md).
