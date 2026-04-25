<!-- unforget: auto-generated - do not edit this block manually -->
## Project Context

**Project:** MyLake - Personal lakehouse platform for local development.

**Stack:** PostgreSQL 16+, RustFS, DuckDB, Go (Gin), React + TypeScript + Vite, TailwindCSS, Monaco Editor, Docker Compose.

**Key rules:**
- PostgreSQL schemas: `auth_mgmt` para auth/users y `ducklake_catalog` para metadata.
- Docker Compose para desarrollo local.
- Backend: Go con Gin, JWT auth, pgx para PostgreSQL.
- Frontend: React + Vite + TypeScript + TailwindCSS + Monaco Editor.

**Commands:**
- `docker compose up -d` - levantar toda la stack.
- `docker compose exec postgres psql -U admin -d mylake -c "\dn"` - verificar schemas.
- `docker compose ps` - ver estado de contenedores.

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8080
- PostgreSQL: localhost:5432
- RustFS: localhost:9001

## Last Session
_2026-04-26 - Backend Go + Frontend React implementados._
- Backend: API REST con Gin, auth JWT, queries SQL protegidas.
- Frontend: React + Vite + TypeScript, login/register, SQL workbench con Monaco Editor.
- Estructura lista para levantar con docker-compose.

## Docs
- `docs/superpowers/specs/2026-04-24-mylake-design.md` - Spec actualizado.
- `docs/superpowers/plans/2026-04-26-backend-frontend.md` - Plan de implementación.
<!-- /unforget -->
