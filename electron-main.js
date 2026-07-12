"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const crypto = require("node:crypto");
const { calculateForceScoreCoefficient, getForceRatingTier, startServer } = require("./server");

const HOST = "127.0.0.1";
const PORT = 4173;
const HEALTH_PATH = "/api/health";
const APP_URL = `http://${HOST}:${PORT}`;
const APP_ORIGIN = new URL(APP_URL).origin;
const PORTABLE_DATA_DIR_NAME = "lr2ir-table-lamp-viewer-data";
const SCREENSHOT_DIR_NAME = "screenshot";
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const APP_ICON_PATH = path.join(__dirname, "build", "icon.ico");
const STELLAVERSE_IR_ORIGIN = "https://ir.stellabms.xyz";
const STELLAVERSE_RIVAL_PARTITION = "l2tv-stellaverse-rival";
const STELLAVERSE_RIVAL_LOAD_TIMEOUT_MS = 30000;
const STELLAVERSE_RIVAL_CACHE_TTL_MS = 5 * 60 * 1000;
const STELLAVERSE_TABLE_CODES = new Set(["INSANE1", "OVERJOY", "ST", "SL", "SR", "SO", "SN", "DPSL", "DPST"]);
const RIVAL_FORCE_CONSTANTS_PATH = path.join(__dirname, "public", "data", "force-chart-constants.json");
const RIVAL_FORCE_DAN_CONSTANTS = new Map([
  ["★1", 4.29],
  ["★2", 6.24],
  ["★3", 8.32],
  ["★4", 9.72],
  ["★5", 12.4],
  ["★6", 14.22],
  ["★7", 17.28],
  ["★8", 18.68],
  ["★9", 21.35],
  ["★10", 23.41],
  ["★★", 24.44],
  ["(^^)", 26.81],
]);

let mainWindow = null;
let embeddedServer = null;
let isQuitting = false;
let usesPortableData = false;
const stellaverseRivalCache = new Map();
const stellaverseClearStatusCache = new Map();
let rivalForceConstantsCache = null;

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

ipcMain.handle("lr2ir:fetch-stellaverse-rival", async (event, options = {}) => {
  assertTrustedIpcSender(event);
  const playerId = String(options?.playerId ?? "").trim();
  if (!/^\d{1,10}$/.test(playerId)) {
    throw new Error("Stellaverse Rival IDは10桁以内の数字で入力してください。");
  }

  const tableCodes = [...new Set(Array.isArray(options?.tableCodes) ? options.tableCodes : [])]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter((value) => STELLAVERSE_TABLE_CODES.has(value));
  if (!tableCodes.length) {
    throw new Error("Stellaverse IRで比較できる難易度表が読み込まれていません。");
  }

  return fetchStellaverseRival(playerId, tableCodes);
});

ipcMain.handle("lr2ir:fetch-stellaverse-rankings", async (event, options = {}) => {
  assertTrustedIpcSender(event);
  const playerId = String(options?.playerId ?? "").trim();
  if (!/^\d{1,10}$/.test(playerId)) {
    throw new Error("Stellaverse IR IDは10桁以内の数字で入力してください。");
  }
  const allowedCodes = new Set(["INSANE1", "OVERJOY", "ST", "SL"]);
  const tableCodes = [...new Set(Array.isArray(options?.tableCodes) ? options.tableCodes : [])]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter((value) => allowedCodes.has(value));
  if (!tableCodes.length) {
    return { playerId, entries: [], failedTables: [] };
  }

  const entriesByHash = new Map();
  const failedTables = [];
  for (const tableCode of tableCodes) {
    try {
      const result = await fetchCachedStellaverseClearStatus(playerId, tableCode);
      for (const entry of result.entries) {
        if (entry.rank != null && entry.totalPlayers != null) {
          entriesByHash.set(entry.md5, entry);
        }
      }
    } catch (error) {
      failedTables.push({
        tableCode,
        error: error instanceof Error ? error.message : "取得に失敗しました。",
      });
    }
  }
  return {
    playerId,
    entries: [...entriesByHash.values()],
    failedTables,
  };
});

