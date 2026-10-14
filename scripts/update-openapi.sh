#!/bin/bash
set -e

# Start dev server in background
npm run dev &
DEV_PID=$!

# Wait for server to be ready
for i in {1..30}; do
    if curl -s http://localhost:5173/api/openapi.json > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Fetch and save OpenAPI spec
curl -s http://localhost:5173/api/openapi.json > openapi.json

# Generate types
npx openapi-typescript ./openapi.json -o ./src/openapi/schema.d.ts

# Kill dev server
kill $DEV_PID

echo "OpenAPI schema updated successfully"