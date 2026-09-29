# Healthcare Portal - Deployment Guide

This guide provides step-by-step instructions for deploying the Healthcare Portal application.

## Prerequisites

- **Docker/Rancher Desktop**: Installed and running
- **Docker Compose**: Included with Docker Desktop/Rancher Desktop
- **Ports Available**: 80 (frontend), 5001 (backend), 5432 (database)
- **System Requirements**: 4GB RAM minimum, 10GB disk space

## Quick Start

### 1. Fix Docker Corruption (If Needed)

If you encounter Docker I/O errors or corrupted snapshots:

**Option A: Factory Reset via Rancher Desktop UI** (Recommended)
1. Open Rancher Desktop
2. Go to Troubleshooting
3. Click "Factory Reset" or "Reset Kubernetes"
4. Confirm and wait for restart

**Option B: Manual Reset**
```bash
# Quit Rancher Desktop completely first
rm -rf ~/Library/Application\ Support/rancher-desktop
rm -rf ~/.rd
rm -rf ~/.local/share/rancher-desktop
# Restart Rancher Desktop
```

### 2. Deploy Healthcare Application

```bash
cd health-app
chmod +x deploy-healthcare-app.sh
./deploy-healthcare-app.sh
```

This script will:
- ✅ Check Docker is running
- ✅ Clean up any existing containers
- ✅ Pull base images (postgres, node, nginx)
- ✅ Build custom healthcare images
- ✅ Start all services
- ✅ Initialize the database
- ✅ Display access information

### 3. Verify Deployment

```bash
# Check all containers are running
docker-compose ps

# Expected output:
# healthcare-db        Up (healthy)
# healthcare-backend   Up (healthy)
# healthcare-frontend  Up (healthy)
```

### 4. Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:5001/api
- **Database**: localhost:5437

**Demo Credentials:**
- Username: `demo`
- Password: `demo123`

## Manual Deployment Steps

If you prefer manual deployment:

### Step 1: Stop Existing Containers

```bash
cd health-app
docker-compose down -v
```

### Step 2: Pull Base Images

```bash
docker-compose pull
```

### Step 3: Build Custom Images

```bash
docker-compose build --no-cache
```

### Step 4: Start Services

```bash
docker-compose up -d
```

### Step 5: Initialize Database

```bash
docker-compose exec healthcare-backend npm run init-db
```

### Step 6: Verify

```bash
docker-compose ps
docker-compose logs -f
```

## Container Details

### healthcare-db (PostgreSQL 16)
- **Image**: postgres:16-alpine
- **Port**: 5432
- **Database**: healthcaredb
- **User**: postgres
- **Password**: postgres123
- **Volume**: healthcare_postgres_data

### healthcare-backend (Node.js)
- **Build**: ./backend
- **Port**: 5001
- **Environment**: 
  - DATABASE_URL=postgresql://postgres:postgres123@healthcare-db:5432/healthcaredb
  - JWT_SECRET=your-secret-key-change-in-production
  - PORT=5001
- **Depends on**: healthcare-db

### healthcare-frontend (Nginx + React)
- **Build**: ./frontend
- **Port**: 80
- **Depends on**: healthcare-backend

## Environment Configuration

### Backend Environment Variables

Create `backend/.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres123@healthcare-db:5432/healthcaredb
JWT_SECRET=your-secret-key-change-in-production
PORT=5001
NODE_ENV=production
```

### Frontend Environment Variables

The frontend uses `frontend/.env.production`:

```env
VITE_API_URL=http://localhost:5001/api
```

## Database Schema

The healthcare database includes:

### Tables
1. **patients** - Patient demographic information
2. **medical_records** - Patient medical history
3. **appointments** - Scheduled and completed appointments
4. **insurance_claims** - Insurance claim submissions and processing

### Sample Data
The database is initialized with demo data:
- 1 demo patient account
- Sample medical records
- Example appointments
- Test insurance claims

## Testing the Deployment

### Automated Testing

```bash
cd health-app
chmod +x test-healthcare-workflows.sh
./test-healthcare-workflows.sh
```

