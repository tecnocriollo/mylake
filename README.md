# 🗃️ MyLake

Personal lakehouse for local development. Run SQL queries, Python notebooks, and PySpark jobs — all from a mobile-first web UI.

## 🚀 Stack

| Layer | Technology |
|-------|------------|
| **Database** | PostgreSQL 16+ |
| **Storage** | RustFS (S3-compatible) |
| **Backend** | Go + Gin + JWT |
| **Frontend** | React + TypeScript + Vite + TailwindCSS |
| **SQL Editor** | CodeMirror 6 |
| **Notebooks** | Custom editor (.ipynb) — Python + PySpark |
| **Python Kernel** | Persistent REPL (Marimo environment) |
| **Spark Kernel** | Persistent PySpark REPL (Spark local mode) |
| **AI Assistant** | Ollama Cloud API |
| **Orchestration** | Docker Compose |

## 📁 Structure

```
mylake/
├── docker-compose.yml
├── backend/                    # Go API (Gin + pgx)
│   ├── main.go
│   └── internal/
│       ├── auth/               # JWT middleware
│       ├── handlers/
│       │   ├── ai.go           # Ollama Cloud chat
│       │   ├── marimo.go       # Persistent Python REPL kernel
│       │   ├── sparkconnect.go # Persistent PySpark REPL kernel
│       │   ├── jupyter.go      # Notebook file I/O
│       │   └── ...
│       └── routes/
├── frontend/                   # React + Vite
│   └── src/
│       ├── pages/
│       └── components/
│           ├── NotebookEditor.tsx   # Main notebook UI
│           ├── AICellAssistant.tsx  # AI chat panel
│           └── CodeMirrorEditor.tsx
├── marimo/                     # Python environment container
├── spark/                      # Spark local mode container
├── notebooks/                  # Persisted .ipynb files
└── scripts/
    └── init-schemas.sql
```

## 🏁 Quick Start

```bash
git clone https://github.com/tecnocriollo/mylake.git
cd mylake
docker compose up -d
```

### Access

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8080 |
| **RustFS** | http://localhost:9001 |

### PostgreSQL

```bash
psql -h localhost -p 5433 -U admin -d mylake
# password: change-me-locally
```

## ✨ Features

### 🔐 Authentication
- JWT registration and login
- Protected API middleware

### 🗄️ SQL Workbench
- CodeMirror 6 with SQL syntax highlighting
- Schema and table catalog browser
- Paginated query results

### 📓 Notebooks
- `.ipynb` format (compatible with Jupyter)
- **Python mode** — persistent REPL kernel, variables shared across cells
- **Spark mode** — persistent PySpark REPL with local Spark session
- Sequential execution counters (`[1]`, `[2]`, ...)
- Kernel restart per mode
- Save / share URL

### 🤖 AI Assistant
- Chat panel per notebook (🤖 button)
- Powered by Ollama Cloud (`kimi-k2.6:cloud` default)
- Actions: add cell, modify cell, explain, run
- Model selector (Qwen, DeepSeek, Gemma, ...)

### 📁 File Management
- Create and delete notebooks
- Persistent storage in `./notebooks`

## 🔧 Useful Commands

```bash
# Logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild backend after code changes
docker compose up -d --build backend

# Restart all
docker compose restart

# Full reset (⚠️ deletes data)
docker compose down -v && docker compose up -d
```

## 🤖 AI Assistant Setup

The AI assistant requires an [Ollama Cloud](https://ollama.com) API key.

**1. Get your key** — sign in at ollama.com and copy your API key.

**2. Set the environment variable** before running `docker compose up`:

```bash
export OLLAMA_API_KEY=your-key-here
docker compose up -d
```

Or create a `.env` file in the project root:

```bash
# .env
OLLAMA_API_KEY=your-key-here
```

Docker Compose picks up `.env` automatically.

Without a key, the AI assistant panel will show errors. Everything else (SQL workbench, notebooks) works without it.

## 🔒 Security Notes

Change these before any non-local deployment:

| Variable | Location |
|----------|----------|
| `JWT_SECRET` | `docker-compose.yml` → backend |
| `POSTGRES_PASSWORD` | `docker-compose.yml` → postgres |
| `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` | `docker-compose.yml` → rustfs |

## 👤 Author

**Tecnocriollo** ([@tecnocriollo](https://github.com/tecnocriollo))

---

*Built for local data pipeline development.*
