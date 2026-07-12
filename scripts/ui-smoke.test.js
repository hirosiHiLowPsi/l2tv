const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

function runElectronSmokeTest() {
  return new Promise((resolve, reject) => {
    const electronPath = require("electron");
    const runnerPath = path.join(__dirname, "electron-ui-smoke-runner.js");
    const child = spawn(
      electronPath,
      ["--no-sandbox", "--disable-gpu", "--headless", runnerPath],
      {
        cwd: path.join(__dirname, ".."),
        env: {
          ...process.env,
          ELECTRON_ENABLE_LOGGING: "0",
          ELECTRON_ENABLE_STACK_DUMPING: "1",
          L2TV_TEST_OFFLINE: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code, signal) => {
      resolve({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

test("Electron loads the main UI and basic controls respond", { timeout: 60_000 }, async () => {
  const result = await runElectronSmokeTest();
  assert.equal(
    result.code,
    0,
    `Electron UI smoke test failed (signal: ${result.signal})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stdout, /Electron UI smoke test passed/);
});
