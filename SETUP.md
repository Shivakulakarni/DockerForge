# DockerForge - Setup & Usage Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- **Node.js** 16+ ([download](https://nodejs.org/))
- **Docker** ([download](https://www.docker.com/products/docker-desktop))
- **Groq API Key** ([get free key](https://console.groq.com) - $5-10 free credits)

### Step 1: Clone & Install

```bash
# Clone the repository
git clone <repo-url>
cd Assignment

# Run setup script
node setup.js
# OR manually:
cd backend && npm install && cd ..
cd frontend && npm install && npm run build && cd ..
```

### Step 2: Configure Environment

```bash
# Edit backend/.env
cd backend
# Windows:
notepad .env
# macOS/Linux:
nano .env

# Add your Groq API key:
# GROQ_API_KEY=gsk_your_actual_key_here
```

Get your free Groq API key here: https://console.groq.com/keys

### Step 3: Start the Application

#### Option A: Local Development (Recommended for Testing)

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Output: ✓ Backend listening on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Output: VITE v5.x.x ready in xxx ms
```

Then open http://localhost:3000

#### Option B: Docker Compose (Full Stack)

```bash
# From project root
export GROQ_API_KEY="your_key_here"  # macOS/Linux
# OR
$env:GROQ_API_KEY="your_key_here"   # Windows PowerShell

docker-compose up --build
```

Access at http://localhost:3000

### Step 4: Test It Out

1. **Enter a GitHub URL**:
   ```
   https://github.com/expressjs/express
   https://github.com/facebook/react
   https://github.com/golang/go
   ```

2. **Click "Generate Dockerfile"**

3. **Watch the magic**:
   - Repository is analyzed
   - Dockerfile is generated via Groq API
   - Docker builds the image
   - Container is verified
   - Dockerfile is displayed

---

## 📊 Project Structure

```
d:\Assignment/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── gitAnalyzer.js        # Git repo detection & analysis
│   │   │   ├── dockerfileGenerator.js # Groq API integration
│   │   │   ├── buildExecutor.js      # Docker build + error parsing
│   │   │   └── orchestrator.js       # Main workflow orchestration
│   │   ├── api/
│   │   │   └── routes.js             # Express API routes
│   │   └── index.js                  # Server entry point
│   ├── package.json
│   ├── Dockerfile
│   ├── .env.example
│   └── .env (IGNORED - create manually)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                   # Main React component
│   │   ├── App.css                   # Styling
│   │   └── main.jsx                  # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── docker-compose.yml                # Full-stack orchestration
├── README.md                         # Main documentation
├── SETUP.md                          # This file
├── setup.js                          # Automated setup script
└── .gitignore
```

---

## 🔑 Getting a Groq API Key

1. **Visit** https://console.groq.com
2. **Sign up** with email or GitHub (free, no credit card required)
3. **Go to** "API Keys" section
4. **Create new API key**
5. **Copy the key** (starts with `gsk_`)
6. **Paste into** `backend/.env` as `GROQ_API_KEY=gsk_...`

**Free tier includes:** $5-10 in free credits, plenty for demos!

---

## 🧪 Testing

### Manual Test (with Groq API Key)

```bash
# Terminal - Backend directory
cd backend
export GROQ_API_KEY="your_key"  # macOS/Linux
# OR
$env:GROQ_API_KEY="your_key"    # Windows

npm start

# Terminal 2 - different directory
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"https://github.com/expressjs/express","maxRetries":3}'

# Response:
# {
#   "success": true,
#   "jobId": "uuid-here",
#   "statusUrl": "/api/status/uuid-here"
# }

# Then check status:
curl http://localhost:5000/api/status/uuid-here

# Wait for completion, then get result:
curl http://localhost:5000/api/result/uuid-here
```

### Automated Test

```bash
cd backend
npm test  # (Note: basic test, requires Groq API key)
```

---

## 🐳 Building Your Own Docker Image

The project comes with pre-configured Dockerfiles. To build manually:

```bash
# Build backend image
docker build -t dockerforge-backend:latest -f backend/Dockerfile .

# Build frontend image
docker build -t dockerforge-frontend:latest -f frontend/Dockerfile .

# Run with Docker Compose (simplest)
docker-compose up --build
```

---

## 📋 API Endpoints Reference

### `POST /api/generate`
Start a Dockerfile generation job.

**Request:**
```json
{
  "repoUrl": "https://github.com/expressjs/express",
  "maxRetries": 3
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "statusUrl": "/api/status/550e8400-e29b-41d4-a716-446655440000"
}
```

---

### `GET /api/status/:jobId`
Get real-time job status and logs.

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "building",
  "repoUrl": "https://github.com/expressjs/express",
  "logs": [
    "[2024-05-25T10:30:45.123Z] Starting Dockerfile generation...",
    "[2024-05-25T10:30:46.456Z] ✓ Repository analyzed: nodejs project",
    "[2024-05-25T10:30:47.789Z] Generating Dockerfile..."
  ],
  "attempts": 1,
  "createdAt": "2024-05-25T10:30:45.123Z"
}
```

**Status values:**
- `pending` - Job queued
- `analyzing` - Cloning & analyzing repo
- `generating` - LLM generating Dockerfile
- `building` - Docker building image
- `verifying` - Testing container
- `success` - Completed successfully
- `failed` - Failed after all retries

---

### `GET /api/result/:jobId`
Get final result with generated Dockerfile.

**Response (Success):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "repoUrl": "https://github.com/expressjs/express",
  "dockerfile": "FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nCMD [\"node\", \"index.js\"]\n",
  "attempts": [
    {
      "attempt": 1,
      "status": "success",
      "dockerfile": "..."
    }
  ],
  "logs": [...],
  "completedAt": "2024-05-25T10:31:05.123Z"
}
```

**Response (Failed):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "failed",
  "repoUrl": "https://github.com/example/repo",
  "dockerfile": "...",
  "error": "Build failed: manifest not found for base image",
  "attempts": [
    {"attempt": 1, "status": "failed", "error": "..."},
    {"attempt": 2, "status": "failed", "error": "..."},
    {"attempt": 3, "status": "failed", "error": "..."}
  ],
  "logs": [...],
  "completedAt": "2024-05-25T10:31:25.123Z"
}
```

---

## 🔧 Troubleshooting

### "GROQ_API_KEY not set"
- ✓ Check `backend/.env` exists
- ✓ Verify `GROQ_API_KEY=...` is set (no quotes)
- ✓ Restart backend after updating `.env`

### "Address already in use :::5000"
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9    # macOS/Linux
# OR
netstat -ano | findstr :5000    # Windows (find PID then)
taskkill /PID <PID> /F
```

### "Docker daemon not running"
- ✓ Start Docker Desktop (macOS/Windows)
- ✓ Or start Docker service: `sudo systemctl start docker` (Linux)

### "Repository not found"
- ✓ Verify GitHub URL is correct (public repos only)
- ✓ Example: `https://github.com/expressjs/express`
- ✓ (Remove `.git` suffix if present)

### Frontend shows 404
- ✓ Make sure backend is running on port 5000
- ✓ Check proxy is configured in `vite.config.js`
- ✓ Verify `/api/` requests reach backend

### Build times out
- ✓ Large repos may take 30+ seconds to clone
- ✓ Docker builds can take 2-5 minutes depending on base image
- ✓ This is normal!

---

## 💡 Tips & Tricks

### Test with Simple Repos
Start with these well-known repos:
- **Node.js**: `https://github.com/expressjs/express`
- **Python**: `https://github.com/pallets/flask`
- **Go**: `https://github.com/golang/go`
- **Ruby**: `https://github.com/rails/rails`

### Monitor Logs in Real-Time
```bash
# Backend logs
cd backend && npm start

# In another terminal, poll status:
watch -n 1 'curl -s http://localhost:5000/api/status/YOUR_JOB_ID | jq .status'
```

### Download Generated Dockerfile
Use the "Download" button in the UI, or:
```bash
curl http://localhost:5000/api/result/YOUR_JOB_ID | jq -r '.dockerfile' > Dockerfile
```

### Save Results to File
```bash
curl http://localhost:5000/api/result/YOUR_JOB_ID > result.json
```

---

## 🚀 Deployment

### Deploy to Production

#### Option 1: Heroku
```bash
# Add Procfile
echo "web: npm start" > backend/Procfile

# Deploy
git push heroku main
```

#### Option 2: Docker (any server with Docker)
```bash
docker-compose up -d
# Runs in background on port 3000 & 5000
```

#### Option 3: Cloud Platforms
- **AWS**: ECS + ECR
- **Google Cloud**: Cloud Run
- **Azure**: Container Instances
- **DigitalOcean**: App Platform

For any platform, ensure:
1. Set `GROQ_API_KEY` environment variable
2. Mount Docker socket: `-v /var/run/docker.sock:/var/run/docker.sock`
3. Allow outbound internet (for Git cloning & API calls)

---

## 📞 Support & Issues

- **GitHub Issues**: [Report bugs](https://github.com/your-repo/issues)
- **Groq Docs**: https://console.groq.com/docs
- **Docker Docs**: https://docs.docker.com/

---

**Built with ❤️ using Node.js, React, Groq API, Docker**

Last updated: May 25, 2026
