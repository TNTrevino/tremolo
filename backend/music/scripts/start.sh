#!/bin/bash
# Development startup script for FastAPI Music Service

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}FastAPI Music Service - Development Server${NC}"
echo "=============================================="

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if virtual environment exists
if [ ! -d "env" ]; then
    echo -e "${YELLOW}Virtual environment not found. Creating...${NC}"
    python3 -m venv env
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source env/bin/activate

# Install/update dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -q -r requirements.txt

# Load environment variables from .env if it exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Loading environment from .env${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${YELLOW}Warning: .env file not found. Using defaults.${NC}"
    echo -e "${YELLOW}Copy .env.example to .env to configure.${NC}"
fi

# Get environment settings
ENVIRONMENT=${ENVIRONMENT:-development}
PORT=${PORT:-8000}
HOST=${HOST:-127.0.0.1}

echo -e "${GREEN}Configuration:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo ""

# Start the development server
echo -e "${GREEN}Starting development server...${NC}"
echo -e "${GREEN}API documentation available at: http://${HOST}:${PORT}/docs${NC}"
echo -e "${GREEN}ReDoc available at: http://${HOST}:${PORT}/redoc${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

uvicorn main:app --reload --host "$HOST" --port "$PORT"
