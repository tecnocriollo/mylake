# Design Spec: MyLake - Production-Like Personal Lakehouse

**Date:** 2026-04-24
**Status:** Draft
**Topic:** Unified Multi-user Lakehouse Platform on Kubernetes

## 1. Executive Summary
MyLake is a robust, multi-user personal lakehouse platform designed for Kubernetes (k3s). It integrates high-performance object storage (RustFS), a transactional metadata catalog (DuckLake via PostgreSQL), and decentralized compute (DuckDB, Apache Spark). The platform provides a unified Web UI for SQL analysis, management, and interactive data science via Jupyter Notebooks.

## 2. System Architecture

### 2.1 Component Overview
*   **Storage Layer:** RustFS (S3-compatible) deployed as a K8s StatefulSet.
*   **Catalog & Management Database:** A single PostgreSQL instance with separate schemas:
    *   `auth_mgmt`: User accounts, RBAC, session management, and Spark job metadata.
    *   `ducklake_catalog`: DuckLake metadata (tables, snapshots, manifests).
*   **Compute Engines:**
    *   **DuckDB:** Embedded in the Go backend and user notebook pods.
    *   **Apache Spark:** Managed via the Spark Operator on K8s.
*   **Web Platform:**
    *   **Backend (Go):** REST API for management, query proxying, and JupyterHub integration.
    *   **Frontend (React):** TailwindCSS styling, Monaco Editor for SQL Workbench.
*   **Interactive Workspace:** JupyterHub spawning per-user JupyterLab pods.
*   **Orchestration & Deployment:** Kubernetes (k3s) with Helm charts.

### 2.2 Data Flow
1.  **Ingestion:** Spark jobs (submitted via UI) or DuckDB (via Workbench/Notebooks) write Parquet files to RustFS.
2.  **Cataloging:** The DuckLake extension (in DuckDB/Spark) updates the PostgreSQL `ducklake_catalog` schema with new snapshots.
3.  **Analysis:** Users query data via the Web Workbench (Go backend proxies to DuckDB) or Jupyter Notebooks (direct DuckDB/Spark access).

## 3. Technical Requirements

### 3.1 Backend (Golang)
*   **Framework:** Gin or Echo for the REST API.
*   **Authentication:** JWT-based session management. Designed for future OIDC integration.
*   **Database Connectivity:** `pgx` for PostgreSQL; embedded DuckDB via CGO or a dedicated driver.
*   **K8s Integration:** Uses `client-go` to manage SparkApplication CRDs (Spark Operator) and interface with JupyterHub APIs.
*   **Features:**
    *   User/Role Management.
    *   SQL Execution Engine (proxying to DuckDB).
    *   Spark Job Submission & Status/Log streaming.
    *   JupyterHub backend service/proxy.

### 3.2 Frontend (React + TailwindCSS)
*   **Editor:** Monaco Editor for SQL with syntax highlighting for DuckDB/Postgres.
*   **Workbench:** Interactive query results with table view and basic charting.
*   **Management Portal:**
    *   User Management (Admin only).
    *   Catalog Browser (Schemas/Tables view).
    *   Spark Job Dashboard (Monitoring logs and pod status).

### 3.3 Multi-Tenancy & Security
*   **Workspace Isolation:** Each user is assigned a dedicated schema within the `ducklake_catalog`.
*   **RBAC:** Admin vs. Standard User roles. Admins manage global resources; Users manage their own workspaces and Spark jobs.
*   **Notebook Isolation:** Each user gets a dedicated K8s pod with resource limits and isolated storage volumes.

### 3.4 Infrastructure (Kubernetes/Helm)
*   **Helm Chart Structure:**
    *   `mylake-base`: Postgres, RustFS.
    *   `mylake-platform`: Go Backend, React Frontend (Nginx).
    *   `mylake-compute`: JupyterHub, Spark Operator.
*   **Storage:** PersistentVolumeClaims (PVCs) for Postgres and RustFS data.

## 4. Implementation Details

### 4.1 DuckLake Catalog Structure
The `ducklake_catalog` schema in Postgres will store:
*   `tables`: Table definitions and schema versions.
*   `snapshots`: Immutable views of table states at specific times.
*   `manifests`: Lists of Parquet files associated with each snapshot.

### 4.2 Spark Job Submission
The Go backend will generate and apply `SparkApplication` YAML manifests to the cluster. It will watch the status of these resources and stream logs via the K8s API to the Web UI.

### 4.3 JupyterHub Integration
The Go backend acts as a custom authenticator or proxy for JupyterHub, ensuring seamless single sign-on (SSO) between the platform UI and the notebook environment.

## 5. Success Criteria
*   Successfully deploy the entire stack on k3s using a single `helm install` command.
*   Create a user in the UI, log in, and run a SQL query that reads from RustFS.
*   Submit a Spark job from the UI and see its logs in real-time.
*   Spawn a Jupyter notebook and query the same DuckLake table created via the Workbench.

## 6. Future Considerations
*   OIDC (Keycloak/Dex) integration.
*   Data lineage and governance tools.
*   Automatic scaling for Spark executors.
