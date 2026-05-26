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
  const files = fs.readdirSync(repoPath).filter(f => !f.startsWith('.'));
  const manifest = {};

  // Check for common manifest files
  if (files.includes('package.json')) {
    manifest.language = 'nodejs';
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(repoPath, 'package.json'), 'utf-8'));
      manifest.framework = Object.keys(pkg.dependencies || {}).find(dep =>
        ['express', 'fastify', 'koa', 'hapi', 'nestjs', 'next', 'react', 'vue'].includes(dep)
      );
      manifest.hasTests = files.includes('jest.config.js') || files.includes('.mocharc');
      manifest.scripts = pkg.scripts || {};
      manifest.packageJsonContent = JSON.stringify(pkg, null, 2).slice(0, 500);
    } catch (e) {
      console.warn('[Analysis] Failed to parse package.json:', e.message);
    }
  } else if (files.includes('requirements.txt')) {
    manifest.language = 'python';
    try {
      const req = fs.readFileSync(path.join(repoPath, 'requirements.txt'), 'utf-8');
      manifest.framework = req.includes('django') ? 'django' : req.includes('flask') ? 'flask' : 'fastapi';
      manifest.requirementsContent = req.slice(0, 300);
    } catch (e) {
      console.warn('[Analysis] Failed to read requirements.txt:', e.message);
    }
  } else if (files.includes('go.mod')) {
    manifest.language = 'go';
    try {
      const gomod = fs.readFileSync(path.join(repoPath, 'go.mod'), 'utf-8');
      manifest.gomodContent = gomod.slice(0, 300);
    } catch (e) {
      console.warn('[Analysis] Failed to read go.mod:', e.message);
    }
  } else if (files.includes('pom.xml')) {
    manifest.language = 'java';
  } else if (files.includes('Gemfile')) {
    manifest.language = 'ruby';
  } else if (files.includes('Dockerfile')) {
    manifest.hasExistingDockerfile = true;
    try {
      const existing = fs.readFileSync(path.join(repoPath, 'Dockerfile'), 'utf-8');
      manifest.existingDockerfile = existing.slice(0, 500);
    } catch (e) {
      console.warn('[Analysis] Failed to read existing Dockerfile:', e.message);
    }
  }

  manifest.files = files.slice(0, 30); // First 30 files
  manifest.directoryStructure = buildDirStructure(repoPath);
  return manifest;
}

/**
 * Build directory structure string for context
 */
function buildDirStructure(repoPath, prefix = '', maxDepth = 2, currentDepth = 0) {
  if (currentDepth >= maxDepth) return '';
  
  try {
    const entries = fs.readdirSync(repoPath).filter(f => !f.startsWith('.'));
    let structure = '';
    
    entries.slice(0, 15).forEach((entry, idx) => {
      const fullPath = path.join(repoPath, entry);
      const isDir = fs.statSync(fullPath).isDirectory();
      structure += `${prefix}${isDir ? '📁' : '📄'} ${entry}\n`;
      
      if (isDir && currentDepth < maxDepth - 1 && !['node_modules', '.git', 'dist'].includes(entry)) {
        structure += buildDirStructure(fullPath, prefix + '  ', maxDepth, currentDepth + 1);
      }
    });
    
    return structure;
  } catch (e) {
    return '';
  }
}

/**
 * Analyze a GitHub repository
 */
/**
 * Validate GitHub URL format
 */
function validateGitHubUrl(repoUrl) {
  // Must be a valid GitHub URL with both owner and repo
  const pattern = /^https:\/\/github\.com\/[\w\-]+\/[\w\-\.]+\/?$/i;
  
  if (!pattern.test(repoUrl)) {
    const parts = repoUrl.split('/').filter(p => p && p !== 'github.com' && !p.includes('https:'));
    
    if (parts.length === 0) {
      throw new Error('Invalid GitHub URL format. Expected: https://github.com/owner/repository');
    } else if (parts.length === 1) {
      throw new Error(`Incomplete URL - missing repository name. Expected: https://github.com/${parts[0]}/repository-name`);
    } else {
      throw new Error('Invalid GitHub URL format. Expected: https://github.com/owner/repository');
    }
  }
  return true;
}

export async function analyzeRepo(repoUrl) {
  try {
    // Validate URL first
    validateGitHubUrl(repoUrl);
    
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
