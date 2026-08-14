const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

let displayPromise;
let displayProcess;

function homebaseHeadless() {
    return process.env.HOMEBASE_HEADLESS !== "false";
}

function startVirtualDisplay() {
    if (process.platform !== "linux") return Promise.resolve(null);
    if (displayPromise) return displayPromise;

    displayPromise = new Promise((resolve, reject) => {
        const child = spawn("Xvfb", [
            "-displayfd", "1",
            "-screen", "0", "1920x1080x24",
            "-nolisten", "tcp"
        ], { stdio: ["ignore", "pipe", "pipe"] });
        displayProcess = child;
        let stderr = "";
        let settled = false;
        const timeout = setTimeout(() => finish(new Error("Homebase virtual display did not start")), 5000);

        function finish(error, display) {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            if (error) {
                displayPromise = undefined;
                displayProcess = undefined;
                child.kill();
                reject(error);
            } else {
                resolve(display);
            }
        }

        child.once("error", error => finish(new Error(`Homebase virtual display failed: ${error.message}`)));
        child.once("exit", code => {
            if (!settled) finish(new Error(`Homebase virtual display exited before startup (${code}): ${stderr.slice(0, 200)}`));
            else {
                displayPromise = undefined;
                displayProcess = undefined;
            }
        });
        child.stderr.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-1000); });
        child.stdout.once("data", chunk => {
            const displayNumber = String(chunk).trim().split(/\s+/)[0];
            if (!/^\d+$/.test(displayNumber)) {
                finish(new Error(`Homebase virtual display returned an invalid display number: ${displayNumber}`));
                return;
            }
            finish(null, `:${displayNumber}`);
        });
    });

    return displayPromise;
}

async function launchHomebaseBrowser() {
    const headless = homebaseHeadless();
    const display = headless ? null : await startVirtualDisplay();
    return chromium.launch({
        headless,
        args: ["--disable-blink-features=AutomationControlled"],
        ...(display ? { env: { ...process.env, DISPLAY: display } } : {})
    });
}

function stopVirtualDisplay() {
    displayProcess?.kill();
    displayProcess = undefined;
    displayPromise = undefined;
}

process.once("exit", stopVirtualDisplay);

module.exports = { homebaseHeadless, launchHomebaseBrowser, startVirtualDisplay, stopVirtualDisplay };
