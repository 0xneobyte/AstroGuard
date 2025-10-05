#!/bin/bash

# ASTROGUARD DigitalOcean Deployment Script
# Run this on your DigitalOcean droplet after initial setup

set -e  # Exit on error

echo "🚀 Starting ASTROGUARD deployment..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/0xneobyte/AstroNuts-Nasa-Space-Apps.git"
DEPLOY_DIR="/var/www/AstroNuts-Nasa-Space-Apps"
DOMAIN=""  # Leave empty for IP-based deployment

echo -e "${BLUE}Step 1: Installing system dependencies...${NC}"
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv nodejs npm nginx git curl

# Install PM2
npm install -g pm2

echo -e "${GREEN}✓ System dependencies installed${NC}"

echo -e "${BLUE}Step 2: Cloning repository...${NC}"
if [ -d "$DEPLOY_DIR" ]; then
    echo "Repository already exists, pulling latest changes..."
    cd $DEPLOY_DIR
    git pull
else
    git clone $REPO_URL $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

echo -e "${GREEN}✓ Repository ready${NC}"

echo -e "${BLUE}Step 3: Setting up backend...${NC}"
cd $DEPLOY_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}⚠ Backend .env file not found!${NC}"
    echo "Creating template .env file..."
    cat > .env << 'EOF'
NASA_API_KEY=DEMO_KEY
NASA_BASE_URL=https://api.nasa.gov/neo/rest/v1
OPENAI_API_KEY=your_openai_key_here
EOF
    echo -e "${RED}⚠ Please edit backend/.env and add your OpenAI API key!${NC}"
    echo "Run: nano $DEPLOY_DIR/backend/.env"
    read -p "Press enter when you've updated the .env file..."
fi

echo -e "${GREEN}✓ Backend setup complete${NC}"

echo -e "${BLUE}Step 4: Setting up frontend...${NC}"
cd $DEPLOY_DIR/frontend

# Install Node dependencies
npm install

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

# Create production .env
if [ -z "$DOMAIN" ]; then
    API_URL="http://$SERVER_IP:5000"
else
    API_URL="https://$DOMAIN"
fi

echo "VITE_API_URL=$API_URL" > .env.production
echo -e "${BLUE}API URL set to: $API_URL${NC}"

# Build frontend
npm run build

echo -e "${GREEN}✓ Frontend built successfully${NC}"

echo -e "${BLUE}Step 5: Configuring Nginx...${NC}"

# Create Nginx config
cat > /etc/nginx/sites-available/astroguard << EOF
server {
    listen 80;
    server_name ${DOMAIN:-$SERVER_IP};

    # Frontend
    location / {
        root $DEPLOY_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Enable Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/astroguard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured${NC}"

echo -e "${BLUE}Step 6: Starting backend with PM2...${NC}"
cd $DEPLOY_DIR/backend

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

# Stop if already running
pm2 stop astroguard-backend 2>/dev/null || true

# Start backend
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Setup PM2 startup
pm2 startup systemd -u root --hp /root

echo -e "${GREEN}✓ Backend started with PM2${NC}"

echo -e "${BLUE}Step 7: Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

echo -e "${GREEN}✓ Firewall configured${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Your ASTROGUARD application is now running at:${NC}"
if [ -z "$DOMAIN" ]; then
    echo -e "${GREEN}http://$SERVER_IP${NC}"
else
    echo -e "${GREEN}http://$DOMAIN${NC}"
fi
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "  Check backend status: pm2 status"
echo "  View backend logs:    pm2 logs astroguard-backend"
echo "  Restart backend:      pm2 restart astroguard-backend"
echo "  Check Nginx status:   systemctl status nginx"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify the AI chatbot is working"
echo "2. (Optional) Setup SSL with: certbot --nginx -d $DOMAIN"
echo "3. Monitor logs: pm2 logs"
echo ""
echo -e "${GREEN}Happy asteroid tracking! 🌍☄️${NC}"
