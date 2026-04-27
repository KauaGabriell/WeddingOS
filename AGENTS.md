# AGENTS.md

## Repo Snapshot

- Fase 1 base já existe e é utilizável.
- Monorepo: `npm workspaces`.
- Frontend: `Next.js + TypeScript` em `apps/frontend`.
- Backend: `Fastify + TypeScript` em `apps/api`.
- Qualidade: `Biome` + `commitlint` + `simple-git-hooks`.
- Banco alvo: `PostgreSQL` via Prisma.
- Storage alvo: `S3-compatible` via adapter já iniciado.

## Trusted Commands

- Root:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run format`
  - `npm run format:check`
- API:
  - `npm --workspace @weddingos/api run dev`
  - `npm --workspace @weddingos/api run test`
  - `npm --workspace @weddingos/api run storage:smoke`
- Frontend:
  - `npm --workspace @weddingos/frontend run dev`

## What Is Already Done

- Tasks de foundation já cobertas: `1.1` até `1.10` em nível base.
- Estrutura inicial de apps existe.
- Env examples e documentação de configuração existem.
- Logger estruturado com `x-request-id` já existe na API.
- Adapter de storage S3 já existe na camada `shared/platform`.
- Frontend tem shell inicial e design-system mínimo.

## Source of Truth Order

- Primeiro: código executável, scripts, manifests e configs atuais.
- Depois: docs de arquitetura:
  - `docs/adr/adr-0001-fastify-modular-monolith-weddingos-core-architecture.md`
  - `docs/architecture/Project_Architecture_Blueprint.md`
  - `docs/architecture/weddingos-erd.md`
- PRD/tasks/requirements guiam intenção e escopo, não provam implementação.

## Phase 2 Focus

- Assuma que próximo passo é arquitetura real do backend, não mais foundation.
- Prioridade natural: tasks `2.x`, começando por estrutura modular e contratos de domínio.
- Preserve fronteiras planejadas:
  - `identity-access`
  - `guests-rsvp`
  - `gift-registry`
  - `photo-wall`
  - `admin-backoffice`
  - `shared/platform`
- Toda feature nova deve entrar no módulo dono; evitar jogar regra em `main.ts`.

## Guardrails

- Não afirmar feature pronta só porque está no PRD/docs.
- Não remover `docs` do `.gitignore`. Se algum doc precisar versionamento, usar allowlist explícita.
- Não mexer em código gerado de Prisma manualmente.
- Manter `shared/platform` para concerns transversais como storage, logging, request context e futuras integrações.
- Em backend, preferir separação desde cedo entre:
  - `routes/controllers`
  - `application`
  - `domain`
  - `infrastructure`
  - `contracts`
- Em frontend, manter abordagem `mobile-first` e estado cliente mínimo.

## Current Caveats

- Frontend ainda é base inicial, sem fluxos de produto reais.
- Backend ainda é foundation, sem módulos de negócio `2.x` implementados.
- Testes existem só para foundation da API; cobertura de domínio ainda não existe.
