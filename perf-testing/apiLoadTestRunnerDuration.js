// apiLoadTestRunnerDuration.js
// At the very top of the file, keep this if you want to suppress the warning:
process.setMaxListeners(0); // 0 means unlimited listeners. Or set a higher number like 100.

const runApiUserFlow = require('./apiUserFlow'); // Import the API-focused user flow

// --- Configuration for Duration-Based API Test ---
const DURATION_MINUTES = 5; // Total duration of the load test in minutes
const TARGET_CONCURRENCY = 50; // How many API flows to run in parallel

// Function to calculate percentiles
function calculatePercentile(durations, percentile) {
    if (durations.length === 0) return 0;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const index = (percentile / 100) * (sortedDurations.length - 1);
    if (index === Math.floor(index)) {
        return sortedDurations[index];
    }
    const lower = sortedDurations[Math.floor(index)];
    const upper = sortedDurations[Math.ceil(index)];
    return lower + (upper - lower) * (index - Math.floor(index));
}

// Function to run the API load test for a specified duration
async function runApiLoadTestForDuration() {
    console.log(`Starting API load test for ${DURATION_MINUTES} minutes with ${TARGET_CONCURRENCY} concurrent users...`);

    const results = [];
    let activeBrowsers = 0;
    let totalUsersLaunched = 0;
    let testRunning = true;

    const overallStartTime = Date.now();
    const overallEndTime = overallStartTime + (DURATION_MINUTES * 60 * 1000);

    return new Promise((resolve) => {
        const launchApiUserFlow = async () => {
            if (Date.now() < overallEndTime && activeBrowsers < TARGET_CONCURRENCY) {
                totalUsersLaunched++;
                const userId = totalUsersLaunched;
                activeBrowsers++;
                console.log(`[Orchestrator] Starting API User ${userId}. Active browsers: ${activeBrowsers}`);

                runApiUserFlow(userId)
                    .then(result => {
                        results.push(result);
                        console.log(`[Orchestrator] API User ${userId} completed. Success: ${result.success}`);
                    })
                    .catch(err => {
                        console.error(`[Orchestrator] API User ${userId} failed unexpectedly:`, err);
                        results.push({ success: false, userId: userId, error: err.message || String(err) });
                    })
                    .finally(() => {
                        activeBrowsers--;
                        console.log(`[Orchestrator] API User ${userId} finished. Active browsers: ${activeBrowsers}`);
                        if (testRunning) {
                            setTimeout(launchApiUserFlow, 50);
                        }
                    });
            } else if (Date.now() >= overallEndTime && activeBrowsers === 0) {
                testRunning = false;
                resolve(results);
            } else if (Date.now() >= overallEndTime && activeBrowsers > 0) {
                testRunning = false;
                setTimeout(launchApiUserFlow, 1000);
            } else if (activeBrowsers >= TARGET_CONCURRENCY) {
                setTimeout(launchApiUserFlow, 1000);
            }
        };

        for (let i = 0; i < TARGET_CONCURRENCY; i++) {
            if (Date.now() < overallEndTime) {
                launchApiUserFlow();
            } else {
                break;
            }
        }
        if (Date.now() >= overallEndTime && activeBrowsers === 0) {
            testRunning = false;
            resolve(results);
        }
    });
}

// Function to analyze results - Tailored for API Test metrics and percentiles
function analyzeApiTestResults(results, totalUsersAttempted) {
    const successfulFlows = results.filter(r => r.success);
    const failedFlows = results.filter(r => !r.success);

    console.log(`\n--- API Load Test Summary ---`);
    console.log(`Total API Flows Attempted (Launched): ${totalUsersAttempted}`);
    console.log(`Successful API Flows (Completed): ${successfulFlows.length}`);
    console.log(`Failed API Flows: ${failedFlows.length}`);

    // Flatten all individual API call durations from successful flows for percentile calculation
    const allIndividualApiCallDurations = successfulFlows.flatMap(flow => flow.allApiCallDurations || []);

    if (successfulFlows.length > 0) {
        const avgFlowDurationPerUser = successfulFlows.reduce((sum, r) => sum + r.totalFlowDuration, 0) / successfulFlows.length;
        const avgIndividualApiCallTime = allIndividualApiCallDurations.reduce((sum, d) => sum + d, 0) / allIndividualApiCallDurations.length;

        const totalSuccessfulApiCalls = successfulFlows.reduce((sum, r) => sum + r.totalSuccessfulApiCallsInFlow, 0);
        const totalApiCallsAttemptedAcrossAllFlows = successfulFlows.reduce((sum, r) => sum + r.totalApiCallsAttemptedInFlow, 0);
        const totalErrorApiCallsAcrossAllFlows = successfulFlows.reduce((sum, r) => sum + r.totalErrorApiCallsInFlow, 0);

        console.log(`\nAverage Metrics for Successful API Flows:`);
        console.log(`  Average Full API Flow Duration Per User: ${avgFlowDurationPerUser.toFixed(2)}ms`);
        console.log(`  Average Individual API Call Time (across all successful calls): ${avgIndividualApiCallTime.toFixed(2)}ms`);

        if (allIndividualApiCallDurations.length > 0) {
            console.log(`\nPercentiles for Individual API Call Durations (ms):`);
            console.log(`  P90: ${calculatePercentile(allIndividualApiCallDurations, 90).toFixed(2)}`);
            console.log(`  P95: ${calculatePercentile(allIndividualApiCallDurations, 95).toFixed(2)}`);
            console.log(`  P99: ${calculatePercentile(allIndividualApiCallDurations, 99).toFixed(2)}`);
        }

        console.log(`\nOverall API Call Summary:`);
        console.log(`  Total Successful API Calls: ${totalSuccessfulApiCalls}`);
        console.log(`  Total API Calls Attempted: ${totalApiCallsAttemptedAcrossAllFlows}`);
        console.log(`  Total API Calls with Errors (HTTP 4xx/5xx or Network): ${totalErrorApiCallsAcrossAllFlows}`);
        console.log(`  Overall API Call Success Rate: ${(totalSuccessfulApiCalls / totalApiCallsAttemptedAcrossAllFlows * 100).toFixed(2)}%`);

    } else {
        console.log(`\nNo successful API flows with complete metrics to average.`);
    }

    if (failedFlows.length > 0) {
        console.log(`\nDetails for Failed API Flows (Flows that ended in a Playwright exception or had internal API errors):`);
        failedFlows.forEach(flow => {
            console.log(`  User ${flow.userId}: Failed due to: ${flow.error || 'Internal API errors'}`);
            if (flow.failedApiCallDetails && flow.failedApiCallDetails.length > 0) {
                console.log(`    API Errors within flow:`);
                flow.failedApiCallDetails.forEach(detail => {
                    console.log(`      - ${detail.method} ${detail.endpoint} Status: ${detail.status} Duration: ${detail.duration}ms`);
                });
            }
        });
    }

    console.log(`--- End of Summary ---`);
}

// --- Main Execution Block ---
(async () => {
    const startTime = Date.now();
    const results = await runApiLoadTestForDuration();
    const endTime = Date.now();
    console.log(`\nAPI Load test completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds.`);

    analyzeApiTestResults(results, results.length);
})();