import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env at module import time
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

let groq = null;
let gemini = null;
let lastUsedService = 'groq'; // Track which service is being used

function getGroqClient() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('[LLM] ✗ GROQ_API_KEY is not set. Check .env file.');
      console.error('[LLM] Current GROQ_API_KEY:', process.env.GROQ_API_KEY);
      console.error('[LLM] Current NODE_ENV:', process.env.NODE_ENV);
      return null;
    }
    groq = new Groq({ apiKey });
  }
  return groq;
}

function getGeminiClient() {
  if (!gemini) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[LLM] ✗ GEMINI_API_KEY is not set. Check .env file.');
      return null;
    }
    gemini = new GoogleGenerativeAI(apiKey);
  }
  return gemini;
}

/**
 * System prompt for Dockerfile generation - Enhanced with best practices
 */
const SYSTEM_PROMPT = `You are an expert Docker engineer specializing in generating production-ready Dockerfiles.

YOUR TASK: Generate ONLY a valid, minimal, efficient Dockerfile that will build and run successfully.

CRITICAL RULES:
1. ALWAYS start with a valid base image (e.g., node:18-alpine, python:3.11-slim, golang:1.21-alpine)
2. ALWAYS set WORKDIR before copying files
3. ALWAYS copy dependency files FIRST (package.json, requirements.txt, go.mod, etc.)
4. ALWAYS install dependencies BEFORE copying source code
5. Use multi-stage builds when applicable to reduce image size
6. For Node.js: Use npm ci instead of npm install for deterministic installs
7. For Python: Create virtual env or use slim images with pip
8. For Go: Use multi-stage build (build with golang image, run with alpine)
9. Handle .dockerignore by excluding node_modules, dist, build, __pycache__
10. EXPOSE ports only if needed (check scripts and config)
11. Set USER for security (don't run as root unless necessary)
12. ALWAYS include explicit error handling in RUN commands

OUTPUT FORMAT:
- ONLY output valid Dockerfile content
- NO explanations, comments, or markdown
- NO triple backticks
- Every line must be valid Dockerfile syntax
- Test mentally: would this build successfully?

LANGUAGE-SPECIFIC TEMPLATES:

Node.js (Express/NestJS/Fastify):
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]

Python (Flask/Django/FastAPI):
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]

Go:
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o myapp .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/myapp .
EXPOSE 8080
CMD ["./myapp"]

Generate a working Dockerfile. Be pragmatic and minimal. Success means it builds without errors.`;

/**
 * Generate a fallback Dockerfile based on language detection
 */
function generateFallbackDockerfile(language) {
  const templates = {
    nodejs: `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production 2>/dev/null || npm install
COPY . .
EXPOSE 3000 8080 5000
CMD ["node", "index.js"]`,
    
    python: `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000 8000
CMD ["python", "app.py"]`,
    
    go: `FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o app .

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/app .
EXPOSE 8080
CMD ["./app"]`,
    
    default: `FROM alpine:latest
WORKDIR /app
COPY . .
CMD ["sh"]`
  };

  return templates[language] || templates.default;
}

/**
 * Generate Dockerfile using Groq API with automatic Gemini fallback
 */
