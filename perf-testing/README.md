### **How to Run Your Load Test:**

1.  **Save the files:** Ensure `userFlow.js` and `loadTestRunner.js` are in the same directory.
2.  **Install dependencies:** If you haven't already, open your terminal in the project directory and run:

    ```bash
    npm init -y
    npx playwright install
    ```
    * `npm init -y`: Initializes a new Node.js project, creating a `package.json` file.
    * `npx playwright install`: Installs Playwright's browser binaries (Chromium, Firefox, WebKit) for headless execution.

3.  **Set Environment Variables**

Let's use clear names for your variables:

- CTFD_BASE_URL: base url of the ctfd challenges
- CTFD_USERNAME: the player username
- CTFD_PASSWORD: the player password

```
export CTFD_BASE_URL=<your-base-url>
export CTFD_USERNAME=<player-username>
export CTFD_PASSWORD=<player-password>
```

3.  **Execute the load test:** To start the load test, run the following command in your terminal:

    ```bash
    node loadTestRunner.js
    ```
    You will see a stream of console logs from each simulated user. Once all users have completed their flows, a summary will be printed.


    ----
    Okay, let's get you set up for 25 users.

You'll have two main files:

1.  `userFlow.js`: This remains the core Playwright script for a *single* user's journey. We've refined it with your provided HTML.
2.  `loadTestRunner.js`: This is a *new* file that will be responsible for orchestrating the execution of `userFlow.js` concurrently for multiple users (in this case, 25).

---

### **1. `userFlow.js` (Updated and Confirmed)**

This file contains the precise Playwright script for one user's journey through your CTFd application. I've incorporated the selector improvements based on the HTML you provided.

