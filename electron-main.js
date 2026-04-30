"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { startServer } = require("./server");

const HOST = "127.0.0.1";
const PORT = 4173;
const HEALTH_PATH = "/api/health";
const APP_URL = `http://${HOST}:${PORT}`;
const APP_ORIGIN = new URL(APP_URL).origin;
const PORTABLE_DATA_DIR_NAME = "lr2ir-table-lamp-viewer-data";
const SCREENSHOT_DIR_NAME = "screenshot";
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;

let mainWindow = null;
let embeddedServer = null;
let isQuitting = false;
let usesPortableData = false;

configureAppStoragePaths();

function configureAppStoragePaths() {
  if (!app.isPackaged) {
    return;
  }

  const exeDir = path.dirname(process.execPath);
  const baseDataDir = path.join(exeDir, PORTABLE_DATA_DIR_NAME);
  const userDataDir = path.join(baseDataDir, "user-data");
  const sessionDataDir = path.join(baseDataDir, "session-data");
  const logsDir = path.join(baseDataDir, "logs");

  if (
    !ensureWritableDirectory(userDataDir) ||
    !ensureWritableDirectory(sessionDataDir) ||
    !ensureWritableDirectory(logsDir)
  ) {
    console.warn("Portable data directory is not writable. Falling back to default AppData paths.");
    return;
  }

  app.setPath("userData", userDataDir);
  app.setPath("sessionData", sessionDataDir);
  app.setAppLogsPath(logsDir);
  usesPortableData = true;
}

