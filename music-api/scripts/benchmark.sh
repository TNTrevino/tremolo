#!/bin/bash
# checks if fastapi server is running and runs performance tests

set -e

echo "=========================================="
echo "FastAPI Music Service - Performance Test"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Checking if FastAPI server is running on http://localhost:8000..."
if ! curl -s http://localhost:8000/docs >/dev/null; then
  echo "Error: FastAPI server not running on http://localhost:8000"
  echo "Start the server with: bash start.sh"
  exit 1
fi

echo "✓ Server is running"
echo ""

if [ -d "env" ]; then
  source env/bin/activate
fi

if ! python3 -c "import requests" 2>/dev/null; then
  echo "Installing requests library..."
  pip install -q requests
fi

echo "Running performance benchmarks..."
echo ""

python3 tests/performance_report.py

echo ""
echo "=========================================="
echo "Performance testing complete!"
echo "=========================================="