async function fetchStellaverseRival(playerId, tableCodes) {
  const cacheKey = `${playerId}:${[...tableCodes].sort().join(",")}`;
  const cached = stellaverseRivalCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < STELLAVERSE_RIVAL_CACHE_TTL_MS) {
    return cached.value;
  }

  const entriesByHash = new Map();
  const failedTables = [];
  let profile = null;
  try {
    profile = await scrapeStellaversePlayerProfile(playerId);
  } catch {
    profile = null;
  }
  let playerName = profile?.name || "";

  const effectiveTableCodes = [...new Set([...tableCodes, "INSANE1", "OVERJOY"])];
  for (const tableCode of effectiveTableCodes) {
    try {
      const result = await fetchCachedStellaverseClearStatus(playerId, tableCode);
      playerName ||= result.name;
      for (const entry of result.entries) {
        const existing = entriesByHash.get(entry.md5);
        if (!existing || compareStellaverseRivalEntry(entry, existing) < 0) {
          entriesByHash.set(entry.md5, entry);
        }
      }
    } catch (error) {
      failedTables.push({
        tableCode,
        error: error instanceof Error ? error.message : "取得に失敗しました。",
      });
    }
  }

  if (!entriesByHash.size) {
    const detail = failedTables.map((item) => `${item.tableCode}: ${item.error}`).join(" / ");
    throw new Error(detail || "Stellaverse IRからスコアを取得できませんでした。");
  }

  const value = {
    id: playerId,
    name: playerName || playerId,
    source: "stellaverse",
    gradeSp: profile?.gradeSp || "",
    forceRating: calculateStellaverseRivalForceRating(entriesByHash, profile?.gradeSp),
    scoreCount: entriesByHash.size,
    entries: [...entriesByHash.values()],
    failedTables,
  };
  stellaverseRivalCache.set(cacheKey, { fetchedAt: Date.now(), value });
  return value;
}

async function fetchCachedStellaverseClearStatus(playerId, tableCode) {
  const cacheKey = `${playerId}:${tableCode}`;
  const cached = stellaverseClearStatusCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < STELLAVERSE_RIVAL_CACHE_TTL_MS) {
    return cached.value;
  }
  const value = await scrapeStellaverseClearStatus(playerId, tableCode);
  stellaverseClearStatusCache.set(cacheKey, { fetchedAt: Date.now(), value });
  return value;
}

