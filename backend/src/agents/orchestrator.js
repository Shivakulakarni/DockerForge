import { randomUUID } from 'crypto';
import { analyzeRepo, cleanupClone } from './gitAnalyzer.js';
import { generateDockerfile } from './dockerfileGenerator.js';
import { buildImage, verifyContainer, cleanupImage } from './buildExecutor.js';

const jobs = new Map();

/**
 * Create and initialize a new job
 */
export function createJob(repoUrl) {
  const jobId = randomUUID();
  const job = {
    id: jobId,
    repoUrl,
    status: 'pending', // pending, analyzing, generating, building, verifying, success, failed
    logs: [],
    attempts: [],
    dockerfile: null,
    error: null,
    createdAt: new Date(),
  };

  jobs.set(jobId, job);
  return jobId;
}

/**
 * Get job by ID
 */
export function getJob(jobId) {
  return jobs.get(jobId);
}

/**
 * Add log message to job
 */
function addLog(job, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  job.logs.push(logEntry);
  console.log(logEntry);
}

/**
 * Main orchestration: analyze → generate → build → retry loop → verify
 */
export async function orchestrateDockerGeneration(jobId, maxRetries = 3) {
  const job = getJob(jobId);
  if (!job) throw new Error('Job not found');

  try {
    addLog(job, `Starting Dockerfile generation for ${job.repoUrl}`);
    job.status = 'analyzing';

    // Step 1: Analyze repo
    const repoAnalysis = await analyzeRepo(job.repoUrl);
    addLog(job, `✓ Repository analyzed: ${repoAnalysis.techStack.language || 'unknown'} project`);

    // Step 2: Build with retry loop
    job.status = 'generating';
    let dockerfile = null;
    let lastError = null;
    let buildSucceeded = false;
    let imageName = `dockerforge-${Date.now()}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      addLog(job, `\n--- Attempt ${attempt}/${maxRetries} ---`);

      try {
        // Generate Dockerfile
        addLog(job, `Generating Dockerfile...`);
        dockerfile = await generateDockerfile(repoAnalysis, lastError, attempt);
        addLog(job, `✓ Dockerfile generated`);

        // Try to build
        job.status = 'building';
        addLog(job, `Building Docker image...`);
        const buildResult = await buildImage(dockerfile, repoAnalysis.clonePath, imageName);
        addLog(job, `✓ Build succeeded!`);
        buildSucceeded = true;

        // Store attempt
        job.attempts.push({
          attempt,
          status: 'success',
          dockerfile,
          buildLog: buildResult.logs,
        });

        break; // Success, exit loop
      } catch (buildError) {
        addLog(job, `✗ Build failed on attempt ${attempt}`);

        if (buildError.error) {
          lastError = buildError.error.errorMessage || JSON.stringify(buildError.error);
          addLog(job, `Error Code: ${buildError.error.errorCode || 'UNKNOWN'}`);
          addLog(job, `Error: ${lastError}`);

          if (buildError.error.suggestions && buildError.error.suggestions.length > 0) {
            addLog(job, `Suggestions to fix:`);
            buildError.error.suggestions.forEach((suggestion, idx) => {
              addLog(job, `  ${idx + 1}. ${suggestion}`);
            });
          }
        }

        job.attempts.push({
          attempt,
          status: 'failed',
          dockerfile,
          error: lastError,
          buildLog: buildError.logs,
        });

        if (attempt < maxRetries) {
          addLog(job, `Retrying with refined prompt...`);
        }
      }
    }

    if (!buildSucceeded) {
      addLog(job, `\n✗ All ${maxRetries} attempts failed. Build could not complete.`);
      job.status = 'failed';
      job.dockerfile = dockerfile; // Return last attempted Dockerfile
      job.error = lastError;
      cleanupClone(repoAnalysis.clonePath);
      return;
    }

    // Step 3: Verify container with docker run
    job.status = 'verifying';
    addLog(job, `\nVerifying container with 'docker run'...`);
    try {
      const verifyResult = await verifyContainer(imageName);
      addLog(job, `✓ Container verification passed`);
      addLog(job, `  Container output: ${verifyResult.logs || 'Container started successfully'}`);
    } catch (verifyError) {
      addLog(job, `⚠ Container verification warning: ${verifyError.message}`);
    }

    // Cleanup
    await cleanupImage(imageName);
    cleanupClone(repoAnalysis.clonePath);

    // Success
    job.status = 'success';
    job.dockerfile = dockerfile;
    addLog(job, `\n✓ SUCCESS: Dockerfile generated and validated!`);
  } catch (error) {
    job.status = 'failed';
    job.error = error.message;
    addLog(job, `✗ Fatal error: ${error.message}`);
    console.error('[Orchestrator] Fatal error:', error);
  }
}
