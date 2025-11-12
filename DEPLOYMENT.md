# Production Deployment Guide 🚀

Complete guide for deploying the Exchange Campaign Manager Bot to production.

## Prerequisites ✅

- Linux server (Ubuntu 20.04+ or similar)
- Docker and Docker Compose installed
- Domain name pointed to your server
- SSL certificate (Let's Encrypt recommended)
- Telegram Bot Token
- Admin Telegram User IDs

## Deployment Options

### Option 1: Docker Compose (Recommended) 🐳

Best for: Simple deployment, easy updates, production-ready

### Option 2: PM2 with Node.js 📦

Best for: Direct Node.js deployment, more control

### Option 3: Systemd Service 🔧

Best for: Native Linux service, maximum control

---

## Option 1: Docker Compose Deployment

### Step 1: Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Step 2: Clone/Upload Project

```bash
# Create directory
mkdir -p /opt/exchange-bot
cd /opt/exchange-bot

# Upload files or clone from git
# git clone https://github.com/yourusername/exchange-bot.git .
```

### Step 3: Configure Environment

```bash
# Copy and edit .env file
cp .env.example .env
nano .env
```

Update with production values:
```env
BOT_TOKEN=your_production_bot_token
ADMIN_IDS=123456789,987654321
DEFAULT_CHANNEL=@yourchannel
BASE_URL=https://track.yourdomain.com
PORT=3000
NODE_ENV=production
```

### Step 4: Set Up Directories

```bash
# Create data and logs directories
mkdir -p data logs

# Set permissions
chmod 755 data logs
```

### Step 5: Deploy with Docker Compose

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### Step 6: Set Up Reverse Proxy (Nginx)

```bash
# Install nginx
sudo apt install nginx -y

# Create nginx config
sudo nano /etc/nginx/sites-available/exchange-bot
```

Add configuration:
```nginx
server {
    listen 80;
    server_name track.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/exchange-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: Set Up SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d track.yourdomain.com

# Auto-renewal is set up automatically
```

### Step 8: Configure Firewall

```bash
# UFW firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Step 9: Set Up Automatic Backups

```bash
# Create backup script
sudo nano /opt/exchange-bot/backup-cron.sh
```

Add:
```bash
#!/bin/bash
cd /opt/exchange-bot
./scripts/backup.sh
# Optional: Upload to cloud storage
# aws s3 cp ./backups/ s3://your-bucket/exchange-bot-backups/ --recursive
```

Make executable:
```bash
chmod +x /opt/exchange-bot/backup-cron.sh
```

Add to crontab:
```bash
crontab -e
```

Add line:
```
0 2 * * * /opt/exchange-bot/backup-cron.sh >> /var/log/exchange-bot-backup.log 2>&1
```

### Step 10: Monitoring Setup

```bash
# Install monitoring tools
sudo apt install netdata -y

# Or use external monitoring
# Set up health check with UptimeRobot, Pingdom, etc.
# Monitor: https://track.yourdomain.com/healthz
```

---

## Option 2: PM2 Deployment

### Step 1: Install Node.js

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### Step 2: Deploy Application

```bash
# Navigate to project
cd /opt/exchange-bot

# Install dependencies
npm ci --production

# Start with PM2
pm2 start src/index.js --name exchange-bot

# Save PM2 configuration
pm2 save

# Set up auto-start on boot
pm2 startup
# Follow the instructions provided
```

### Step 3: PM2 Management

```bash
# View logs
pm2 logs exchange-bot

# Restart
pm2 restart exchange-bot

# Stop
pm2 stop exchange-bot

# Monitor
pm2 monit

# Status
pm2 status
```

---

## Option 3: Systemd Service

### Step 1: Create Service File

```bash
sudo nano /etc/systemd/system/exchange-bot.service
```

Add:
```ini
[Unit]
Description=Exchange Campaign Manager Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/exchange-bot
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=exchange-bot

[Install]
WantedBy=multi-user.target
```

### Step 2: Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable auto-start
sudo systemctl enable exchange-bot

# Start service
sudo systemctl start exchange-bot

# Check status
sudo systemctl status exchange-bot

# View logs
sudo journalctl -u exchange-bot -f
```

---

## Post-Deployment Checklist ✅

### 1. Verify Bot Functionality

```
# Send to your bot:
/start
/health
/campaigns
```

### 2. Test Redirect Service

Visit: `https://track.yourdomain.com/healthz`

Should return JSON with status "OK"

### 3. Test Link Creation and Redirect

```
/newcampaign
# Create test campaign

/newlink 1 @testchannel "Test"
# Generate test link

# Visit the short link in browser
# Should redirect to affiliate URL
```

### 4. Set Up Monitoring

- [ ] Health check endpoint monitored (UptimeRobot, Pingdom)
- [ ] Server monitoring (CPU, RAM, disk)
- [ ] Log monitoring
- [ ] SSL certificate expiration alerts

### 5. Configure Backups

- [ ] Database backups scheduled
- [ ] Backup verification script
- [ ] Off-site backup storage (optional)

### 6. Security Hardening

```bash
# Disable password authentication (use SSH keys only)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Update regularly
sudo apt update && sudo apt upgrade -y

# Set up fail2ban
sudo apt install fail2ban -y
```

### 7. Performance Optimization

```bash
# For Docker, adjust resources in docker-compose.yml
# For PM2, configure clustering if needed

# Monitor database size
du -h app.db

# Optimize database periodically
sqlite3 app.db "VACUUM;"
```

---

## Updating the Application 🔄

### Docker Compose Method

```bash
cd /opt/exchange-bot

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

### PM2 Method

```bash
cd /opt/exchange-bot

# Pull latest code
git pull

# Install any new dependencies
npm ci --production

# Restart
pm2 restart exchange-bot
```

### Systemd Method

```bash
cd /opt/exchange-bot

# Pull latest code
git pull

# Install dependencies
npm ci --production

# Restart service
sudo systemctl restart exchange-bot
```

---

## Troubleshooting 🔧

### Bot Not Starting

```bash
# Check logs
docker-compose logs         # Docker
pm2 logs exchange-bot       # PM2
journalctl -u exchange-bot  # Systemd

# Common issues:
# - BOT_TOKEN not set
# - Port 3000 already in use
# - Database permissions
```

### High CPU/Memory Usage

```bash
# Monitor resources
docker stats               # Docker
pm2 monit                  # PM2
htop                       # System

# Optimize:
# - Check for infinite loops in logs
# - Optimize database queries
# - Increase server resources
```

### Database Issues

```bash
# Check database
sqlite3 app.db ".schema"

# Repair database
sqlite3 app.db "PRAGMA integrity_check;"

# Restore from backup
./scripts/restore.sh backups/app_db_20250115_120000.db
```

### SSL Certificate Issues

```bash
# Test certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check nginx config
sudo nginx -t
```

---

## Scaling Considerations 📈

### Single Server Limits

- Up to ~1M clicks/day
- 100+ campaigns
- Multiple channels
- 1-2 GB RAM sufficient

### When to Scale

If you exceed:
- 10M clicks/day
- 1000+ campaigns
- Need high availability

Consider:
- Load balancer with multiple instances
- PostgreSQL instead of SQLite
- Redis caching layer
- Separate bot and web servers

---

## Maintenance Schedule 📅

### Daily
- Check health endpoint
- Monitor error logs
- Review click statistics

### Weekly
- Check disk space
- Review backup logs
- Update if patches available

### Monthly
- Update dependencies
- Optimize database
- Review server resources
- Audit security

### Quarterly
- Full system audit
- Performance review
- Capacity planning
- Documentation update

---

## Emergency Procedures 🚨

### Bot Down

1. Check service status
2. Review logs for errors
3. Restart service
4. If persists, restore from backup
5. Check Telegram API status

### Database Corruption

1. Stop service
2. Restore from latest backup
3. Verify integrity
4. Restart service

### Server Compromise

1. Disconnect from network
2. Change all credentials
3. Audit logs
4. Restore from known good backup
5. Update security measures

---

## Support Resources 📚

- [README.md](README.md) - Main documentation
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Setup instructions
- [EXAMPLES.md](EXAMPLES.md) - Usage examples
- [CHANGELOG.md](CHANGELOG.md) - Version history

---

**Need help?** Open an issue on GitHub or contact support.

**Production ready?** Follow this checklist completely before going live!
