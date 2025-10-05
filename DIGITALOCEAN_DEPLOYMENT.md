# 🚀 DigitalOcean Deployment Guide

## Overview
This guide will help you deploy ASTROGUARD on DigitalOcean with a working AI chatbot.

## Architecture

```
┌─────────────────────────────────────────┐
│         DigitalOcean Droplet            │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐│
│  │   Frontend   │  │     Backend     ││
│  │  (Static)    │  │   (FastAPI)     ││
│  │   Port 80    │→ │   Port 5000     ││
│  └──────────────┘  └─────────────────┘│
│                                         │
│  Nginx (Reverse Proxy)                 │
└─────────────────────────────────────────┘
```

## Prerequisites

1. **DigitalOcean Droplet** (Ubuntu 22.04 LTS recommended)
   - Minimum: 1GB RAM, 1 vCPU
   - Recommended: 2GB RAM, 2 vCPU
   
2. **Domain Name** (optional but recommended)
   - Example: astroguard.yourdomain.com
   
3. **Your OpenAI API Key**

## Step-by-Step Deployment

### 1. Create DigitalOcean Droplet

1. Log into DigitalOcean
2. Click "Create" → "Droplets"
3. Choose:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($12/month - 2GB RAM)
   - **Datacenter**: Choose closest to your users
4. Add SSH key (recommended)
5. Create Droplet

### 2. Connect to Your Droplet

```bash
ssh root@your-droplet-ip
```

### 3. Install Dependencies

```bash
# Update system
apt update && apt upgrade -y

# Install Python 3.10+
apt install -y python3 python3-pip python3-venv

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install Nginx
apt install -y nginx

# Install Git
apt install -y git

# Install PM2 (Process Manager)
npm install -g pm2
```

### 4. Clone Your Repository

```bash
cd /var/www
git clone https://github.com/0xneobyte/AstroNuts-Nasa-Space-Apps.git
cd AstroNuts-Nasa-Space-Apps
```

### 5. Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
```

Add this to `.env`:
```bash
NASA_API_KEY=DEMO_KEY
NASA_BASE_URL=https://api.nasa.gov/neo/rest/v1
OPENAI_API_KEY=your_openai_key_here
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

### 6. Setup Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Create production .env
nano .env.production
```

Add this to `.env.production`:
```bash
# Replace with your actual domain or droplet IP
VITE_API_URL=http://your-droplet-ip:5000
# Or if using domain:
# VITE_API_URL=https://api.yourdomain.com
```

Build the frontend:
```bash
npm run build
```

### 7. Configure Nginx

Create Nginx configuration:
```bash
nano /etc/nginx/sites-available/astroguard
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-droplet-ip;  # or your domain

    # Frontend (Static files)
    location / {
        root /var/www/AstroNuts-Nasa-Space-Apps/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/astroguard /etc/nginx/sites-enabled/
nginx -t  # Test configuration
systemctl restart nginx
```

### 8. Start Backend with PM2

```bash
cd /var/www/AstroNuts-Nasa-Space-Apps/backend

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'astroguard-backend',
    script: 'venv/bin/uvicorn',
    args: 'main:app --host 0.0.0.0 --port 5000',
    cwd: '/var/www/AstroNuts-Nasa-Space-Apps/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
EOF

# Start the backend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Make PM2 start on system boot
pm2 startup
```

### 9. Configure Firewall

```bash
# Allow HTTP
ufw allow 80/tcp

# Allow HTTPS (if using SSL)
ufw allow 443/tcp

# Allow SSH
ufw allow 22/tcp

# Enable firewall
ufw enable
```

### 10. Test Your Deployment

1. Open browser: `http://your-droplet-ip`
2. Select an asteroid
3. Click the AI button
4. Test the chatbot!

## SSL/HTTPS Setup (Recommended)

### Using Let's Encrypt (Free SSL)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

Update `frontend/.env.production`:
```bash
VITE_API_URL=https://yourdomain.com
```

Rebuild frontend:
```bash
cd /var/www/AstroNuts-Nasa-Space-Apps/frontend
npm run build
```

## Environment Variables Quick Reference

### Frontend (.env.production)
```bash
# Development (localhost)
VITE_API_URL=http://localhost:5000

# Production (IP address)
VITE_API_URL=http://your-droplet-ip:5000

# Production (Domain with Nginx proxy)
VITE_API_URL=https://yourdomain.com

# Production (API subdomain)
VITE_API_URL=https://api.yourdomain.com
```

### Backend (.env)
```bash
NASA_API_KEY=DEMO_KEY
NASA_BASE_URL=https://api.nasa.gov/neo/rest/v1
OPENAI_API_KEY=sk-proj-your-key-here
```

## Useful PM2 Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs astroguard-backend

# Restart backend
pm2 restart astroguard-backend

# Stop backend
pm2 stop astroguard-backend

# Monitor resources
pm2 monit
```

## Updating Your Deployment

When you make changes:

```bash
cd /var/www/AstroNuts-Nasa-Space-Apps

# Pull latest code
git pull

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart astroguard-backend

# Update frontend
cd ../frontend
npm install
npm run build
```

## Troubleshooting

### Backend not starting
```bash
# Check logs
pm2 logs astroguard-backend

# Check if port 5000 is available
netstat -tulpn | grep 5000

# Test manually
cd /var/www/AstroNuts-Nasa-Space-Apps/backend
source venv/bin/activate
python main.py
```

### AI Chatbot not working
```bash
# Check backend logs
pm2 logs astroguard-backend

# Test API endpoint
curl http://localhost:5000/docs

# Check environment variables
cat backend/.env

# Rebuild frontend with correct API URL
cd frontend
cat .env.production
npm run build
```

### CORS Errors
The backend already has CORS enabled for all origins. If you still get CORS errors, check:
1. API URL in frontend `.env.production`
2. Nginx proxy configuration
3. Browser console for specific error

## Cost Estimate

**Monthly DigitalOcean Costs:**
- Droplet (2GB): $12/month
- Bandwidth: Free (1TB included)
- **Total**: ~$12/month

**OpenAI API Costs:**
- GPT-4o-mini: ~$0.001-0.005 per conversation
- 1000 conversations: ~$1-5/month

## Security Best Practices

1. **Use HTTPS** (Let's Encrypt free SSL)
2. **Keep OpenAI key secret** (never commit to git)
3. **Regular updates**: `apt update && apt upgrade`
4. **Firewall**: Only allow necessary ports
5. **SSH Key Auth**: Disable password login
6. **Backup**: Regular backups of code and .env files

## Performance Optimization

### Enable Nginx Gzip Compression
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

### Enable Nginx Caching
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Support

If you need help:
1. Check PM2 logs: `pm2 logs`
2. Check Nginx logs: `tail -f /var/log/nginx/error.log`
3. Check backend manually: `cd backend && source venv/bin/activate && python main.py`

---

**Your deployment is now complete! 🚀**
