# 🗃️ MyLake

Your personal lakehouse for local development. PostgreSQL + RustFS + DuckDB + Go + React.

## 🚀 Stack

| Layer | Technology |
|------|------------|
| **Database** | PostgreSQL 16+ |
| **Storage** | RustFS (S3-compatible) |
| **Backend** | Go + Gin + JWT |
| **Frontend** | React + TypeScript + Vite + TailwindCSS |
| **SQL Editor** | Monaco Editor |
| **Notebooks** | Jupyter Lab + PySpark |
| **Orchestration** | Docker Compose |

## 📁 Structure

```
mylake/
├── docker-compose.yml          # Full stack
├── backend/                    # Go API (Gin + pgx)
│   ├── main.go
│   ├── internal/
│   │   ├── auth/              # JWT middleware
│   │   ├── handlers/          # HTTP handlers
│   │   └── routes/            # API routes
│   └── Dockerfile
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── pages/             # Login, Workbench
│   │   ├── components/        # Layout, LakeExplorer
│   │   └── api/               # HTTP client
│   └── package.json
├── notebooks/                  # Jupyter notebooks
└── scripts/
    └── init-schemas.sql        # Initial schemas
```

## 🏁 Quick Start

### 1. Clone and launch

```bash
git clone https://github.com/tecnocriollo/mylake.git
cd mylake
docker compose up -d
```

### 2. Verify services

```bash
docker compose ps
```

### 3. Access

| Service | URL |
|----------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8080 |
| **Jupyter Lab** | http://localhost:8888 (token: `mylake-token-123`) |
| **RustFS** | http://localhost:9001 |

### 4. Local PostgreSQL

```bash
# Connect
psql -h localhost -p 5433 -U admin -d mylake

# Or via Docker
docker compose exec postgres psql -U admin -d mylake -c "\dn"
```

Default credentials:
- User: `admin`
- Password: `change-me-locally`

## ✨ Features

### 🔐 JWT Authentication
- User registration and login
- JWT tokens with expiration
- Protected route middleware

### 🗄️ SQL Workbench
- Monaco Editor with SQL syntax
- Protected query execution
- Paginated table results
- Schema and table catalog
- **"Create Table" button** to generate SQL templates

### 📊 Catalog
- PostgreSQL schema explorer
- Table and view listing
- Quick SELECT on click
- Hover for advanced options

### 🐍 Jupyter Lab
- Python + PySpark included
- Persistent notebooks in `./notebooks`
- Lakehouse integration

### 📁 File Management
- Create folders, Python scripts, and notebooks
- File explorer in sidebar
- Jupyter integration

## 🛠️ Development

### Backend (Go)

```bash
cd backend
go mod tidy
go run main.go
```

### Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Copy and adjust:
```bash
cp backend/.env.example backend/.env
```

## 🔧 Useful Commands

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild backend
docker compose up -d --build backend

# Restart everything
docker compose restart

# Complete reset (⚠️ deletes data)
docker compose down -v
docker compose up -d
```

## 🔒 Security

- JWT secret: change in production (`JWT_SECRET`)
- PostgreSQL: change password (`POSTGRES_PASSWORD`)
- RustFS: rotate access keys (`RUSTFS_ACCESS_KEY`, `RUSTFS_SECRET_KEY`)
- Jupyter: use secure token in production

## 📝 TODO

- [ ] DuckDB integration for analytical queries
- [ ] RustFS table viewer
- [ ] Export results to CSV/Parquet
- [ ] OAuth authentication (GitHub, Google)

## 👤 Author

**Tecnocriollo** ([@tecnocriollo](https://github.com/tecnocriollo))

---

*Built with ❤️ for local data pipeline development.*
