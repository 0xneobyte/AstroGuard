#!/bin/bash

# ASTROGUARD Quick Update Script
# Run this on your DigitalOcean server after pushing to GitHub

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔄 ASTROGUARD Update Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Change to project directory
cd /var/www/AstroNuts-Nasa-Space-Apps || exit 1

# Pull latest code
echo -e "${YELLOW}📥 Pulling latest code from GitHub...${NC}"
git pull
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Update backend
echo -e "${YELLOW}🐍 Updating backend...${NC}"
cd backend

# Activate virtual environment
source venv/bin/activate

# Install any new dependencies
pip install -r requirements.txt -q

# Restart backend
pm2 restart astroguard-backend

echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

# Update frontend
echo -e "${YELLOW}⚛️ Building frontend...${NC}"
cd ../frontend

# Install any new dependencies
npm install --silent

# Build production version
npm run build

echo -e "${GREEN}✓ Frontend built${NC}"
echo ""

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Update Complete!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}🌐 Your site: ${GREEN}http://$SERVER_IP${NC}"
echo ""
echo -e "${BLUE}Status:${NC}"
pm2 status
echo ""
echo -e "${BLUE}To view logs:${NC} pm2 logs astroguard-backend"
echo ""
