#!/bin/bash

echo "🎵 Tremolo Frontend Setup"
echo "========================="
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🚀 To start the development server, run:"
    echo "   npm run dev"
    echo ""
    echo "🏗️  To build for production, run:"
    echo "   npm run build"
    echo ""
    echo "👀 To preview the production build, run:"
    echo "   npm run preview"
    echo ""
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
