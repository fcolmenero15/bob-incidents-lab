#!/bin/bash
set -e

echo "🔨 Building Docker images..."
cd ..
docker build -t healthcare-app-backend:latest ./backend
docker build -t healthcare-app-frontend:latest ./frontend

echo "🚀 Deploying with Terraform..."
cd terraform
terraform apply "$@"

echo "✅ Deployment complete!"
echo "📍 Frontend: http://localhost"
echo "📍 Backend API: http://localhost:5001"

# Made with Bob
