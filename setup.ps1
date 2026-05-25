#!/usr/bin/env powershell

Write-Host "🐳 DockerForge Setup Script" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Check for Node.js
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$node = node -v 2>$null
if (-not $node) {
    Write-Host "✗ Node.js not found. Please install Node.js 16+" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js $node" -ForegroundColor Green

# Check for Docker
$docker = docker -v 2>$null
if (-not $docker) {
    Write-Host "✗ Docker not found. Please install Docker" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker installed" -ForegroundColor Green

# Create .env file
Write-Host "`nSetting up environment..." -ForegroundColor Yellow
if (-not (Test-Path backend\.env)) {
    Copy-Item backend\.env.example backend\.env
    Write-Host "Created backend\.env file" -ForegroundColor Green
    Write-Host "⚠️  Please add your GROQ_API_KEY to backend\.env" -ForegroundColor Yellow
} else {
    Write-Host "✓ backend\.env already exists" -ForegroundColor Green
}

# Install backend dependencies
Write-Host "`nInstalling backend dependencies..." -ForegroundColor Yellow
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Backend install failed" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "✓ Backend dependencies installed" -ForegroundColor Green

# Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Frontend install failed" -ForegroundColor Red
    exit 1
}
Set-Location ..
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green

Write-Host "`n✓ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Add GROQ_API_KEY to backend\.env" -ForegroundColor White
Write-Host "2. Run: npm start (from backend/)" -ForegroundColor White
Write-Host "3. Run: npm run dev (from frontend/)" -ForegroundColor White
Write-Host "4. Open http://localhost:3000" -ForegroundColor White
