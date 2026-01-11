#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REQUIRED_PYTHON_VERSION=3.8
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."

# Helper functions
print_header() {
  echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check Python version
check_python() {
  print_header "Checking Python"

  if ! command -v python3 &>/dev/null; then
    print_error "Python3 is not installed"
    echo "Install with: sudo apt-get install python3 python3-venv python3-pip"
    exit 1
  fi

  PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
  PYTHON_MAJOR=$(python3 -c 'import sys; print(sys.version_info[0])')
  PYTHON_MINOR=$(python3 -c 'import sys; print(sys.version_info[1])')

  if ((PYTHON_MAJOR < 3)) || ((PYTHON_MAJOR == 3 && PYTHON_MINOR < REQUIRED_PYTHON_VERSION)); then
    print_error "Python $REQUIRED_PYTHON_VERSION or higher is required. Found: $PYTHON_VERSION"
    echo "Install with: sudo apt-get install python3.${REQUIRED_PYTHON_VERSION}"
    exit 1
  fi

  print_success "Python $PYTHON_VERSION found"
}

# Check Node.js
check_node() {
  print_header "Checking Node.js"

  if ! command -v node &>/dev/null; then
    print_error "Node.js is not installed"
    echo "Install from: https://nodejs.org/ or via: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
  fi

  NODE_VERSION=$(node -v)
  print_success "Node.js $NODE_VERSION found"

  if ! command -v npm &>/dev/null; then
    print_error "npm is not installed"
    exit 1
  fi

  NPM_VERSION=$(npm -v)
  print_success "npm $NPM_VERSION found"
}

# Check Go
check_go() {
  print_header "Checking Go"

  if ! command -v go &>/dev/null; then
    print_error "Go is not installed"
    echo "Install from: https://golang.org/doc/install or via: sudo apt-get install golang-go"
    exit 1
  fi

  GO_VERSION=$(go version | awk '{print $3}')
  print_success "Go $GO_VERSION found"

  if ! command -v gofmt &>/dev/null; then
    print_error "gofmt is not available"
    exit 1
  fi

  print_success "gofmt is available"
}

# Setup frontend
setup_frontend() {

  FRONTEND_DIR="$ROOT_DIR/frontend"
  print_header "Setting up Frontend"

  if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "frontend directory not found"
    exit 1
  fi

  print_info "Running npm i in frontend..."
  cd "$FRONTEND_DIR"
  npm i

  print_success "Frontend dependencies installed"
  cd "$FRONTEND_DIR"
}

# Setup backend/music (Python/Django)
setup_backend_music() {
  BACKEND_MUSIC_DIR="$ROOT_DIR/backend/music"
  print_header "Setting up Backend Music Service (Django)"

  if [ ! -d "$BACKEND_MUSIC_DIR" ]; then
    print_error "backend/music directory not found"
    exit 1
  fi

  cd "$BACKEND_MUSIC_DIR"

  # Check if venv already exists
  if [ -d "env" ]; then
    print_warning "Virtual environment already exists. Skipping venv creation."
  else
    print_info "Creating Python virtual environment..."
    python3 -m venv env
    print_success "Virtual environment created"
  fi

  # Activate virtual environment
  print_info "Activating virtual environment..."
  source env/bin/activate

  # Upgrade pip
  print_info "Upgrading pip..."
  pip install --upgrade pip

  # Install requirements
  if [ -f "requirements.txt" ]; then
    print_info "Installing Python dependencies..."
    pip install -r requirements.txt
    print_success "Python dependencies installed"
  else
    print_warning "requirements.txt not found"
  fi

  deactivate
  cd "$SCRIPT_DIR"
}

# Setup Husky hooks
setup_husky() {
  print_header "Setting up Git Hooks (Husky)"

  print_info "Installing precommit hooks..."

  cd "$ROOT_DIR"
  print_info "Running npm i in root directory..."
  npm i

  print_success "Git hooks configured"
}

# Main setup flow
main() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   Tremolo Project Setup (Linux)             ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

  # Check dependencies
  check_python
  check_node
  check_go

  # Setup services
  setup_frontend
  setup_backend_music
  setup_husky

  # Summary
  echo -e "\n${BLUE}╔════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║   ✅ Setup Complete!                       ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

  echo -e "${YELLOW}Next steps:${NC}"
  echo -e "1. Set environment variables:"
  echo -e "   Take a look at the 'Environment Setup' section in the README."
  echo ""
  echo -e "2. Start frontend:"
  echo -e "   cd frontend && npm run dev"
  echo ""
  echo -e "3. Start music service:"
  echo -e "   cd backend/music && source env/bin/activate && fastapi dev main.py "

  echo ""
  echo -e "4. Start user tracking service:"
  echo -e "   cd backend/main && go run main.go"
  echo ""
}

# Run main function
main
