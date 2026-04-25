<!-- unforget: auto-generated - do not edit this block manually -->
## Project Context

**Project:** MyLake - Personal lakehouse platform for local development.

**Stack:** PostgreSQL 16+, RustFS, DuckDB, Go (Gin/Echo), React, TailwindCSS, Monaco Editor, Docker Compose.

**Key rules:**
- PostgreSQL schemas: `auth_mgmt` for auth/users y `ducklake_catalog` para metadata.
- Docker Compose para desarrollo local (sin Kubernetes/Helm).
- Infra base: postgres + rustfs en docker-compose.yml.

**Commands:**
- `docker compose up -d` - levantar postgres + rustfs.
- `docker compose exec postgres psql -U admin -d mylake -c "\dn"` - verificar schemas.
- `docker compose ps` - ver estado de contenedores.

## Last Session
_2026-04-26 - Simplificación de arquitectura: eliminado Helm/K8s, solo Docker Compose._
- Eliminados charts de Helm y plan de infra K8s.
- Actualizado spec a arquitectura simplificada.
- Pendiente: construir backend Go + frontend React.

## Docs
- `docs/superpowers/specs/2026-04-24-mylake-design.md` - Spec actualizado (Docker Compose).
<!-- /unforget -->
