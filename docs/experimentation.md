# Experimentation and inspector

`src/decisions/experiments.ts` declares experiments as `{ id, owns, variants: { control, treatment } }`. Variants are partial patches; the current controls are empty and preserve the defaults:

| Experiment              | Owned paths                                              | Treatment                    |
| ----------------------- | -------------------------------------------------------- | ---------------------------- |
| `arrival-flow`          | `hero.layout`, `search.layout`, `destinationCard.layout` | `split`, `inline`, `compact` |
| `destination-density`   | `destinations.columns`                                   | `two`                        |
| `planning-guide-detail` | `planningGuide.detail`                                   | `expanded`                   |

An HTTP-only `visitorId` UUID cookie makes `auto` assignments stable across reload and navigation when cookies are accepted. `src/decisions/bucketing.ts` hashes `${visitorId}:${experimentId}` with 32-bit FNV-1a over UTF-16 code units; unsigned hash `% 100` below 50 selects control, otherwise treatment. This is deterministic assignment, **not** tracking, exposure logging, or a remote flag service. With cookies disabled, a new ID may be generated on each request. SSR and hydration still consume the same loader result within each response.

## Try the behavior

Run the app per [Quick start](quick-start.md), then visit:

```text
/?exp.arrival-flow=control&exp.destination-density=control&country=US&offers=off
```

Open the bottom-right inspector. Switch both experiments to treatment: hero/search switch to split/inline, cards become compact on both pages, and both destination grids use two columns. The resolved-decision panel shows the owning experiment and treatment variant per changed path. Set country `IN` and offers `on` to display seasonal copy with rule provenance; switching either one off hides it. Set `guide=on` to show planning cues across home and index; force `planning-guide-detail=treatment` to expand them. With `guide=off`, expanded detail can still be assigned but is not visible.

Supported overrides are `exp.arrival-flow`, `exp.destination-density`, `exp.planning-guide-detail` (`auto`, `control`, `treatment`), `country` (`US`, `IN`), `offers` and `guide` (`on`, `off`). Removing a parameter (or selecting Auto) restores cookie-based assignment or default context. The inspector shows the selected assignments, each resolved value and provenance; its experiment-ID filter is only for navigating controls. Invalid strings are ignored by the resolver and listed in the inspector. Search, links, and the destination form preserve valid or invalid inspector query strings and preserve the current destination while changing controls. A malformed or unknown destination slug shows a clear-filter action rather than a server-function validation error.

## Adding an experiment

1. Decide which existing decision paths the experiment owns. Add an entry to `experiments` with a unique ID, declared ownership, and both variants (an empty control is fine).
2. If it needs a **new path**, update `DecisionValues`/`decisionDefaults`, patch-value validation in `experiments.ts`, provenance initialization in `resolve.ts`, and the consuming JSX/CSS. Add the override key to `src/search.ts` and `src/page.functions.ts` for inspector/URL control. These changes keep the new path typed and validated end to end.
3. Use `useDecision(path)` at render sites. Do not branch on an experiment ID: unrelated experiments or rules should be able to select the same UI variant only after ownership is deliberately redesigned.
4. Exercise control, treatment, unknown overrides, ownership conflicts, SSR, and client navigation. Tests for the pure engine are in `tests/decisions.test.ts`; browser flows are in `tests/e2e/decisions.spec.ts`.

This local inspector is a development demonstration, not a production experimentation platform.
