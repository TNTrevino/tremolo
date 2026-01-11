#!/bin/bash
# Production startup script for FastAPI Music Service

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}FastAPI Music Service - Production Server${NC}"
echo "=============================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "env" ]; then
    echo -e "${RED}Virtual environment not found!${NC}"
    echo "Please run: python3 -m venv env"
    exit 1
fi

# Activate virtual environment
source env/bin/activate

# Load environment variables from .env if it exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Loading environment from .env${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create .env from .env.example"
    exit 1
fi

# Verify we're in production mode
if [ "$ENVIRONMENT" != "production" ]; then
    echo -e "${YELLOW}Warning: ENVIRONMENT is set to '$ENVIRONMENT', not 'production'${NC}"
    echo -e "${YELLOW}Set ENVIRONMENT=production in .env for production deployment${NC}"
fi

# Get environment settings
PORT=${PORT:-8000}
HOST=${HOST:-0.0.0.0}
WORKERS=${WORKERS:-$(($(nproc) * 2 + 1))}

echo -e "${GREEN}Configuration:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  Workers: $WORKERS"
echo ""

# Verify Gunicorn is installed
if ! command -v gunicorn &> /dev/null; then
    echo -e "${RED}Gunicorn not found!${NC}"
    echo "Install with: pip install gunicorn"
    exit 1
fi

# Start the production server with Gunicorn
echo -e "${GREEN}Starting production server with Gunicorn...${NC}"
echo -e "${GREEN}Server available at: http://${HOST}:${PORT}${NC}"
echo ""

gunicorn main:app \
    -c gunicorn_config.py \
    --bind "$HOST:$PORT" \
    --workers "$WORKERS" \
    --worker-class uvicorn.workers.UvicornWorker \
    --log-level info \
    --access-logfile - \
    --error-logfile -
