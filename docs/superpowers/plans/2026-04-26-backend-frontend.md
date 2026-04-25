# MyLake Backend + Frontend Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Build a Go REST API backend and React frontend for MyLake.

**Architecture:** Go backend with Gin framework, PostgreSQL with pgx, JWT auth. React frontend with TailwindCSS and Monaco Editor.

---

## Task 1: Go Backend Setup

**Files to create:**
- `backend/go.mod`
- `backend/main.go`
- `backend/.env.example`
- `backend/internal/config/config.go`
- `backend/internal/database/db.go`
- `backend/internal/models/user.go`
- `backend/internal/auth/jwt.go`
- `backend/internal/handlers/auth.go`
- `backend/internal/handlers/health.go`
- `backend/internal/routes/routes.go`

### Step 1: Initialize Go module
```bash
cd backend && go mod init mylake
```

### Step 2: Create main.go with Gin server
- Port 8080
- Health check endpoint
- CORS configured for frontend

### Step 3: Database connection
- Use pgx v5
- Connect to postgres://admin:change-me-locally@localhost:5432/mylake
- Test connection on startup

### Step 4: JWT Authentication
- Login endpoint: POST /api/auth/login
- Register endpoint: POST /api/auth/register
- Middleware for protected routes
- Store users in auth_mgmt schema

### Step 5: Health endpoint
- GET /api/health - returns db status

---

## Task 2: React Frontend Setup

**Files to create:**
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/tsconfig.json`
- `frontend/tailwind.config.js`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/Layout.tsx`
- `frontend/src/pages/Login.tsx`
- `frontend/src/pages/Workbench.tsx`
- `frontend/src/api/client.ts`

### Step 1: Initialize Vite + React + TypeScript
```bash
cd frontend && npm create vite@latest . -- --template react-ts
```

### Step 2: Add TailwindCSS
- Install and configure tailwind
- Add basic styles

### Step 3: Add Monaco Editor
- Install @monaco-editor/react
- Create SQL editor component

### Step 4: Authentication pages
- Login form
- Store JWT in localStorage
- Protected routes

### Step 5: SQL Workbench page
- Monaco Editor for SQL
- Run query button
- Results table display

---

## Task 3: Docker Compose Integration

**Update:** `docker-compose.yml`
- Add `backend` service
- Add `frontend` service (dev mode with hot reload)
- Configure networking between services

---

## Task 4: Integration Testing

- Login with test user
- Execute a simple SQL query
- Verify results display

---

## Success Criteria
- Backend starts and connects to PostgreSQL
- Frontend loads and can login
- SQL queries execute via the workbench
- All services run via `docker compose up -d`
