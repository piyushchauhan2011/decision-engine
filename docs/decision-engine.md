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

`resolveDecisions({ context, assignments })` in `src/decisions/resolve.ts` starts with these defaults and `source: 'default'` provenance per path. It applies patches from assigned experiment variants, then matching rule effects. Each written path records `{ source: 'experiment', id, variant }` or `{ source: 'rule', id }`. Empty control patches leave defaults and default provenance in place. The result also records selected assignments. Unknown IDs/variants and two active writes to the same path throw; there is no priority or last-write-wins merge. Registry order controls reporting, not precedence. Registration rejects overlapping ownership even when control patches are empty; see [Registry over conditionals](registry-pattern.md).

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

`RuleContext` is `{ visitor: { country: 'IN' | 'US' }, flags: { 'seasonal-offers': boolean, 'planning-guide': boolean } }`. URL strings are not passed straight to this engine: `src/page.functions.ts` normalizes/reports invalid values first. Typed in-repo rules are validated at registration and evaluation so malformed runtime input fails clearly rather than being treated as a nonmatch.
