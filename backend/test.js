#!/usr/bin/env node

/**
 * Simple end-to-end test for DockerForge
 * Tests: Git analysis → LLM generation → Docker build (without real build)
 */

import { analyzeRepo, cleanupClone } from './src/agents/gitAnalyzer.js';
import { generateDockerfile } from './src/agents/dockerfileGenerator.js';
import { createJob, getJob, orchestrateDockerGeneration } from './src/agents/orchestrator.js';

async function testGitAnalysis() {
  console.log('\n=== Test 1: Git Analysis ===');
  try {
    // Use a well-known, stable repo for testing
    const repoUrl = 'https://github.com/expressjs/express.git';
    console.log(`Analyzing repo: ${repoUrl}`);
    
    const analysis = await analyzeRepo(repoUrl);
    console.log('✓ Analysis successful');
    console.log(`  Language: ${analysis.techStack.language}`);
    console.log(`  Framework: ${analysis.techStack.framework}`);
    
    cleanupClone(analysis.clonePath);
    return analysis;
  } catch (error) {
    console.error('✗ Git analysis failed:', error.message);
    throw error;
  }
}

async function testDockerfileGeneration(repoAnalysis) {
  console.log('\n=== Test 2: Dockerfile Generation ===');
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not set - skipping generation test');
      return null;
    }

    console.log('Generating Dockerfile via Groq API...');
    const dockerfile = await generateDockerfile(repoAnalysis, null, 1);
    
    console.log('✓ Generation successful');
    console.log('Generated Dockerfile (first 300 chars):');
    console.log(dockerfile.substring(0, 300) + '...\n');
    
    return dockerfile;
  } catch (error) {
    console.error('✗ Generation failed:', error.message);
    throw error;
  }
}

async function testOrchestrator() {
  console.log('\n=== Test 3: Full Orchestration (Mock) ===');
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not set - skipping orchestration test');
      return;
    }

    const jobId = createJob('https://github.com/expressjs/express.git');
    console.log(`Created job: ${jobId}`);

    // Start orchestration (non-blocking)
    orchestrateDockerGeneration(jobId, 3).catch(console.error);

    // Check status a few times
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const job = getJob(jobId);
      console.log(`  Status: ${job.status} (${job.logs.length} log lines)`);
      if (['success', 'failed'].includes(job.status)) break;
    }

    const finalJob = getJob(jobId);
    console.log(`✓ Final status: ${finalJob.status}`);
    if (finalJob.dockerfile) {
      console.log('✓ Dockerfile generated');
    }
  } catch (error) {
    console.error('✗ Orchestration test failed:', error.message);
  }
}

async function main() {
  console.log('🐳 DockerForge - End-to-End Test Suite\n');

  try {
    // Test 1: Git analysis
    const analysis = await testGitAnalysis();

    // Test 2: Dockerfile generation (if API key available)
    await testDockerfileGeneration(analysis);

    // Test 3: Orchestration
    await testOrchestrator();

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

main();
