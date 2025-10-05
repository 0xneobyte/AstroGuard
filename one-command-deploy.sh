#!/bin/bash

# 🚀 ASTROGUARD - One Command Deployment
# Copy and paste this entire script into your DigitalOcean droplet terminal

echo "🚀 Starting ASTROGUARD deployment..."

# Install dependencies
apt update && apt upgrade -y
apt install -y python3 python3-pip python3-venv nodejs npm nginx git curl
npm install -g pm2

# Clone repository
cd /var/www
git clone https://github.com/0xneobyte/AstroNuts-Nasa-Space-Apps.git
cd AstroNuts-Nasa-Space-Apps

# Setup backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create backend .env
echo "NASA_API_KEY=DEMO_KEY" > .env
echo "NASA_BASE_URL=https://api.nasa.gov/neo/rest/v1" >> .env
echo "OPENAI_API_KEY=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" >> .env

# Start backend
pm2 start "venv/bin/uvicorn main:app --host 0.0.0.0 --port 5000" --name astroguard-backend
pm2 save
pm2 startup

# Setup frontend
cd ../frontend
npm install

# Create frontend .env.production with server IP
SERVER_IP=$(curl -s ifconfig.me)
echo "VITE_API_URL=http://$SERVER_IP" > .env.production

# Build frontend
npm run build

# Configure Nginx
cat > /etc/nginx/sites-available/astroguard << 'NGINXCONF'
server {
    listen 80;
    server_name _;

    location / {
        root /var/www/AstroNuts-Nasa-Space-Apps/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
NGINXCONF

ln -sf /etc/nginx/sites-available/astroguard /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# Create update script
cat > /root/update-astroguard.sh << 'UPDATESCRIPT'
#!/bin/bash
cd /var/www/AstroNuts-Nasa-Space-Apps
git pull
cd backend
source venv/bin/activate
pip install -r requirements.txt -q
pm2 restart astroguard-backend
cd ../frontend
npm install --silent
npm run build
echo "✅ Update complete! Site: http://$(curl -s ifconfig.me)"
UPDATESCRIPT

chmod +x /root/update-astroguard.sh

# Done!
SERVER_IP=$(curl -s ifconfig.me)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Your site: http://$SERVER_IP"
echo ""
echo "📝 To update later:"
echo "   1. Push changes: git push"
echo "   2. On server: /root/update-astroguard.sh"
echo ""
echo "🔍 Useful commands:"
echo "   pm2 status"
echo "   pm2 logs astroguard-backend"
echo "   pm2 restart astroguard-backend"
echo ""
