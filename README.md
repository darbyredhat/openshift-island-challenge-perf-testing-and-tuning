# CTFd REST API Load Testing with Playwright

This document provides instructions for setting up and running REST API-focused load tests against your CTFd application using Playwright. This setup is optimized for high-performance REST API testing, bypassing full UI rendering for each request and and using a pre-authenticated session.

## **System Requirements:**

To run these load tests, you will need the following installed on your system:

* **Node.js** (which includes `npm`, the Node Package Manager)
* **Playwright** (installed via `npm`)
* **`jq`** (command-line JSON processor)
* **OpenShift CLI (`oc`)** configured and logged into your cluster
* **Git**

---

## **Overview of Files:**

* **`apiUserFlow.js`**: This is the core Playwright script that defines a single user's REST API journey. It loads a pre-authenticated session and then executes a sequence of API calls (e.g., fetching challenges, scoreboard, users, notifications) with built-in pacing.
* **`apiLoadTestRunnerDuration.js`**: This is the orchestrator script responsible for running multiple instances of `apiUserFlow.js` concurrently over a defined duration. It collects and analyzes the performance metrics for all REST API calls.
* **`captureSessionState.js`**: A one-time utility script used to perform an initial web login and save the authenticated session state (`auth.json`), which is then reused by `apiUserFlow.js`.

---

## **Setup and Execution Guide:**

### **Step 1: Project Initialization and Dependencies**

1.  **Clone the repository** and navigate into the `perf-testing` directory:
    ```bash
    git clone https://github.com/darbyredhat/openshift-island-challenge-perf-testing-and-tuning
    cd openshift-island-challenge-perf-testing-and-tuning/perf-testing
    ```
2.  **Install npm packages (including Playwright):**
    ```bash
    npm install
    npx playwright install
    ```
    * `npm install`: Installs all dependencies listed in `package.json` (including Playwright).
    * `npx playwright install`: Downloads the necessary browser binaries (Chromium, Firefox, WebKit) for headless execution.
3.  **Install `jq` (if needed and not already installed via `brew` or your package manager):**
    ```bash
    brew install jq # For macOS
    # sudo apt-get install jq # For Debian/Ubuntu
    ```

### **Step 2: Set Environment Variables (Required)**

These variables must be exported in your terminal session before running the scripts.

* **`CTFD_BASE_URL`**: The base URL of your CTFd challenges (e.g., `https://island-ctfd.apps.cluster-g76g8.g76g8.sandbox1331.opentlc.com`).
* **`CTFD_USERNAME`**: The username of the player account to use for capturing the session state (e.g., `player1`).
* **`CTFD_PASSWORD`**: The password for the player account.
* **`CTFD_ADMIN_USERNAME`**: The username of an administrator account (for manual token generation).
* **`CTFD_ADMIN_PASSWORD`**: The password for the administrator account.
* **`CTFD_API_ACCESS_TOKEN`**: The API token for the `CTFD_USERNAME` (obtained in Step 5).

    ```bash
    export CTFD_BASE_URL="https://your-ctfd-instance.com"
    export CTFD_USERNAME="player1"
    export CTFD_PASSWORD="your_player_password"
    export CTFD_ADMIN_USERNAME="your_admin_username"
    export CTFD_ADMIN_PASSWORD="your_admin_password"
    # This one will be set after Step 4
    # export CTFD_API_ACCESS_TOKEN="your_obtained_api_token"
    ```

### **Step 3: Capture Authenticated Session State (Run Once)**

This script will log in as the specified `CTFD_USERNAME` and save its session (cookies) to `auth.json`. This `auth.json` will be reused by `apiUserFlow.js` to avoid repeated web logins.

```bash
node captureSessionState.js
```

* You should see `Session state saved successfully to auth.json.` in the output.
* **Re-run this only if the session expires or if you change the player credentials.**

### **Step 4: Obtain API Access Token (Manual Steps via CTFd Web Interface)**

This is the manual method to obtain an API Access Token for your `CTFD_USERNAME` (e.g., `player1`).

1.  **Log in to your CTFd instance** using an **Administrator account** in your web browser.
2.  In the Admin Panel, go to the **"Users"** section.
3.  **Click on the username** of the player account you want to generate the token for (e.g., `player1`).
4.  On the user's profile page, look for a section related to **"API Tokens"** or **"Generate API Key"**.
5.  Click the button or link to **"Generate"** or "Create" a new API token.
6.  A token string will be displayed. **Copy this entire token string carefully.**

Once you have copied the token, you **must set it as an environment variable** in your terminal:

```bash
export CTFD_API_ACCESS_TOKEN="<PASTE_YOUR_COPIED_TOKEN_HERE>"
```

### **Step 5: Execute the API Load Test**

Now, run your API load test using `apiLoadTestRunnerDuration.js`.

```bash
node apiLoadTestRunnerDuration.js
```

* **Configuration:** You can adjust `DURATION_MINUTES` and `TARGET_CONCURRENCY` at the top of `apiLoadTestRunnerDuration.js` to control the test's duration and load level.
* You will see console logs from each simulated API flow. Once the duration is complete, a summary will be printed.

### **Step 6: Analyze Results**

The `apiLoadTestRunnerDuration.js` script will print a detailed `--- API Load Test Summary ---` at the end.

Key metrics to analyze:

* **`Total API Flows Attempted` & `Successful API Flows`**: Shows overall test completion rate.
* **`Average Full API Flow Duration Per User`**: Time for one user to complete all its API calls (including pacing).
* **`Average Individual API Call Time`**: Average response time for a single API call (e.g., `GET /api/v1/challenges`).
* **`Percentiles (P90, P95, P99)`**: Crucial for understanding worst-case API response times.
* **`Overall API Call Success Rate`**: Should ideally be 100%.

### **Real-Time Monitoring During Test:**

While the test is running, it's crucial to monitor your OpenShift application components:

* **CTFd Application Pod:**
    ```bash
    oc logs <your-ctfd-app-pod-name> -n ctfd --tail=50 -f | grep -iE "ERROR|CRITICAL|FAIL|FATAL|EXCEPTION|TRACEBACK|500|WARN"
    ```
    * Monitor CPU and Memory usage via OpenShift Dashboards (`Workloads > Deployments > ctfd > Metrics`).
* **CTFd MySQL Database Pod:**
    * Monitor CPU, Memory, and Database Connections via OpenShift Dashboards (`Workloads > Deployments > ctfd-mysql-db > Metrics`).
    * Check active connections (`oc exec <db-pod-name> ... SHOW STATUS LIKE 'Threads_connected';`).

---