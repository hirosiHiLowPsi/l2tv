"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const executablePath = path.resolve(process.argv[2] || "");
const timeoutMs = 60_000;
const cleanupAttempts = 10;

if (!process.argv[2] || !fs.existsSync(executablePath)) {
  throw new Error("Packaged Electron executable path is required.");
}

async function runPackagedSmokeTest() {
  const smokeDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "l2tv-packaged-smoke-"));
  const successMarkerPath = path.join(smokeDataDir, "packaged-smoke-ok");
  let child = null;
  let timeout = null;

  try {
    const result = await new Promise((resolve, reject) => {
      // These flags apply only to the CI/build smoke process. Packaged users retain Chromium sandboxing.
      child = spawn(executablePath, ["--no-sandbox", "--disable-gpu", "--headless"], {
        cwd: path.dirname(executablePath),
        env: {
          ...process.env,
          ELECTRON_ENABLE_LOGGING: "0",
          L2TV_MAIN_SMOKE_TEST: "1",
          L2TV_SMOKE_DATA_DIR: smokeDataDir,
          L2TV_TEST_OFFLINE: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      const stdout = [];
      const stderr = [];
      child.stdout.on("data", (chunk) => stdout.push(chunk));
      child.stderr.on("data", (chunk) => stderr.push(chunk));
      child.once("error", reject);
      child.once("close", (code, signal) => {
        clearTimeout(timeout);
        resolve({
          code,
          signal,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8"),
        });
      });

      timeout = setTimeout(() => {
        child.kill();
        reject(new Error(`Packaged Electron smoke test timed out after ${timeoutMs} ms.`));
      }, timeoutMs);
    });

    if (result.code !== 0 || !fs.existsSync(successMarkerPath)) {
      throw new Error(
        `Packaged Electron smoke test failed (code: ${result.code}, signal: ${result.signal})\n` +
          `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
      );
    }
    console.log("Verified packaged Electron startup and renderer preload.");
  } finally {
    clearTimeout(timeout);
    if (child && child.exitCode === null) {
      child.kill();
    }
    for (let attempt = 1; attempt <= cleanupAttempts; attempt += 1) {
      try {
        fs.rmSync(smokeDataDir, { recursive: true, force: true });
        break;
      } catch (error) {
        if (attempt === cleanupAttempts || !["EBUSY", "EPERM"].includes(error?.code)) {
          console.warn(`Could not remove packaged smoke data: ${error?.message || error}`);
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, attempt * 100));
      }
    }
  }
}

runPackagedSmokeTest().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