async function scrapeStellaversePlayerProfile(playerId) {
  const window = createStellaverseScrapeWindow();
  try {
    await window.loadURL(`${STELLAVERSE_IR_ORIGIN}/players/${encodeURIComponent(playerId)}`);
    const deadline = Date.now() + STELLAVERSE_RIVAL_LOAD_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const result = await window.webContents.executeJavaScript(
        `(() => {
          const bodyText = document.body?.innerText || "";
          if (/player not found|プレイヤーが見つかりません/i.test(bodyText)) {
            return { state: "error" };
          }
          const heading = Array.from(document.querySelectorAll("h2")).find((node) =>
            !/STELLAVERSE IR/i.test(node.textContent || "")
          );
          const gradeHeading = Array.from(document.querySelectorAll("h4")).find((node) =>
            /LR2IR ID/i.test(node.textContent || "")
          );
          if (!heading || !gradeHeading) return { state: "loading" };
          const gradeText = gradeHeading.textContent?.replace(/\\s+/g, " ").trim() || "";
          return {
            state: "ready",
            name: heading.textContent?.replace(/\\s+/g, " ").trim() || "",
            gradeText,
            isPrivate: /プロフィール(?:は|が)非公開|非公開プロフィール|profile is private|private profile/i.test(bodyText)
          };
        })()`,
        true,
      );
      if (result?.state === "ready") {
        const gradeText = String(result.gradeText || "").replace(/\s*-\s*LR2IR ID[\s\S]*$/i, "").trim();
        return {
          name: sanitizeStellaverseRivalName(result.name, playerId),
          gradeSp: gradeText.split("/")[0]?.trim() || "",
          isPrivate: Boolean(result.isPrivate),
        };
      }
      if (result?.state === "error") {
        throw new Error("Stellaverse IRのプレイヤーが見つかりませんでした。");
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error("Stellaverse IRのプロフィール取得がタイムアウトしました。");
  } finally {
    if (!window.isDestroyed()) window.destroy();
  }
}

async function scrapeStellaverseClearStatus(playerId, tableCode) {
  const targetUrl = `${STELLAVERSE_IR_ORIGIN}/clear-status/${encodeURIComponent(tableCode)}/${encodeURIComponent(playerId)}`;
  const window = createStellaverseScrapeWindow();

  try {
    await window.loadURL(targetUrl);
    const deadline = Date.now() + STELLAVERSE_RIVAL_LOAD_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const result = await window.webContents.executeJavaScript(buildStellaverseScrapeScript(), true);
      if (result?.state === "ready") {
        return {
          name: sanitizeStellaverseRivalName(result.name, playerId),
          entries: normalizeStellaverseRivalRows(result.rows),
        };
      }
      if (result?.state === "error") {
        throw new Error(String(result.message || "プレイヤーまたは公開スコアを確認できませんでした。"));
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error("Stellaverse IRの応答がタイムアウトしました。");
  } finally {
    if (!window.isDestroyed()) {
      window.destroy();
    }
  }
}

function createStellaverseScrapeWindow() {
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      partition: STELLAVERSE_RIVAL_PARTITION,
    },
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  const blockUnexpectedNavigation = (event, url) => {
    try {
      if (new URL(url).origin !== STELLAVERSE_IR_ORIGIN) {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  };
  window.webContents.on("will-navigate", blockUnexpectedNavigation);
  window.webContents.on("will-redirect", blockUnexpectedNavigation);
  return window;
}

function calculateStellaverseRivalForceRating(entriesByHash, gradeSp) {
  const constants = loadRivalForceConstants();
  const candidates = [];
  for (const chart of constants) {
    const score = entriesByHash.get(chart.md5);
    const exScore = Number(score?.exScore);
    const maxExScore = Number(score?.maxExScore);
    if (!Number.isFinite(exScore) || !Number.isFinite(maxExScore) || maxExScore <= 0) continue;
    const force = chart.chartConstant * calculateForceScoreCoefficient(exScore / maxExScore);
    if (Number.isFinite(force)) candidates.push(force);
  }
  candidates.sort((left, right) => right - left);
  const best50 = candidates.slice(0, 50);
  const danConstant = RIVAL_FORCE_DAN_CONSTANTS.get(String(gradeSp || "").trim()) || 0;
  const total = best50.reduce((sum, value) => sum + value, 0) + danConstant;
  const rating = Math.max(0, Math.min(total / (danConstant > 0 ? 51 : 50), 30));
  const tier = getForceRatingTier(rating);
  return {
    available: true,
    rating,
    title: tier.title,
    tier: tier.tier,
    top50Count: best50.length,
    playedCharts: candidates.length,
    hasDanCandidate: danConstant > 0,
  };
}

function loadRivalForceConstants() {
  if (rivalForceConstantsCache) return rivalForceConstantsCache;
  try {
    const payload = JSON.parse(fs.readFileSync(RIVAL_FORCE_CONSTANTS_PATH, "utf8"));
    rivalForceConstantsCache = (Array.isArray(payload?.charts) ? payload.charts : [])
      .map((chart) => ({
        md5: String(chart?.md5 || "").trim().toLowerCase(),
        chartConstant: Number(chart?.chartConstant),
      }))
      .filter((chart) => /^[0-9a-f]{32}$/.test(chart.md5) && Number.isFinite(chart.chartConstant));
  } catch {
    rivalForceConstantsCache = [];
  }
  return rivalForceConstantsCache;
}

function buildStellaverseScrapeScript() {
  return `(() => {
    const bodyText = document.body?.innerText || "";
    const errorMessages = [
      "プレイヤーが見つかりません",
      "クリア状況は非公開",
      "Player not found",
      "clear status is private"
    ];
    const foundError = errorMessages.find((message) => bodyText.toLowerCase().includes(message.toLowerCase()));
    if (foundError) return { state: "error", message: foundError };

    const tables = Array.from(document.querySelectorAll("table"));
    const scoreTable = tables.find((table) => {
      const headers = Array.from(table.querySelectorAll("th")).map((cell) => cell.textContent?.trim() || "");
      return headers.some((header) => /^EX(?:\\s|$)/i.test(header)) && headers.some((header) => /^BP(?:\\s|$)/i.test(header));
    });
    if (!scoreTable) return { state: "loading" };

    const heading = Array.from(document.querySelectorAll("h3")).find((node) => /クリア状況|clear status/i.test(node.textContent || ""));
    const headingText = heading?.textContent?.replace(/\\s+/g, " ").trim() || "";
    const nameMatch = headingText.match(/(?:クリア状況|clear status)\\s*[—-]\\s*(.+?)(?:\\s*\\(|$)/i);
    const rows = Array.from(scoreTable.querySelectorAll("tbody tr")).map((row) => {
      const link = row.querySelector('a[href^="/charts/"]');
      const md5Match = link?.getAttribute("href")?.match(/\\/charts\\/([0-9a-f]{32})/i);
      if (!md5Match) return null;
      const cells = Array.from(row.querySelectorAll("td"));
      const lampCell = link.closest("td");
      return {
        md5: md5Match[1].toLowerCase(),
        lampClass: lampCell?.className || "",
        rankText: cells[2]?.textContent?.trim() || "",
        exText: cells[3]?.textContent?.trim() || "",
        rateText: cells[4]?.textContent?.trim() || "",
        bpText: cells[5]?.textContent?.trim() || ""
      };
    }).filter(Boolean);
    return { state: "ready", name: nameMatch?.[1]?.trim() || "", rows };
  })()`;
}

function normalizeStellaverseRivalRows(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const md5 = String(row?.md5 ?? "").trim().toLowerCase();
      if (!/^[0-9a-f]{32}$/.test(md5)) {
        return null;
      }
      const scoreMatch = String(row?.exText ?? "").match(/([\d,]+)\s*\/\s*([\d,]+)/);
      const exScore = parseStellaverseInteger(scoreMatch?.[1]);
      const maxExScore = parseStellaverseInteger(scoreMatch?.[2]);
      const rateMatch = String(row?.rateText ?? "").match(/([\d.]+)\s*%/);
      const scoreRate = rateMatch ? Number(rateMatch[1]) : maxExScore > 0 && exScore != null ? (exScore / maxExScore) * 100 : null;
      const rankMatch = String(row?.rankText ?? "").match(/([\d,]+)\s*\/\s*([\d,]+)/);
      const rank = parseStellaverseInteger(rankMatch?.[1]);
      const totalPlayers = parseStellaverseInteger(rankMatch?.[2]);
      return {
        md5,
        lampStatus: parseStellaverseLampClass(row?.lampClass),
        exScore,
        maxExScore,
        scoreRate: Number.isFinite(scoreRate) ? Math.round(scoreRate * 100) / 100 : null,
        missCount: parseStellaverseInteger(row?.bpText),
        rank,
        totalPlayers,
        topPercent:
          rank != null && totalPlayers > 0 ? Math.round((rank / totalPlayers) * 10000) / 100 : null,
      };
    })
    .filter(Boolean);
}

function parseStellaverseInteger(value) {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const numeric = Number.parseInt(normalized, 10);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
}

function parseStellaverseLampClass(value) {
  const normalized = String(value ?? "").toLowerCase();
  if (/perfect|full.?combo|(?:^|[-_])fc(?:$|[-_])/.test(normalized)) return "FULL COMBO";
  if (/hard/.test(normalized)) return "HARD CLEAR";
  if (/easy/.test(normalized)) return "EASY CLEAR";
  if (/fail/.test(normalized)) return "FAILED";
  if (/norm|clear/.test(normalized)) return "CLEAR";
  return "NO PLAY";
}

function sanitizeStellaverseRivalName(value, fallback) {
  const name = String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s*(?:🔒\uFE0F?\s*)?(?:非公開プロフィール|private profile)\s*$/i, "")
    .trim()
    .slice(0, 80);
  if (/^(?:🔒\uFE0F?\s*)?(?:非公開プロフィール|private profile)$/i.test(name)) {
    return fallback;
  }
  return name || fallback;
}

function compareStellaverseRivalEntry(left, right) {
  const leftEx = Number.isFinite(Number(left?.exScore)) ? Number(left.exScore) : -1;
  const rightEx = Number.isFinite(Number(right?.exScore)) ? Number(right.exScore) : -1;
  if (leftEx !== rightEx) {
    return rightEx - leftEx;
  }
  const lampOrder = ["FULL COMBO", "HARD CLEAR", "CLEAR", "EASY CLEAR", "FAILED", "NO PLAY"];
  return lampOrder.indexOf(left?.lampStatus) - lampOrder.indexOf(right?.lampStatus);
}

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
    icon: APP_ICON_PATH,
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
