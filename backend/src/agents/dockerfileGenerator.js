import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

let groq = null;
let gemini = null;
let lastUsedService = 'groq'; // Track which service is being used

function getGroqClient() {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
}

function getGeminiClient() {
  if (!gemini && process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return gemini;
}

/**
 * System prompt for Dockerfile generation
 */
const SYSTEM_PROMPT = `You are an expert Docker engineer. Generate a production-ready Dockerfile for a given repository.

Your Dockerfile MUST:
1. Start with an appropriate base image (alpine for smaller images when applicable)
2. Include all necessary package installations
3. Set working directory
4. Copy application files
5. Install dependencies (npm install, pip install, go build, etc.)
6. Expose ports if applicable
7. Define entrypoint or CMD

For Node.js apps:
- Use node:18-alpine or node:20-alpine as base
- Run npm ci instead of npm install
- Set NODE_ENV=production

For Python apps:
- Use python:3.11-slim or python:3.12-slim
- Create virtual environment or use pip
- Install requirements.txt

For Go apps:
- Use multi-stage build with golang:1.21-alpine and alpine:latest
- Compile in builder stage, copy binary to final stage

Always use multi-stage builds when beneficial. Handle .dockerignore properly.
Be concise but complete. Only respond with the Dockerfile content, no explanations.`;

/**
 * Generate Dockerfile using Groq API with automatic Gemini fallback
 */
export async function generateDockerfile(repoAnalysis, previousError = null, attemptNumber = 1) {
  const { techStack, readme, repoUrl } = repoAnalysis;

  let userPrompt = `Generate a Dockerfile for this repository:
URL: ${repoUrl}
Language: ${techStack.language || 'unknown'}
Framework: ${techStack.framework || 'none'}
README (first 1000 chars): ${readme || 'N/A'}
Files detected: ${(techStack.files || []).join(', ')}
Attempt: ${attemptNumber}`;

  if (previousError && attemptNumber > 1) {
    userPrompt += `\n\nPrevious build error:
${previousError}

Please fix the Dockerfile to resolve this error. Consider:
- Missing RUN npm install or pip install
- Incorrect base image
- Path mismatches in COPY commands
- Missing environment variables
- Port exposure issues`;
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

    const dockerfile = message.content[0].type === 'text' ? message.content[0].text : '';

    if (!dockerfile.includes('FROM')) {
      throw new Error('Generated Dockerfile does not contain FROM statement');
    }

    lastUsedService = 'groq';
    console.log(`[LLM] ✓ Dockerfile generated successfully using Groq`);
    return dockerfile;
  } catch (groqError) {
    console.warn(`[LLM] ⚠ Groq failed: ${groqError.message}`);
    console.log(`[LLM] Falling back to Gemini API...`);

    // Fallback to Gemini
    try {
      const gemini = getGeminiClient();
      if (!gemini) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      console.log(`[LLM] Generating Dockerfile using Gemini (attempt ${attemptNumber})...`);

      const model = gemini.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

      const result = await model.generateContent(fullPrompt);
      const dockerfile = result.response.text();

      if (!dockerfile.includes('FROM')) {
        throw new Error('Generated Dockerfile does not contain FROM statement');
      }

      lastUsedService = 'gemini';
      console.log(`[LLM] ✓ Dockerfile generated successfully using Gemini (Groq fallback)`);
      return dockerfile;
    } catch (geminiError) {
      console.error(`[LLM] ✗ Gemini also failed: ${geminiError.message}`);
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
