# DockerForge - AI-Powered Dockerfile Generator

An intelligent, self-correcting system that analyzes GitHub repositories and automatically generates production-ready Dockerfiles with built-in error recovery.

**🚀 Status**: ✅ **Production Ready** | **Last Updated**: May 25, 2026

---

## ⚡ Quick Start

```bash
# 1. Get Groq API key (free): https://console.groq.com/keys

# 2. Clone & setup
git clone <repo-url>
cd Assignment
echo "GROQ_API_KEY=your_key_here" > backend/.env

# 3. Run
cd backend && npm install && npm start        # Terminal 1
cd frontend && npm install && npm run dev     # Terminal 2

# 4. Open http://localhost:3000
```

**Need help?** → See [SETUP.md](SETUP.md) or [QUICK_START.md](QUICK_START.md)

---

## ✨ Features

- **🔍 Smart Repository Analysis**: Detects project type, framework, and dependencies
- **🤖 AI-Powered Generation**: Uses Groq API for fast, intelligent Dockerfile creation
- **🔄 Self-Correcting Loop**: Automatically retries up to 3 times with refined prompts on build failures
- **⏱️ Real-Time Logs**: Stream build logs directly to the web UI
- **✅ Docker Verification**: Validates generated Dockerfiles by building and running containers
- **🎨 Beautiful Web UI**: Modern responsive interface with syntax-highlighted Dockerfile display

---

## 🏗 Architecture

```
GitHub Repo URL
      ↓
[Git Analyzer]  → Shallow clone + language detection
      ↓
[LLM (Groq)]    → Generate Dockerfile with context
      ↓
[Docker Build]  → Build image, capture errors
      ↓
[Error Loop]    → Retry up to 3x with refined prompts
      ↓
[Verification]  → Test container startup
      ↓
[Web UI]        → Display results + logs
```

**Core innovation:** The **self-correcting retry loop** that parses Docker errors and refines prompts automatically.

---

## 🛠 Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **Backend** | Node.js + Express | Fast, Docker SDK mature |
| **LLM** | Groq (Mixtral-8x7b) | <100ms latency + free tier |
| **Frontend** | React + Vite | Modern, fast dev experience |
| **Deployment** | Docker + Compose | Production-ready |

---

## 📚 Documentation

- **[README.md](README.md)** ← You are here
- **[SETUP.md](SETUP.md)** - Complete setup guide with troubleshooting
- **[QUICK_START.md](QUICK_START.md)** - 60-second reference
- **[IMPLEMENTATION.md](IMPLEMENTATION.md)** - Technical details & project status

---

## 📋 API Endpoints

### `POST /api/generate`
Start a Dockerfile generation job.

```json
Request:
{
  "repoUrl": "https://github.com/expressjs/express",
  "maxRetries": 3
}

Response:
{
  "success": true,
  "jobId": "uuid-here",
  "statusUrl": "/api/status/uuid-here"
}
```

### GET /api/status/:jobId
Get real-time job status and logs.

```json
Response:
{
  "jobId": "uuid",
  "status": "building",
  "repoUrl": "...",
  "logs": [
    "[timestamp] message",
    ...
  ],
  "attempts": 1
}
```

### GET /api/result/:jobId
Get final result with generated Dockerfile.

```json
Response:
{
  "jobId": "uuid",
  "status": "success|failed",
  "dockerfile": "FROM node:20-alpine\n...",
  "attempts": [
    {
      "attempt": 1,
      "status": "failed",
      "error": "manifest not found",
      "dockerfile": "..."
    },
    {
      "attempt": 2,
      "status": "success",
      "dockerfile": "..."
    }
  ]
}
```

## 🧠 LLM Choice: Groq

**Why Groq?**
- **Sub-100ms latency**: Extremely fast inference (important for demo)
- **Free tier**: $5-10 in free credits (sufficient for testing)
- **Strong code generation**: Mixtral-8x7b model is excellent for Docker/Dockerfile generation
- **Reliability**: Consistently available, production-grade

**Alternative**: OpenAI GPT-4, but would accumulate costs quickly for demos.

## 🔧 Error Recovery Strategy

The system handles common Docker build errors:

| Error | Handling |
|-------|----------|
| `manifest not found` | Suggests valid base images (node:20-alpine, python:3.11-slim, etc.) |
| `command not found` | Adds missing `apt-get update` and package install steps |
| `COPY failed: path not found` | Refines path matching and directory structure analysis |
| `permission denied` | Adjusts USER/RUN permissions in Dockerfile |

**Max Retries**: 3 attempts (configurable)
- Attempt 1: Initial generation from repo analysis
- Attempt 2: Refine with error context + suggestions
- Attempt 3: Final attempt with fallback strategies

If all 3 fail, system returns best-effort Dockerfile + error explanation.

## ⚠️ Limitations

1. **Large Repos**: Shallow clones (`--depth=1`) don't capture full history; dependency graphs may miss transitive dependencies
2. **Complex Projects**: Multi-module builds, custom build scripts, or non-standard structures may need manual refinement
3. **Private Dependencies**: Cannot access private Git repos or private npm packages
4. **Resource Limits**: No automatic optimization for large base images; may generate larger images than optimal
5. **Entrypoint Detection**: Simple heuristic-based; may not detect complex startup scripts
6. **LLM Limitations**: Groq API may hallucinate version numbers or obscure dependencies; always verify generated Dockerfile

## 📊 Project Structure

```
d:\Assignment/
├── backend/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── gitAnalyzer.js          # Repo detection
│   │   │   ├── dockerfileGenerator.js  # LLM integration
│   │   │   ├── buildExecutor.js        # Docker SDK + error parsing
│   │   │   └── orchestrator.js         # Main workflow orchestration
│   │   ├── api/
│   │   │   └── routes.js               # Express routes
│   │   └── index.js                    # Entry point
│   ├── Dockerfile                       # Backend container image
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Main React component
│   │   ├── App.css                     # Styling
│   │   └── main.jsx                    # Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── Dockerfile                      # Frontend multi-stage build
│   ├── nginx.conf                      # Nginx configuration
│   ├── package.json
│   └── .dockerignore
├── docker-compose.yml                   # Full-stack orchestration
├── .gitignore
└── README.md
```

## 🧪 Testing

### Manual End-to-End Test

```bash
# Start the system locally
npm start  # Backend
npm run dev  # Frontend (in separate terminal)

# Submit a simple repo
# URL: https://github.com/expressjs/express
# Expected: Generates Node.js Dockerfile, builds successfully

# Check generated Dockerfile
# Should include: FROM node:*, npm ci, COPY, CMD
```

### Error Recovery Test

```bash
# Submit a repo that initially fails
# System should retry up to 3 times
# Watch logs for:
# - Attempt 1: [error message]
# - Attempt 2: Refining prompt...
# - Attempt 3: Final attempt
```

## 📹 Demo Video Outline (2-3 min)

1. **Intro** (20 sec): Show UI, explain purpose
2. **Submit Repo** (30 sec): Enter GitHub URL, click Generate
3. **Live Build** (60 sec): Watch build logs in real-time, show error handling
4. **Error Recovery** (30 sec): Show automatic retry on error (if occurs)
5. **Final Result** (30 sec): Display generated Dockerfile, download option
6. **Outro** (10 sec): Summary of key features

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
