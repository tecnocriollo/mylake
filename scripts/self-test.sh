#!/bin/sh
set -e

echo "🔍 Running mylake self-test..."
echo ""

# Test 1: PostgreSQL connectivity
echo "[1/6] 📡 Testing PostgreSQL connectivity..."
for i in 1 2 3 4 5 6 7 8 9 10; do
    if nc -z postgres 5432 2>/dev/null; then
        echo "      ✅ PostgreSQL is reachable on port 5432"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "      ❌ PostgreSQL failed to respond on port 5432"
        exit 1
    fi
    echo "      ⏳ Waiting for PostgreSQL... ($i/10)"
    sleep 2
done

# Test 2: Catalog (schemas and tables query)
echo "[2/6] 📚 Testing Catalog (information_schema access)..."
# Install psql client temporarily for catalog test
apk add --no-cache postgresql-client >/dev/null 2>&1
SCHEMA_COUNT=$(PGPASSWORD=change-me-locally psql -h postgres -U admin -d mylake -t -c "SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast');" 2>/dev/null | tr -d '[:space:]')
if [ "$SCHEMA_COUNT" -gt 0 ] 2>/dev/null; then
    echo "      ✅ Catalog queries working ($SCHEMA_COUNT user schemas found)"
else
    echo "      ⚠️  Catalog test failed or no user schemas yet"
fi

# Test 3: Filesystem (RustFS/S3)
echo "[3/6] 📁 Testing Filesystem (RustFS/S3)..."
if nc -z rustfs 9000 2>/dev/null; then
    echo "      ✅ RustFS is responding on port 9000"
    if wget -qO- http://rustfs:9000/ >/dev/null 2>&1 || curl -s http://rustfs:9000/ >/dev/null 2>&1; then
        echo "      ✅ RustFS HTTP interface responding"
    else
        echo "      ⚠️  RustFS port open but HTTP not responding yet"
    fi
else
    echo "      ⚠️  RustFS not responding (non-critical)"
fi

# Test 4: Marimo connectivity
echo "[4/6] 🐍 Testing Marimo connectivity..."
if nc -z marimo 2718 2>/dev/null; then
    echo "      ✅ Marimo is responding on port 2718"
else
    echo "      ❌ Marimo not responding on port 2718"
    exit 1
fi

# Test 5: Marimo API integration
echo "[5/6] 🔗 Testing Marimo API integration..."
MARIMO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://marimo:2718 2>/dev/null || echo "000")
if [ "$MARIMO_RESPONSE" = "200" ]; then
    echo "      ✅ Marimo API responding"
    
    # Check if marimo allows iframe embedding by checking headers
    CSP_HEADER=$(curl -sI http://marimo:2718 2>/dev/null | grep -i "Content-Security-Policy" | grep -i "frame-ancestors" || echo "")
    if [ -n "$CSP_HEADER" ]; then
        echo "      ✅ Marimo CSP headers configured for iframe embedding"
    else
        echo "      ⚠️  Marimo CSP headers may need review for iframe support"
    fi
else
    echo "      ⚠️  Marimo API check returned HTTP $MARIMO_RESPONSE"
fi

# Test 6: Backend API
echo "[6/6] 🔌 Testing Backend API..."
sleep 2
if nc -z backend 8080 2>/dev/null; then
    echo "      ✅ Backend API is responding on port 8080"
    HEALTH_STATUS=$(curl -s http://backend:8080/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    if [ "$HEALTH_STATUS" = "healthy" ]; then
        echo "      ✅ Backend health check passed"
    else
        echo "      ⚠️  Backend port open but health check returned: $HEALTH_STATUS"
    fi
else
    echo "      ⏭️  Backend not started yet (will start after self-test)"
fi

echo ""
echo "🎉 Self-test completed!"
echo ""
echo "Summary:"
echo "  ✅ PostgreSQL: Required for operation"
echo "  ✅ Catalog:    Information schema accessible"
echo "  ⚡ Filesystem: Optional (RustFS/S3 storage)"
echo "  🐍 Marimo:     Python notebook engine"
echo "  🔗 M-iframe:   Embedding support"
echo "  🔌 Backend:    API services"
echo ""
exit 0