```javascript
// userFlow.js
const { chromium } = require('playwright');

async function runUserFlow(userId) {
    let browser;
    try {
        console.log(`[User ${userId}] Starting flow...`);
        // Launch a headless browser for better performance and resource usage
        // For debugging, set headless: false but remember it consumes more resources
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const baseUrl = 'https://island-ctfd.apps.cluster-g76g8.g76g8.sandbox1331.opentlc.com';
        const username = 'player1';
        const password = 'zPDdXTJb';
        const firstChallengeFlag = 'DONE';

        // --- Step 1: Visit the login page ---
        console.log(`[User ${userId}] Navigating to login page: ${baseUrl}`);
        const loginPageStartTime = Date.now();
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' }); // Wait for initial DOM
        const loginPageEndTime = Date.now();
        console.log(`[User ${userId}] Navigated to login page in ${loginPageEndTime - loginPageStartTime}ms`);

        // --- Step 2: Enter user ID and password ---
        console.log(`[User ${userId}] Entering credentials...`);
        await page.fill('input#name', username); // Using ID selector 'name'
        await page.fill('input#password', password); // Using ID selector 'password'

        // --- Step 3: Click the Login button ---
        console.log(`[User ${userId}] Clicking login button...`);
        await page.click('input#_submit'); // Using ID selector '_submit'

        // Wait for navigation after login to the challenges page
        await page.waitForURL('**/challenges', { waitUntil: 'domcontentloaded' });
        console.log(`[User ${userId}] Successfully logged in and navigated to challenges page.`);

        // Wait for the challenges to load on the page by waiting for the spinner to disappear.
        await page.waitForSelector('.spinner', { state: 'hidden' });
        console.log(`[User ${userId}] Challenges loaded on the page.`);

        // --- Step 4: Click the first challenge labeled: "Write your name in the sand" ---
        console.log(`[User ${userId}] Clicking "Write your name in the sand" challenge...`);
        const firstChallengeClickStartTime = Date.now();
        // More specific selector: finds text inside a div with class 'card-body'
        await page.click('div.card-body:has-text("Write your name in the sand")');
        const firstChallengeClickEndTime = Date.now();
        console.log(`[User ${userId}] Clicked first challenge in ${firstChallengeClickEndTime - firstChallengeClickStartTime}ms`);

        // Wait for the challenge dialog/modal to appear (using its ID if it's the main modal container)
        await page.waitForSelector('#challenge-window[aria-hidden="false"]', { state: 'visible' }); // Wait for the modal itself to be visible
        await page.waitForSelector('#challenge-window h3:has-text("Write your name in the sand")'); // Wait for the specific title
        console.log(`[User ${userId}] First challenge dialog opened.`);

        // --- Step 5: For the flag, enter: DONE ---
        console.log(`[User ${userId}] Entering flag "${firstChallengeFlag}"...`);
        await page.fill('#challenge-window input[name="flag"]', firstChallengeFlag);
        console.log(`[User ${userId}] Flag entered.`);

        // --- Step 6: Close the pop up dialog (by clicking Submit) ---
        console.log(`[User ${userId}] Clicking submit button for first challenge...`);
        await page.click('#challenge-window button:has-text("Submit")');
        // Wait for the dialog to disappear or become hidden
        await page.waitForSelector('#challenge-window[aria-hidden="true"]', { state: 'hidden' });
        console.log(`[User ${userId}] First challenge dialog closed.`);
        // Note: Waiting for domcontentloaded after modal close might be optional but good for stability
        await page.waitForLoadState('domcontentloaded');


        // --- Step 7: Click the second challenge labeled: "Kubernetes version" ---
        console.log(`[User ${userId}] Clicking "Kubernetes version" challenge...`);
        const secondChallengeClickStartTime = Date.now();
        await page.click('div.card-body:has-text("Kubernetes version")');
        const secondChallengeClickEndTime = Date.now();
        console.log(`[User ${userId}] Clicked second challenge in ${secondChallengeClickEndTime - secondChallengeClickStartTime}ms`);

        // Wait for the challenge dialog/modal to appear
        await page.waitForSelector('#challenge-window[aria-hidden="false"]', { state: 'visible' });
        await page.waitForSelector('#challenge-window h3:has-text("Kubernetes version")');
        console.log(`[User ${userId}] Second challenge dialog opened.`);

        // --- Step 8: Don't enter a flag. Close the pop up dialog ---
        console.log(`[User ${userId}] Closing second challenge dialog without entering flag...`);
        await page.click('#challenge-window button:has-text("Close")'); // Assuming a "Close" button exists
        // Wait for the dialog to disappear
        await page.waitForSelector('#challenge-window[aria-hidden="true"]', { state: 'hidden' });
        console.log(`[User ${userId}] Second challenge dialog closed.`);
        await page.waitForLoadState('domcontentloaded');


        // --- Step 9: Click the third challenge labeled: "Hello World" ---
        console.log(`[User ${userId}] Clicking "Hello World" challenge...`);
        const thirdChallengeClickStartTime = Date.now();
        await page.click('div.card-body:has-text("Hello World")');
        const thirdChallengeClickEndTime = Date.now();
        console.log(`[User ${userId}] Clicked third challenge in ${thirdChallengeClickEndTime - thirdChallengeClickStartTime}ms`);

        // Wait for the challenge dialog/modal to appear
        await page.waitForSelector('#challenge-window[aria-hidden="false"]', { state: 'visible' });
        await page.waitForSelector('#challenge-window h3:has-text("Hello World")');
        console.log(`[User ${userId}] Third challenge dialog opened.`);

        // --- Step 10: Don't enter a flag. Close the pop up dialog ---
        console.log(`[User ${userId}] Closing third challenge dialog without entering flag...`);
        await page.click('#challenge-window button:has-text("Close")');
        // Wait for the dialog to disappear
        await page.waitForSelector('#challenge-window[aria-hidden="true"]', { state: 'hidden' });
        console.log(`[User ${userId}] Third challenge dialog closed.`);
        await page.waitForLoadState('domcontentloaded');


        console.log(`[User ${userId}] Flow completed successfully.`);
        return {
            success: true,
            userId: userId,
            loginPageLoadTime: loginPageEndTime - loginPageStartTime,
            firstChallengeOpenTime: firstChallengeClickEndTime - firstChallengeClickStartTime,
            secondChallengeOpenTime: secondChallengeClickEndTime - secondChallengeClickStartTime,
            thirdChallengeOpenTime: thirdChallengeClickEndTime - thirdChallengeClickStartTime,
            // You can add more metrics here if needed, e.g., total flow time
            totalFlowTime: Date.now() - loginPageStartTime,
        };

    } catch (error) {
        console.error(`[User ${userId}] Flow failed:`, error.message);
        return { success: false, userId: userId, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
            console.log(`[User ${userId}] Browser closed.`);
        }
    }
}

module.exports = runUserFlow;
```

