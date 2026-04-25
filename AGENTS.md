<!-- unforget: auto-generated - do not edit this block manually -->
## Project Context

**Project:** MyLake - production-like personal lakehouse platform for Kubernetes/k3s.

**Stack:** PostgreSQL 16+, RustFS, DuckLake, DuckDB, Apache Spark, Go, Gin or Echo, pgx, client-go, React, TailwindCSS, Monaco Editor, JupyterHub, Docker Compose (local dev), Kubernetes/k3s (production).

**Key rules:**
- Use PostgreSQL schemas `auth_mgmt` for users/RBAC/sessions/Spark metadata and `ducklake_catalog` for DuckLake metadata.
- Local dev uses `docker-compose.yml` (postgres + rustfs). Helm charts were removed.
- Implementation plans in `docs/superpowers/plans` require `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Commands:**
- `docker compose up -d` - start local postgres + rustfs.
- `docker compose exec postgres psql -U admin -d mylake -c "\dn"` - verify schemas.
- `docker compose ps` - check container health.

## Last Session
_2026-04-25 - Completed infra foundation, started frontend brainstorm._
- Installed Docker, created `docker-compose.yml` for postgres + rustfs local dev.
- Verified deployment: `ducklake_catalog` + `auth_mgmt` schemas confirmed, rustfs running on port 9000.
- Merged `feat/infra-foundation` → `master`, removed helm charts (user preference: docker-compose only).
- Added `scripts/init-schemas.sql` and `scripts/install-k8s-tools.sh`.
- Started frontend brainstorm — no backend built yet; next question: build Go backend + frontend together or stub backend first?

## Docs
- `docs/superpowers/specs/2026-04-24-mylake-design.md` - Full MyLake architecture spec (Go backend, React frontend, DuckLake, Spark, JupyterHub).
- `docs/superpowers/plans/2026-04-24-infrastructure-foundation.md` - Completed infra plan (postgres + rustfs).
<!-- /unforget -->
