# DockerForge - Quick Reference

## ⚡ 60-Second Start

```bash
# 1. Get Groq API key (free): https://console.groq.com/keys

# 2. Clone and setup
cd Assignment

# 3. Configure
echo "GROQ_API_KEY=your_key_here" > backend/.env

# 4. Run (two terminals)
cd backend && npm install && npm start
cd frontend && npm install && npm run dev

# 5. Open http://localhost:3000
# 6. Enter a GitHub repo URL
# 7. Click "Generate Dockerfile"
```

---

## 🎯 What It Does

| Step | Action | Who | Time |
|------|--------|-----|------|
| 1 | Clone repo | Git | 5-30s |
| 2 | Detect language | Node | <1s |
| 3 | Generate Dockerfile | Groq AI | 2-5s |
| 4 | Build image | Docker | 30-120s |
| 5 | Test container | Docker | 2-5s |
| 6 | Display result | React | <1s |

**Total:** 1-3 minutes (first time slower due to image pulls)

---

## 📦 Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **LLM** | Groq (Mixtral-8x7b) | Sub-100ms latency + free tier |
| **Backend** | Node.js + Express | Fast, Docker SDK mature |
| **Frontend** | React + Vite | Fast dev experience |
| **Docker** | Docker CLI + SDK | Direct control + streaming |
| **Git** | simple-git | Shallow clones for speed |

---

## 🔄 Self-Correcting Loop

```
Attempt 1:
  Generate Dockerfile v1
  ├─ Build ✓ SUCCESS → Done!
  └─ Build ✗ FAIL → Attempt 2

Attempt 2 (refined prompt with error context):
  Generate Dockerfile v2
  ├─ Build ✓ SUCCESS → Done!
  └─ Build ✗ FAIL → Attempt 3

Attempt 3 (final attempt):
  Generate Dockerfile v3
  ├─ Build ✓ SUCCESS → Done!
  └─ Build ✗ FAIL → Return best-effort result
```

**Max retries:** 3 (configurable via API)

---

## 🐳 Docker Compose

```bash
$env:GROQ_API_KEY = "your_key"
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# API:      http://localhost:5000/api
```

---

## 🚨 Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `GROQ_API_KEY not set` | `echo "GROQ_API_KEY=..." > backend/.env` |
| `Port 5000 in use` | `lsof -ti:5000 \| xargs kill -9` |
| `Docker daemon not running` | Start Docker Desktop |
| `Repository not found` | Use public GitHub repos only |
| `Build times out` | Normal for first build; wait 2-5 min |

---

## 🔗 Links

- **Groq Console**: https://console.groq.com
- **GitHub**: (your repo URL)
- **Demo Video**: (will be recorded)
- **Issues**: (GitHub issues)

---

## 📊 Example Results

### Input
```
Repository: https://github.com/expressjs/express
Language: Node.js
Framework: Express.js
```

### Output Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
```

### Build Result
```
✓ Repository analyzed: nodejs project
✓ Dockerfile generated
✓ Build succeeded in 45 seconds
✓ Container verification passed
✓ SUCCESS!
```

---

## 💬 Need Help?

1. **Setup issues?** → See [SETUP.md](SETUP.md)
2. **API questions?** → See [README.md](README.md#-api-endpoints)
3. **Groq questions?** → See https://console.groq.com/docs
4. **Docker help?** → See https://docs.docker.com/

---

**Remember:** This is a demo/prototype. For production, add:
- Authentication & rate limiting
- Database for result caching
- Webhook notifications
- Private repo support (with GitHub tokens)
- Cost optimization (layer caching, multi-stage builds)
