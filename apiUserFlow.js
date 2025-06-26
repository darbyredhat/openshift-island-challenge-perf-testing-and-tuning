// apiUserFlow.js
const { chromium } = require('playwright');

// Helper function to pick random elements from an array
function getRandomElements(arr, count) {
    const shuffled = arr.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function runApiUserFlow(userId) {
    let browser;
    let context;
    try {
        console.log(`[User ${userId}] Starting API focused flow with pre-authenticated session...`);

        // Launch browser with options to ignore HTTPS errors
        // This is crucial for the context that will be created from it
        browser = await chromium.launch({
            headless: true,
            ignoreHTTPSErrors: true, // Ignore HTTPS errors for the browser instance
            args: ['--ignore-certificate-errors'] // Explicit Chromium argument for robustness
        });

        const baseUrl = process.env.CTFD_BASE_URL;
        const apiAccessToken = process.env.CTFD_API_ACCESS_TOKEN; // Get API token for header

        if (!baseUrl || !apiAccessToken) {
            throw new Error(
                'Missing environment variables. Please set CTFD_BASE_URL and CTFD_API_ACCESS_TOKEN.'
            );
        }

        // --- API Test Configuration ---
        const DEFAULT_PACING_MS = 500; // 500ms think time between major API calls
        const NUM_CHALLENGES_TO_DETAIL = 3; // How many challenge details to fetch after getting the list

        const apiCallMetrics = []; // To store detailed results for each individual API call
        const flowStartTime = Date.now(); // Flow timing starts here, *after* session setup

        // --- Step 1: Create a new browser context loading the saved session state ---
        // This bypasses the HTML login process for each user flow.
        context = await browser.newContext({
            storageState: 'auth.json', // Load the saved session state
            extraHTTPHeaders: {
                'Authorization': `Token ${apiAccessToken}`, // Add the correct token header
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            // IMPORTANT: Also apply ignoreHTTPSErrors to the context creation itself
            // This ensures that API requests made through `page.request` within this context
            // will also ignore certificate errors, even if the browser launch didn't cover all cases.
            ignoreHTTPSErrors: true
        });
        const page = await context.newPage();

        console.log(`[User ${userId}] Pre-authenticated session loaded. Beginning API calls.`);

        // --- Helper function to make an API call and record metrics ---
        const makeApiCall = async (method, endpoint, expectedStatus = 200) => {
            const fullUrl = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
            const apiCallStartTime = Date.now();
            let responseStatus;
            let responseOk;
            let responseBody = null;
            let responseText = null;

            try {
                // Playwright's page.request uses the context's network settings,
                // which now include ignoreHTTPSErrors
                const apiResponse = await page.request[method.toLowerCase()](fullUrl, { timeout: 30000 });
                responseStatus = apiResponse.status();
                responseOk = apiResponse.ok();

                try {
                    responseBody = await apiResponse.json();
                } catch (jsonError) {
                    responseText = await apiResponse.text();
                    console.warn(`[User ${userId}] DEBUG: API ${method} ${endpoint} Status ${responseStatus}. JSON parse failed. Raw body text snippet: "${responseText.substring(0, 200)}..."`);
                }

                console.log(`[User ${userId}] API ${method} ${endpoint} finished with status ${responseStatus}.`);

                if (!responseOk && responseStatus !== expectedStatus) {
                    console.warn(`[User ${userId}] API ${method} ${endpoint} failed: Status ${responseStatus} (expected ${expectedStatus}), Body: ${JSON.stringify(responseBody || responseText || 'No body content')}`);
                }

            } catch (apiError) {
                console.error(`[User ${userId}] API ${method} ${endpoint} failed due to network error/timeout: ${apiError.message}`);
                responseStatus = 'NETWORK_ERROR';
                responseOk = false;
            }

            const apiCallEndTime = Date.now();
            const duration = apiCallEndTime - apiCallStartTime;

            apiCallMetrics.push({
                endpoint: endpoint,
                method: method,
                duration: duration,
                status: responseStatus,
                ok: responseOk,
                is_error: !responseOk || responseStatus >= 400 || responseStatus === 'NETWORK_ERROR'
            });
            return responseBody;
        };

        // --- API Call Sequence for Realistic Scenario ---

        // 1. Get all challenges
        let challengesData = await makeApiCall('GET', '/api/v1/challenges');
        await page.waitForTimeout(DEFAULT_PACING_MS);

        // 2. Get details for a few random challenges (chained request)
        if (challengesData && challengesData.data && Array.isArray(challengesData.data) && challengesData.data.length > 0) {
            const randomChallenges = getRandomElements(challengesData.data, NUM_CHALLENGES_TO_DETAIL);
            for (const challenge of randomChallenges) {
                if (challenge && typeof challenge.id !== 'undefined') {
                    await makeApiCall('GET', `/api/v1/challenges/${challenge.id}`);
                } else {
                    console.warn(`[User ${userId}] Skipped getting challenge detail due to invalid challenge object:`, JSON.stringify(challenge));
                }
                await page.waitForTimeout(DEFAULT_PACING_MS / 2);
            }
        } else {
            console.warn(`[User ${userId}] No challenges data found or data is empty/invalid. ChallengesData was:`, JSON.stringify(challengesData));
        }
        await page.waitForTimeout(DEFAULT_PACING_MS);

        // 3. Get scoreboard
        await makeApiCall('GET', '/api/v1/scoreboard');
        await page.waitForTimeout(DEFAULT_PACING_MS);

        // 4. Get users list
        await makeApiCall('GET', '/api/v1/users');
        await page.waitForTimeout(DEFAULT_PACING_MS);

        // 5. Get notifications
        await makeApiCall('GET', '/api/v1/notifications');
        await page.waitForTimeout(DEFAULT_PACING_MS);

        const flowEndTime = Date.now();
        console.log(`[User ${userId}] API focused flow completed.`);

        // Aggregate results for the return object
        const totalFlowDuration = flowEndTime - flowStartTime;
        const totalSuccessfulApiCallsInFlow = apiCallMetrics.filter(m => m.ok).length;
        const totalApiCallsAttemptedInFlow = apiCallMetrics.length;
        const totalErrorApiCallsInFlow = apiCallMetrics.filter(m => m.is_error).length;

        return {
            success: totalErrorApiCallsInFlow === 0,
            userId: userId,
            // loginPageLoadTime is no longer applicable
            flowStartTime: flowStartTime, // This is now when API calls start
            flowEndTime: flowEndTime,
            totalFlowDuration: totalFlowDuration, // This will be much shorter now
            totalApiCallsAttemptedInFlow: totalApiCallsAttemptedInFlow,
            totalSuccessfulApiCallsInFlow: totalSuccessfulApiCallsInFlow,
            totalErrorApiCallsInFlow: totalErrorApiCallsInFlow,
            allApiCallDurations: apiCallMetrics.map(m => m.duration),
            failedApiCallDetails: apiCallMetrics.filter(m => m.is_error)
        };

    } catch (error) {
        console.error(`[User ${userId}] API focused flow failed catastrophically:`, error.message);
        return { success: false, userId: userId, error: error.message };
    } finally {
        if (context) {
            await context.close(); // Close context to ensure trace saves (if enabled)
        }
        if (browser) {
            await browser.close();
            console.log(`[User ${userId}] Browser closed.`);
        }
    }
}

module.exports = runApiUserFlow;