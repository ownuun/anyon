# Style & Conventions
- Rust: `rustfmt` enforced (`rustfmt.toml`); group imports by crate; snake_case modules, PascalCase types; keep functions small; derive `Debug`/`Serialize`/`Deserialize` where helpful.
- TypeScript/React: ESLint + Prettier (2 spaces, single quotes, ~80 cols); PascalCase components, camelCase vars/funcs, prefer kebab-case filenames when practical. Use Tailwind + shadcn/ui patterns.
- Shared types: never edit `shared/types.ts` directly; change Rust definitions (e.g., `crates/server/src/bin/generate_types.rs`) and regenerate.
- Testing: Rust unit tests colocated with code; frontend uses type/lint checks, add lightweight Vitest when adding runtime logic.
- Security/config: keep secrets out of repo; use `.env` overrides.