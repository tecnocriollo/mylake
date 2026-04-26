#!/bin/bash
set -e

echo "🎭 MyLake E2E Test Runner"
echo "========================="
echo ""

# Check if the app is running
if ! curl -s http://207.180.223.160:5173 > /dev/null; then
    echo "❌ Frontend is not running at http://207.180.223.160:5173"
    echo "   Please start the app: docker compose up -d"
    exit 1
fi

if ! curl -s http://207.180.223.160:8080/api/health > /dev/null; then
    echo "❌ Backend is not running at http://207.180.223.160:8080"
    echo "   Please start the app: docker compose up -d"
    exit 1
fi

echo "✅ App is running"
echo ""

# Run Playwright tests
cd /home/pato/projects/mylake/frontend

echo "🧪 Running E2E tests..."
npx playwright test --config=playwright.config.ts "$@"

echo ""
echo "✅ Tests completed!"
