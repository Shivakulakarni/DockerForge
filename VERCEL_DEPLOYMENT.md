# 🚀 Vercel Deployment Guide - DockerForge

This guide shows how to deploy DockerForge to Vercel (frontend) and recommended backends for the API.

---

## 📋 Architecture

```
Frontend (React + Vite) → Vercel
                           ↓
                    (API Calls)
                           ↓
Backend (Express API) → Railway/Render/Heroku
                     (or Vercel Serverless)
```

---

## 🎯 Option 1: Frontend Only (Recommended for Quick Demo)

### Step 1: Setup Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Import Project"

### Step 2: Connect GitHub Repository
1. Select **Shivakulakarni/DockerForge**
2. Click "Import"
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: ./
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install`

### Step 3: Set Environment Variables
In Vercel Dashboard → Settings → Environment Variables:
```
VITE_API_URL=https://your-backend-url.com
```

### Step 4: Deploy
Click "Deploy" → Wait for build to complete
- Frontend: `dockerforge.vercel.app` (or your custom domain)

---

## 🔧 Option 2: Full Stack Deployment (Frontend + Backend)

### Backend Deployment on Railway (Easiest)

#### Step 1: Push Code to GitHub
```bash
git push origin main
```

#### Step 2: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose **Shivakulakarni/DockerForge**

#### Step 3: Configure Railway
1. Add environment variables:
   - `GROQ_API_KEY=your_key`
   - `GEMINI_API_KEY=your_key`
   - `BACKEND_PORT=5000`
   - `NODE_ENV=production`
2. Set build command: `cd backend && npm install`
3. Set start command: `node src/index.js`
4. Select Node.js environment

#### Step 4: Deploy Backend
- Railway auto-deploys on every push
- Get your backend URL: `your-project.up.railway.app`

### Frontend Deployment on Vercel

#### Step 1: Update Frontend to Point to Backend
Edit `frontend/src/axios-config.js` (or wherever API calls are made):
```javascript
const API_URL = process.env.VITE_API_URL || 'http://localhost:5000';
```

#### Step 2: Deploy Frontend
1. Go to https://vercel.com/new
2. Import **Shivakulakarni/DockerForge**
3. Set environment variable:
   - `VITE_API_URL=https://your-project.up.railway.app`
4. Deploy

#### Step 3: Test
- Frontend: `https://dockerforge.vercel.app`
- Backend: `https://your-project.up.railway.app/api/health`
- Full flow: Enter GitHub URL → Should generate Dockerfile

---

## 🚀 Quick Deploy (Click to Deploy)

### Vercel Frontend
```bash
# From project root
vercel deploy --prod
```

### Railway Backend
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

---

## 🔑 Environment Variables

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend-url.com
VITE_APP_NAME=DockerForge
```

### Backend (Railway/Render/Heroku)
```
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxx
BACKEND_PORT=5000
NODE_ENV=production
```

---

## 📊 Deployment Comparison

| Platform | Frontend | Backend | Free Tier | Setup Time |
|----------|----------|---------|-----------|------------|
| **Vercel** | ⭐⭐⭐ | ⚠️ (Serverless) | 50GB/month | 5 min |
| **Railway** | ⭐ | ⭐⭐⭐ | $5/month | 10 min |
| **Render** | ⭐⭐ | ⭐⭐ | Limited | 10 min |
| **Heroku** | ⚠️ | ⭐ | Paid | 10 min |

**Recommendation**: Vercel (Frontend) + Railway (Backend)

---

## 🔗 Post-Deployment Configuration

### Update GitHub Links
Update `README.md` with your live URLs:
```markdown
**🌐 Live Demo**: https://dockerforge.vercel.app
**API**: https://your-backend.up.railway.app
```

### Configure CORS for Production
In `backend/src/index.js`:
```javascript
app.use(cors({
  origin: 'https://dockerforge.vercel.app',
  credentials: true
}));
```

### Monitor & Logs

**Vercel Logs:**
- Dashboard → Deployments → Select deployment → Logs

**Railway Logs:**
- Dashboard → Your project → Deployments → View logs

---

## ❌ Troubleshooting

### Issue: CORS Errors
**Solution**: Update backend CORS origin to your Vercel URL

### Issue: Build Fails
**Solution**: Check that monorepo paths are correct in build commands

### Issue: API Returns 404
**Solution**: Verify `VITE_API_URL` environment variable is set

### Issue: Docker Commands Don't Work
**Note**: Vercel/Railway don't have Docker daemon access by default. Use mock layer.

---

## 🎉 Success Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render
- [ ] Environment variables configured
- [ ] CORS origins updated
- [ ] API health check responds (GET /api/health)
- [ ] Full flow tested (GitHub URL → Dockerfile generated)
- [ ] README.md updated with live URLs
- [ ] Custom domain configured (optional)

---

## 📚 Additional Resources

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- GitHub Pages: https://pages.github.com

---

**Next Steps:**
1. Create Vercel project
2. Create Railway project
3. Set environment variables
4. Test end-to-end flow
5. Share your live demo! 🎊
