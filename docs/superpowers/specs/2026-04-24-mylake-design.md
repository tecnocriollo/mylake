# Design Spec: MyLake - Personal Lakehouse Platform

**Date:** 2026-04-24 (Updated: 2026-04-26)
**Status:** Draft
**Topic:** Multi-user Lakehouse Platform with Docker Compose

## 1. Executive Summary
MyLake is a personal lakehouse platform for local development and testing. It integrates object storage (RustFS), a transactional metadata catalog (DuckLake via PostgreSQL), and compute engines (DuckDB, Apache Spark). The platform provides a unified Web UI for SQL analysis and management.

**Scope Change:** Originally designed for Kubernetes (k3s), now simplified to Docker Compose for local development and testing.

## 2. System Architecture

### 2.1 Component Overview
*   **Storage Layer:** RustFS (S3-compatible) via Docker Compose.
*   **Catalog & Management Database:** PostgreSQL with separate schemas:
    *   `auth_mgmt`: User accounts, RBAC, session management.
    *   `ducklake_catalog`: DuckLake metadata (tables, snapshots, manifests).
*   **Compute Engines:**
    *   **DuckDB:** Embedded in the Go backend.
    *   **Apache Spark:** Via Docker Compose (future).
*   **Web Platform:**
    *   **Backend (Go):** REST API for management and query proxying.
    *   **Frontend (React):** TailwindCSS styling, Monaco Editor for SQL Workbench.
*   **Orchestration:** Docker Compose (local dev/testing).

### 2.2 Data Flow
1.  **Ingestion:** DuckDB (via Workbench) writes Parquet files to RustFS.
2.  **Cataloging:** The DuckLake extension updates PostgreSQL `ducklake_catalog` schema.
3.  **Analysis:** Users query data via the Web Workbench (Go backend proxies to DuckDB).

## 3. Technical Requirements

### 3.1 Backend (Golang)
*   **Framework:** Gin or Echo for the REST API.
*   **Authentication:** JWT-based session management.
*   **Database Connectivity:** `pgx` for PostgreSQL; DuckDB via CGO.
*   **Features:**
    *   User/Role Management.
    *   SQL Execution Engine (proxying to DuckDB).
    *   Catalog browser APIs.

### 3.2 Frontend (React + TailwindCSS)
*   **Editor:** Monaco Editor for SQL with syntax highlighting.
*   **Workbench:** Interactive query results with table view.
*   **Management Portal:**
    *   User Management (Admin only).
    *   Catalog Browser (Schemas/Tables view).

### 3.3 Infrastructure (Docker Compose)
*   **Services:**
    *   `postgres`: PostgreSQL 16 with init scripts.
    *   `rustfs`: S3-compatible object storage.
    *   `backend`: Go REST API (future).
    *   `frontend`: React app served via Nginx (future).

## 4. Implementation Details

### 4.1 DuckLake Catalog Structure
The `ducklake_catalog` schema in Postgres will store:
*   `tables`: Table definitions.
*   `snapshots`: Immutable views of table states.
*   `manifests`: Lists of Parquet files.

## 5. Success Criteria
*   Deploy the stack with `docker compose up -d`.
*   Create a user in the UI, log in, and run a SQL query.
*   Query data from RustFS via the Web Workbench.

## 6. Future Considerations
*   Kubernetes/k3s deployment (original scope).
*   JupyterHub integration.
*   Spark Operator for distributed compute.
*   OIDC integration.
