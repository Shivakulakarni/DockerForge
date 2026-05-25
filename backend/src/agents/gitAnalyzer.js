import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLONE_DIR = path.join(__dirname, '../../temp/cloned-repos');

// Ensure temp directory exists
if (!fs.existsSync(CLONE_DIR)) {
  fs.mkdirSync(CLONE_DIR, { recursive: true });
}

/**
 * Detect programming language and framework from repo structure
 */
function detectTechStack(repoPath) {
  const files = fs.readdirSync(repoPath);
  const manifest = {};

  // Check for common manifest files
  if (files.includes('package.json')) {
    manifest.language = 'nodejs';
    const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json'), 'utf-8'));
    manifest.framework = Object.keys(pkg.dependencies || {}).find(dep =>
      ['express', 'fastify', 'koa', 'hapi', 'nestjs'].includes(dep)
    );
    manifest.hasTests = files.includes('jest.config.js') || files.includes('.mocharc');
  } else if (files.includes('requirements.txt')) {
    manifest.language = 'python';
    const req = fs.readFileSync(path.join(repoPath, 'requirements.txt'), 'utf-8');
    manifest.framework = req.includes('django') ? 'django' : req.includes('flask') ? 'flask' : 'fastapi';
  } else if (files.includes('go.mod')) {
    manifest.language = 'go';
  } else if (files.includes('pom.xml')) {
    manifest.language = 'java';
  } else if (files.includes('Gemfile')) {
    manifest.language = 'ruby';
  } else if (files.includes('Dockerfile')) {
    manifest.hasExistingDockerfile = true;
  }

  manifest.files = files;
  return manifest;
}

/**
 * Analyze a GitHub repository
 */
export async function analyzeRepo(repoUrl) {
  try {
    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const repoClonePath = path.join(CLONE_DIR, repoName);

    // Clean up if exists
    if (fs.existsSync(repoClonePath)) {
      fs.rmSync(repoClonePath, { recursive: true });
    }

    // Shallow clone for speed
    console.log(`[Git] Cloning ${repoUrl} (shallow clone)...`);
    const git = simpleGit();
    await git.clone(repoUrl, repoClonePath, ['--depth', '1']);

    // Detect tech stack
    const techStack = detectTechStack(repoClonePath);

    // Read README if exists
    const readmePath = path.join(repoClonePath, 'README.md');
    const readme = fs.existsSync(readmePath)
      ? fs.readFileSync(readmePath, 'utf-8').slice(0, 1000) // First 1000 chars
      : '';

    const result = {
      repoUrl,
      repoName,
      techStack,
      readme,
      clonePath: repoClonePath,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Git] Analysis complete:`, result.techStack);
    return result;
  } catch (error) {
    console.error('[Git] Analysis failed:', error.message);
    throw new Error(`Failed to analyze repo: ${error.message}`);
  }
}

/**
 * Clean up cloned repository
 */
export function cleanupClone(repoPath) {
  try {
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true });
    }
  } catch (error) {
    console.warn('[Git] Cleanup failed:', error.message);
  }
}
