"use strict";

const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

test("packaged entrypoint owns the stable local origin and uses a trusted preload token", { timeout: 60_000 }, async () => {
  const result = await new Promise((resolve, reject) => {
    const child = spawn(require("electron"), ["--no-sandbox", "--disable-gpu", "--headless", "."], {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        ELECTRON_ENABLE_LOGGING: "0",
        L2TV_MAIN_SMOKE_TEST: "1",
        L2TV_TEST_OFFLINE: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
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

  assert.equal(
    result.code,
    0,
    `Electron main smoke test failed (signal: ${result.signal})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stdout, /L2TV: http:\/\/127\.0\.0\.1:4173/);
  assert.match(result.stdout, /Electron main-process smoke test passed/);
});
