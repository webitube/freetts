/**
 * Automated Test Harness for FreeTTS
 * 
 * This script runs all tests, collates results into TestLog.json,
 * and writes a final report with PASSED/FAILED disposition.
 * 
 * Usage: node scripts/test-harness.js
 */

import { execSync } from 'child_process';
import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const TEST_LOG_PATH = join(PROJECT_ROOT, 'TestLog.json');
const REPORT_PATH = join(PROJECT_ROOT, 'TestReport.json');

// Clear or create test log file
if (existsSync(TEST_LOG_PATH)) {
    writeFileSync(TEST_LOG_PATH, '', 'utf-8');
}

/**
 * Log a message to TestLog.json
 */
function logToTestLog(entry) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        ...entry
    };
    appendFileSync(TEST_LOG_PATH, JSON.stringify(logEntry) + '\n', 'utf-8');
    console.log(`[LOG] ${entry.message}`);
}

/**
 * Run tests using Vitest
 */
function runTests() {
    const startTime = Date.now();
    logToTestLog({ type: 'test-start', message: 'Starting test execution...' });

    try {
        // Run vitest with JSON output for parsing
        const output = execSync('npx vitest run --reporter=json', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            stdio: 'pipe'
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        logToTestLog({
            type: 'test-complete',
            message: 'Test execution completed.',
            duration: duration,
            stdout: output
        });

        return { success: true, output, duration };
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;

        logToTestLog({
            type: 'test-error',
            message: `Tests failed with error: ${error.message}`,
            duration: duration,
            stderr: error.stderr?.toString() || 'No error output'
        });

        return { success: false, error: error.message, duration };
    }
}

/**
 * Run coverage report
 */
function runCoverage() {
    logToTestLog({ type: 'coverage-start', message: 'Running coverage analysis...' });

    try {
        const output = execSync('npx vitest run --coverage', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            stdio: 'pipe'
        });

        logToTestLog({
            type: 'coverage-complete',
            message: 'Coverage analysis completed.',
            stdout: output
        });

        return { success: true };
    } catch (error) {
        logToTestLog({
            type: 'coverage-error',
            message: `Coverage analysis failed: ${error.message}`
        });

        return { success: false, error: error.message };
    }
}

/**
 * Generate final test report
 */
function generateReport(testResult, coverageResult) {
    const report = {
        generatedAt: new Date().toISOString(),
        testResult: {
            success: testResult.success,
            duration: testResult.duration || 0,
            message: testResult.success ? 'All tests passed' : `Tests failed: ${testResult.error || 'Unknown error'}`
        },
        coverageResult: {
            success: coverageResult.success,
            message: coverageResult.success ? 'Coverage analysis completed' : `Coverage failed: ${coverageResult.error || 'Unknown error'}`
        },
        finalDisposition: testResult.success ? 'PASSED' : 'FAILED'
    };

    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
    
    logToTestLog({
        type: 'report-generated',
        message: `Test Report generated at ${REPORT_PATH}`,
        report: report
    });

    return report;
}

/**
 * Main execution
 */
async function main() {
    console.log('='.repeat(60));
    console.log('FreeTTS Automated Test Harness');
    console.log('='.repeat(60));
    console.log();

    // Run tests
    const testResult = runTests();

    // Run coverage
    const coverageResult = runCoverage();

    // Generate report
    const report = generateReport(testResult, coverageResult);

    console.log();
    console.log('='.repeat(60));
    console.log('Test Execution Summary');
    console.log('='.repeat(60));
    console.log(`Final Disposition: ${report.finalDisposition}`);
    console.log(`Test Duration: ${testResult.duration || 0}ms`);
    console.log(`Test Success: ${testResult.success}`);
    console.log(`Coverage Success: ${coverageResult.success}`);
    console.log();
    console.log(`Test Log: ${TEST_LOG_PATH}`);
    console.log(`Test Report: ${REPORT_PATH}`);
    console.log('='.repeat(60));

    // Exit with appropriate code
    process.exit(testResult.success ? 0 : 1);
}

// Run the harness
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
