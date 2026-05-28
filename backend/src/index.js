import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './api/routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

// Verify API keys are loaded
if (!process.env.GROQ_API_KEY) {
  console.warn('⚠️  WARNING: GROQ_API_KEY not found in .env file');
}
if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY not found in .env file');
}

const app = express();

const corsOptions = {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : true, // Allow all origins when no env var is set (dev mode)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder', 'ngrok-skip-browser-warning', 'serveo-skip-browser-warning'],
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', routes);

// Serve frontend (SPA fallback)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, '../../frontend/dist/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

// Start server only in non-serverless environments
if (!process.env.VERCEL) {
  const PORT = process.env.BACKEND_PORT || 5000;
  app.listen(PORT, () => {
    console.log(`✓ Backend listening on http://localhost:${PORT}`);
  });
}

// Export for Vercel serverless
export default app;
