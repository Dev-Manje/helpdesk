# HelpDesk Docker Deployment Guide

## Overview

This guide provides complete instructions for deploying the HelpDesk application using Docker on Windows 11. The deployment uses Docker Compose to orchestrate multiple services including the React frontend, FastAPI backend, MongoDB database, and Rasa chatbot.

## Prerequisites

### Hardware Requirements
- **CPU**: 4+ cores (AMD Ryzen 5 or Intel i5 minimum)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB+ free space (SSD preferred)
- **Network**: Stable internet connection

### Software Requirements
- **Windows 11 Pro or Enterprise** (required for Hyper-V/WSL2)
- **Docker Desktop 4.0+** with WSL2 backend
- **Windows Subsystem for Linux 2 (WSL2)**
- **PowerShell 7.0+** (included with Windows 11)

### Docker Desktop Setup
1. Download and install Docker Desktop for Windows
2. Enable WSL2 backend during installation
3. Configure Docker Desktop:
   - Go to Settings → Resources → Advanced
   - Allocate at least 4GB RAM and 2 CPU cores
   - Set disk image size to 50GB+

## Quick Start

### 1. Clone and Setup
```powershell
# Clone the repository
git clone <your-repo-url>
cd helpdesk

# Copy environment file and configure
Copy-Item .env.example .env
# Edit .env with your actual values
notepad .env
```

### 2. Deploy Application
```powershell
# Start all services
.\deploy.ps1 -Start

# Or use docker-compose directly
docker-compose up -d
```

### 3. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Detailed Deployment Steps

### Environment Configuration

1. **Copy environment template**:
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Edit .env file** with your production values:
   ```env
   MONGO_ROOT_PASSWORD=your_secure_password_here
   SECRET_KEY=your_32_character_secret_key_here
   ```

### Database Initialization

The MongoDB container automatically initializes with:
- Required collections and indexes
- Default categories and departments
- SLA rules configuration
- Sample data structure

### Service Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (React)       │◄──►│   (FastAPI)     │
│   Port: 3000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────────────────┼───────────────────────┐
                                 ▼                       ▼
                    ┌─────────────────┐    ┌─────────────────┐
                    │   MongoDB       │    │   Rasa Actions  │
                    │   Port: 27017   │    │   Port: 5055    │
                    └─────────────────┘    └─────────────────┘
```

## Management Commands

### Using PowerShell Script

```powershell
# Start services
.\deploy.ps1 -Start

# Stop services
.\deploy.ps1 -Stop

# Restart services
.\deploy.ps1 -Restart

# View logs
.\deploy.ps1 -Logs

# View specific service logs
.\deploy.ps1 -Logs -Service backend

# Build images
.\deploy.ps1 -Build

# Clean environment
.\deploy.ps1 -Clean
```

### Using Docker Compose Directly

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose build --no-cache

# Scale services (if needed)
docker-compose up -d --scale backend=2
```

## Production Configuration

### Security Considerations

1. **Change default passwords** in `.env` file
2. **Use strong SECRET_KEY** (minimum 32 characters)
3. **Configure CORS_ORIGINS** for production domain
4. **Enable HTTPS** in production (add reverse proxy)

### Performance Tuning

1. **Resource allocation** in Docker Desktop:
   - RAM: 8GB+ for production
   - CPU: 4+ cores
   - Disk: 50GB+ for database

2. **MongoDB optimization**:
   - Persistent volumes for data
   - Connection pooling configured
   - Indexes created automatically

### Monitoring

```powershell
# Check service health
docker-compose ps

# Monitor resource usage
docker stats

# View specific logs
docker-compose logs backend
docker-compose logs mongodb
```

## Backup and Recovery

### Database Backup

```powershell
# Create backup
docker exec helpdesk_mongodb mongodump --db helpdesk --out /backup

# Copy backup to host
docker cp helpdesk_mongodb:/backup ./mongodb_backup

# Restore from backup
docker cp ./mongodb_backup helpdesk_mongodb:/backup
docker exec helpdesk_mongodb mongorestore --db helpdesk /backup/helpdesk
```

### Volume Backup

```powershell
# Backup MongoDB data volume
docker run --rm -v helpdesk_mongodb_data:/data -v ${PWD}:/backup alpine tar czf /backup/mongodb_data.tar.gz -C /data .
```

## Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```powershell
   # Check what's using ports
   netstat -ano | findstr :3000
   netstat -ano | findstr :8000
   netstat -ano | findstr :27017
   ```

2. **Docker not starting**:
   - Ensure WSL2 is enabled
   - Restart Docker Desktop
   - Check Windows Hyper-V is enabled

3. **Build failures**:
   ```powershell
   # Clear Docker cache
   docker system prune -a
   # Rebuild without cache
   docker-compose build --no-cache
   ```

4. **Database connection issues**:
   ```powershell
   # Check MongoDB logs
   docker-compose logs mongodb
   # Test connection
   docker exec -it helpdesk_mongodb mongo --eval "db.stats()"
   ```

### Logs and Debugging

```powershell
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb

# Export logs for analysis
docker-compose logs > deployment_logs.txt
```

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Strong passwords set
- [ ] SSL/HTTPS configured (recommended)
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring alerts set up
- [ ] Regular security updates scheduled

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Docker Desktop logs
3. Check application logs using the commands above
4. Ensure all prerequisites are met

## Security Notes

- Change all default passwords before production use
- Use environment-specific `.env` files
- Regularly update Docker images
- Monitor for security vulnerabilities
- Implement proper backup procedures
- Consider using Docker secrets for sensitive data in production