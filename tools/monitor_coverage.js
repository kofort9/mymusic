#!/usr/bin/env node

/**
 * Coverage Monitoring Script
 * 
 * Runs npm test --coverage multiple times within a 5-minute window
 * and updates TEST_COVERAGE_GAPS.md as coverage changes.
 * 
 * Usage: node tools/monitor_coverage.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DURATION_MS = 5 * 60 * 1000; // 5 minutes
const INTERVAL_MS = 30 * 1000; // Run every 30 seconds
const COVERAGE_DOC = path.join(__dirname, '..', 'TEST_COVERAGE_GAPS.md');

let startTime = Date.now();
let runCount = 0;
let lastCoverage = null;

function extractCoverageFromOutput(output) {
  const lines = output.split('\n');
  const summaryLine = lines.find(line => line.includes('All files'));
  if (!summaryLine) return null;

  // Parse: "All files              |   88.29 |    77.13 |   84.51 |   88.53 |"
  const parts = summaryLine.split('|').map(p => p.trim()).filter(p => p);
  if (parts.length < 5) return null;

  return {
    statements: parseFloat(parts[1]),
    branches: parseFloat(parts[2]),
    functions: parseFloat(parts[3]),
    lines: parseFloat(parts[4]),
  };
}

function extractTestCount(output) {
  const match = output.match(/Tests:\s+(\d+)\s+passed/);
  return match ? parseInt(match[1]) : null;
}

function extractTestSuites(output) {
  const match = output.match(/Test Suites:\s+(\d+)\s+passed/);
  return match ? parseInt(match[1]) : null;
}

function updateCoverageDoc(coverage, testCount, testSuites) {
  if (!fs.existsSync(COVERAGE_DOC)) {
    console.log('⚠️  TEST_COVERAGE_GAPS.md not found, skipping update');
    return;
  }

  let content = fs.readFileSync(COVERAGE_DOC, 'utf8');

  // Update summary line
  content = content.replace(
    /\*\*Current coverage: [\d.]+% statements, [\d.]+% branches, [\d.]+% functions, [\d.]+% lines\*\*/,
    `**Current coverage: ${coverage.statements}% statements, ${coverage.branches}% branches, ${coverage.functions}% functions, ${coverage.lines}% lines**`
  );

  // Update test status
  content = content.replace(
    /\*\*Test Status:\*\* \d+ passing, \d+ test suites passing/,
    `**Test Status:** ${testCount} passing, ${testSuites} test suites passing`
  );

  // Update branch coverage threshold note
  content = content.replace(
    /✅ \*\*Branch coverage at [\d.]+% \(above 70% threshold!\)/,
    `✅ **Branch coverage at ${coverage.branches}% (above 70% threshold!)**`
  );

  fs.writeFileSync(COVERAGE_DOC, content, 'utf8');
  console.log(`✅ Updated TEST_COVERAGE_GAPS.md`);
}

function runCoverage() {
  runCount++;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n[${elapsed}s] Run #${runCount}: Running coverage tests...`);

  try {
    const output = execSync('npm test -- --coverage', {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'pipe',
    });

    const coverage = extractCoverageFromOutput(output);
    const testCount = extractTestCount(output);
    const testSuites = extractTestSuites(output);

    if (!coverage) {
      console.log('⚠️  Could not extract coverage from output');
      return;
    }

    console.log(`📊 Coverage: ${coverage.statements}% statements, ${coverage.branches}% branches, ${coverage.functions}% functions, ${coverage.lines}% lines`);
    console.log(`📝 Tests: ${testCount} passing, ${testSuites} test suites`);

    if (lastCoverage) {
      const changes = {
        statements: (coverage.statements - lastCoverage.statements).toFixed(2),
        branches: (coverage.branches - lastCoverage.branches).toFixed(2),
        functions: (coverage.functions - lastCoverage.functions).toFixed(2),
        lines: (coverage.lines - lastCoverage.lines).toFixed(2),
      };

      const hasChanges = Object.values(changes).some(v => parseFloat(v) !== 0);
      if (hasChanges) {
        console.log(`📈 Changes: statements ${changes.statements > 0 ? '+' : ''}${changes.statements}%, branches ${changes.branches > 0 ? '+' : ''}${changes.branches}%, functions ${changes.functions > 0 ? '+' : ''}${changes.functions}%, lines ${changes.lines > 0 ? '+' : ''}${changes.lines}%`);
        updateCoverageDoc(coverage, testCount, testSuites);
      } else {
        console.log('➡️  No coverage changes detected');
      }
    } else {
      // First run - update doc with initial values
      updateCoverageDoc(coverage, testCount, testSuites);
    }

    lastCoverage = coverage;

  } catch (error) {
    console.error(`❌ Error running coverage tests:`, error.message);
  }
}

function main() {
  console.log('🚀 Starting coverage monitoring...');
  console.log(`⏱️  Duration: ${DURATION_MS / 1000}s (${DURATION_MS / INTERVAL_MS} runs)`);
  console.log(`📄 Coverage doc: ${COVERAGE_DOC}`);
  console.log('');

  // Run immediately
  runCoverage();

  // Then run at intervals
  const intervalId = setInterval(() => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= DURATION_MS) {
      clearInterval(intervalId);
      console.log('\n✅ Monitoring complete!');
      if (lastCoverage) {
        console.log(`\n📊 Final coverage: ${lastCoverage.statements}% statements, ${lastCoverage.branches}% branches, ${lastCoverage.functions}% functions, ${lastCoverage.lines}% lines`);
      }
      process.exit(0);
    }
    runCoverage();
  }, INTERVAL_MS);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Interrupted by user');
    clearInterval(intervalId);
    if (lastCoverage) {
      console.log(`\n📊 Final coverage: ${lastCoverage.statements}% statements, ${lastCoverage.branches}% branches, ${lastCoverage.functions}% functions, ${lastCoverage.lines}% lines`);
    }
    process.exit(0);
  });
}

main();

