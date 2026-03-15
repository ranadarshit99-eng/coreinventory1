#!/bin/bash
# CoreInventory - Quick Setup Script
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║     CoreInventory Setup              ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Backend
echo "▶ Setting up Python backend..."
cd backend
pip install -r requirements.txt -q
echo "✅ Backend dependencies installed"

# Start backend in background
echo "▶ Starting backend server..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "✅ Backend running at http://localhost:8000 (PID: $BACKEND_PID)"

cd ..

# Frontend
echo ""
echo "▶ Setting up React frontend..."
cd frontend
npm install --silent
echo "✅ Frontend dependencies installed"

echo ""
echo "▶ Starting frontend dev server..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ CoreInventory is running!                    ║"
echo "║                                                  ║"
echo "║  Frontend → http://localhost:5173                ║"
echo "║  Backend  → http://localhost:8000                ║"
echo "║  API Docs → http://localhost:8000/docs           ║"
echo "║                                                  ║"
echo "║  Login: admin@coreinventory.com / Admin@123      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait and cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" EXIT
wait
