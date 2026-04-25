# MyLake Infrastructure Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the core storage (RustFS) and database (PostgreSQL) on Kubernetes (k3s) to serve as the foundation for the MyLake platform.

**Architecture:** A single Kubernetes namespace `mylake` containing two StatefulSets: PostgreSQL (for metadata/auth) and RustFS (for S3 storage). PostgreSQL is initialized with two distinct schemas: `ducklake_catalog` for DuckLake metadata and `auth_mgmt` for platform authentication, RBAC, sessions, and Spark job metadata.

**Tech Stack:** Kubernetes (k3s), Helm v3, PostgreSQL 16+, RustFS.

---

### Task 1: Project Structure and Namespace

**Files:**
- Create: `deploy/helm/mylake-base/Chart.yaml`
- Create: `deploy/helm/mylake-base/values.yaml`
- Create: `deploy/helm/mylake-base/templates/namespace.yaml`

- [ ] **Step 1: Create Helm Chart definition**

```yaml
# deploy/helm/mylake-base/Chart.yaml
apiVersion: v2
name: mylake-base
description: Foundation infrastructure for MyLake (Postgres & RustFS)
type: application
version: 0.1.0
appVersion: "1.0.0"
```

- [ ] **Step 2: Create initial values file**

```yaml
# deploy/helm/mylake-base/values.yaml
namespace: mylake
postgres:
  user: admin
  password: change-me-locally
  database: mylake
rustfs:
  accessKey: mylake-access
  secretKey: mylake-secret-key
```

- [ ] **Step 3: Create Namespace template**

```yaml
# deploy/helm/mylake-base/templates/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: {{ .Values.namespace }}
```

- [ ] **Step 4: Verify chart structure**

Run: `helm lint deploy/helm/mylake-base`
Expected: `1 chart(s) linted, 0 chart(s) failed`

- [ ] **Step 5: Commit**

```bash
git add deploy/helm/mylake-base
git commit -m "infra: initialize mylake-base helm chart"
```

---

### Task 2: PostgreSQL Deployment with Multi-Schema Initialization

**Files:**
- Create: `deploy/helm/mylake-base/templates/postgres-configmap.yaml`
- Create: `deploy/helm/mylake-base/templates/postgres-statefulset.yaml`
- Create: `deploy/helm/mylake-base/templates/postgres-service.yaml`

- [ ] **Step 1: Create Initialization ConfigMap**
This script creates the `ducklake_catalog` and `auth_mgmt` schemas on startup.

```yaml
# deploy/helm/mylake-base/templates/postgres-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init-script
  namespace: {{ .Values.namespace }}
data:
  init-schemas.sql: |
    CREATE SCHEMA IF NOT EXISTS ducklake_catalog;
    CREATE SCHEMA IF NOT EXISTS auth_mgmt;
```

- [ ] **Step 2: Create PostgreSQL StatefulSet**

```yaml
# deploy/helm/mylake-base/templates/postgres-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: {{ .Values.namespace }}
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        env:
        - name: POSTGRES_USER
          value: {{ .Values.postgres.user }}
        - name: POSTGRES_PASSWORD
          value: {{ .Values.postgres.password }}
        - name: POSTGRES_DB
          value: {{ .Values.postgres.database }}
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: init-scripts
          mountPath: /docker-entrypoint-initdb.d/
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: init-scripts
        configMap:
          name: postgres-init-script
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

- [ ] **Step 3: Create PostgreSQL Service**

```yaml
# deploy/helm/mylake-base/templates/postgres-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: {{ .Values.namespace }}
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

- [ ] **Step 4: Commit**

```bash
git add deploy/helm/mylake-base/templates/postgres-*
git commit -m "infra: add postgresql statefulset with schema initialization"
```

---

### Task 3: RustFS Deployment

**Files:**
- Create: `deploy/helm/mylake-base/templates/rustfs-statefulset.yaml`
- Create: `deploy/helm/mylake-base/templates/rustfs-service.yaml`

- [ ] **Step 1: Create RustFS StatefulSet**

```yaml
# deploy/helm/mylake-base/templates/rustfs-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rustfs
  namespace: {{ .Values.namespace }}
spec:
  serviceName: rustfs
  replicas: 1
  selector:
    matchLabels:
      app: rustfs
  template:
    metadata:
      labels:
        app: rustfs
    spec:
      containers:
      - name: rustfs
        image: rustfs/rustfs:latest
        env:
        - name: RUSTFS_ACCESS_KEY
          value: {{ .Values.rustfs.accessKey }}
        - name: RUSTFS_SECRET_KEY
          value: {{ .Values.rustfs.secretKey }}
        ports:
        - containerPort: 9000
        volumeMounts:
        - name: rustfs-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: rustfs-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 5Gi
```

- [ ] **Step 2: Create RustFS Service**

```yaml
# deploy/helm/mylake-base/templates/rustfs-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: rustfs
  namespace: {{ .Values.namespace }}
spec:
  selector:
    app: rustfs
  ports:
  - name: s3
    port: 9000
    targetPort: 9000
```

- [ ] **Step 3: Commit**

```bash
git add deploy/helm/mylake-base/templates/rustfs-*
git commit -m "infra: add rustfs statefulset for s3 storage"
```

---

### Task 4: Deployment and Verification

- [ ] **Step 1: Install the Helm chart**

Run: `helm upgrade --install mylake-base ./deploy/helm/mylake-base --create-namespace`
Expected: `STATUS: deployed`

- [ ] **Step 2: Verify Postgres Schemas**

Run: `kubectl exec -n mylake -it statefulset/postgres -- psql -U admin -d mylake -c "\dn"`
Expected: Output should list `ducklake_catalog` and `auth_mgmt` schemas.

- [ ] **Step 3: Verify RustFS Health**

Run: `kubectl get pods -n mylake -l app=rustfs`
Expected: `rustfs-0` pod is `Running`.

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "infra: verified deployment of foundation"
```
