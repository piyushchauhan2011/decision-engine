# Decision and rule engine

`src/decisions/` is pure TypeScript. It takes a typed rule context and explicit experiment assignments, then resolves one immutable-for-render snapshot before JSX runs. Rendering reads the resolved **decision paths**, never re-evaluates rules or chooses assignments in a component.

## Values and resolution

`src/decisions/types.ts` defines every allowed path and its default:

| Path                     | Default     | Other value | Effect                               |
| ------------------------ | ----------- | ----------- | ------------------------------------ |
| `hero.layout`            | `immersive` | `split`     | Home hero                            |
| `search.layout`          | `overlay`   | `inline`    | Home search placement                |
| `destinationCard.layout` | `image`     | `compact`   | Cards on both routes                 |
| `destinations.columns`   | `three`     | `two`       | Grids on both routes                 |
| `offers.visible`         | `false`     | `true`      | Home seasonal invitation             |
| `planningGuide.visible`  | `false`     | `true`      | Planning cues in home/index sections |
| `planningGuide.detail`   | `brief`     | `expanded`  | Planning cue copy                    |

`resolveDecisions({ page, context, assignments })` in `src/decisions/resolve.ts` starts with all seven defaults and `source: 'default'` provenance per path, while evaluating only owners indexed for that page. It applies patches from assigned experiment variants, then matching rule effects. Each written path records `{ source: 'experiment', id, variant }` or `{ source: 'rule', id }`. Empty control patches leave defaults and default provenance in place. The result records only selected page-relevant assignments. Unknown IDs/variants, disabled/ineligible/irrelevant assignments, multiple assignments on a surface, and two active writes to one path throw. Registration allows shared paths only between experiments on the same surface with disjoint allocation ranges; cross-surface and rule ownership conflicts are rejected.

## Rule engine

`src/decisions/rules.ts` represents predicates as typed data nodes: `all`, `any`, `not`, `eq` (`visitor.country` against `IN` or `US`), and `flag` (`seasonal-offers` or `planning-guide`). `eq` calls a named operator in `ruleOperators`; rules do **not** evaluate arbitrary expressions or JavaScript strings. Validation traverses the entire rule tree before evaluation (including branches that might short-circuit), rejecting unknown nodes, fields, flags, and invalid context.

```ts
{
  type: "all",
  rules: [
    { type: "flag", name: "seasonal-offers" },
    { type: "eq", field: "visitor.country", value: "IN" },
  ],
}
```

The `india-seasonal-offers` effect owns `offers.visible` and patches it to `true` only if **both** conditions above hold; otherwise the default is `false`. The `planning-guide-flag` effect owns `planningGuide.visible` and patches it to `true` when the flag is on. The `planning-guide-detail` experiment independently owns the cue copy: treatment may select expanded detail while the visibility flag still keeps cues hidden.

`RuleContext` is `{ visitor: { country: 'IN' | 'US' }, flags: { 'seasonal-offers': boolean, 'planning-guide': boolean } }`. URL strings are not passed straight to this engine: `src/decisions/request.server.ts` normalizes/reports invalid development values first, while production uses trusted configuration only. Rule trees and patch types are validated once at registration; public `evaluateRule` validates arbitrary input trees on each call. The page resolver validates context once and evaluates registered rule trees without repeated validation.
