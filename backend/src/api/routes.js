import express from 'express';
import { createJob, getJob, orchestrateDockerGeneration } from '../agents/orchestrator.js';

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/generate
 * Start Dockerfile generation job
 */
router.post('/generate', async (req, res) => {
  try {
    const { repoUrl, maxRetries = 3 } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'repoUrl is required' });
    }

    // Validate GitHub URL format
    const urlPattern = /^https:\/\/github\.com\/[\w\-]+\/[\w\-\.]+\/?$/i;
    if (!urlPattern.test(repoUrl)) {
      const parts = repoUrl.split('/').filter(p => p && p !== 'github.com' && !p.includes('https:'));
      
      if (parts.length === 1) {
        return res.status(400).json({ 
          error: `Invalid GitHub URL - missing repository name. Use format: https://github.com/${parts[0]}/repository-name` 
        });
      } else {
        return res.status(400).json({ 
          error: 'Invalid GitHub URL format. Expected: https://github.com/username/repository' 
        });
      }
    }

    const jobId = createJob(repoUrl);

    // Start job in background
    orchestrateDockerGeneration(jobId, maxRetries).catch((error) => {
      console.error('Job execution error:', error);
    });

    res.json({
      success: true,
      jobId,
      statusUrl: `/api/status/${jobId}`,
    });
  } catch (error) {
    console.error('Error in /generate:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/status/:jobId
 * Get job status and logs
 */
router.get('/status/:jobId', (req, res) => {
  try {
    const job = getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      repoUrl: job.repoUrl,
      logs: job.logs,
      attempts: job.attempts.length,
      createdAt: job.createdAt,
    });
  } catch (error) {
    console.error('Error in /status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/result/:jobId
 * Get final result with Dockerfile
 */
router.get('/result/:jobId', (req, res) => {
  try {
    const job = getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'pending' || job.status === 'analyzing' || job.status === 'generating' || job.status === 'building') {
      return res.status(202).json({ error: 'Job still in progress', status: job.status });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      repoUrl: job.repoUrl,
      dockerfile: job.dockerfile || null,
      error: job.error || null,
      attempts: job.attempts,
      logs: job.logs,
      completedAt: new Date(),
    });
  } catch (error) {
    console.error('Error in /result:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