---

### **2. `loadTestRunner.js` (New File for Concurrency)**

This file will orchestrate the concurrent execution of your `userFlow.js` script. Create this file in the same directory as `userFlow.js`.

```javascript
// loadTestRunner.js
const runUserFlow = require('./userFlow'); // Import the user flow script

const NUM_USERS = 25; // Define the number of concurrent users
const CONCURRENCY_LIMIT = 5; // How many Playwright browsers to run in parallel
                            // Start with a low number (e.g., 5-10) and increase cautiously.
                            // 25 users concurrently might be too much for one machine.
                            // We'll discuss scaling for 100 users later.

async function runLoadTest() {
    console.log(`Starting load test for ${NUM_USERS} users...`);

    const userPromises = [];
    const results = [];
    let activeBrowsers = 0;
    let userCounter = 0;

    return new Promise(async (resolve) => {
        const queue = [];

        // Function to process the next user in the queue
        const processNextUser = async () => {
            if (queue.length === 0 && activeBrowsers === 0 && userCounter >= NUM_USERS) {
                // All users processed and all browsers closed
                resolve(results);
                return;
            }

            if (queue.length > 0 && activeBrowsers < CONCURRENCY_LIMIT) {
                const userIdToRun = queue.shift();
                activeBrowsers++;
                console.log(`[Orchestrator] Starting User ${userIdToRun}. Active browsers: ${activeBrowsers}`);

                runUserFlow(userIdToRun)
                    .then(result => {
                        results.push(result);
                        console.log(`[Orchestrator] User ${userIdToRun} completed. Success: ${result.success}`);
                    })
                    .catch(err => {
                        console.error(`[Orchestrator] User ${userIdToRun} failed unexpectedly: ${err.message}`);
                        results.push({ success: false, userId: userIdToRun, error: err.message });
                    })
                    .finally(() => {
                        activeBrowsers--;
                        console.log(`[Orchestrator] User ${userIdToRun} finished. Active browsers: ${activeBrowsers}`);
                        // Try to process the next user immediately
                        processNextUser();
                    });
                // After launching a user, try to launch another if capacity allows
                processNextUser();
            }
        };

        // Populate the initial queue and start processing
        for (let i = 1; i <= NUM_USERS; i++) {
            queue.push(i);
            // Start processing if there's capacity
            if (activeBrowsers < CONCURRENCY_LIMIT) {
                processNextUser();
            }
        }
        // If the queue is fully populated but not all started, ensure remaining start
        if (queue.length > 0) {
            processNextUser(); // Kick-off processing any remaining in the queue
        }
    });
}

// Function to analyze results
function analyzeResults(results) {
    const successfulRuns = results.filter(r => r.success);
    const failedRuns = results.filter(r => !r.success);

    console.log(`\n--- Load Test Summary ---`);
    console.log(`Total Users Attempted: ${NUM_USERS}`);
    console.log(`Successful Runs: ${successfulRuns.length}`);
    console.log(`Failed Runs: ${failedRuns.length}`);

    if (successfulRuns.length > 0) {
        const avgLoginTime = successfulRuns.reduce((sum, r) => sum + r.loginPageLoadTime, 0) / successfulRuns.length;
        const avgFirstChallengeTime = successfulRuns.reduce((sum, r) => sum + r.firstChallengeOpenTime, 0) / successfulRuns.length;
        const avgSecondChallengeTime = successfulRuns.reduce((sum, r) => sum + r.secondChallengeOpenTime, 0) / successfulRuns.length;
        const avgThirdChallengeTime = successfulRuns.reduce((sum, r) => sum + r.thirdChallengeOpenTime, 0) / successfulRuns.length;
        const avgTotalFlowTime = successfulRuns.reduce((sum, r) => sum + r.totalFlowTime, 0) / successfulRuns.length;

        console.log(`\nAverage Metrics for Successful Runs:`);
        console.log(`  Login Page Load Time: ${avgLoginTime.toFixed(2)}ms`);
        console.log(`  First Challenge Open Time: ${avgFirstChallengeTime.toFixed(2)}ms`);
        console.log(`  Second Challenge Open Time: ${avgSecondChallengeTime.toFixed(2)}ms`);
        console.log(`  Third Challenge Open Time: ${avgThirdChallengeTime.toFixed(2)}ms`);
        console.log(`  Total Flow Time (Login to 3rd Challenge Closed): ${avgTotalFlowTime.toFixed(2)}ms`);
    }

    if (failedRuns.length > 0) {
        console.log(`\nDetails for Failed Runs:`);
        failedRuns.forEach(fail => {
            console.log(`  User ${fail.userId}: ${fail.error}`);
        });
    }

    console.log(`--- End of Summary ---`);
}

// Run the load test
(async () => {
    const startTime = Date.now();
    const results = await runLoadTest();
    const endTime = Date.now();
    console.log(`\nLoad test completed in ${((endTime - startTime) / 1000).toFixed(2)} seconds.`);
    analyzeResults(results);
})();
```

