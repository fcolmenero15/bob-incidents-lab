# Terraform configuration for Bank Simulator Docker Infrastructure
# This demonstrates infrastructure-as-code for the SDLC demo

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

# Configure the Docker provider
# For Colima, use: unix://${HOME}/.colima/default/docker.sock
# For Docker Desktop, use: unix:///var/run/docker.sock
provider "docker" {
  host = "unix://${pathexpand("~/.colima/default/docker.sock")}"
}

# Variables for configuration
variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "bank-app"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "db_port" {
  description = "External port for PostgreSQL database"
  type        = number
  default     = 5437
}

variable "backend_port" {
  description = "External port for backend API"
  type        = number
  default     = 5001
}

variable "backend_replicas" {
  description = "Number of backend container replicas"
  type        = number
  default     = 1
}

variable "simulate_overload" {
  description = "Set to 1 to inject overload metrics and response delay into the backend (lab use only)"
  type        = number
  default     = 0
}

variable "frontend_port" {
  description = "External port for frontend"
  type        = number
  default     = 80
}

# Local values
locals {
  container_prefix = "${var.project_name}-${var.environment}"
  network_name     = "${var.project_name}-network"

  common_labels = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Docker Network
resource "docker_network" "bank_network" {
  name = local.network_name
  
  labels {
    label = "project"
    value = var.project_name
  }
  
  labels {
    label = "environment"
    value = var.environment
  }
  
  labels {
    label = "managed_by"
    value = "terraform"
  }
}

# Docker Volume for PostgreSQL data persistence
resource "docker_volume" "postgres_data" {
  name = "${local.container_prefix}-postgres-data"
  
  labels {
    label = "project"
    value = var.project_name
  }
  
  labels {
    label = "environment"
    value = var.environment
  }
}

# PostgreSQL Database Container
resource "docker_image" "postgres" {
  name = "postgres:16-alpine"
}

resource "docker_container" "database" {
  name  = "${local.container_prefix}-db"
  image = docker_image.postgres.image_id
  
  restart = "unless-stopped"
  
  env = [
    "POSTGRES_DB=bankdb",
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=password"
  ]
  
  ports {
    internal = 5432
    external = var.db_port
  }
  
  volumes {
    volume_name    = docker_volume.postgres_data.name
    container_path = "/var/lib/postgresql/data"
  }
  
  networks_advanced {
    name    = docker_network.bank_network.name
    aliases = ["database"]
  }
  
  healthcheck {
    test     = ["CMD-SHELL", "pg_isready -U postgres"]
    interval = "10s"
    timeout  = "5s"
    retries  = 5
  }
  
  labels {
    label = "project"
    value = var.project_name
  }
  
  labels {
    label = "environment"
    value = var.environment
  }
  
  labels {
    label = "component"
    value = "database"
  }
}

# Backend API Container
resource "docker_image" "backend" {
  name = "${var.project_name}-backend:latest"
  
  build {
    context    = "../backend"
    dockerfile = "Dockerfile"
  }
}

resource "docker_container" "backend" {
  count = var.backend_replicas
  name  = "${local.container_prefix}-backend${count.index == 0 ? "" : "-${count.index}"}"
  image = docker_image.backend.image_id
  
  restart = "unless-stopped"
  
  env = [
    "NODE_ENV=production",
    "PORT=5001",
    "DATABASE_URL=postgresql://postgres:password@database:5432/bankdb",
    "DB_HOST=database",
    "DB_PORT=5432",
    "DB_NAME=bankdb",
    "DB_USER=postgres",
    "DB_PASSWORD=password",
    "JWT_SECRET=your-secret-key-change-in-production",
    "CORS_ORIGIN=http://localhost",
    "SIMULATE_OVERLOAD=${var.simulate_overload}"
  ]
  
  ports {
    internal = 5001
    external = var.backend_port + count.index
  }
  
  networks_advanced {
    name    = docker_network.bank_network.name
    aliases = [count.index == 0 ? "bank-app-dev-backend" : "bank-app-dev-backend-${count.index}"]
  }
  
  healthcheck {
    test     = ["CMD", "node", "-e", "require('http').get('http://localhost:5001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
    interval = "30s"
    timeout  = "10s"
    retries  = 3
  }
  
  depends_on = [docker_container.database]
  
  labels {
    label = "project"
    value = var.project_name
  }
  
  labels {
    label = "environment"
    value = var.environment
  }
  
  labels {
    label = "component"
    value = "backend"
  }
}

# Frontend Container
resource "docker_image" "frontend" {
  name = "${var.project_name}-frontend:latest"
  
  build {
    context    = "../frontend"
    dockerfile = "Dockerfile"
  }
}

resource "docker_container" "frontend" {
  name  = "${local.container_prefix}-frontend"
  image = docker_image.frontend.image_id
  
  restart = "unless-stopped"
  
  ports {
    internal = 80
    external = var.frontend_port
  }
  
  networks_advanced {
    name    = docker_network.bank_network.name
    aliases = ["frontend"]
  }
  
  healthcheck {
    test     = ["CMD", "wget", "--spider", "-q", "http://localhost"]
    interval = "30s"
    timeout  = "10s"
    retries  = 3
  }
  
  depends_on = [docker_container.backend]
  
  labels {
    label = "project"
    value = var.project_name
  }
  
  labels {
    label = "environment"
    value = var.environment
  }
  
  labels {
    label = "component"
    value = "frontend"
  }
}

# Outputs
output "database_container_id" {
  description = "ID of the database container"
  value       = docker_container.database.id
}

output "database_port" {
  description = "External port for database access"
  value       = var.db_port
}

output "backend_container_ids" {
  description = "IDs of all backend container replicas"
  value       = docker_container.backend[*].id
}

output "backend_urls" {
  description = "URLs to access backend API replicas"
  value       = [for i in range(var.backend_replicas) : "http://localhost:${var.backend_port + i}"]
}

output "frontend_container_id" {
  description = "ID of the frontend container"
  value       = docker_container.frontend.id
}

output "frontend_url" {
  description = "URL to access the application"
  value       = "http://localhost:${var.frontend_port}"
}

output "network_name" {
  description = "Name of the Docker network"
  value       = docker_network.bank_network.name
}

output "all_container_ids" {
  description = "All container IDs"
  value = {
    database = docker_container.database.id
    backend  = docker_container.backend[*].id
    frontend = docker_container.frontend.id
  }
}