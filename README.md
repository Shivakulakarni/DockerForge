# DockerForge - AI-Powered Dockerfile Generator

An intelligent, self-correcting system that analyzes GitHub repositories and automatically generates production-ready Dockerfiles with built-in error recovery.

**🚀 Status**: ✅ **Production Ready** | **Last Updated**: May 26, 2026

---

## ⚡ Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/dockerforge
cd Assignment

# 2. Set up API keys in backend/.env
echo "GROQ_API_KEY=your_groq_key_here" > backend/.env
echo "GEMINI_API_KEY=your_gemini_key_here" >> backend/.env

# 3. Run backend and frontend in separate terminals
cd backend && npm install && npm start        # Terminal 1, port 5000
cd frontend && npm install && npm run dev     # Terminal 2, port 3000

# 4. Open http://localhost:3000
```

**Or use Docker Compose:**
```bash
docker-compose up
```

---

## ✨ Features

- **🔍 Smart Repository Analysis**: Detects project type, framework, and dependencies via manifest files (package.json, requirements.txt, go.mod, pom.xml, Gemfile)
- **🤖 AI-Powered Generation**: Uses Groq API (fast, <100ms) with automatic Gemini fallback for reliability
- **🔄 Self-Correcting Loop**: Automatically retries up to 3 times with refined prompts on build failures
- **⏱️ Real-Time Logs**: Stream build logs directly to web UI as they happen
- **✅ Docker Verification**: Validates generated Dockerfiles by actually building and running containers
- **🎨 Beautiful Web UI**: Modern responsive interface with syntax-highlighted Dockerfile display

---

## 🏗️ Architecture

```
GitHub Repo URL
      ↓
[Git Analyzer]  → Shallow clone + language detection
      ↓
[LLM (Groq)]    → Generate Dockerfile with context (+ Gemini fallback)
      ↓
[Docker Build]  → Build image, capture errors in real-time
      ↓
[Error Parser]  → Classify errors + suggest fixes
      ↓
[Retry Loop]    → Up to 3 attempts with refined prompts
      ↓
[Verification]  → Run container with `docker run` test
      ↓
[Web UI]        → Display final Dockerfile + logs
```

**Core innovation:** The **self-correcting retry loop** that parses Docker errors and automatically refines prompts for intelligent recovery.

---

## 🛠 Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Frontend** | React 18 + Vite | Modern, fast dev experience |
| **Backend** | Node.js + Express | Fast, Docker-friendly, npm ecosystem |
| **LLM (Primary)** | Groq API (Mixtral-8x7b) | <100ms latency + free tier ($5-10 credits) |
| **LLM (Fallback)** | Google Gemini API | Reliable backup if Groq fails |
| **Git Operations** | simple-git | Reliable repo cloning on Windows/Mac/Linux |
| **Docker** | Shell exec (not SDK) | More reliable build logs on Windows |
| **Deployment** | Docker Compose | Production-ready orchestration |

---

## 📚 Documentation

- **[README.md](README.md)** ← You are here
- **[SETUP.md](SETUP.md)** - Complete setup guide with troubleshooting
- **[QUICK_START.md](QUICK_START.md)** - 60-second reference
- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Technical details & completion status

---

## 📋 API Endpoints

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

### `GET /api/status/:jobId`
Get real-time job status and logs.

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "building",
  "repoUrl": "https://github.com/expressjs/express",
  "logs": [
    "[timestamp] Repository analyzed: nodejs project",
    "[timestamp] --- Attempt 1/3 ---",
    "[timestamp] Building Docker image...",
    "..."
  ],
  "attempts": 1
}
```