function ensureWritableDirectory(directoryPath) {
  try {
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.accessSync(directoryPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

ipcMain.handle("lr2ir:pick-file", async (event, options = {}) => {
  assertTrustedIpcSender(event);
  const title = typeof options.title === "string" ? options.title : "ファイルを選択";
  const defaultPath = typeof options.defaultPath === "string" ? options.defaultPath : "";
  const filters =
    Array.isArray(options.filters) && options.filters.length
      ? options.filters
      : [{ name: "Database", extensions: ["db"] }];

  const result = await dialog.showOpenDialog({
    title,
    properties: ["openFile"],
    defaultPath,
    filters,
  });

  if (result.canceled || !result.filePaths?.length) {
    return "";
  }

  return result.filePaths[0];
});

ipcMain.handle("lr2ir:pick-directory", async (event, options = {}) => {
  assertTrustedIpcSender(event);
  const title = typeof options.title === "string" ? options.title : "フォルダを選択";
  const defaultPath = typeof options.defaultPath === "string" ? options.defaultPath : "";

  const result = await dialog.showOpenDialog({
    title,
    properties: ["openDirectory", "createDirectory"],
    defaultPath,
  });

  if (result.canceled || !result.filePaths?.length) {
    return "";
  }

  return result.filePaths[0];
});

ipcMain.handle("lr2ir:save-image", async (event, options = {}) => {
  assertTrustedIpcSender(event);
  const dataUrl = typeof options.dataUrl === "string" ? options.dataUrl : "";
  const requestedName = typeof options.fileName === "string" ? options.fileName : "";
  const requestedDirectory = typeof options.directoryPath === "string" ? options.directoryPath.trim() : "";

  if (!dataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("PNGデータの保存に失敗しました。");
  }

  const base64 = dataUrl.slice("data:image/png;base64,".length);
  if (base64.length > Math.ceil((MAX_SCREENSHOT_BYTES * 4) / 3) + 4) {
    throw new Error("画像データが大きすぎます。");
  }

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    throw new Error("画像データが空です。");
  }
  if (buffer.length > MAX_SCREENSHOT_BYTES) {
    throw new Error("画像データが大きすぎます。");
  }

  const screenshotDir = resolveScreenshotDirectory(requestedDirectory);
  fs.mkdirSync(screenshotDir, { recursive: true });

  const safeFileName = sanitizeScreenshotFileName(requestedName);
  const targetPath = writeUniqueFileSync(screenshotDir, safeFileName, buffer);

  return {
    filePath: targetPath,
    directoryPath: screenshotDir,
  };
});

function assertTrustedIpcSender(event) {
  const senderUrl = event?.senderFrame?.url || event?.sender?.getURL?.() || "";
  try {
    if (new URL(senderUrl).origin === APP_ORIGIN) {
      return;
    }
  } catch {
    // fall through
  }
  throw new Error("許可されていない画面からの操作です。");
}

function resolveScreenshotDirectory(customDirectoryPath = "") {
  const requested = String(customDirectoryPath ?? "").trim();
  if (requested) {
    const resolved = path.resolve(requested);
    if (ensureWritableDirectory(resolved)) {
      return resolved;
    }
    throw new Error("指定されたスクショ保存先に書き込めませんでした。");
  }

  const preferredBaseDir = app.isPackaged ? path.dirname(process.execPath) : __dirname;
  const preferredDir = path.join(preferredBaseDir, SCREENSHOT_DIR_NAME);

  if (ensureWritableDirectory(preferredDir)) {
    return preferredDir;
  }

  const fallbackDir = path.join(app.getPath("userData"), SCREENSHOT_DIR_NAME);
  if (ensureWritableDirectory(fallbackDir)) {
    return fallbackDir;
  }

  throw new Error("スクリーンショット保存先フォルダを作成できませんでした。");
}

function sanitizeScreenshotFileName(fileName) {
  const now = new Date();
  const pad2 = (value) => String(value).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}` +
    `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  const fallback = `L2TV_Today_${timestamp}.png`;

  const normalized = String(fileName ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
  if (!normalized) {
    return fallback;
  }

  const withExt = normalized.toLowerCase().endsWith(".png") ? normalized : `${normalized}.png`;
  return withExt.slice(0, 180);
}

function writeUniqueFileSync(directoryPath, fileName, buffer) {
  const parsed = path.parse(fileName);
  const baseName = parsed.name || "l2tv-image";
  const extension = parsed.ext || ".png";

  for (let index = 0; index < 1000; index += 1) {
    const suffix = index === 0 ? "" : `_${index + 1}`;
    const candidate = path.join(directoryPath, `${baseName}${suffix}${extension}`);
    try {
      fs.writeFileSync(candidate, buffer, { flag: "wx" });
      return candidate;
    } catch (error) {
      if (error?.code === "EEXIST") {
        continue;
      }
      throw error;
    }
  }

  const fallbackSuffix = `${Date.now()}_${cryptoRandomSuffix()}`;
  const fallbackPath = path.join(directoryPath, `${baseName}_${fallbackSuffix}${extension}`);
  fs.writeFileSync(fallbackPath, buffer, { flag: "wx" });
  return fallbackPath;
}

function cryptoRandomSuffix() {
  return crypto.randomBytes(4).toString("hex");
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#dff4ff",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "electron-preload.js"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttpUrl(url)) {
      shell.openExternal(url).catch((error) => {
        console.error(`Failed to open external URL: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isAppUrl(url)) {
      return;
    }
    event.preventDefault();
    if (isHttpUrl(url)) {
      shell.openExternal(url).catch((error) => {
        console.error(`Failed to open external URL: ${error instanceof Error ? error.message : String(error)}`);
      });
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function isHttpUrl(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function startEmbeddedServer() {
  if (embeddedServer && embeddedServer.listening) {
    return;
  }

  try {
    embeddedServer = startServer({ host: HOST, port: PORT });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    if (!isQuitting) {
      dialog.showErrorBox("起動エラー", `アプリ内サーバーの起動に失敗しました。\n${details}`);
      app.quit();
    }
    return;
  }

  embeddedServer.on("error", (error) => {
    const details = error instanceof Error ? error.message : String(error);
    console.error(`Embedded server error: ${details}`);
    if (!isQuitting) {
      dialog.showErrorBox("サーバーが停止しました", `アプリ内サーバーでエラーが発生しました。\n${details}`);
      app.quit();
    }
  });
}

function stopEmbeddedServer() {
  if (!embeddedServer) {
    return;
  }

  const server = embeddedServer;
  embeddedServer = null;
  try {
    server.close();
  } catch {
    // noop
  }
}

function checkHealth() {
  return new Promise((resolve) => {
    const request = http.get(
      {
        hostname: HOST,
        port: PORT,
        path: HEALTH_PATH,
        timeout: 1500,
      },
      (response) => {
        const ok = response.statusCode === 200;
        response.resume();
        resolve(ok);
      },
    );

    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });

    request.on("error", () => {
      resolve(false);
    });
  });
}

async function waitForServerReady(maxAttempts = 120, delayMs = 250) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (await checkHealth()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function bootstrap() {
  if (!mainWindow) {
    createMainWindow();
  }
  startEmbeddedServer();

  if (usesPortableData) {
    console.log(`Using portable app data directory: ${app.getPath("userData")}`);
  }

  const ready = await waitForServerReady();
  if (!ready) {
    dialog.showErrorBox(
      "起動エラー",
      "アプリ内サーバーの起動に失敗しました。\nウイルス対策ソフトやポート使用状況をご確認ください。",
    );
    app.quit();
    return;
  }

  await mainWindow.loadURL(APP_URL);
}

app.whenReady().then(bootstrap);

app.on("before-quit", () => {
  isQuitting = true;
  stopEmbeddedServer();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (mainWindow) {
    return;
  }
  await bootstrap();
});