export async function generateDockerfile(repoAnalysis, previousError = null, attemptNumber = 1) {
  const { techStack, readme, repoUrl, clonePath } = repoAnalysis;

  // Build rich context from manifest files
  let contextDetails = `Repository: ${repoUrl}
Language: ${techStack.language || 'unknown'}
Framework: ${techStack.framework || 'none'}`;

  if (techStack.packageJsonContent) {
    contextDetails += `\n\npackage.json (excerpt):\n${techStack.packageJsonContent}`;
  }
  if (techStack.scripts) {
    contextDetails += `\n\nAvailable scripts: ${Object.keys(techStack.scripts).join(', ')}`;
  }
  if (techStack.requirementsContent) {
    contextDetails += `\n\nrequirements.txt (excerpt):\n${techStack.requirementsContent}`;
  }
  if (techStack.gomodContent) {
    contextDetails += `\n\ngo.mod (excerpt):\n${techStack.gomodContent}`;
  }
  if (techStack.existingDockerfile) {
    contextDetails += `\n\nExisting Dockerfile (reference - may be outdated):\n${techStack.existingDockerfile}`;
  }
  if (techStack.directoryStructure) {
    contextDetails += `\n\nDirectory structure:\n${techStack.directoryStructure}`;
  }

  let userPrompt = `Generate a working Dockerfile for:

${contextDetails}

Key requirements:
- Must build successfully without errors
- Must be minimal and efficient
- Use appropriate base image for ${techStack.language || 'detected'} projects
- Handle dependency installation properly`;

  if (previousError && attemptNumber > 1) {
    userPrompt += `\n\n=== FIX PREVIOUS BUILD ERROR (Attempt ${attemptNumber}) ===

Previous Dockerfile failed with:
${previousError}

IMPORTANT: The previous Dockerfile had an issue. Fix it by:
1. Checking if all dependencies are installed (npm install, pip install, etc.)
2. Verifying base image is correct and available
3. Ensuring all COPY source paths exist
4. Making sure working directory is set before copying files
5. Confirming file permissions are correct
6. Testing paths relative to repository root

Generate ONLY the corrected Dockerfile. This MUST work this time.`;
  }

  // Try Groq first
  try {
    const groq = getGroqClient();
    if (!groq) {
      throw new Error('GROQ_API_KEY not configured');
    }

    console.log(`[LLM] Generating Dockerfile using Groq (attempt ${attemptNumber})...`);

    const message = await groq.messages.create({
      model: 'mixtral-8x7b-32768',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    let dockerfile = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Clean up common formatting issues
    dockerfile = dockerfile.replace(/```dockerfile\n?/g, '').replace(/```\n?/g, '').trim();

    // Validate essential Dockerfile structure
    if (!dockerfile.includes('FROM')) {
      throw new Error('Generated Dockerfile missing FROM statement');
    }
    if (!dockerfile.includes('WORKDIR') && !dockerfile.includes('workdir')) {
      throw new Error('Generated Dockerfile missing WORKDIR - critical for file operations');
    }

    lastUsedService = 'groq';
    console.log(`[LLM] ✓ Dockerfile generated successfully using Groq`);
    return dockerfile;
  } catch (groqError) {
    console.warn(`[LLM] ⚠ Groq failed: ${groqError.message}`);

    // On attempt 3, use fallback instead of trying Gemini
    if (attemptNumber >= 3) {
      console.log(`[LLM] Using fallback Dockerfile for ${techStack.language || 'generic'} project`);
      lastUsedService = 'fallback';
      return generateFallbackDockerfile(techStack.language);
    }

    console.log(`[LLM] Falling back to Gemini API...`);

    // Fallback to Gemini (attempts 1-2)
    try {
      const gemini = getGeminiClient();
      if (!gemini) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      console.log(`[LLM] Generating Dockerfile using Gemini (attempt ${attemptNumber})...`);

      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

      const result = await model.generateContent(fullPrompt);
      let dockerfile = result.response.text();

      // Clean up common formatting issues
      dockerfile = dockerfile.replace(/```dockerfile\n?/g, '').replace(/```\n?/g, '').trim();

      // Validate essential Dockerfile structure
      if (!dockerfile.includes('FROM')) {
        throw new Error('Generated Dockerfile missing FROM statement');
      }
      if (!dockerfile.includes('WORKDIR') && !dockerfile.includes('workdir')) {
        throw new Error('Generated Dockerfile missing WORKDIR - critical for file operations');
      }

      lastUsedService = 'gemini';
      console.log(`[LLM] ✓ Dockerfile generated successfully using Gemini (Groq fallback)`);
      return dockerfile;
    } catch (geminiError) {
      console.error(`[LLM] ✗ Gemini also failed: ${geminiError.message}`);
      
      // Final fallback for attempt 3
      if (attemptNumber >= 3) {
        console.log(`[LLM] Using fallback Dockerfile for ${techStack.language || 'generic'} project`);
        lastUsedService = 'fallback';
        return generateFallbackDockerfile(techStack.language);
      }
      
      throw new Error(
        `All LLM services failed - Groq: ${groqError.message} | Gemini: ${geminiError.message}`
      );
    }
  }
}

/**
 * Get the last service used for generation
 */
export function getLastUsedService() {
  return lastUsedService;
}
