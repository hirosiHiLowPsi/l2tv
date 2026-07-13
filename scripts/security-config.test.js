"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.join(__dirname, "..");
const packageJson = require(path.join(projectRoot, "package.json"));

test("release configuration is portable-only and includes legal/security files", () => {
  assert.equal(packageJson.scripts["dist:win:installer"], undefined);
  assert.equal(packageJson.scripts["dist:win:zip"], undefined);
  assert.equal(packageJson.build.nsis, undefined);
  assert.equal(packageJson.build.files.includes("database-worker.js"), true);
  assert.equal(packageJson.build.afterPack, "scripts/apply-electron-fuses.js");
  assert.deepEqual(packageJson.build.electronLanguages, ["ja", "en-US"]);
  assert.equal(packageJson.dependencies?.["update-electron-app"], undefined);
  assert.equal(fs.existsSync(path.join(projectRoot, "scripts", "verify-electron-fuses.js")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, "scripts", "verify-packaged-launch.js")), true);

  const buildScript = fs.readFileSync(path.join(projectRoot, "scripts", "build-win-zip.js"), "utf8");
  assert.match(buildScript, /verify-packaged-launch\.js/);

  const extraFiles = new Set(packageJson.build.extraFiles.map((entry) => entry.from));
  for (const required of ["LICENSE", "THIRD_PARTY_NOTICES.md", "SECURITY.md"]) {
    assert.equal(extraFiles.has(required), true, `${required} must be included in releases`);
  }
  assert.equal(fs.existsSync(path.join(projectRoot, "build", "installer.nsh")), false);
});

test("Electron security fuses disable development and loose-resource entrypoints", () => {
  const fuseScript = fs.readFileSync(
    path.join(projectRoot, "scripts", "apply-electron-fuses.js"),
    "utf8",
  );
  assert.match(fuseScript, /RunAsNode\]: false/);
  assert.match(fuseScript, /EnableNodeOptionsEnvironmentVariable\]: false/);
  assert.match(fuseScript, /EnableNodeCliInspectArguments\]: false/);
  assert.match(fuseScript, /EnableEmbeddedAsarIntegrityValidation\]: true/);
  assert.match(fuseScript, /OnlyLoadAppFromAsar\]: true/);
});

test("Stellaverse network consent is disabled in the initial UI", () => {
  const html = fs.readFileSync(path.join(projectRoot, "public", "index.html"), "utf8");
  assert.match(html, /id="allow-stellaverse-network"/);
  assert.doesNotMatch(html, /id="allow-stellaverse-network"[^>]*\bchecked\b/);
});

test("portable data transfer is exposed only through validated desktop handlers", () => {
  const html = fs.readFileSync(path.join(projectRoot, "public", "index.html"), "utf8");
  const appSource = fs.readFileSync(path.join(projectRoot, "public", "app.js"), "utf8");
  const preload = fs.readFileSync(path.join(projectRoot, "electron-preload.js"), "utf8");
  const main = fs.readFileSync(path.join(projectRoot, "electron-main.js"), "utf8");

  assert.match(html, /id="export-transfer-button"/);
  assert.match(html, /id="import-transfer-button"/);
  assert.match(appSource, /DATA_TRANSFER_FORMAT = "l2tv-data-transfer"/);
  assert.match(preload, /lr2ir:export-data-transfer/);
  assert.match(preload, /lr2ir:import-data-transfer/);
  assert.match(main, /assertTrustedIpcSender\(event\);[\s\S]*validateDataTransferPayload/);
  assert.match(main, /MAX_DATA_TRANSFER_BYTES/);
});
