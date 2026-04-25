<!-- unforget: auto-generated - do not edit this block manually -->
## Project Context

**Project:** MyLake - production-like personal lakehouse platform for Kubernetes/k3s.

**Stack:** Kubernetes/k3s, Helm v3, PostgreSQL 16+, RustFS, DuckLake, DuckDB, Apache Spark, Go, Gin or Echo, pgx, client-go, React, TailwindCSS, Monaco Editor, JupyterHub.

**Key rules:**
- Use PostgreSQL schemas `auth_mgmt` for users/RBAC/sessions/Spark metadata and `ducklake_catalog` for DuckLake metadata.
- Deploy foundation infrastructure as Helm chart `deploy/helm/mylake-base` in namespace `mylake`.
- Model RustFS and PostgreSQL as StatefulSets with PVC-backed storage.
- Implementation plans in `docs/superpowers/plans` require `superpowers:subagent-driven-development` or `superpowers:executing-plans`.

**Commands:**
- `helm lint deploy/helm/mylake-base` - validate the base Helm chart.
- `helm upgrade --install mylake-base ./deploy/helm/mylake-base --create-namespace` - install foundation stack.
- `kubectl exec -n mylake -it statefulset/postgres -- psql -U admin -d mylake -c "\dn"` - verify schemas.
- `kubectl get pods -n mylake -l app=rustfs` - verify RustFS pod health.

## Last Session
_2026-04-25 - Synced project docs and installed/unforget context tooling._
- Read the MyLake superpower spec and infrastructure implementation plan.
- Fixed schema mismatch by updating the infrastructure plan from `ducklake`/`platform` to `ducklake_catalog`/`auth_mgmt`.
- Installed the Claude `unforget` skill into Codex via `~/.codex/skills/unforget` symlink.
- Created assistant instruction files with this managed context block.
- `docs/` was observed as untracked in git during the session.

## Docs
- `docs/superpowers/specs/2026-04-24-mylake-design.md` - Draft architecture for the full MyLake lakehouse platform.
- `docs/superpowers/plans/2026-04-24-infrastructure-foundation.md` - Helm implementation plan for PostgreSQL and RustFS foundation infrastructure.
<!-- /unforget -->
