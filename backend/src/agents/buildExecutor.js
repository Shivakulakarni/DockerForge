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
    raw: errorLog.slice(0, 1000), // Keep first 1000 chars for context
    errorCode: null,
    errorMessage: null,
    suggestions: [],
    context: [],
  };

  // Extract error code and message - look for actual error lines
  let errorFound = false;
  let contextLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Collect context around errors
    if (line.includes('ERROR') || line.includes('Error') || line.includes('error') || line.includes('FAILED')) {
      if (!errorFound) {
        error.errorMessage = line.trim().substring(0, 200);
        errorFound = true;
        // Add surrounding lines for context
        contextLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3));
      }
    }
    
    // Manifest/Image not found
    if (line.includes('manifest not found') || line.includes('image not found') || line.includes('pull access denied') || line.includes('no such file or directory') && line.includes('FROM')) {
      error.errorCode = 'MANIFEST_NOT_FOUND';
      error.suggestions = [
        'Verify base image name and tag exist (check docker hub)',
        'Try: node:18-alpine, python:3.11-slim, golang:1.21-alpine, or alpine:latest',
        'If using private image, ensure registry credentials are available'
      ];
    }
    
    // Command not found (RUN layer)
    if ((line.includes('command not found') || line.includes('not found in')) && !error.errorCode) {
      error.errorCode = 'COMMAND_NOT_FOUND';
      error.suggestions = [
        'Install required packages before using commands',
        'Try: RUN apt-get update && apt-get install -y <package>',
        'Ensure the command is available in the base image OS'
      ];
    }
    
    // File/Path not found (COPY/ADD)
    if ((line.includes('COPY failed') || line.includes('ADD failed') || line.includes('no such file or directory') || line.includes('denied')) && !error.errorCode) {
      error.errorCode = 'PATH_NOT_FOUND';
      error.suggestions = [
        'Check COPY/ADD source paths - they must exist in the repository root',
        'Use relative paths from repository root: COPY package.json . or COPY src/ /app/src/',
        'Verify file names and paths are correct (case-sensitive on Linux)'
      ];
    }
    
    // Permission denied
    if (line.includes('permission denied') && !error.errorCode) {
      error.errorCode = 'PERMISSION_DENIED';
      error.suggestions = [
        'Add executable permission: RUN chmod +x script.sh',
        'Ensure RUN commands have proper permissions',
        'Try running as root or appropriate user'
      ];
    }
  }

  error.context = contextLines.slice(0, 5);

  // If no specific error found, extract most relevant line
  if (!error.errorMessage) {
    const relevantLines = lines.filter(l => 
      l.toLowerCase().includes('error') || 
      l.toLowerCase().includes('failed') || 
      l.toLowerCase().includes('denied')
    );
    if (relevantLines.length > 0) {
      error.errorMessage = relevantLines[0].trim().substring(0, 200);
    } else {
      // Last non-empty line
      const lastLine = lines.filter(l => l.trim().length > 0).pop();
      error.errorMessage = lastLine ? lastLine.trim().substring(0, 200) : 'Unknown build error';
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
