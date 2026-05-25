#!/usr/bin/env node

/**
 * DockerForge - Quick Start Guide
 * Run this after cloning to set up the project
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n🐳 DockerForge - Setup Guide\n');
console.log('=' .repeat(50));

// Check Node.js
try {
  const version = execSync('node -v', { encoding: 'utf-8' }).trim();
  console.log(`✓ Node.js ${version}`);
} catch {
  console.error('✗ Node.js not found. Please install Node.js 16+');
  process.exit(1);
}

// Check Docker
try {
  execSync('docker -v', { encoding: 'utf-8' });
  console.log('✓ Docker installed');
} catch {
  console.error('✗ Docker not found. Please install Docker');
  process.exit(1);
}

// Set up environment
const envPath = path.join(__dirname, 'backend', '.env');
const envExamplePath = path.join(__dirname, 'backend', '.env.example');

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✓ Created .env file (edit backend/.env to add GROQ_API_KEY)');
} else {
  console.log('✓ backend/.env already exists');
}

console.log('\n📦 Installing dependencies...\n');

// Install backend
console.log('Installing backend packages...');
execSync('npm install', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
console.log('✓ Backend packages installed\n');

// Install frontend
console.log('Installing frontend packages...');
execSync('npm install', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
console.log('✓ Frontend packages installed\n');

// Build frontend
console.log('Building frontend...');
execSync('npm run build', { cwd: path.join(__dirname, 'frontend'), stdio: 'inherit' });
console.log('✓ Frontend built\n');

console.log('=' .repeat(50));
console.log('\n✅ Setup complete!\n');
console.log('📝 Next steps:\n');
console.log('1. Get Groq API Key (free $5-10 credits):');
console.log('   → Visit: https://console.groq.com');
console.log('   → Copy API key\n');
console.log('2. Add API key to backend/.env:');
console.log('   GROQ_API_KEY=your_key_here\n');
console.log('3. Run the application:\n');
console.log('   Option A - Local Development (two terminals):');
console.log('   Terminal 1: cd backend && npm start');
console.log('   Terminal 2: cd frontend && npm run dev');
console.log('   Then visit http://localhost:3000\n');
console.log('   Option B - Docker Compose:');
console.log('   docker-compose up --build\n');
console.log('4. Test with a GitHub repo URL:');
console.log('   https://github.com/expressjs/express\n');
