# 🚀 Git-Based Deployment to DigitalOcean

## Simple Git Push & Deploy Workflow

This guide shows you how to deploy by simply pushing to GitHub and pulling on your server.

---

## 🎯 Quick Setup (One-Time)

### 1. Initial Server Setup

SSH into your DigitalOcean droplet:
```bash
ssh root@your-droplet-ip
```

Install dependencies:
```bash
# Update system
apt update && apt upgrade -y

# Install Python, Node, Nginx, Git
apt install -y python3 python3-pip python3-venv nodejs npm nginx git

# Install PM2 globally
npm install -g pm2
```

### 2. Clone Your Repository

```bash
cd /var/www
git clone https://github.com/0xneobyte/AstroNuts-Nasa-Space-Apps.git
cd AstroNuts-Nasa-Space-Apps
```

### 3. Setup Backend (One-Time)

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

Add your keys:
```bash
NASA_API_KEY=DEMO_KEY
NASA_BASE_URL=https://api.nasa.gov/neo/rest/v1
OPENAI_API_KEY=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
```

Save with `Ctrl+X`, `Y`, `Enter`

Start backend with PM2:
```bash
pm2 start "venv/bin/uvicorn main:app --host 0.0.0.0 --port 5000" --name astroguard-backend
pm2 save
pm2 startup
```

### 4. Setup Frontend (One-Time)

Get your server IP:
```bash
curl ifconfig.me
```

Build frontend:
```bash
cd /var/www/AstroNuts-Nasa-Space-Apps/frontend

# Install dependencies
npm install

# Create production environment file
echo "VITE_API_URL=http://$(curl -s ifconfig.me)" > .env.production

# Build
npm run build
```

### 5. Configure Nginx (One-Time)

```bash
nano /etc/nginx/sites-available/astroguard
```

Paste this config:
```nginx
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        root /var/www/AstroNuts-Nasa-Space-Apps/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
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

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Enable and start:
```bash
ln -s /etc/nginx/sites-available/astroguard /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site
nginx -t
systemctl restart nginx
```

### 6. Configure Firewall (One-Time)

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
```

---

## 🔄 Every Time You Make Changes (Simple Update)

### On Your Local Machine:

1. **Make your changes**
2. **Commit and push:**
   ```bash
   git add .
   git commit -m "Updated features"
   git push
   ```

### On Your Server:

```bash
cd /var/www/AstroNuts-Nasa-Space-Apps

# Pull latest code
git pull

# Update backend (if you changed Python code)
cd backend
source venv/bin/activate
pip install -r requirements.txt  # Only if you added packages
pm2 restart astroguard-backend

# Update frontend (if you changed React code)
cd ../frontend
npm install  # Only if you added packages
npm run build
```

**That's it!** Your changes are live.

---

## 📝 Quick Update Script

Create this script on your server for even faster updates:

```bash
nano /root/update-astroguard.sh
```

Paste this:
```bash
#!/bin/bash

echo "🔄 Updating ASTROGUARD..."

cd /var/www/AstroNuts-Nasa-Space-Apps

# Pull latest code
git pull

# Update backend
echo "🐍 Updating backend..."
cd backend
source venv/bin/activate
pip install -r requirements.txt -q
pm2 restart astroguard-backend

# Update frontend
echo "⚛️ Building frontend..."
cd ../frontend
npm install --silent
npm run build

echo "✅ Update complete! Visit http://$(curl -s ifconfig.me)"
```

Make it executable:
```bash
chmod +x /root/update-astroguard.sh
```

**Now just run:**
```bash
/root/update-astroguard.sh
```

---

## 🎯 Super Fast Workflow

### On Local Machine:
```bash
git add .
git commit -m "your changes"
git push
```

### On Server (SSH):
```bash
/root/update-astroguard.sh
```

**Done!** 🚀

---

## ⚠️ Important Notes

### Frontend API URL

Your frontend `.env.production` on the **server** should be:
```bash
VITE_API_URL=http://YOUR_DROPLET_IP
```

**NOT** `localhost:5000` - that won't work!

The Nginx config proxies `/api/*` to `localhost:5000` internally, so your frontend just calls:
- `http://YOUR_DROPLET_IP/api/asteroids`
- `http://YOUR_DROPLET_IP/api/ai/chat`

### Backend .env File

**Never commit `.env` to Git!** 

Your `.gitignore` should have:
```
backend/.env
frontend/.env
frontend/.env.production
```

Create `.env` manually on the server with your actual API keys.

---

## 🧪 Testing

After deployment:
```bash
# Check backend status
pm2 status

# View backend logs
pm2 logs astroguard-backend

# Test API directly
curl http://localhost:5000/api/asteroids

# Check Nginx
systemctl status nginx
```

Visit in browser: `http://YOUR_DROPLET_IP`

---

## 🐛 Troubleshooting

### Backend won't start
```bash
cd /var/www/AstroNuts-Nasa-Space-Apps/backend
source venv/bin/activate
python main.py  # Test manually
```

### AI Chatbot not working
```bash
# Check logs
pm2 logs astroguard-backend

# Verify OpenAI key
cat backend/.env | grep OPENAI

# Check frontend API URL
cat frontend/.env.production
```

### Frontend shows old version
```bash
# Clear browser cache, or
# Force rebuild
cd frontend
rm -rf dist node_modules
npm install
npm run build
```

### 502 Bad Gateway
```bash
pm2 restart astroguard-backend
pm2 logs astroguard-backend
```

---

## 💡 Pro Tips

1. **Setup GitHub Actions** (optional) - Auto-deploy on push
2. **Use PM2 logs** - `pm2 logs --lines 50` to see errors
3. **Monitor resources** - `pm2 monit` to watch CPU/memory
4. **Setup SSL** - Free with Let's Encrypt:
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx
   ```

---

## 📊 Typical Workflow

```
Local Machine                    Server
─────────────                    ──────

1. Edit code
2. Test locally
3. git push          ──────>     4. git pull
                                 5. npm run build
                                 6. pm2 restart
                                 7. ✅ Live!
```

---

## 🎉 You're Done!

Your workflow is now:
1. **Code locally**
2. **Push to GitHub**
3. **SSH to server**
4. **Run update script**

Simple as that! 🚀
