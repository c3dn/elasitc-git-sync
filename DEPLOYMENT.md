# Deployment Guide

This guide covers deploying Elastic Git Sync in various environments.

## Production Deployment

### Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose installed
- Domain name (optional but recommended)
- SSL certificate (Let's Encrypt recommended)

### Basic Production Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/elastic-git-sync.git
   cd elastic-git-sync
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env
   ```

   Update the following:
   ```env
   ENCRYPTION_KEY=your-very-secure-random-string-at-least-32-chars
   PUBLIC_POCKETBASE_URL=https://api.yourdomain.com
   ORIGIN=https://yourdomain.com
   ```

3. **Update docker-compose.yml for production**
   ```yaml
   version: '3.8'

   services:
     pocketbase:
       image: ghcr.io/muchobien/pocketbase:latest
       container_name: elastic-git-sync-backend
       restart: always
       ports:
         - "127.0.0.1:8090:8090"  # Only expose locally
       volumes:
         - ./backend/pb_data:/pb/pb_data
         - ./backend/pb_migrations:/pb/pb_migrations
         - ./backend/pb_hooks:/pb/pb_hooks
       environment:
         - ENCRYPTION_KEY=${ENCRYPTION_KEY}

     frontend:
       build:
         context: ./frontend
         dockerfile: Dockerfile
       container_name: elastic-git-sync-frontend
       restart: always
       ports:
         - "127.0.0.1:3000:3000"  # Only expose locally
       environment:
         - PUBLIC_POCKETBASE_URL=${PUBLIC_POCKETBASE_URL}
         - ORIGIN=${ORIGIN}
       depends_on:
         - pocketbase
   ```

4. **Start the services**
   ```bash
   docker-compose up -d
   ```

### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/elastic-git-sync`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # PocketBase API
    location /api/ {
        proxy_pass http://127.0.0.1:8090/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # PocketBase Admin UI (restrict access!)
    location /_/ {
        allow 192.168.1.0/24;  # Your internal network
        deny all;
        proxy_pass http://127.0.0.1:8090/_/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/elastic-git-sync /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
# Install Certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically
```

### Backup Strategy

**Automated backup script** (`backup.sh`):

```bash
#!/bin/bash

BACKUP_DIR="/backups/elastic-git-sync"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PocketBase database
docker-compose exec -T pocketbase sh -c "cd /pb/pb_data && tar czf - ." > "$BACKUP_DIR/pb_data_$DATE.tar.gz"

# Keep only last 7 days
find $BACKUP_DIR -name "pb_data_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/pb_data_$DATE.tar.gz"
```

Schedule with cron:
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/elastic-git-sync-backup.log 2>&1
```

### Monitoring

**Health check script** (`healthcheck.sh`):

```bash
#!/bin/bash

# Check frontend
if ! curl -sf http://localhost:3000 > /dev/null; then
    echo "Frontend is down!"
    # Send alert (email, Slack, etc.)
fi

# Check backend
if ! curl -sf http://localhost:8090/api/health > /dev/null; then
    echo "Backend is down!"
    # Send alert
fi
```

Schedule health checks:
```bash
*/5 * * * * /path/to/healthcheck.sh >> /var/log/elastic-git-sync-health.log 2>&1
```

### Log Management

Configure log rotation in `/etc/logrotate.d/elastic-git-sync`:

```
/var/log/elastic-git-sync*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 root root
    sharedscripts
}
```

### Security Hardening

1. **Firewall rules**
   ```bash
   # Allow only HTTP/HTTPS
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

2. **Restrict PocketBase admin**
   - Only allow access from internal IPs
   - Use VPN for remote access
   - Change default admin credentials immediately

3. **Environment variables**
   - Never commit `.env` to git
   - Use strong encryption keys
   - Rotate API keys regularly

4. **Docker security**
   ```bash
   # Run containers as non-root
   # Add to docker-compose.yml
   user: "1000:1000"
   ```

### Updates

To update to a new version:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Docker Swarm Deployment

For high availability:

```yaml
version: '3.8'

services:
  pocketbase:
    image: ghcr.io/muchobien/pocketbase:latest
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    volumes:
      - pocketbase-data:/pb/pb_data
    networks:
      - elastic-git-sync

  frontend:
    image: your-registry/elastic-git-sync-frontend:latest
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
    networks:
      - elastic-git-sync

volumes:
  pocketbase-data:

networks:
  elastic-git-sync:
```

## Kubernetes Deployment

Example Kubernetes manifests available in the `k8s/` directory (to be added).

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs -f

# Verify environment variables
docker-compose config

# Check disk space
df -h
```

### Database corruption

```bash
# Stop services
docker-compose down

# Restore from backup
cd backend/pb_data
rm -rf *
tar xzf /backups/elastic-git-sync/pb_data_YYYYMMDD_HHMMSS.tar.gz

# Restart
docker-compose up -d
```

### Performance issues

- Increase Docker memory limits
- Add database indexes
- Enable caching in Nginx
- Use SSD storage for pb_data

## Maintenance

### Regular tasks

- **Weekly**: Review sync logs
- **Monthly**: Update dependencies
- **Quarterly**: Security audit
- **Annually**: Disaster recovery test

### Scaling considerations

- Use external database (PostgreSQL) for PocketBase (when supported)
- Add Redis for caching
- Use load balancer for multiple frontend instances
- Consider CDN for static assets

---

For more help, see the main [README](README.md) or open an issue.
