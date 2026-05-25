import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import Docker from 'dockerode';

const docker = new Docker();

/**
 * Parse Docker build error to extract key information with better suggestions
 */
function parseDockerError(errorLog) {
  const lines = errorLog.split('\n');
  const error = {
    raw: errorLog,
    errorCode: null,
    errorMessage: null,
    suggestions: [],
  };

  // Extract error code and message
  let errorFound = false;
  for (const line of lines) {
    if (line.includes('ERROR') || line.includes('Error') || line.includes('failed')) {
      if (!errorFound) {
        error.errorMessage = line.trim().substring(0, 150);
        errorFound = true;
      }
    }
    
    // Manifest/Image not found
    if (line.includes('manifest not found') || line.includes('image not found') || line.includes('pull access denied')) {
      error.errorCode = 'MANIFEST_NOT_FOUND';
      error.suggestions = [
        'Verify base image exists (e.g., node:18-alpine, python:3.11-slim, golang:1.21-alpine)',
        'Check spelling and tag of base image',
        'Ensure image is publicly available or credentials are set'
      ];
    }
    
    // Command not found
    if (line.includes('command not found') || line.includes('not found in') || line.includes('sh:') && line.includes('not found')) {
      error.errorCode = 'COMMAND_NOT_FOUND';
      error.suggestions = [
        'Try adding package installation before using the command',
        'Example: RUN apt-get update && apt-get install -y <package>',
        'Verify command is available in the base image'
      ];
    }
    
    // File/Path not found
    if (line.includes('COPY failed') || line.includes('ADD failed') || line.includes('no such file or directory')) {
      error.errorCode = 'PATH_NOT_FOUND';
      error.suggestions = [
        'Check COPY/ADD source paths exist in the repository',
        'Use relative paths from repository root',
        'Example: COPY package.json . or COPY src/ /app/src/'
      ];
    }
    
    // Permission denied
    if (line.includes('permission denied')) {
      error.errorCode = 'PERMISSION_DENIED';
      error.suggestions = [
        'Try adding RUN chmod +x to make scripts executable',
        'Verify USER context (run as root if needed for installation)',
        'Check file ownership in COPY commands'
      ];
    }
  }

  // If no error found, extract the most relevant error line
  if (!error.errorMessage) {
    const relevantLines = lines.filter(l => l.includes('error') || l.includes('Error') || l.includes('ERROR') || l.includes('failed'));
    if (relevantLines.length > 0) {
      error.errorMessage = relevantLines[0].trim().substring(0, 150);
    } else {
      error.errorMessage = lines.filter(l => l.trim().length > 0).pop() || 'Unknown build error';
    }
  }

  return error;
}

/**
 * Build Docker image from Dockerfile using docker build command
 */
export async function buildImage(dockerfile, repoPath, imageName) {
  return new Promise((resolve, reject) => {
    const dockerfilePath = path.join(repoPath, 'Dockerfile');
    fs.writeFileSync(dockerfilePath, dockerfile);

    console.log(`[Docker] Building image: ${imageName}...`);

    const buildLog = [];
    const buildCommand = `docker build -t ${imageName} "${repoPath}"`;

    const childProcess = exec(buildCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const fullLog = buildLog.join('') + stdout + stderr;

      if (error) {
        console.error('[Docker] Build failed:', error.message);
        const parsedError = parseDockerError(fullLog);
        reject({
          status: 'failed',
          error: parsedError,
          logs: fullLog,
        });
      } else {
        console.log(`[Docker] Build succeeded: ${imageName}`);
        resolve({
          status: 'success',
          imageName,
          logs: fullLog,
        });
      }
    });

    // Capture output line-by-line for real-time logging
    if (childProcess.stdout) {
      childProcess.stdout.on('data', (data) => {
        const text = data.toString();
        buildLog.push(text);
        process.stdout.write(text);
      });
    }

    if (childProcess.stderr) {
      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        buildLog.push(text);
        process.stderr.write(text);
      });
    }
  });
}

/**
 * Run Docker container briefly to verify it starts
 */
export async function verifyContainer(imageName) {
  try {
    console.log(`[Docker] Verifying container: ${imageName}...`);

    const container = await docker.createContainer({
      Image: imageName,
      Cmd: ['echo', 'Container started successfully'],
      HostConfig: {
        AutoRemove: true,
      },
    });

    const stream = await container.attach({ stream: true, stdout: true, stderr: true });
    const logs = [];

    stream.on('data', (chunk) => {
      logs.push(chunk.toString());
    });

    await container.start();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    await container.stop();
    await container.remove();

    console.log(`[Docker] Container verification passed`);
    return {
      status: 'success',
      logs: logs.join(''),
    };
  } catch (error) {
    console.error('[Docker] Verification failed:', error.message);
    throw error;
  }
}

/**
 * Clean up image after building
 */
export async function cleanupImage(imageName) {
  try {
    const image = docker.getImage(imageName);
    await image.remove({ force: true });
    console.log(`[Docker] Cleaned up image: ${imageName}`);
  } catch (error) {
    console.warn(`[Docker] Cleanup failed for ${imageName}:`, error.message);
  }
}