---

### **Important Considerations for 25 (and eventually 100) Users:**

1.  **`CONCURRENCY_LIMIT`:**
    * **Start Low:** I've set `CONCURRENCY_LIMIT` to `5`. This means only 5 browser instances will be running simultaneously. This is a safe starting point.
    * **Monitor Resources:** As you run the test, open your system's task manager (Windows) or Activity Monitor (macOS) / `htop` (Linux) to watch your CPU and RAM usage.
    * **Increase Gradually:** If your machine handles 5 concurrently without issues, slowly increase this number (e.g., to 10, then 15). You'll quickly find the limit of your local machine.
    * **Headless Mode:** `headless: true` is crucial for performance. If you need to debug, change it to `false` in `userFlow.js`, but switch it back for actual load testing.

2.  **Resource Consumption:**
    * **Playwright is Heavy:** Each Playwright browser instance is a real browser (Chromium, Firefox, WebKit). Running 25 of these (let alone 100) will consume significant CPU and RAM.
    * **For 100 Users:** For 100 concurrent users, you will almost certainly need a more powerful machine (e.g., a cloud VM with many vCPUs and ample RAM) or a distributed testing setup.

3.  **Distributed Testing (for 100+ users):**
    * **Multiple Machines:** The most common approach for high concurrency with Playwright is to run instances of `loadTestRunner.js` on several different machines and have them all target your application simultaneously.
    * **Orchestration Tools:** For truly large-scale Playwright load testing, you might look into tools that can orchestrate distributed Playwright runs (e.g., using Kubernetes, Docker Swarm, or dedicated load testing platforms that support custom scripts).
    * **Hybrid Approach:** Another approach is to use a traditional load testing tool (like JMeter or k6) for the majority of the "dumb" HTTP requests, and then use a few Playwright instances for complex, real-browser scenarios.

4.  **Network Latency:** Running the test from your local machine to a remote application will include your local network latency. For more accurate results, consider running the test from a location closer to your application's servers (e.g., a cloud VM in the same region).

5.  **CTFd Rate Limiting:** Be aware that CTFd instances might have rate limiting or WAF (Web Application Firewall) rules that could block your load test if it appears too aggressive. Start with 25 users and observe before scaling further.

Go ahead and run this. Observe the output and your system's resource usage. This will give us valuable data to discuss scaling to 100 users if your current machine can't handle it.

## Analyzing Results

You've hit on the most critical part of load testing: **interpreting the results to understand your application's responsiveness and stability under load.**

Your `loadTestRunner.js` script already provides a good foundation for this with the `analyzeResults` function. Let's break down how to view those results and what they mean, along with other ways to monitor.

### 1. Understanding the `loadTestRunner.js` Output

When you run `node loadTestRunner.js`, the console output will first show logs for each user's journey, and then, at the end, the `--- Load Test Summary ---`.

Here's what each part of that summary tells you:

* **`Total Users Attempted: 25`**
    * **What it is:** The total number of user flows your script tried to simulate.
    * **What it tells you:** Confirms that your test executed for the desired number of users.

* **`Successful Runs: X`**
    * **What it is:** The number of user flows that completed *without* throwing any errors in the Playwright script.
    * **What it tells you:** This is your **success rate**. If `X` is significantly less than `Total Users Attempted`, it means your application or the test environment is failing under load. A low success rate is a major red flag, indicating stability issues. Ideally, this should be close to 100%.

