#!/bin/bash

# TrendPulse Quick Start Script

echo "🚀 Starting TrendPulse..."
echo ""

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Error: Please run this script from the TrendPulse root directory"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down TrendPulse..."
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo "🐍 Starting Backend (FastAPI)..."
cd backend
source venv/bin/activate
python -m app.main &
BACKEND_PID=$!
cd ..
sleep 2

# Start Frontend
echo "⚛️  Starting Frontend (React + Vite)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ TrendPulse is running!"
echo ""
echo "📊 Frontend: http://localhost:5173"
echo "🔌 Backend:  http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for both processes
wait
