const assert = require("node:assert/strict");
const { app, BrowserWindow } = require("electron");
const { createAppServer } = require("../server");

let appServer = null;
let mainWindow = null;

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
  appServer = createAppServer();
  const port = await listenOnRandomPort(appServer);

  mainWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: "temp:l2tv-ui-smoke",
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
    levelToggle: Boolean(document.getElementById('level-mode-toggle-button')),
    languagePrompt: Boolean(document.querySelector('.language-startup-modal'))
  }))()`);

  assert.equal(initialControls.title, "L2TV");
  assert.equal(initialControls.menuButton, true);
  assert.equal(initialControls.analyzeForm, true);
  assert.equal(initialControls.scoreDbInput, true);
  assert.equal(initialControls.tableListButton, true);
  assert.equal(initialControls.irRankToggle, true);
  assert.equal(initialControls.irStatusToggle, true);
  assert.equal(initialControls.levelToggle, true);

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

  await evaluate("document.getElementById('menu-close-button').click()");
  await waitFor(() => evaluate("!document.body.classList.contains('menu-open')"));
  assert.equal(await evaluate("document.getElementById('control-drawer').getAttribute('aria-hidden')"), "true");

  console.log("Electron UI smoke test passed");
}

run()
  .then(async () => {
    await closeServer();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.exit(0);
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    await closeServer();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.exit(1);
  });