* **`Failed Runs: Y`**
    * **What it is:** The number of user flows that encountered an error (e.g., a selector not found, a timeout, a navigation failure).
    * **What it tells you:** The counterpart to successful runs. Look at the "Details for Failed Runs" section to see *why* they failed. Common reasons under load include:
        * **Timeouts:** The application was too slow to respond within Playwright's default `timeout` (5 seconds by default for many actions like `click`, `waitForSelector`). This is a clear sign of performance degradation.
        * **Element not found:** The page might have rendered partially, or with errors, preventing elements from being present.
        * **Navigation errors:** The server might have returned an error page (e.g., 500 Internal Server Error, 503 Service Unavailable) instead of the expected challenges page.

* **`Average Metrics for Successful Runs:`**
    * **`Login Page Load Time: X ms`**
    * **`First Challenge Open Time: Y ms`**
    * **`Second Challenge Open Time: Z ms`**
    * **`Third Challenge Open Time: A ms`**
    * **`Total Flow Time (Login to 3rd Challenge Closed): B ms`**
    * **What these are:** These are the average durations (in milliseconds) for specific, critical steps within your user flow, calculated *only for the successful runs*.
    * **What they tell you:** These are your primary indicators of **responsiveness**.
        * **How fast is fast enough?** This depends entirely on your application's requirements and user expectations.
            * **< 100 ms:** Feels instantaneous.
            * **100-300 ms:** Very good, imperceptible delay for most users.
            * **300-1000 ms (1 second):** Acceptable, users notice a slight delay but typically don't lose their train of thought.
            * **1-3 seconds:** Borderline acceptable for simple interactions; users might get impatient for more complex tasks.
            * **> 3 seconds:** Generally considered poor, leads to user frustration and abandonment.
        * **Trend:** As you increase the number of users or concurrency, do these average times increase significantly? If so, it means the application is struggling to handle the increased load.
        * **Bottlenecks:** If one specific step (e.g., "Login Page Load Time") is consistently much higher than others, it points to a potential bottleneck in that part of the application or the resources it relies on (database, authentication service, etc.).

* **`Details for Failed Runs:`**
    * **What it is:** A list of each failed user ID and the error message caught by the `catch` block in `userFlow.js`.
    * **What it tells you:** Crucial for debugging. The error messages will often point to the exact Playwright action that failed (e.g., "Timeout waiting for selector...", "Navigation failed because page crashed"). This helps you investigate whether it's an application bug, a performance issue, or a test script problem.

### 2. Beyond Script Output: Real-Time Monitoring

While the script gives you a summary, a true understanding of responsiveness comes from monitoring your application's resources *during* the test.

1.  **Your Local Machine's Resources:**
    * **Task Manager (Windows) / Activity Monitor (macOS) / `htop` (Linux):** Watch CPU, Memory, and Network Usage.
    * **What to look for:** If your local machine's CPU is consistently at 100%, or memory is maxed out, your test runner itself is the bottleneck, not necessarily your application. This means you need more resources for the test client (e.g., a more powerful machine or distributed testing).

2.  **Application Server-Side Monitoring (Most Important!):**
    * This is where you'll see the *real* impact of the load. Access the monitoring dashboards for your application's infrastructure.

    * **CTFd Monitoring:** Since it's a CTFd instance on OpenShift, you should have access to OpenShift's monitoring tools (e.g., Grafana dashboards if configured, or `oc top pods/nodes`).

    * **Key Metrics to Monitor on your App Server(s):**
        * **CPU Utilization:** Is it spiking to 100%?
        * **Memory Usage:** Is it approaching its limits? Is there excessive swapping?
        * **Network I/O:** Is the network interface maxed out?
        * **Disk I/O:** Is the application database struggling to read/write?
        * **Database Performance:** (If applicable) Monitor database CPU, memory, connection count, and query response times. Look for slow queries or lock contention.
        * **Application Logs:** Check your CTFd application's logs for errors, warnings, or unhandled exceptions that occur under load.
        * **Error Rates (Server-Side):** Many web servers and proxies report internal server errors (5xx codes). A spike in these indicates critical failures.
        * **Response Codes:** Are a high percentage of requests returning 200 OK, or are there spikes in 4xx (client error, e.g., too many requests/rate limiting) or 5xx (server error) codes?
