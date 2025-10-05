# 🚀 QUICK DEPLOYMENT REFERENCE

## For DigitalOcean Hosting

### The Problem
Your AI chatbot works locally but won't work when hosted because `VITE_API_URL` is set to `http://localhost:5000`.

### The Solution
Update environment variables to point to your production backend URL.

---

## Option 1: Automatic Deployment (Easiest)

On your DigitalOcean droplet:
```bash
wget https://raw.githubusercontent.com/yourusername/AstroNuts-Nasa-Space-Apps/main/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

This script will:
✅ Install all dependencies
✅ Setup backend + frontend
✅ Configure Nginx
✅ Start services with PM2
✅ Configure firewall

---

## Option 2: Manual Configuration

### Step 1: Deploy Backend
On your droplet:
```bash
cd /var/www/AstroNuts-Nasa-Space-Apps/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env with your OpenAI key
nano .env
```

Add:
```bash
NASA_API_KEY=DEMO_KEY
OPENAI_API_KEY=sk-proj-your-key-here
```

Start with PM2:
```bash
pm2 start "uvicorn main:app --host 0.0.0.0 --port 5000" --name astroguard-backend
pm2 save
pm2 startup
```

### Step 2: Configure Frontend
Get your droplet IP: `curl ifconfig.me`

On your LOCAL machine:
```bash
cd frontend

# Create production environment file
echo "VITE_API_URL=http://YOUR_DROPLET_IP:5000" > .env.production

# Build
npm run build

# Upload dist/ folder to droplet
scp -r dist/ root@YOUR_DROPLET_IP:/var/www/AstroNuts-Nasa-Space-Apps/frontend/
```

### Step 3: Configure Nginx
On your droplet:
```bash
nano /etc/nginx/sites-available/astroguard
```

Add:
```nginx
server {
    listen 80;
    server_name YOUR_DROPLET_IP;

    location / {
        root /var/www/AstroNuts-Nasa-Space-Apps/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable and restart:
```bash
ln -s /etc/nginx/sites-available/astroguard /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

---

## Environment Variables Cheat Sheet

### Frontend (.env for local dev)
```bash
VITE_API_URL=http://localhost:5000
```

### Frontend (.env.production for deployment)
```bash
# Using IP
VITE_API_URL=http://YOUR_DROPLET_IP:5000

# Using domain (with Nginx proxy)
VITE_API_URL=https://yourdomain.com

# Using API subdomain
VITE_API_URL=https://api.yourdomain.com
```

### Backend (.env for all environments)
```bash
NASA_API_KEY=DEMO_KEY
OPENAI_API_KEY=sk-proj-your-actual-key-here
```

---

## Testing Checklist

After deployment:
- [ ] Visit http://YOUR_DROPLET_IP
- [ ] Site loads
- [ ] Can browse asteroids
- [ ] Map shows impact locations
- [ ] 3D view works
- [ ] Click AI chatbot button (💬)
- [ ] AI generates summary
- [ ] Can ask questions to AI
- [ ] Backend is running: `pm2 status`
- [ ] Check logs: `pm2 logs astroguard-backend`

---

## Common Issues

### 1. Chatbot shows "Sorry, I encountered an error"
**Cause:** Frontend can't reach backend
**Fix:** Check VITE_API_URL in .env.production matches your droplet IP

```bash
cd frontend
cat .env.production  # Should show your droplet IP
npm run build
```

### 2. Backend not starting
**Cause:** Missing dependencies or wrong Python version
**Fix:**
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
python main.py  # Test manually
```

### 3. 502 Bad Gateway
**Cause:** Backend not running
**Fix:**
```bash
pm2 restart astroguard-backend
pm2 logs astroguard-backend
```

### 4. CORS errors
**Cause:** Nginx not proxying correctly
**Fix:** Check Nginx config has proxy_pass for /api/

---

## Useful Commands

```bash
# Check backend status
pm2 status

# View backend logs
pm2 logs astroguard-backend

# Restart backend
pm2 restart astroguard-backend

# Check Nginx status
systemctl status nginx

# View Nginx logs
tail -f /var/log/nginx/error.log

# Test backend API
curl http://localhost:5000/docs

# Get droplet IP
curl ifconfig.me
```

---

## Cost Summary

- **DigitalOcean Droplet** (2GB): $12/month
- **OpenAI API** (GPT-4o-mini): ~$1-5/month for 1000 conversations
- **Total**: ~$13-17/month

---

## Next Steps After Deployment

1. **Setup SSL (Free):**
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com
   ```

2. **Setup Domain:**
   - Point A record to your droplet IP
   - Update .env.production with domain
   - Rebuild frontend

3. **Monitor Costs:**
   - Watch OpenAI API usage
   - Monitor droplet resources

---

**Need help?** Check `DIGITALOCEAN_DEPLOYMENT.md` for full details.
