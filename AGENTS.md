# AGENTS.md

## Current Repo Reality (read this first)

- This repository is currently docs-first and not runnable yet.
- There is no verified root runtime config yet (`package.json`, lockfile, workspace config, CI workflow, or README are absent at root).
- `apps/api` and `apps/frontend` directories exist but are currently empty.

## Source-of-Truth Order

- Prefer executable config and scripts when they exist.
- Until then, use architecture decisions from:
  - `docs/adr/adr-0001-fastify-modular-monolith-weddingos-core-architecture.md`
  - `docs/architecture/Project_Architecture_Blueprint.md`
- Use product/planning docs as intent, not implementation proof:
  - `docs/prd/weddingos-prd.md`
  - `docs/requirements/weddingos-requirements-matrix.md`
  - `docs/tasks/weddingos-phase-tables-and-day-plan.md`
- Treat `.tmp_weddingos_plan.json` as generated/planning artifact, not operational source of truth.

## Architecture Intent (verified from docs)

- Frontend target: Next.js + TypeScript (`apps/frontend`).
- Backend target: Fastify + TypeScript modular monolith (`apps/api`).
- Planned backend module boundaries:
  - `identity-access`
  - `guests-rsvp`
  - `gift-registry`
  - `photo-wall`
  - `admin-backoffice`
  - `shared/platform`

## Agent Guardrails for This Repo

- Do not assume dev/build/test/lint commands until manifests and scripts are added.
- Do not claim features are implemented based only on PRD/task docs.
- Never remove `docs` from `.gitignore`. If some doc file must be versioned, use explicit allowlist entries instead of unignoring the whole `docs` tree.
- For new implementation work, start with phase 1 foundations:
  - Task `1.1`: initial repo/app structure
  - Task `1.2`: monorepo + TypeScript + root scripts (`dev`, `build`, `lint`, `test`)
