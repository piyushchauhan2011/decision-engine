# Experimentation and inspector

For an end-to-end feature that also needs data, rules, and components, start with the [feature delivery workflow](feature-workflow.md).

`src/decisions/experiments.ts` declares experiments as `{ id, surface, enabled, allocation, eligibleWhen?, owns, variants: { control, treatment } }`. Variants are partial patches; the current controls are empty and preserve the defaults. Each current experiment has its own enabled, full-range `[0, 10000]` surface:

| Experiment              | Owned paths                                              | Treatment                    |
| ----------------------- | -------------------------------------------------------- | ---------------------------- |
| `arrival-flow`          | `hero.layout`, `search.layout`, `destinationCard.layout` | `split`, `inline`, `compact` |
| `destination-density`   | `destinations.columns`                                   | `two`                        |
| `planning-guide-detail` | `planningGuide.detail`                                   | `expanded`                   |

An HTTP-only `visitorId` UUID cookie makes `auto` assignments stable across reload and navigation when cookies are accepted. A surface bucket hashes `${visitorId}:surface:${surface}` with FNV-1a modulo 10000; one experiment owns each half-open interval, and gaps, disabled experiments, or failed eligibility remain unassigned. The chosen experiment's control/treatment split hashes `${visitorId}:${experimentId}` modulo 100, with values below 50 selecting control. Shared surfaces have mutually exclusive, non-overlapping intervals; adding an experiment into unused slots does not shift existing slots. Production signs the cookie with HMAC-SHA256 to prevent supplying a chosen UUID, but deleting cookies can still resample. This is deterministic assignment, **not** tracking, exposure logging, or a remote flag service. With cookies disabled, a new ID may be generated on each request. SSR and hydration consume the same loader snapshot within each response.

## Try the behavior

Run the app per [Quick start](quick-start.md), then visit:

```text
/?exp.arrival-flow=control&exp.destination-density=control&country=US&offers=off
```

Open the bottom-right inspector. Switch both experiments to treatment: hero/search switch to split/inline, cards become compact on both pages, and both destination grids use two columns. The resolved-decision panel shows the owning experiment and treatment variant per changed path. Set country `IN` and offers `on` to display seasonal copy with rule provenance; switching either one off hides it. Set `guide=on` to show planning cues across home and index; force `planning-guide-detail=treatment` to expand them. With `guide=off`, expanded detail can still be assigned but is not visible.

Supported local-development overrides are `exp.arrival-flow`, `exp.destination-density`, `exp.planning-guide-detail` (`auto`, `control`, `treatment`), `country` (`US`, `IN`), `offers` and `guide` (`on`, `off`). Removing a parameter (or selecting Auto) restores cookie-based assignment or default context. Preview can force an enabled, eligible experiment outside its slot; competing forced IDs on one surface choose the lexicographically first ID and report the rest as ignored. The inspector shows selected assignments or “Not assigned on this page”, each resolved value and provenance; its experiment-ID filter is only for navigating controls. Invalid strings are ignored by the resolver and listed in the inspector. Search, links, and the destination form preserve recognized inspector query strings in development and preserve the current destination while changing controls. A malformed or unknown destination slug shows a clear-filter action rather than a server-function validation error.

## Adding an experiment

1. Decide which page decision paths the experiment owns. Add an entry to `experiments` with a unique ID, nonempty surface, enabled state, half-open basis-point allocation, declared ownership, and both variants (an empty control is fine). Same-surface experiments may own the same path only with disjoint slots; rules cannot share experiment-owned paths.
2. If it needs a **new path**, update `DecisionValues`/`decisionDefaults`, `decisionPagePaths`, patch-value validation in `experiments.ts`, provenance initialization in `resolve.ts`, and the consuming JSX/CSS. Registered experiment IDs automatically become recognized override keys.
3. Use `useDecision(path)` at render sites. Do not branch on an experiment ID: unrelated experiments or rules should be able to select the same UI variant only after ownership is deliberately redesigned.
4. Exercise control, treatment, unknown overrides, ownership conflicts, SSR, and client navigation. Tests for the pure engine are in `tests/decisions.test.ts`; browser flows are in `tests/e2e/decisions.spec.ts`.

This inspector exists only in development. Production ignores URL overrides even in direct server-function submissions; server-configured flags default off and country remains `US` until a trusted geography source is available.
