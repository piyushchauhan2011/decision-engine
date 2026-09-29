# Elsewhere — hotel page decisions demo

TanStack Start SSR demo: a local SQLite hotel catalog with decisions resolved before rendering. No .NET app or external database required.

```sh
pnpm install
pnpm db:setup
pnpm dev --host 127.0.0.1
```

Open <http://127.0.0.1:3000/>. Requires Node.js 20.19.x or >=22.12 and pnpm.

## Documentation

- [Quick start, database setup, and checks](docs/quick-start.md)
- [Application architecture and data flow](docs/architecture.md)
- [Decision and rule engine](docs/decision-engine.md)
- [Experiments, overrides, and inspector](docs/experimentation.md)
- [Registries instead of experiment-specific conditionals](docs/registry-pattern.md)