### `GET /api/result/:jobId`
Get final result with generated Dockerfile (after job completes).

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success|failed",
  "dockerfile": "FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json .\nRUN npm ci\nCOPY . .\nEXPOSE 3000\nCMD [\"npm\", \"start\"]",
  "error": null,
  "attempts": [
    {
      "attempt": 1,
      "status": "success",
      "dockerfile": "..."
    }
  ],
  "logs": [...]
}
```

## 🧠 LLM Choice: Groq API

**Why Groq?**
- **Sub-100ms latency**: Extremely fast inference (critical for demo experience)
- **Free tier**: $5-10 in free credits (sufficient for comprehensive testing)
- **Strong code generation**: Mixtral-8x7b model excels at Docker/Dockerfile generation
- **Reliability**: Production-grade availability

**Gemini Fallback:** Google Generative AI automatically activates if Groq fails, ensuring no loss of functionality.

**Alternatives considered:**
- OpenAI GPT-4: Better quality, but paid-only (would accumulate costs quickly)
- Meta Llama: Requires self-hosted setup (adds deployment complexity)
- Anthropic Claude: Excellent but not free tier

---

## 🔧 Error Recovery Strategy

The system intelligently handles common Docker build errors:

| Error | Root Cause | Recovery Strategy |
|-------|-----------|------------------|
| `manifest not found` | Invalid base image | Suggests valid images (node:20-alpine, python:3.11-slim, etc.) |
| `command not found` | Missing package install | Adds `apt-get update && apt-get install` steps |
| `COPY failed: no such file` | Wrong path in COPY directive | Refines paths based on actual repo structure |
| `permission denied` | File/script permissions | Suggests `RUN chmod +x` or USER context adjustments |
| `pull access denied` | Private base image or auth issue | Suggests using public images or registry auth |

**Max Retries**: 3 attempts (configurable via API)
- **Attempt 1**: Initial Dockerfile from repo analysis
- **Attempt 2**: Refined with error context + LLM fix suggestions
- **Attempt 3**: Final attempt with fallback strategies
- **Failure**: Returns best-effort Dockerfile + detailed error explanation

---

## ⚠️ Known Limitations

1. **Large Repositories**: Shallow clones (`--depth=1`) don't capture full history; dependency graphs may miss transitive dependencies
2. **Complex Projects**: Multi-module builds, monorepos, or non-standard structures may need manual refinement
3. **Private Dependencies**: Cannot access private Git repos or private npm/PyPI packages
4. **Entrypoint Detection**: Simple heuristics; may not detect complex startup scripts or environment-specific entry points
5. **LLM Hallucinations**: Groq/Gemini may suggest version numbers or dependencies that don't exist; always verify the generated Dockerfile
6. **Resource Limits**: No automatic optimization for small images; generated images may be larger than optimal
7. **Build Context Size**: Very large repos may exceed Docker build context limits
8. **Windows-Specific**: Shell exec for Docker build is optimized for Windows; may have different behavior on Linux/Mac

---

## 📊 Project Structure

```
d:\Assignment/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── gitAnalyzer.js          # Clone + language detection
│   │   │   ├── dockerfileGenerator.js  # Groq + Gemini LLM integration
│   │   │   ├── buildExecutor.js        # Docker build + error parsing
│   │   │   └── orchestrator.js         # Main workflow (3-attempt loop)
│   │   ├── api/
│   │   │   └── routes.js               # Express REST endpoints
│   │   └── index.js                    # Entry point
│   ├── Dockerfile                       # Backend container image
│   ├── package.json                     # Dependencies
│   ├── .env.example                     # Template for secrets
│   └── test.js                          # Git analysis test
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Main React component
│   │   ├── App.css                     # Tailwind-like styling
│   │   └── main.jsx                    # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── Dockerfile                      # Frontend multi-stage build
│   ├── nginx.conf                      # Nginx proxy config
│   └── package.json
├── docker-compose.yml                   # Full-stack orchestration
├── .gitignore
├── README.md                            # This file
├── SETUP.md                             # Detailed setup guide
├── QUICK_START.md                       # 60-second reference
└── IMPLEMENTATION.md                    # Technical details
```

---

## 🧪 Testing

### Manual End-to-End Test

```bash
# Terminal 1: Start backend
cd backend && npm start
# Output: ✓ Backend listening on http://localhost:5000

# Terminal 2: Start frontend
cd frontend && npm run dev
# Output: ➜ Local: http://localhost:3000/

# Browser: http://localhost:3000
# Submit: https://github.com/expressjs/express
# Expected: Generates Node.js Dockerfile, builds successfully
```

### Error Recovery Test

```bash
# Submit a repo that will trigger a build failure initially
# Watch logs for:
# --- Attempt 1/3 ---
# ✗ Build failed
# Retrying with refined prompt...
# --- Attempt 2/3 ---
# (LLM refines the Dockerfile based on error)
```

---

## 📹 Demo Video Outline

**Length**: 2-3 minutes

1. **Intro** (20 sec): Show UI, explain DockerForge purpose
2. **Submit Repo** (30 sec): Enter `https://github.com/expressjs/express`, click Generate
3. **Live Build** (60 sec): Watch real-time build logs streaming, show language detection
4. **Error Handling** (30 sec): Show error messages and retry logic in action
5. **Final Result** (30 sec): Display generated Dockerfile, show download/copy buttons
6. **Outro** (10 sec): Summary of key features

---

## 🚀 Deployment

### Docker Compose (Recommended)

```bash
docker-compose up
```

Opens on http://localhost:3000

### Manual Docker Build

**Backend:**
```bash
cd backend
docker build -t dockerforge-backend .
docker run -p 5000:5000 -e GROQ_API_KEY=your_key_here dockerforge-backend
```

**Frontend:**
```bash
cd frontend
docker build -t dockerforge-frontend .
docker run -p 3000:3000 dockerforge-frontend
```

---

## 📄 License

MIT - See LICENSE file

---

## 🤝 Contributing

Contributions welcome! Please ensure:
- URL validation passes (GitHub repo must have owner/repo)
- Docker builds successfully
- Real-time logs display correctly
- Dockerfile is valid and executable

---

## ✅ Assignment Completion Status

All assignment requirements met:
- ✅ Accepts GitHub repo URLs with validation
- ✅ Clones repositories via git (shallow for speed)
- ✅ Analyzes file structure for language/framework
- ✅ Generates Dockerfiles using LLM (Groq + Gemini fallback)
- ✅ Runs `docker build` with real-time error capture
- ✅ Parses build errors with intelligent suggestions
- ✅ Retries up to 3 times with refined prompts
- ✅ Verifies containers with `docker run`
- ✅ Displays final Dockerfile in web UI
- ✅ Complete documentation (README, SETUP, IMPLEMENTATION)

## 🔐 Security Notes

- **Docker Socket**: Mounted for image building; only use in controlled environments
- **API Keys**: Store Groq API key in `.env`, never commit to git
- **Cloned Repos**: Downloaded to `temp/cloned-repos/`, cleaned up after processing
- **Temporary Files**: Auto-cleanup implemented

## 🤝 Contributing

Suggestions for improvement:
- Add support for private repos (with GitHub token)
- Cache analysis results by repo hash
- Support for Docker Compose file generation
- GitHub Actions workflow generation
- Cost optimization (multi-stage builds, layer caching)

## 📝 License

MIT

---

**Built with** ❤️ **using** Node.js, React, Groq API, Docker SDK