This will test:
- ✅ Infrastructure (containers, database)
- ✅ Patient authentication
- ✅ Medical records management
- ✅ Appointment scheduling
- ✅ Insurance claims processing
- ✅ Data integrity
- ✅ Frontend accessibility

### Manual Testing

1. **Patient Registration**
   - Navigate to http://localhost:8080
   - Click "Register"
   - Fill in patient information
   - Submit and verify account creation

2. **Patient Login**
   - Use demo credentials (demo/demo123)
   - Verify dashboard loads

3. **Medical Records**
   - View medical records
   - Update medical information
   - Verify changes persist

4. **Appointments**
   - Schedule new appointment
   - View appointment history
   - Update appointment status

5. **Insurance Claims**
   - Submit new claim
   - View claim status
   - Test coverage calculator

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs healthcare-backend
docker-compose logs healthcare-db
docker-compose logs healthcare-frontend

# Restart specific service
docker-compose restart healthcare-backend
```

### Database Connection Issues

```bash
# Check database is running
docker-compose ps healthcare-db

# Test database connection
docker exec healthcare-db psql -U postgres -d healthcaredb -c "SELECT 1"

# Reinitialize database
docker-compose exec healthcare-backend npm run init-db
```

### Port Already in Use

```bash
# Find process using port 8080
lsof -i :8080

# Find process using port 5001
lsof -i :5001

# Kill process (replace PID)
kill -9 <PID>
```

### Image Build Failures

```bash
# Clean Docker cache
docker builder prune -af

# Rebuild without cache
docker-compose build --no-cache
```

### Frontend Not Loading

```bash
# Check nginx logs
docker-compose logs healthcare-frontend

# Verify backend is accessible
curl http://localhost:5001/api/health

# Restart frontend
docker-compose restart healthcare-frontend
```

## Maintenance Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f healthcare-backend

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Services

```bash
# All services
docker-compose restart

# Specific service
docker-compose restart healthcare-backend
```

### Stop Application

```bash
# Stop containers (keep data)
docker-compose stop

# Stop and remove containers (keep data)
docker-compose down

# Stop, remove containers and volumes (delete data)
docker-compose down -v
```

### Update Application

```bash
# Pull latest code changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup Database

```bash
# Create backup
docker exec healthcare-db pg_dump -U postgres healthcaredb > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker exec -i healthcare-db psql -U postgres healthcaredb < backup_20260526_120000.sql
```

## Production Deployment

For production deployment:

1. **Update Environment Variables**
   - Change JWT_SECRET to a strong random value
   - Update database password
   - Set NODE_ENV=production

2. **Use Docker Secrets**
   ```yaml
   secrets:
     db_password:
       file: ./secrets/db_password.txt
   ```

3. **Enable HTTPS**
   - Add SSL certificates
   - Configure nginx for HTTPS
   - Update VITE_API_URL to use HTTPS

4. **Set Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
   ```

5. **Configure Health Checks**
   - Already configured in docker-compose.yml
   - Monitor with external tools

6. **Set Up Monitoring**
   - Application logs
   - Database performance
   - Container health
   - API response times

7. **Configure Backups**
   - Automated database backups
   - Volume snapshots
   - Disaster recovery plan

## Security Considerations

- ✅ Change default passwords
- ✅ Use environment variables for secrets
- ✅ Enable HTTPS in production
- ✅ Implement rate limiting
- ✅ Regular security updates
- ✅ Database access restrictions
- ✅ Input validation and sanitization
- ✅ JWT token expiration
- ✅ CORS configuration

## Performance Optimization

- Use connection pooling (already configured)
- Enable database query caching
- Implement Redis for session storage
- Use CDN for static assets
- Enable gzip compression (already configured)
- Optimize database indexes
- Monitor and optimize slow queries

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review troubleshooting section
3. Verify all prerequisites are met
4. Check Docker/Rancher Desktop status
5. Ensure ports are available

## Next Steps

After successful deployment:
1. ✅ Test all healthcare workflows
2. ✅ Configure production environment
3. ✅ Set up monitoring and alerting
4. ✅ Implement backup strategy
5. ✅ Review security settings
6. ✅ Train users on the system
7. ✅ Document custom configurations