const assert = require("node:assert/strict");
const path = require("node:path");
const { app, BrowserWindow, ipcMain } = require("electron");
const { createAppServer, getApiTokenForDesktop } = require("../server");

let appServer = null;
let mainWindow = null;
let capturedTransferPayload = null;
let importTransferPayload = null;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function evaluate(expression) {
  return mainWindow.webContents.executeJavaScript(expression, true);
}

async function waitFor(condition, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }
    await delay(100);
  }
  throw new Error("UI smoke test timed out while waiting for the page.");
}

async function listenOnRandomPort(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

async function closeServer() {
  if (!appServer) {
    return;
  }
  const server = appServer;
  appServer = null;
  await new Promise((resolve) => server.close(() => resolve()));
}

async function run() {
  await app.whenReady();
  ipcMain.handle("lr2ir:get-api-token", () => getApiTokenForDesktop());
  ipcMain.handle("lr2ir:export-data-transfer", (_event, options) => {
    capturedTransferPayload = options?.payload ?? null;
    return null;
  });
  ipcMain.handle("lr2ir:import-data-transfer", () => importTransferPayload);
  appServer = createAppServer();
  const port = await listenOnRandomPort(appServer);

  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: "temp:l2tv-ui-smoke",
      preload: path.join(__dirname, "..", "electron-preload.js"),
    },
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  await waitFor(() => evaluate("document.readyState === 'complete'"));
  await waitFor(() => evaluate("Boolean(document.getElementById('menu-toggle-button'))"));

  const initialControls = await evaluate(`(() => ({
    title: document.title,
    menuButton: Boolean(document.getElementById('menu-toggle-button')),
    analyzeForm: Boolean(document.getElementById('analyze-form')),
    scoreDbInput: Boolean(document.getElementById('score-db-path')),
    tableListButton: Boolean(document.getElementById('open-table-list-button')),
    irRankToggle: Boolean(document.getElementById('show-ir-rank')),
    irStatusToggle: Boolean(document.getElementById('show-ir-status')),
    stellaverseConsent: Boolean(document.getElementById('allow-stellaverse-network')),
    stellaverseConsentChecked: document.getElementById('allow-stellaverse-network')?.checked,
    levelToggle: Boolean(document.getElementById('level-mode-toggle-button')),
    exportTransferButton: Boolean(document.getElementById('export-transfer-button')),
    importTransferButton: Boolean(document.getElementById('import-transfer-button')),
    languagePrompt: Boolean(document.querySelector('.language-startup-modal'))
  }))()`);

  assert.equal(initialControls.title, "L2TV");
  assert.equal(initialControls.menuButton, true);
  assert.equal(initialControls.analyzeForm, true);
  assert.equal(initialControls.scoreDbInput, true);
  assert.equal(initialControls.tableListButton, true);
  assert.equal(initialControls.irRankToggle, true);
  assert.equal(initialControls.irStatusToggle, true);
  assert.equal(initialControls.stellaverseConsent, true);
  assert.equal(initialControls.stellaverseConsentChecked, false);
  assert.equal(initialControls.levelToggle, true);
  assert.equal(initialControls.exportTransferButton, true);
  assert.equal(initialControls.importTransferButton, true);

  if (initialControls.languagePrompt) {
    const languageButtonClicked = await evaluate(`(() => {
      const button = [...document.querySelectorAll('.language-startup-modal button')]
        .find((candidate) => candidate.textContent.trim() === '日本語');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    assert.equal(languageButtonClicked, true);
    await waitFor(() => evaluate("!document.querySelector('.language-startup-modal')"));
  }

  await evaluate("document.getElementById('menu-toggle-button').click()");
  await waitFor(() => evaluate("document.body.classList.contains('menu-open')"));
  const openMenuState = await evaluate(`({
    menuOpen: document.body.classList.contains('menu-open'),
    drawerVisible: document.getElementById('control-drawer').getAttribute('aria-hidden') === 'false',
    menuExpanded: document.getElementById('menu-toggle-button').getAttribute('aria-expanded') === 'true'
  })`);
  assert.deepEqual(openMenuState, { menuOpen: true, drawerVisible: true, menuExpanded: true });

  const darkTheme = await evaluate(`(() => {
    const select = document.getElementById('theme-select');
    select.value = 'lr2ir-dark';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return document.body.dataset.theme;
  })()`);
  assert.equal(darkTheme, "lr2ir-dark");

  const scoreMode = await evaluate(`(() => {
    const button = document.getElementById('level-mode-toggle-button');
    button.click();
    return button.textContent.trim();
  })()`);
  assert.equal(scoreMode, "SCORE LAMP");

  const irToggleState = await evaluate(`(() => {
    const checkbox = document.getElementById('show-ir-rank');
    const before = checkbox.checked;
    checkbox.click();
    return { before, after: checkbox.checked };
  })()`);
  assert.deepEqual(irToggleState, { before: true, after: false });

  await evaluate(`(() => {
    document.getElementById('export-transfer-button').click();
  })()`);
  await waitFor(() => Promise.resolve(Boolean(capturedTransferPayload)));
  assert.equal(capturedTransferPayload.format, "l2tv-data-transfer");
  assert.equal(capturedTransferPayload.version, 1);
  assert.deepEqual(
    Object.keys(capturedTransferPayload.data).sort(),
    [
      "custom-table-list-entries",
      "form-state",
      "last-analysis",
      "stellaverse-rival-ids",
      "table-preset-selection",
    ],
  );
  await waitFor(() => evaluate("!document.getElementById('import-transfer-button').disabled"));

  importTransferPayload = {
    format: "l2tv-data-transfer",
    version: 1,
    exportedAt: "2026-07-13T00:00:00.000Z",
    appVersion: "2.1.0",
    data: {
      "form-state": {
        scoreDbPath: "C:\\legacy\\score.db",
        songDbPath: "C:\\legacy\\song.db",
        levelChartMode: "lamp",
        language: "ja",
        languagePromptSeen: true,
        themeMode: "l2tv-pop",
      },
      "last-analysis": null,
      "table-preset-selection": [],
      "custom-table-list-entries": [],
      "stellaverse-rival-ids": [],
    },
  };
  await evaluate("document.getElementById('import-transfer-button').click()");
  await waitFor(() => evaluate("Boolean(document.querySelector('.app-choice-modal'))"));
  await evaluate("document.querySelector('.app-choice-actions button').click()");
  await delay(1_000);
  const importedState = await evaluate(`({
    readyState: document.readyState,
    scoreDbPath: document.getElementById('score-db-path')?.value,
    theme: document.body.dataset.theme,
    status: document.getElementById('status-box')?.textContent
  })`);
  assert.equal(importedState.readyState, "complete");
  assert.equal(importedState.scoreDbPath, "C:\\legacy\\score.db");
  assert.equal(importedState.theme, "l2tv-pop");

  await evaluate("document.getElementById('menu-close-button').click()");
  await waitFor(() => evaluate("!document.body.classList.contains('menu-open')"));
  assert.equal(await evaluate("document.getElementById('control-drawer').getAttribute('aria-hidden')"), "true");

  console.log("Electron UI smoke test passed");
}

run()
  .then(async () => {
    ipcMain.removeHandler("lr2ir:get-api-token");
    ipcMain.removeHandler("lr2ir:export-data-transfer");
    ipcMain.removeHandler("lr2ir:import-data-transfer");
    await closeServer();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.exit(0);
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    ipcMain.removeHandler("lr2ir:export-data-transfer");
    ipcMain.removeHandler("lr2ir:import-data-transfer");
    await closeServer();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.exit(1);
  });
    ipcMain.removeHandler("lr2ir:get-api-token");
