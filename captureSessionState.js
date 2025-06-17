// captureSessionState.js
const { chromium } = require('playwright');

(async () => {
    console.log('Capturing authenticated session state...');

    const baseUrl = process.env.CTFD_BASE_URL;
    const username = process.env.CTFD_USERNAME;
    const password = process.env.CTFD_PASSWORD;

    if (!baseUrl || !username || !password) {
        console.error('ERROR: Missing environment variables. Please set CTFD_BASE_URL, CTFD_USERNAME, and CTFD_PASSWORD.');
        process.exit(1);
    }

    let browser;
    let context;
    try {
        browser = await chromium.launch({ headless: true }); // Run headless for capture
        context = await browser.newContext();
        const page = await context.newPage();

        console.log('Navigating to login page...');
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

        console.log('Performing login...');
        await page.fill('input#name', username);
        await page.fill('input#password', password);
        await page.click('input#_submit');
        await page.waitForURL('**/challenges', { waitUntil: 'domcontentloaded' });
        console.log('Login successful. Saving session state to auth.json...');

        await context.storageState({ path: 'auth.json' });
        console.log('Session state saved successfully to auth.json.');

    } catch (error) {
        console.error('Failed to capture session state:', error.message);
        process.exit(1);
    } finally {
        if (context) {
            await context.close();
        }
        if (browser) {
            await browser.close();
        }
    }
})();