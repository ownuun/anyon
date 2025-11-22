# Completion Steps
- Run `pnpm run check` (or at least relevant `frontend:check` / `backend:check`), plus `pnpm run frontend:lint` and `pnpm run backend:lint` as applicable.
- Run `cargo test --workspace` when backend logic changes.
- If Rust types changed, run `pnpm run generate-types` (or `generate-types:check`).
- For DB schema changes, ensure migrations are added/applied (`sqlx migrate run`) and `prepare-db` scripts updated if needed.
- Keep formatting (`cargo fmt --all`, frontend format scripts) and ensure no secrets committed.
- Summarize changes and next steps (ports/env vars) for the user; note any tests not run and why.