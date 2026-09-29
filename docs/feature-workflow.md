# From feature request to experiment

This is the workflow for a feature that needs catalog data, new UI, eligibility rules, and an experiment. **Example (not implemented):** add a destination arrival tip. It has new `arrivalTip` data, a rule-gated `arrivalTip.visible` path, and an `arrival-tip-detail` experiment that selects `arrivalTip.layout: 'brief' | 'detailed'` when the tip is visible. The gate and the experiment own **different paths**; a rule and an experiment cannot both claim `arrivalTip.visible`.

## 1. Write the contract before components

Agree on the data source, routes/sections, eligibility, default, and variants. For this example:

| Question        | Decision                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------- |
| Data            | An editorial arrival tip on each destination; use actual stored text, not invented JSX copy |
| Placement       | Destination cards on home and index; filtered index shows the same tip                      |
| Rule            | Only show when a new `arrival-tips` flag is on **and** the visitor country is `IN`          |
| Default/control | Tip hidden by default; if eligible, render the brief layout                                 |
| Treatment       | If eligible, render the detailed layout                                                     |
| Owners          | Rule owns `arrivalTip.visible`; experiment owns `arrivalTip.layout`                         |

A decision path expresses a UI outcome, not an experiment name. In particular, `arrivalTip.layout` may resolve to `detailed` while the gate is off: the layout assignment exists, but the feature stays hidden. Record what happens with missing data before writing UI: make it required and backfill it, or explicitly define a real nullable/empty state; do not silently manufacture catalog facts.

## 2. Land data and its server contract

For new persisted fields, change `src/db/schema.ts`, generate a checked-in migration with `pnpm db:generate`, and migrate with `pnpm db:migrate`. Backfill existing SQLite files before adding a required column; a seed alone is not a migration for already-deployed rows. Add sample content to `scripts/seed-data.ts` and explicit upsert columns in `scripts/seed.ts`, keeping unrelated rows. Update only the relevant select projections in `src/db/catalog.server.ts`; queries currently return six sorted destinations on home, all seven on the index, and three hotels selected by fixed IDs. Change these constraints only if the feature calls for it. Extend `src/catalog.functions.ts` only if another validated server-function input or query is needed. Keep `better-sqlite3` access server-side; routes consume serializable loader data, never a client-side database import.

If data already exists in the catalog, reuse it instead of adding a table. Run `pnpm db:setup` against the intended `DB_FILE_NAME`, then check the rendered data on both routes and a filtered destination. Missing/unseeded data should continue to fail clearly, not fall back to fabricated content.

## 3. Define and register the decisions

Add `arrivalTip.visible: boolean` (default `false`) and `arrivalTip.layout: 'brief' | 'detailed'` (default `brief`) to `DecisionValues`, `decisionDefaults`, and the relevant `decisionPagePaths` in `src/decisions/types.ts`. Extend allowed patch values and register `arrival-tip-detail` with a distinct surface, `enabled: true`, an explicit `[0, 10000]` allocation, `owns: ['arrivalTip.layout']`, empty control, and treatment patch `{ 'arrivalTip.layout': 'detailed' }`. Add default provenance entries for both paths in `src/decisions/resolve.ts`.

In `src/decisions/rules.ts`, add the `arrival-tips` flag to `RuleContext`, accepted flag names and context validation; define a rule effect that owns only `arrivalTip.visible`, uses `all(flag('arrival-tips'), eq('visitor.country', 'IN'))`, and patches visibility to `true`. Reuse the existing typed operators; do not interpolate URLs into executable rule expressions. `createDecisionRegistry` checks unique IDs, declared path ownership, valid patch values, and overlaps even for empty control variants. `resolveDecisions` rejects conflicting active writes and records the source of each applied path; do not add a last-write-wins priority.

## 4. Carry inputs through the server and the URL

For a locally controllable demo, add the new flag to `RuleContext`, `src/search.ts`, `src/page.functions.ts` and `src/decisions/request.server.ts`. Registered experiment IDs already drive URL allowlisting and server override keys, so `exp.arrival-tip-detail` requires no separate enumeration. Update `src/inspector/Inspector.tsx` for a new flag control; experiment controls already read the registry. Route `loaderDeps` must include relevant fields so changing a control recalculates decisions in development. Production ignores public controls: enable trusted flags via validated server configuration rather than URL fields. Preserve destination filtering through links and forms.

The page server function assigns by visitor cookie and resolves decisions before the route loader returns. Do not bucket, query the DB, or recompute decisions inside React/localStorage: initial SSR and hydration must use the same result. Personalized HTML uses `Cache-Control: private, no-cache` to require revalidation on normal HTTP reuse without blocking the back/forward cache.

## 5. Build the UI from values, not rollout IDs

Make a shared arrival-tip component in `src/pages/` that receives real catalog content and reads `useDecision('arrivalTip.layout')`. If it is a whole page section, render it directly in the page's JSX using a `useDecision('arrivalTip.visible')` condition; if it belongs inside cards, read `arrivalTip.visible` there instead. If brief/detailed require different component trees with the same props, use a typed `Record<Layout, ComponentType<Props>>` registry like `cardRegistry` in `src/pages/destinations/cards.tsx`; a small copy choice needs only a value-based conditional. Never check the experiment ID at render sites. Check both card layouts and both column settings; a cross-section feature should not appear on only one route by accident. See [Page composition](page-composition.md).

## 6. Verify the matrix, then decide whether to launch

- Engine tests (`tests/decisions.test.ts`): gate on/off and country match/nonmatch, control/treatment, default and rule/experiment provenance, unknown inputs, and duplicate/overlapping ownership.
- Data test (`tests/catalog.test.ts`): migrate/seed a temporary SQLite file, verify the new projection and filtered/unfiltered queries; do not depend on `local.db` in unit tests.
- Browser flow (`tests/e2e/decisions.spec.ts`): force both variants with eligible and ineligible rules, visit home/index/filtered index, navigate and reload with auto assignment, inspect provenance, confirm only one server-rendered variant appears and no hydration errors. Check narrow screens and behavior with JavaScript disabled.
- Run `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` after `pnpm db:setup` (Playwright uses the seeded default `local.db`), plus `pnpm lint` and `pnpm format:check`. For page or asset changes, run `pnpm perf:audit` before and after using the same desktop preset and compare saved reports; performance scores are measurements, not a correctness gate. See [Quick start](quick-start.md) for prerequisites and commands.

**Launch boundary:** code-defined basis-point slots and the restart-applied `DECISION_DISABLED_EXPERIMENTS` emergency stop support a controlled server-side rollout; `enabled: false` is the code-defined stop. Production signs visitor cookies, ignores public preview input and omits the inspector. This repository does **not** provide remote configuration, staff authentication, durable identity, trusted geography, exposure/metric logging, or monitoring. Establish those separately before relying on country targeting or performance claims. After a decision, promote the chosen behavior to the default (if retained), remove obsolete variants/owners and URL controls, and update tests.

See [Decision and rule engine](decision-engine.md), [Experimentation](experimentation.md), and [Registry over conditionals](registry-pattern.md) for the underlying contracts.
