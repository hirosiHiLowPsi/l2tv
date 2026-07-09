const http = require("node:http");
const https = require("node:https");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const dns = require("node:dns").promises;
const net = require("node:net");
const { DatabaseSync } = require("node:sqlite");

const HOST = process.env.HOST ?? "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT ?? "4173", 10);
const PUBLIC_DIR = path.join(__dirname, "public");
const FORCE_RATING_CONSTANTS_PATH = path.join(PUBLIC_DIR, "data", "force-chart-constants.json");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) L2TV/0.1 Safari/537.36";
const API_TOKEN = crypto.randomBytes(32).toString("hex");
const MAX_REMOTE_RESPONSE_BYTES = 25 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 300;
const MAX_REDIRECTS = 5;
const REMOTE_TABLE_LIST_URL =
  "https://script.google.com/macros/s/AKfycbzaQbcI9UZDcDlSHHl2NHilhmePrNrwxRdOFkmIXsfnbfksKKmAB3V65WZ8jPWU-7E/exec?table=tablelist";
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"]);

const STELLAVERSE_PROFILE_TABLE_PATTERN = /(?:stellaverse|stella[_\s-]*verse|stellabms|openlr2|custom|ir|profile|account|player|user|setting|config)/i;
const STELLAVERSE_PROFILE_SIGNAL_PATTERN = /(?:stellaverse|stella[_\s-]*verse|stellabms|openlr2)/i;
const PROFILE_NAME_COLUMN_PATTERN = /^(?:name|username|user_name|player_name|display_name|nickname|nick|irname|ir_name|screenname|screen_name)$/i;
const PROFILE_ID_COLUMN_PATTERN = /^(?:id|irid|ir_id|user_id|player_id|account_id|uid)$/i;
const SENSITIVE_PROFILE_COLUMN_PATTERN = /(?:password|passwd|token|secret|key|cookie|session|access|refresh|auth)/i;

const LAMP_ORDER = [
  "FULL COMBO",
  "HARD CLEAR",
  "CLEAR",
  "EASY CLEAR",
  "FAILED",
  "NO PLAY",
  "NO SONG",
  "UNMATCHED",
  "UNSUPPORTED",
];

const LAMP_LABELS = {
  "FULL COMBO": "FULL COMBO",
  "HARD CLEAR": "HARD CLEAR",
  CLEAR: "CLEAR",
  "EASY CLEAR": "EASY CLEAR",
  FAILED: "FAILED",
  "NO PLAY": "NO PLAY",
  "NO SONG": "NS",
  UNMATCHED: "UNMATCHED",
  UNSUPPORTED: "UNSUPPORTED",
};

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
    "connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

const responseCache = new Map();
const tableCache = new Map();
const tableListCache = new Map();
const playerMyListCache = new Map();
const songDbCatalogCache = new Map();
let forceChartConstantsCache = null;
const FORCE_RATING_MAX = 30;
const FORCE_LAMP_COEFFICIENTS = new Map([
  ["MAX", 1],
  ["PERFECT", 1],
  ["FULL COMBO", 1],
  ["EX HARD CLEAR", 1],
  ["HARD CLEAR", 1],
  ["CLEAR", 1],
  ["EASY CLEAR", 1],
  ["FAILED", 1],
]);
const FORCE_SCORE_AAA_THRESHOLD = 8 / 9;
const FORCE_SCORE_AAA_BASE = 0.9;
const FORCE_SCORE_FULL_BONUS_THRESHOLD = 0.9444;
const FORCE_SCORE_FULL_BONUS_BASE = 0.98;
const FORCE_DAN_LAMP_COEFFICIENTS = new Map([
  ["HARD CLEAR", 1],
  ["CLEAR", 1],
]);
const FORCE_DAN_CONSTANTS = new Map([
  [11, { label: "発狂初段", grade: "★1", courseId: 11110, constant: 1.0 }],
  [12, { label: "発狂二段", grade: "★2", courseId: 11109, constant: 1.0 }],
  [13, { label: "発狂三段", grade: "★3", courseId: 11108, constant: 1.0 }],
  [14, { label: "発狂四段", grade: "★4", courseId: 11107, constant: 1.0 }],
  [15, { label: "発狂五段", grade: "★5", courseId: 11106, constant: 1.0 }],
  [16, { label: "発狂六段", grade: "★6", courseId: 11105, constant: 1.39 }],
  [17, { label: "発狂七段", grade: "★7", courseId: 11104, constant: 1.76 }],
  [18, { label: "発狂八段", grade: "★8", courseId: 11103, constant: 2.94 }],
  [19, { label: "発狂九段", grade: "★9", courseId: 11102, constant: 7.09 }],
  [20, { label: "発狂十段", grade: "★10", courseId: 11101, constant: 12.2 }],
  [21, { label: "発狂皆伝", grade: "★★", courseId: 11100, constant: 18.15 }],
  [22, { label: "Overjoy", grade: "(^^)", courseId: 11099, constant: 26.81 }],
]);

function getForceDanLampCoefficient(lampStatus, danConstant) {
  if (!danConstant) {
    return null;
  }
  if (Number(danConstant.courseId) === 11099) {
    return lampStatus === "HARD CLEAR" || lampStatus === "CLEAR" ? 1 : null;
  }
  return FORCE_DAN_LAMP_COEFFICIENTS.get(lampStatus) ?? null;
}

const LOCAL_DAN_STAR_MAP = new Map(
  Array.from({ length: 10 }, (_, index) => [index + 1, `☆${index + 1}`]),
);
for (let index = 1; index <= 10; index += 1) {
  LOCAL_DAN_STAR_MAP.set(index + 10, `★${index}`);
}
LOCAL_DAN_STAR_MAP.set(21, "★★");
LOCAL_DAN_STAR_MAP.set(22, "(^^)");

const LOCAL_GRADE_PASS_CLEAR_MIN = 3;
const LOCAL_SKILL_ANALYZER_PASS_CLEAR_MIN = 2;

const LOCAL_DAN_TEXT_LEVELS = new Map([
  ["初", 1],
  ["一", 1],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", 10],
]);

const GENOSIDE2018_OVERJOY_TITLE_KEY = "genoside2018段位認定overjoy";
const GENOSIDE2018_DAN_TITLE_PREFIX = "genoside2018段位認定";
const HISTORICAL_OVERJOY_TITLE_KEYS = new Set([
  "overjoy",
  "段位認定overjoy",
  GENOSIDE2018_OVERJOY_TITLE_KEY,
]);

function createAppServer() {
  return http.createServer(async (req, res) => {
    try {
      if (!req.url) {
        sendError(res, 400, "URLが空です。");
        return;
      }

      if (!isAllowedLocalRequestHost(req)) {
        sendError(res, 403, "許可されていないホストです。");
        return;
      }
      const requestUrl = new URL(req.url, `http://${req.headers.host ?? `${HOST}:${PORT}`}`);

      if (req.method === "GET" && requestUrl.pathname === "/api/health") {
        sendJson(res, 200, { ok: true });
        return;
      }

      if (req.method === "GET" && requestUrl.pathname === "/api/client-config") {
        sendJson(res, 200, { apiToken: API_TOKEN });
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/analyze") {
        if (!validateApiPostRequest(req, res)) {
          return;
        }
        const body = await readJsonBody(req);
        const analysis = await analyzeRequest(body);
        sendJson(res, 200, analysis);
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/table-list") {
        if (!validateApiPostRequest(req, res)) {
          return;
        }
        const body = await readJsonBody(req);
        const tableList = await loadTableListRequest(body);
        sendJson(res, 200, tableList);
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/table-meta") {
        if (!validateApiPostRequest(req, res)) {
          return;
        }
        const body = await readJsonBody(req);
        const tableMeta = await loadTableMetaRequest(body);
        sendJson(res, 200, tableMeta);
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/profile-from-db") {
        if (!validateApiPostRequest(req, res)) {
          return;
        }
        const body = await readJsonBody(req);
        const profile = await loadProfileFromScoreDbRequest(body);
        sendJson(res, 200, profile);
        return;
      }

      if (req.method === "POST" && requestUrl.pathname === "/api/local-db-state") {
        if (!validateApiPostRequest(req, res)) {
          return;
        }
        const body = await readJsonBody(req);
        const localDbState = await loadLocalDbStateRequest(body);
        sendJson(res, 200, localDbState);
        return;
      }

      if (req.method === "GET") {
        await serveStaticFile(requestUrl.pathname, res);
        return;
      }

      sendError(res, 405, "許可されていないメソッドです。");
    } catch (error) {
      console.error(error);
      sendError(res, 500, error instanceof Error ? error.message : "不明なエラーが発生しました。");
    }
  });
}

function startServer({ host = HOST, port = PORT } = {}) {
  const normalizedPort = Number.parseInt(String(port), 10);
  const listenPort = Number.isFinite(normalizedPort) ? normalizedPort : PORT;
  const server = createAppServer();

  server.listen(listenPort, host, () => {
    console.log(`L2TV: http://${host}:${listenPort}`);
  });

  return server;
}

async function analyzeRequest(body) {
  const scoreDbPath = normalizeLocalPath(body?.scoreDbPath);
  const songDbPath = normalizeLocalPath(body?.songDbPath);
  const rivalFolderPath = normalizeLocalPath(body?.rivalFolderPath);
  const includeUnlistedUpdates = Boolean(body?.includeUnlistedUpdates);
  const skillAnalyzerFetchMode = normalizeSkillAnalyzerFetchMode(body?.skillAnalyzerFetchMode);
  const scoreDbMode = normalizeScoreDbMode(body?.scoreDbMode);
  const useLocalScoreDb = Boolean(scoreDbPath);
  const tableUrls = Array.isArray(body?.tableUrls)
    ? [...new Set(body.tableUrls.map((url) => String(url ?? "").trim()).filter(Boolean))]
    : [];
  const hasTableInputs = tableUrls.length > 0;

  if (!useLocalScoreDb) {
    throw new Error("LR2 score.db のパスを入力してください。");
  }

  const tableResults = hasTableInputs
    ? await mapWithConcurrency(tableUrls, 3, async (tableUrl) => {
        try {
          return { ok: true, table: await loadTableFromUrl(tableUrl) };
        } catch (error) {
          return {
            ok: false,
            tableUrl,
            error: error instanceof Error ? error.message : "難易度表の読み込みに失敗しました。",
          };
        }
      })
    : [];

  const tables = tableResults.filter((result) => result.ok).map((result) => result.table);
  const tableErrors = tableResults.filter((result) => !result.ok);

  if (hasTableInputs && !tables.length) {
    throw new Error("難易度表を1件も読み込めませんでした。");
  }

  const playerMyList = await loadPlayerMyListFromScoreDb(scoreDbPath, songDbPath, { skillAnalyzerFetchMode, scoreDbMode });
  const rivalData = await loadRivalFolderData(rivalFolderPath);
  const playerProfile = playerMyList.localProfile ?? {
    playerId: playerMyList.playerId || "",
    name: "",
    lr2Id: "",
    grade: "",
    gradeSp: "",
    gradeDp: "",
    skillAnalyzer: null,
    stellaSkill4th: null,
    overjoyTripleCrown: false,
    hitTotals: null,
    playTimeTotal: null,
  };

  const lookupMap = new Map();
  const enrichedTables = hasTableInputs ? tables.map((table) => enrichTable(table, lookupMap, playerMyList, rivalData)) : [];
  const unlistedUpdateCharts = includeUnlistedUpdates ? buildUnlistedUpdateCharts(playerMyList, enrichedTables) : [];
  const overall = buildOverallSummary(enrichedTables);
  const localDbState = useLocalScoreDb ? await buildLocalDbState(scoreDbPath, songDbPath) : null;
  const localScoreState = buildLocalScoreState(playerMyList);
  const forceRating = buildForceRating(playerMyList);

  return {
    analyzedAt: new Date().toISOString(),
    localDbState,
    localScoreState,
    overall,
    player: {
      id: playerMyList.playerId || "local",
      sourceType: playerMyList.sourceType,
      scoreDbMode: playerMyList.scoreDbMode,
      name: playerProfile.name,
      lr2Id: playerProfile.lr2Id || playerMyList.localProfile?.lr2Id || "",
      grade: playerProfile.grade,
      gradeSp: playerProfile.gradeSp,
      gradeDp: playerProfile.gradeDp,
      skillAnalyzer: playerProfile.skillAnalyzer || playerMyList.localProfile?.skillAnalyzer || null,
      stellaSkill4th:
        playerProfile.stellaSkill4th ||
        playerProfile.skillAnalyzer?.st ||
        playerMyList.localProfile?.stellaSkill4th ||
        playerMyList.localProfile?.skillAnalyzer?.st ||
        null,
      overjoyTripleCrown: Boolean(playerProfile.overjoyTripleCrown || playerMyList.localProfile?.overjoyTripleCrown),
      forceRating,
      localDbPath: playerMyList.localDbPath || "",
      localSongDbPath: playerMyList.localSongDbPath || "",
      hitTotals: playerMyList.localProfile?.hitTotals ?? null,
      playTimeTotal: playerMyList.localProfile?.playTimeTotal ?? null,
    },
    rivals: {
      folderPath: rivalData.path,
      count: rivalData.rivals.length,
      totalScores: rivalData.rivals.reduce((sum, rival) => sum + rival.scoreCount, 0),
      players: rivalData.rivals.map((rival) => ({
        id: rival.id,
        name: rival.name,
        scoreCount: rival.scoreCount,
      })),
    },
    tableErrors,
    tables: enrichedTables,
    unlistedUpdateCharts,
  };
}

async function loadLocalDbStateRequest(body) {
  const scoreDbPath = normalizeLocalPath(body?.scoreDbPath);
  const songDbPath = normalizeLocalPath(body?.songDbPath);
  const state = await buildLocalDbState(scoreDbPath, songDbPath);
  return {
    fetchedAt: new Date().toISOString(),
    ...state,
  };
}

async function buildLocalDbState(scoreDbPath, songDbPath) {
  const resolvedScoreDbPath = scoreDbPath ? path.resolve(scoreDbPath) : "";
  const resolvedSongDbPath = resolveSongDbPathFromScoreDb(resolvedScoreDbPath, songDbPath);

  return {
    scoreDb: await readLocalFileState(resolvedScoreDbPath),
    songDb: await readLocalFileState(resolvedSongDbPath),
  };
}

async function readLocalFileState(filePath) {
  const resolvedPath = normalizeLocalPath(filePath);
  if (!resolvedPath) {
    return {
      path: "",
      exists: false,
      size: null,
      mtimeMs: null,
    };
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return {
      path: resolvedPath,
      exists: false,
      size: null,
      mtimeMs: null,
    };
  }

  return {
    path: resolvedPath,
    exists: true,
    size: Number.isFinite(stat.size) ? stat.size : null,
    mtimeMs: Number.isFinite(stat.mtimeMs) ? Math.trunc(stat.mtimeMs) : null,
  };
}

async function loadProfileFromScoreDbRequest(body) {
  const scoreDbPath = normalizeLocalPath(body?.scoreDbPath);
  const songDbPath = normalizeLocalPath(body?.songDbPath);
  const skillAnalyzerFetchMode = normalizeSkillAnalyzerFetchMode(body?.skillAnalyzerFetchMode);
  const requestedScoreDbMode = normalizeScoreDbMode(body?.scoreDbMode);
  if (!scoreDbPath) {
    throw new Error("LR2 score.db パスを入力してください。");
  }

  const resolvedPath = path.resolve(scoreDbPath);
  const resolvedSongDbPath = resolveSongDbPathFromScoreDb(resolvedPath, songDbPath);
  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    throw new Error("指定された LR2 score.db が見つかりません。");
  }

  let database;
  try {
    database = new DatabaseSync(resolvedPath, { readonly: true });
    const playerRow = database.prepare("SELECT * FROM player LIMIT 1").get();

    if (!playerRow) {
      throw new Error("score.db の player テーブルを読み取れませんでした。");
    }

    const localPlayerId = normalizeText(playerRow.id) || "local";
    const scoreDbMode = resolveScoreDbMode(requestedScoreDbMode, resolvedPath);
    const dbProfile = readPlayerProfileFromScoreDb(database, playerRow, scoreDbMode);
    const scoreRows = readScoreRowsForLocalGrade(database);
    const fallbackGradeSp = formatLocalGrade(playerRow.grade_7);
    const localGradeDp = formatLocalGrade(playerRow.grade_14);
    const inferredGradeInfo = await inferLocalGradeInfoFromSongDbGrades(resolvedSongDbPath, scoreRows);
    const inferredGradeSp = inferredGradeInfo?.grade || fallbackGradeSp;
    const localSkillAnalyzer = await loadLocalSkillAnalyzerProgress(resolvedSongDbPath, scoreRows);
    const stellaverseIrProfile =
      scoreDbMode === "stellaverse" && dbProfile?.id ? await fetchStellaverseIrPlayerProfile(dbProfile.id) : null;
    const skillAnalyzer = mergeSkillAnalyzerProgress(null, localSkillAnalyzer, "both");
    const gradeSp = inferredGradeSp || "";
    const gradeDp = localGradeDp || "";
    const overjoyTripleCrown = await hasLocalOverjoyTripleCrown(resolvedSongDbPath, scoreRows);
    const profileName = stellaverseIrProfile?.name || dbProfile?.name || sanitizeLocalPlayerName(playerRow.name) || "";

    const localProfile = {
      playerId: localPlayerId,
      name: profileName,
      lr2Id: dbProfile?.id || normalizeText(playerRow.irid),
      grade: "",
      gradeSp,
      gradeDp,
      skillAnalyzer,
      stellaSkill4th: skillAnalyzer?.st ?? null,
      overjoyTripleCrown,
      forceDanCandidate: inferredGradeInfo ? buildForceDanCandidateFromGradeInfo(inferredGradeInfo) : null,
      playTimeTotal: buildLocalPlayTimeTotalFromPlayerRow(playerRow),
    };
    localProfile.grade = combineLocalGrades(localProfile.gradeSp, localProfile.gradeDp);

    return {
      fetchedAt: new Date().toISOString(),
      player: {
        id: localProfile.playerId || "local",
      sourceType: "local-score-db",
      scoreDbMode,
      name: localProfile.name || "",
        lr2Id: localProfile.lr2Id || "",
        grade: localProfile.grade || "",
        gradeSp: localProfile.gradeSp || "",
        gradeDp: localProfile.gradeDp || "",
        skillAnalyzer: localProfile.skillAnalyzer || null,
        stellaSkill4th: localProfile.stellaSkill4th || localProfile.skillAnalyzer?.st || null,
        overjoyTripleCrown: Boolean(localProfile.overjoyTripleCrown),
        localDbPath: resolvedPath,
      },
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "score.db からプロフィールを取得できませんでした。");
  } finally {
    database?.close();
  }
}

async function serveStaticFile(requestPath, res) {
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, relativePath));
  const relativeToPublic = path.relative(PUBLIC_DIR, resolvedPath);

  if (relativeToPublic.startsWith("..") || path.isAbsolute(relativeToPublic)) {
    sendError(res, 403, "アクセスできません。");
    return;
  }

  try {
    const stat = await fsp.stat(resolvedPath);
    if (!stat.isFile()) {
      sendError(res, 404, "ファイルが見つかりません。");
      return;
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      "Content-Type": MIME_TYPES[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(resolvedPath).pipe(res);
  } catch {
    sendError(res, 404, "ファイルが見つかりません。");
  }
}

function validateApiPostRequest(req, res) {
  const origin = String(req.headers.origin ?? "").trim();
  if (origin) {
    if (!isAllowedLocalOrigin(origin, req)) {
      sendError(res, 403, "許可されていない送信元です。");
      return false;
    }
  }

  const contentType = String(req.headers["content-type"] ?? "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    sendError(res, 415, "Content-Type は application/json を指定してください。");
    return false;
  }

  const token = String(req.headers["x-l2tv-token"] ?? "");
  const expectedToken = Buffer.from(API_TOKEN);
  const receivedToken = Buffer.from(token);
  if (
    !token ||
    receivedToken.length !== expectedToken.length ||
    !crypto.timingSafeEqual(receivedToken, expectedToken)
  ) {
    sendError(res, 403, "APIトークンが不正です。");
    return false;
  }

  return true;
}

function isAllowedLocalRequestHost(req) {
  if (!isLoopbackRemoteAddress(req?.socket?.remoteAddress)) {
    return false;
  }

  const parsed = parseHostHeader(req.headers.host);
  if (!parsed) {
    return false;
  }

  return isAllowedLoopbackHostAndPort(parsed.hostname, parsed.port, req);
}

function isLoopbackRemoteAddress(remoteAddress) {
  const value = String(remoteAddress ?? "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!value) {
    return false;
  }
  if (value === "::1" || value === "127.0.0.1") {
    return true;
  }
  const mappedIpv4 = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) {
    return mappedIpv4[1] === "127.0.0.1";
  }
  if (net.isIP(value) === 4) {
    const parts = value.split(".").map((part) => Number.parseInt(part, 10));
    return parts.length === 4 && parts[0] === 127 && parts.every((part) => Number.isInteger(part));
  }
  return false;
}

function isAllowedLocalOrigin(origin, req) {
  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:") {
    return false;
  }

  return isAllowedLoopbackHostAndPort(parsed.hostname, parsed.port, req);
}

function parseHostHeader(hostHeader) {
  const value = String(hostHeader ?? "").trim();
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(`http://${value}`);
    return {
      hostname: parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ""),
      port: parsed.port,
    };
  } catch {
    return null;
  }
}

function isAllowedLoopbackHostAndPort(hostname, port, req) {
  const normalizedHostname = String(hostname ?? "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!LOOPBACK_HOSTNAMES.has(normalizedHostname)) {
    return false;
  }

  const localPort = Number(req?.socket?.localPort);
  const allowedPorts = new Set([String(PORT)]);
  if (Number.isFinite(localPort) && localPort > 0) {
    allowedPorts.add(String(localPort));
  }

  return allowedPorts.has(String(port || "80"));
}

async function readJsonBody(req) {
  const chunks = [];
  let totalSize = 0;

  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > 2 * 1024 * 1024) {
      throw new Error("リクエストが大きすぎます。");
    }
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("JSONの解析に失敗しました。");
  }
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

async function loadTableListRequest(body) {
  const force = Boolean(body?.force);
  const cacheKey = REMOTE_TABLE_LIST_URL;
  const cached = tableListCache.get(cacheKey);
  const now = Date.now();
  if (!force && cached && now - cached.cachedAt < 60 * 60 * 1000) {
    return structuredClone(cached.payload);
  }

  const entries = await loadRemoteTableListEntries();
  const payload = {
    sourceUrl: REMOTE_TABLE_LIST_URL,
    fetchedAt: new Date().toISOString(),
    tables: entries,
  };
  setLimitedCache(tableListCache, cacheKey, { cachedAt: now, payload });
  return structuredClone(payload);
}

async function loadTableMetaRequest(body) {
  const { safeUrl, headerUrl, header } = await loadTableHeaderFromUrl(body?.url);
  return {
    id: buildStableTableListId(safeUrl),
    name: normalizeText(header.name) || buildTableNameFromUrl(safeUrl),
    symbol: normalizeText(header.symbol) || "",
    url: safeUrl,
    sourceUrl: safeUrl,
    headerUrl,
    dataUrl: new URL(String(header.data_url), headerUrl).toString(),
  };
}

async function loadRemoteTableListEntries() {
  const response = await fetchRemoteText(REMOTE_TABLE_LIST_URL, { useCache: false });
  const entries = new Map();
  addTableListEntries(entries, parseTableListText(response.text, response.finalUrl));

  const scriptUrls = extractScriptUrls(response.text, response.finalUrl).filter((url) =>
    /table[_-]?list|tablelist/i.test(url),
  );
  for (const scriptUrl of scriptUrls) {
    let scriptResponse;
    try {
      scriptResponse = await fetchRemoteText(scriptUrl);
    } catch {
      continue;
    }

    addTableListEntries(entries, parseTableListText(scriptResponse.text, scriptResponse.finalUrl));
    const dataUrls = extractTableListDataUrls(scriptResponse.text, scriptResponse.finalUrl);
    for (const dataUrl of dataUrls) {
      try {
        const dataResponse = await fetchRemoteText(dataUrl);
        addTableListEntries(entries, parseTableListText(dataResponse.text, dataResponse.finalUrl));
      } catch {
        // Some scripts contain unrelated URLs; skip anything that is not readable as table list data.
      }
    }
  }

  return [...entries.values()].sort((left, right) => {
    const yearDiff = (Number(right.year) || 0) - (Number(left.year) || 0);
    if (yearDiff !== 0) {
      return yearDiff;
    }
    return String(left.name).localeCompare(String(right.name), "ja");
  });
}

function addTableListEntries(targetMap, entries) {
  for (const entry of Array.isArray(entries) ? entries : []) {
    const url = normalizeTableListEntryUrl(entry?.url);
    if (!url || targetMap.has(url) || !isSpTableListEntry(entry)) {
      continue;
    }
    const name = normalizeText(entry?.name) || buildTableNameFromUrl(url);
    const tag1 = normalizeText(entry?.tag1 ?? entry?.type);
    const tag2 = normalizeText(entry?.tag2 ?? entry?.tag);
    targetMap.set(url, {
      id: buildStableTableListId(url),
      name,
      url,
      symbol: normalizeText(entry?.symbol),
      type: tag1,
      tag1,
      tag: tag2,
      tag2,
      comment: normalizeText(entry?.comment),
      year: normalizeText(entry?.year),
    });
  }
}

function isSpTableListEntry(entry) {
  return normalizeTableListPlayMode(entry?.tag1 ?? entry?.type) === "sp";
}

function normalizeTableListPlayMode(value) {
  const compact = normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!compact) {
    return "";
  }
  if (compact === "sp" || compact === "single" || compact === "singleplay") {
    return "sp";
  }
  if (compact === "dp" || compact === "double" || compact === "doubleplay") {
    return "dp";
  }
  return compact;
}

function parseTableListText(text, baseUrl) {
  const source = String(text ?? "");
  if (!source.trim()) {
    return [];
  }

  if (looksLikeJson(source)) {
    try {
      return parseTableListJson(JSON.parse(source), baseUrl);
    } catch {
      return [];
    }
  }

  const csvEntries = parseTableListDelimitedText(source, baseUrl);
  if (csvEntries.length) {
    return csvEntries;
  }

  const htmlEntries = parseTableListHtml(source, baseUrl);
  const scriptEntries = parseTableListScriptObjects(source, baseUrl);
  return [...htmlEntries, ...scriptEntries];
}

function parseTableListJson(payload, baseUrl) {
  const entries = [];
  const visit = (value, inherited = {}) => {
    if (Array.isArray(value)) {
      const rowEntry = parseTableListJsonRow(value, baseUrl, inherited);
      if (rowEntry) {
        entries.push(rowEntry);
        return;
      }
      for (const item of value) {
        visit(item, inherited);
      }
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    const nextInherited = {
      year: normalizeText(pickTableListField(value, ["year", "updated", "date"]) ?? inherited.year),
      tag1: normalizeText(
        pickTableListField(value, ["tag1", "tag_1", "tags1", "type", "mode", "playMode", "play_mode", "tag"]) ??
          inherited.tag1,
      ),
      tag2: normalizeText(
        pickTableListField(value, ["tag2", "tag_2", "tags2", "category", "group", "kind"]) ?? inherited.tag2,
      ),
    };

    const rawUrl =
      pickTableListField(value, [
        "url",
        "table_url",
        "tableUrl",
        "header_url",
        "headerUrl",
        "data_url",
        "dataUrl",
        "bmstable",
      ]) ??
      "";
    const url = resolveTableListCandidateUrl(rawUrl, baseUrl, { trusted: true });
    if (url) {
      entries.push({
        url,
        name: normalizeText(pickTableListField(value, ["name", "title", "label", "tableName", "table_name", "symbol"])),
        symbol: normalizeText(pickTableListField(value, ["symbol", "mark", "prefix", "id"])),
        tag1: normalizeText(
          pickTableListField(value, ["tag1", "tag_1", "tags1", "type", "mode", "playMode", "play_mode", "tag"]) ??
            nextInherited.tag1,
        ),
        tag2: normalizeText(
          pickTableListField(value, ["tag2", "tag_2", "tags2", "category", "group", "kind", "tagCategory"]) ??
            nextInherited.tag2,
        ),
        comment: normalizeText(pickTableListField(value, ["comment", "description", "memo", "note", "remarks"])),
        year: nextInherited.year,
      });
    }

    for (const childValue of Object.values(value)) {
      if (childValue && typeof childValue === "object") {
        visit(childValue, nextInherited);
      }
    }
  };

  visit(payload);
  return entries;
}

function parseTableListJsonRow(value, baseUrl, inherited = {}) {
  if (value.some((cell) => cell && typeof cell === "object")) {
    return null;
  }

  const cells = value.map((cell) => String(cell ?? ""));
  const linkCellIndex = cells.findIndex((cell) => {
    const link = extractTableListCellLink(cell, baseUrl);
    return Boolean(link.url);
  });
  if (linkCellIndex < 0) {
    return null;
  }

  const link = extractTableListCellLink(cells[linkCellIndex], baseUrl);
  if (!link.url) {
    return null;
  }

  const textCells = cells.map((cell) => htmlToText(cell));
  const followingCells = textCells.slice(linkCellIndex + 1);
  const symbol = linkCellIndex > 0 ? textCells[0] : "";
  const name =
    link.text ||
    (linkCellIndex > 0 ? textCells[linkCellIndex] || textCells[linkCellIndex - 1] : textCells[linkCellIndex]) ||
    buildTableNameFromUrl(link.url);

  if (!name || isTableListActionText(name)) {
    return null;
  }

  return {
    url: link.url,
    name,
    symbol,
    type: followingCells[0] || normalizeText(inherited.tag1),
    tag1: followingCells[0] || normalizeText(inherited.tag1),
    tag2: followingCells[1] || normalizeText(inherited.tag2),
    tag: followingCells[1] || normalizeText(inherited.tag2),
    comment: followingCells[2] || "",
    year: normalizeText(inherited.year),
  };
}

function pickTableListField(value, keys) {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(value, key) && value[key] != null && value[key] !== "") {
      return value[key];
    }
  }

  const normalizedLookup = new Map(
    Object.keys(value).map((key) => [normalizeTableListHeader(key), key]),
  );
  for (const key of keys) {
    const actualKey = normalizedLookup.get(normalizeTableListHeader(key));
    if (actualKey && value[actualKey] != null && value[actualKey] !== "") {
      return value[actualKey];
    }
  }
  return undefined;
}

function parseTableListDelimitedText(text, baseUrl) {
  const lines = String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : "";
  if (!delimiter) {
    return [];
  }

  const headers = splitDelimitedLine(lines[0], delimiter).map((header) => normalizeTableListHeader(header));
  if (!headers.some((header) => /url|table|header/.test(header))) {
    return [];
  }

  const entries = [];
  for (const line of lines.slice(1)) {
    const cells = splitDelimitedLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });

    const url = resolveTableListCandidateUrl(row.url || row.tableurl || row.headerurl || row.table || row.header, baseUrl, {
      trusted: true,
    });
    if (!url) {
      continue;
    }

    entries.push({
      url,
      name: row.name || row.title || row.label || row.symbol,
      symbol: row.symbol || row.id,
      type: row.tag1 || row.tags1 || row.type || row.mode || row.playmode || row.tag,
      tag1: row.tag1 || row.tags1 || row.type || row.mode || row.playmode || row.tag,
      tag: row.tag2 || row.tags2 || row.category || row.group || row.kind,
      tag2: row.tag2 || row.tags2 || row.category || row.group || row.kind,
      comment: row.comment || row.description,
      year: row.year,
    });
  }

  return entries;
}

function splitDelimitedLine(line, delimiter) {
  if (delimiter === "\t") {
    return String(line).split("\t").map((cell) => cell.trim());
  }

  const cells = [];
  let current = "";
  let quoted = false;
  for (const character of String(line)) {
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  cells.push(current.trim());
  return cells;
}

function normalizeTableListHeader(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseTableListHtml(html, baseUrl) {
  const rowEntries = parseTableListHtmlRows(html, baseUrl);
  if (rowEntries.length) {
    return rowEntries;
  }

  const entries = [];
  let currentYear = "";
  let currentName = "";
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(String(html ?? "")))) {
    const href = extractHtmlAttribute(match[1], "href");
    const text = htmlToText(match[2]);
    if (/^(20\d{2}|19\d{2}|2020-2022|bce'?g archive)$/i.test(text)) {
      currentYear = text;
      continue;
    }

    if (href === "#" && text && !isTableListActionText(text)) {
      currentName = text;
      continue;
    }

    const url = resolveTableListCandidateUrl(href, baseUrl);
    if (!url) {
      continue;
    }

    const name = isTableListActionText(text) ? currentName : text;
    entries.push({
      url,
      name: name || buildTableNameFromUrl(url),
      year: currentYear,
    });
  }

  return entries;
}

function parseTableListHtmlRows(html, baseUrl) {
  const entries = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const rowMatch of String(html ?? "").matchAll(rowPattern)) {
    const cellHtmlList = extractHtmlTableCells(rowMatch[1]);
    if (cellHtmlList.length < 2) {
      continue;
    }

    const linkCellIndex = cellHtmlList.findIndex((cellHtml) => {
      const link = extractFirstTableListLink(cellHtml, baseUrl);
      return Boolean(link.url);
    });
    if (linkCellIndex < 0) {
      continue;
    }

    const link = extractFirstTableListLink(cellHtmlList[linkCellIndex], baseUrl);
    if (!link.url) {
      continue;
    }

    const followingCells = cellHtmlList.slice(linkCellIndex + 1).map((cellHtml) => htmlToText(cellHtml));
    const symbol = linkCellIndex > 0 ? htmlToText(cellHtmlList[0]) : "";
    const name = link.text || htmlToText(cellHtmlList[linkCellIndex]) || buildTableNameFromUrl(link.url);
    const type = followingCells[0] ?? "";
    const tag = followingCells[1] ?? "";
    const comment = followingCells[2] ?? "";

    if (!name || isTableListActionText(name)) {
      continue;
    }

    entries.push({
      url: link.url,
      name,
      symbol,
      type,
      tag1: type,
      tag,
      tag2: tag,
      comment,
    });
  }
  return entries;
}

function extractHtmlTableCells(rowHtml) {
  const cells = [];
  const cellPattern = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
  for (const match of String(rowHtml ?? "").matchAll(cellPattern)) {
    cells.push(match[1]);
  }
  return cells;
}

function extractFirstTableListLink(cellHtml, baseUrl) {
  return extractTableListCellLink(cellHtml, baseUrl);
}

function extractTableListCellLink(cellHtml, baseUrl) {
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/i;
  const match = String(cellHtml ?? "").match(anchorPattern);
  if (match) {
    const url = resolveTableListCandidateUrl(extractHtmlAttribute(match[1], "href"), baseUrl, { trusted: true });
    return {
      url,
      text: htmlToText(match[2]),
    };
  }

  const text = htmlToText(cellHtml);
  const urlMatch = String(cellHtml ?? "").match(/https?:\/\/[^\s"'<>]+/i) || text.match(/https?:\/\/\S+/i);
  const url = urlMatch ? resolveTableListCandidateUrl(urlMatch[0], baseUrl, { trusted: true }) : "";
  return {
    url,
    text: url ? text.replace(urlMatch?.[0] ?? "", "").trim() : "",
  };
}

function parseTableListScriptObjects(source, baseUrl) {
  const entries = [];
  const objectPattern = /\{[^{}]*(?:table_url|tableUrl|header_url|headerUrl|url)[^{}]*\}/gi;
  for (const match of String(source ?? "").matchAll(objectPattern)) {
    const objectText = match[0];
    const rawUrl =
      extractJsonLikeFieldValue(objectText, "table_url") ||
      extractJsonLikeFieldValue(objectText, "tableUrl") ||
      extractJsonLikeFieldValue(objectText, "header_url") ||
      extractJsonLikeFieldValue(objectText, "headerUrl") ||
      extractJsonLikeFieldValue(objectText, "url");
    const url = resolveTableListCandidateUrl(rawUrl, baseUrl, { trusted: true });
    if (!url) {
      continue;
    }
    entries.push({
      url,
      name:
        extractJsonLikeFieldValue(objectText, "name") ||
        extractJsonLikeFieldValue(objectText, "title") ||
        extractJsonLikeFieldValue(objectText, "symbol") ||
        buildTableNameFromUrl(url),
      symbol: extractJsonLikeFieldValue(objectText, "symbol"),
      type:
        extractJsonLikeFieldValue(objectText, "tag1") ||
        extractJsonLikeFieldValue(objectText, "tag_1") ||
        extractJsonLikeFieldValue(objectText, "tags1") ||
        extractJsonLikeFieldValue(objectText, "type") ||
        extractJsonLikeFieldValue(objectText, "tag"),
      tag1:
        extractJsonLikeFieldValue(objectText, "tag1") ||
        extractJsonLikeFieldValue(objectText, "tag_1") ||
        extractJsonLikeFieldValue(objectText, "tags1") ||
        extractJsonLikeFieldValue(objectText, "type") ||
        extractJsonLikeFieldValue(objectText, "tag"),
      tag:
        extractJsonLikeFieldValue(objectText, "tag2") ||
        extractJsonLikeFieldValue(objectText, "tag_2") ||
        extractJsonLikeFieldValue(objectText, "category") ||
        extractJsonLikeFieldValue(objectText, "group"),
      tag2:
        extractJsonLikeFieldValue(objectText, "tag2") ||
        extractJsonLikeFieldValue(objectText, "tag_2") ||
        extractJsonLikeFieldValue(objectText, "tags2") ||
        extractJsonLikeFieldValue(objectText, "category") ||
        extractJsonLikeFieldValue(objectText, "group"),
      comment: extractJsonLikeFieldValue(objectText, "comment"),
      year: extractJsonLikeFieldValue(objectText, "year"),
    });
  }

  const urlPattern = /(["'`])([^"'`]*(?:table\.html|header\.json)[^"'`]*)\1/gi;
  for (const match of String(source ?? "").matchAll(urlPattern)) {
    const url = resolveTableListCandidateUrl(match[2], baseUrl);
    if (url) {
      entries.push({ url, name: buildTableNameFromUrl(url) });
    }
  }

  return entries;
}

function extractScriptUrls(html, baseUrl) {
  const urls = [];
  const scriptPattern = /<script\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/gi;
  let match;
  while ((match = scriptPattern.exec(String(html ?? "")))) {
    try {
      urls.push(new URL(decodeBasicHtmlEntities(match[2]), baseUrl).toString());
    } catch {
      // Ignore invalid script URLs.
    }
  }
  return [...new Set(urls)];
}

function extractTableListDataUrls(source, baseUrl) {
  const urls = [];
  const stringPattern = /(["'`])([^"'`]+\.(?:json|csv|tsv|txt)(?:\?[^"'`]*)?)\1/gi;
  for (const match of String(source ?? "").matchAll(stringPattern)) {
    const rawUrl = match[2];
    if (!/table|list|bmstable|difficulty|難易度/i.test(rawUrl)) {
      continue;
    }
    try {
      urls.push(new URL(decodeBasicHtmlEntities(rawUrl), baseUrl).toString());
    } catch {
      // Ignore invalid data URLs.
    }
  }
  return [...new Set(urls)];
}

function extractHtmlAttribute(attributesText, attributeName) {
  const pattern = new RegExp(`\\b${escapeRegExp(attributeName)}\\s*=\\s*(["'])(.*?)\\1`, "i");
  const match = String(attributesText ?? "").match(pattern);
  return match ? decodeBasicHtmlEntities(match[2]) : "";
}

function extractJsonLikeFieldValue(source, key) {
  const pattern = new RegExp(`["']?${escapeRegExp(key)}["']?\\s*[:=]\\s*(["'\`])([^"'\`]+)\\1`, "i");
  const match = String(source ?? "").match(pattern);
  return match ? decodeBasicHtmlEntities(match[2]) : "";
}

function resolveTableListCandidateUrl(rawUrl, baseUrl, { trusted = false } = {}) {
  const value = decodeBasicHtmlEntities(normalizeText(rawUrl));
  if (!value || value === "#") {
    return "";
  }

  let parsed;
  try {
    parsed = new URL(value, baseUrl);
  } catch {
    return "";
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return "";
  }

  parsed.hash = "";
  const url = parsed.toString();
  const pathname = parsed.pathname.toLowerCase();
  if (pathname.includes("tablelist")) {
    return "";
  }
  if (trusted && !/\.(?:png|jpe?g|gif|webp|svg|css|js|zip|7z|rar|txt|csv|tsv)$/i.test(pathname)) {
    return url;
  }
  if (/\b(?:table|header)\.(?:html|json)$/.test(pathname) || pathname.endsWith("/table/")) {
    return url;
  }
  return "";
}

function normalizeTableListEntryUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
}

function isTableListActionText(value) {
  return /^(table|tables|main|venue|append|result|ranking|home|mirror|copy url)$/i.test(normalizeText(value));
}

function buildTableNameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const tableIndex = parts.findIndex((part) => part.toLowerCase() === "table");
    if (tableIndex > 0) {
      return parts[tableIndex - 1];
    }
    return parts[parts.length - 2] || parts[parts.length - 1] || parsed.hostname;
  } catch {
    return "難易度表";
  }
}

function buildStableTableListId(url) {
  return crypto.createHash("sha1").update(String(url)).digest("hex").slice(0, 16);
}

async function loadTableFromUrl(sourceUrl) {
  const safeUrl = normalizeRemoteUrl(sourceUrl);

  if (tableCache.has(safeUrl)) {
    return structuredClone(tableCache.get(safeUrl));
  }

  const { headerUrl, header } = await loadTableHeaderFromUrl(sourceUrl);
  const dataUrl = new URL(String(header.data_url), headerUrl).toString();
  const dataResponse = await fetchRemoteText(dataUrl);
  const scoreData = parseJson(dataResponse.text, "score.json");

  if (!Array.isArray(scoreData)) {
    throw new Error("score.json は配列形式である必要があります。");
  }

  const levelOrder = Array.isArray(header.level_order)
    ? header.level_order.map((level) => String(level))
    : [];

  const charts = scoreData.map((item, index) => normalizeChartItem(item, index, header.symbol ?? ""));

  const table = {
    id: crypto.createHash("sha1").update(safeUrl).digest("hex").slice(0, 12),
    name: normalizeText(header.name) || "名称不明の難易度表",
    symbol: normalizeText(header.symbol) || "",
    sourceUrl: safeUrl,
    headerUrl,
    dataUrl,
    levelOrder,
    chartCount: charts.length,
    charts,
  };

  setLimitedCache(tableCache, safeUrl, table);
  return structuredClone(table);
}

async function loadTableHeaderFromUrl(sourceUrl) {
  const safeUrl = normalizeRemoteUrl(sourceUrl);
  const sourceResponse = await fetchRemoteText(safeUrl);
  const sourceText = sourceResponse.text;
  const sourceFinalUrl = sourceResponse.finalUrl;

  let headerUrl = "";
  let headerJsonText = "";

  if (looksLikeJson(sourceText)) {
    const parsed = parseJson(sourceText, "ヘッダーJSON");
    if (Array.isArray(parsed) || typeof parsed !== "object" || parsed === null || !parsed.data_url) {
      throw new Error("URLは table.html または header.json を指定してください。");
    }
    headerUrl = sourceFinalUrl;
    headerJsonText = sourceText;
  } else {
    const headerPath = extractBmstableHeaderUrl(sourceText);
    if (!headerPath) {
      throw new Error("bmstableメタタグを見つけられませんでした。");
    }
    headerUrl = new URL(headerPath, sourceFinalUrl).toString();
    const headerResponse = await fetchRemoteText(headerUrl);
    headerJsonText = headerResponse.text;
  }

  const header = parseJson(headerJsonText, "ヘッダーJSON");
  if (!header || typeof header !== "object" || Array.isArray(header)) {
    throw new Error("ヘッダーJSONの形式が不正です。");
  }

  if (!header.data_url) {
    throw new Error("header.json に data_url がありません。");
  }

  return { safeUrl, headerUrl, header };
}

function normalizeChartItem(item, index, tableSymbol) {
  const md5 = normalizeHex(item?.md5, 32);
  const sha256 = normalizeHex(item?.sha256, 64);
  const hints = extractIrHints(item);
  const title = normalizeText(item?.title) || "タイトル不明";
  const artist = buildArtistText(item);
  const level = normalizeLevel(item?.level);
  const fallbackKey = crypto
    .createHash("sha1")
    .update(JSON.stringify([tableSymbol, index, title, artist, level, md5, sha256]))
    .digest("hex")
    .slice(0, 12);

  return {
    key:
      (md5 && `md5:${md5}`) ||
      (hints.hintedBmsId && `bmsid:${hints.hintedBmsId}`) ||
      (sha256 && `sha256:${sha256}`) ||
      `fallback:${fallbackKey}`,
    index,
    level,
    title,
    artist,
    url: normalizeText(item?.url),
    urlDiff: normalizeText(item?.url_diff),
    md5,
    sha256,
    hintedBmsId: hints.hintedBmsId,
    hintedBmsMd5: hints.hintedBmsMd5,
  };
}

function extractIrHints(item) {
  const serialized = JSON.stringify(item ?? {});
  const bmsIdMatch = serialized.match(/\bbmsid=(\d+)/i);
  const bmsMd5Match = serialized.match(/\bbmsmd5=([0-9a-f]{32})/i);

  return {
    hintedBmsId: bmsIdMatch ? Number.parseInt(bmsIdMatch[1], 10) : null,
    hintedBmsMd5: bmsMd5Match ? bmsMd5Match[1].toLowerCase() : null,
  };
}

async function loadPlayerMyListFromScoreDb(scoreDbPath, songDbPath = "", options = {}) {
  const resolvedPath = path.resolve(scoreDbPath);
  const resolvedSongDbPath = resolveSongDbPathFromScoreDb(resolvedPath, songDbPath);
  const skillAnalyzerFetchMode = normalizeSkillAnalyzerFetchMode(options?.skillAnalyzerFetchMode);
  const requestedScoreDbMode = normalizeScoreDbMode(options?.scoreDbMode);

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    throw new Error("指定された LR2 score.db が見つかりません。");
  }

  const songStat = resolvedSongDbPath ? await fsp.stat(resolvedSongDbPath).catch(() => null) : null;
  const scoreDbFingerprint = buildFileFingerprint(stat);
  const songDbFingerprint = songStat?.isFile() ? buildFileFingerprint(songStat) : "-";
  const cacheKey = [
    `scoredb:${resolvedPath}`,
    scoreDbFingerprint,
    `songdb:${resolvedSongDbPath || "-"}`,
    songDbFingerprint,
    `mode:${requestedScoreDbMode}`,
    `skill:${skillAnalyzerFetchMode}`,
  ].join("|");

  if (playerMyListCache.has(cacheKey)) {
    return playerMyListCache.get(cacheKey);
  }

  let database;
  try {
    database = new DatabaseSync(resolvedPath, { readonly: true });
    const playerRow = database.prepare("SELECT * FROM player LIMIT 1").get();

    if (!playerRow) {
      throw new Error("score.db の player テーブルを読み取れませんでした。");
    }

    const localPlayerId = normalizeText(playerRow.id) || "local";
    const scoreDbMode = resolveScoreDbMode(requestedScoreDbMode, resolvedPath);
    const dbProfile = readPlayerProfileFromScoreDb(database, playerRow, scoreDbMode);
    const localPlayerName =
      dbProfile?.name || sanitizeLocalPlayerName(playerRow.name) || "";
    const localGradeDp = formatLocalGrade(playerRow.grade_14);
    const songCatalog = await loadSongDbCatalogData(resolvedSongDbPath);
    let scoreRows = [];
    try {
      scoreRows = database
        .prepare("SELECT hash, scorehash, clear, playcount, perfect, great, totalnotes, bad, poor, minbp FROM score")
        .all();
    } catch {
      try {
        scoreRows = database
          .prepare("SELECT hash, scorehash, clear, playcount, perfect, great, totalnotes, bad, poor FROM score")
          .all();
      } catch {
        try {
          scoreRows = database
            .prepare("SELECT hash, scorehash, clear, playcount, perfect, great, totalnotes FROM score")
            .all();
        } catch {
          scoreRows = database
            .prepare("SELECT hash, clear, playcount, perfect, great, totalnotes FROM score")
            .all();
        }
      }
    }
    const byHash = new Map();
    for (const row of scoreRows) {
      const md5 = normalizeHex(row.hash, 32);
      if (!md5 || byHash.has(md5)) {
        continue;
      }
      const scoreInfo = buildLocalScoreInfo(row);

      const entry = {
        md5,
        title: songCatalog.songInfoByHash.get(md5)?.title ?? "",
        artist: songCatalog.songInfoByHash.get(md5)?.artist ?? "",
        lampStatus: normalizeLocalScoreLamp(row.clear, row.playcount),
        playCount: Number.isFinite(row.playcount) ? row.playcount : null,
        exScore: scoreInfo.exScore,
        maxExScore: scoreInfo.maxExScore,
        scoreRate: scoreInfo.scoreRate,
        maxOffset: scoreInfo.maxOffset,
        badCount: scoreInfo.badCount,
        poorCount: scoreInfo.poorCount,
        missCount: scoreInfo.missCount,
      };
      byHash.set(md5, entry);
    }

    const fallbackGradeSp = formatLocalGrade(playerRow.grade_7);
    const localSkillAnalyzer = await loadLocalSkillAnalyzerProgress(resolvedSongDbPath, scoreRows);
    const inferredGradeInfo = await inferLocalGradeInfoFromSongDbGrades(resolvedSongDbPath, scoreRows);
    const inferredGradeSp = inferredGradeInfo?.grade || fallbackGradeSp;
    const stellaverseIrProfile =
      scoreDbMode === "stellaverse" && dbProfile?.id ? await fetchStellaverseIrPlayerProfile(dbProfile.id) : null;
    const skillAnalyzer = mergeSkillAnalyzerProgress(null, localSkillAnalyzer, "both");
    const profileName = stellaverseIrProfile?.name || localPlayerName;
    const gradeSp = inferredGradeSp || "";
    const gradeDp = localGradeDp || "";
    const overjoyTripleCrown = await hasLocalOverjoyTripleCrown(resolvedSongDbPath, scoreRows);

    const result = {
      playerId: localPlayerId,
      entries: [...byHash.values()],
      byBmsId: new Map(),
      byHash,
      localSongHashes: songCatalog.localSongHashes,
      hasLocalSongCatalog: songCatalog.hasSongCatalog,
      sourceType: "local-score-db",
      scoreDbMode,
      localDbPath: resolvedPath,
      localSongDbPath: songCatalog.path,
      localProfile: {
        playerId: localPlayerId,
        scoreDbMode,
        name: profileName,
        lr2Id: dbProfile?.id || normalizeText(playerRow.irid),
        grade: combineLocalGrades(gradeSp, gradeDp),
        gradeSp,
        gradeDp,
        skillAnalyzer,
        stellaSkill4th: skillAnalyzer?.st ?? null,
        overjoyTripleCrown,
        forceDanCandidate: inferredGradeInfo ? buildForceDanCandidateFromGradeInfo(inferredGradeInfo) : null,
        hitTotals: buildLocalHitTotalsFromPlayerRow(playerRow),
        playTimeTotal: buildLocalPlayTimeTotalFromPlayerRow(playerRow),
      },
    };

    setLimitedCache(playerMyListCache, cacheKey, result);
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "score.db の読み込みに失敗しました。");
  } finally {
    database?.close();
  }
}

function enrichTable(table, _lookupMap, playerMyList, rivalData = null) {
  const charts = table.charts.map((chart) => {
    const playerEntry = findPlayerEntry(playerMyList, chart);
    const chartMd5 = normalizeHex(chart.md5 || chart.hintedBmsMd5, 32);
    const localSongExists = getLocalSongExists(playerMyList, chart);
    const base = {
      ...chart,
      bmsId: null,
      playCount: null,
      exScore: null,
      maxExScore: null,
      scoreRate: null,
      maxOffset: null,
      badCount: null,
      poorCount: null,
      missCount: null,
      statusDetail: "",
      lampStatus: "UNMATCHED",
      localSongExists,
      rivalComparison: null,
    };

    if (localSongExists === false) {
      return {
        ...base,
        lampStatus: "NO SONG",
        statusDetail: "No local song.db song entry",
      };
    }

    if (playerEntry) {
      const enriched = {
        ...base,
        lampStatus: playerEntry.lampStatus,
        playCount: playerEntry.playCount ?? null,
        exScore: playerEntry.exScore ?? null,
        maxExScore: playerEntry.maxExScore ?? null,
        scoreRate: playerEntry.scoreRate ?? null,
        maxOffset: playerEntry.maxOffset ?? null,
        badCount: playerEntry.badCount ?? null,
        poorCount: playerEntry.poorCount ?? null,
        missCount: playerEntry.missCount ?? null,
        statusDetail: "",
      };
      return {
        ...enriched,
        rivalComparison: buildRivalComparison(chart, enriched, rivalData),
      };
    }

    if (!chartMd5 && chart.sha256) {
      return {
        ...base,
        lampStatus: "UNSUPPORTED",
        statusDetail: "sha256 only chart cannot be matched from local score.db",
      };
    }

    const noPlayEntry = {
      ...base,
      lampStatus: "NO PLAY",
      statusDetail: "No local score.db entry",
    };
    return {
      ...noPlayEntry,
      rivalComparison: buildRivalComparison(chart, noPlayEntry, rivalData),
    };
  });

  const summary = countLampStatuses(charts);
  const levelSummaries = buildLevelSummaries(charts, table.levelOrder);

  return {
    ...table,
    charts,
    summary,
    levelSummaries,
    stats: {
      totalCharts: charts.length,
      clearCount: countClearCharts(charts),
      playedCount: countPlayedCharts(charts),
      matchableCount: countMatchableCharts(charts),
      clearRate: calculateClearRate(charts),
      playedRate: calculatePlayedRate(charts),
    },
  };
}

function findPlayerEntry(playerMyList, chart) {
  const md5 = normalizeHex(chart.md5 || chart.hintedBmsMd5, 32);
  if (md5 && playerMyList.byHash?.has(md5)) {
    return playerMyList.byHash.get(md5);
  }

  return null;
}

function getLocalSongExists(playerMyList, chart) {
  if (!playerMyList?.hasLocalSongCatalog || !(playerMyList.localSongHashes instanceof Set)) {
    return null;
  }

  const md5 = normalizeHex(chart?.md5 || chart?.hintedBmsMd5, 32);
  if (!md5) {
    return null;
  }

  return playerMyList.localSongHashes.has(md5);
}

function buildRivalComparison(chart, selfChart, rivalData) {
  const md5 = normalizeHex(chart?.md5 || chart?.hintedBmsMd5, 32);
  if (!md5 || !rivalData?.byHash?.has(md5)) {
    return null;
  }

  const rivals = rivalData.byHash.get(md5) ?? [];
  if (!rivals.length) {
    return null;
  }

  const bestScore = [...rivals].sort(compareRivalScoresForBest)[0] ?? null;
  if (!bestScore) {
    return null;
  }

  const selfExScore = Number.isFinite(Number(selfChart?.exScore)) ? Number(selfChart.exScore) : null;
  const selfLamp = selfChart?.lampStatus || "NO PLAY";
  const scoreDiff = selfExScore != null && bestScore.exScore != null ? selfExScore - bestScore.exScore : null;
  const lampDiff = compareLampRankForServer(selfLamp, bestScore.lampStatus);

  return {
    rivalCount: rivals.length,
    scores: [...rivals].sort(compareRivalScoresForBest),
    bestScore,
    selfExScore,
    selfLamp,
    scoreDiff,
    scoreResult: scoreDiff == null ? "unknown" : scoreDiff > 0 ? "win" : scoreDiff < 0 ? "lose" : "draw",
    lampResult: lampDiff == null ? "unknown" : lampDiff < 0 ? "win" : lampDiff > 0 ? "lose" : "draw",
  };
}

function compareRivalScoresForBest(left, right) {
  const leftEx = Number.isFinite(Number(left?.exScore)) ? Number(left.exScore) : -1;
  const rightEx = Number.isFinite(Number(right?.exScore)) ? Number(right.exScore) : -1;
  if (leftEx !== rightEx) {
    return rightEx - leftEx;
  }
  return compareLampRankForServer(left?.lampStatus, right?.lampStatus) ?? 0;
}

function compareLampRankForServer(left, right) {
  const leftIndex = LAMP_ORDER.indexOf(left);
  const rightIndex = LAMP_ORDER.indexOf(right);
  const normalizedLeft = leftIndex === -1 ? LAMP_ORDER.length : leftIndex;
  const normalizedRight = rightIndex === -1 ? LAMP_ORDER.length : rightIndex;
  return normalizedLeft - normalizedRight;
}

function loadForceChartConstants() {
  if (forceChartConstantsCache) {
    return forceChartConstantsCache;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(FORCE_RATING_CONSTANTS_PATH, "utf8"));
    const charts = Array.isArray(payload?.charts) ? payload.charts : [];
    forceChartConstantsCache = charts
      .map((chart) => ({
        md5: normalizeHex(chart?.md5, 32),
        chartConstant: Number(chart?.chartConstant),
        source: normalizeText(chart?.source),
        sourceTable: normalizeText(chart?.sourceTable),
        difficulty: normalizeText(chart?.difficulty),
      }))
      .filter((chart) => chart.md5 && Number.isFinite(chart.chartConstant) && chart.chartConstant >= 0);
  } catch (error) {
    console.warn(
      `FORCE rating constants could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
    );
    forceChartConstantsCache = [];
  }

  return forceChartConstantsCache;
}

function buildForceRating(playerMyList) {
  const constants = loadForceChartConstants();
  if (!constants.length) {
    return {
      available: false,
      rating: 0,
      title: "SLATE",
      tier: "slate",
      best50Total: 0,
      top50Count: 0,
      playedCharts: 0,
      constantCharts: 0,
      best20Average: 0,
      best50Average: 0,
      broadAverage: 0,
      broadCount: 0,
      danCandidate: null,
      cutoff: 0,
      topCharts: [],
    };
  }

  const candidates = [];
  for (const chart of constants) {
    const score = playerMyList?.byHash?.get(chart.md5);
    const lampCoefficient = FORCE_LAMP_COEFFICIENTS.get(score?.lampStatus);
    const exScore = Number(score?.exScore);
    const maxExScore = Number(score?.maxExScore);
    if (!lampCoefficient || !Number.isFinite(exScore) || !Number.isFinite(maxExScore) || maxExScore <= 0) {
      continue;
    }

    const exScoreRatio = Math.min(Math.max(exScore / maxExScore, 0), 1);
    const scoreCoefficient = calculateForceScoreCoefficient(exScoreRatio);
    const force = chart.chartConstant * scoreCoefficient * lampCoefficient;
    if (!Number.isFinite(force)) {
      continue;
    }

    candidates.push({
      candidateType: "chart",
      force,
      chartConstant: chart.chartConstant,
      md5: chart.md5,
      source: chart.source,
      sourceTable: chart.sourceTable,
      difficulty: chart.difficulty,
      title: normalizeText(score?.title),
      artist: normalizeText(score?.artist),
      lampStatus: score.lampStatus,
      exScore,
      maxExScore,
      scoreRate: exScoreRatio * 100,
      scoreCoefficient,
      lampCoefficient,
    });
  }

  candidates.sort(
    (left, right) =>
      right.force - left.force ||
      right.chartConstant - left.chartConstant ||
      left.md5.localeCompare(right.md5),
  );
  const best50 = candidates.slice(0, 50);
  const danCandidate = playerMyList?.localProfile?.forceDanCandidate || null;
  const broadCandidates = danCandidate ? [...best50, danCandidate] : best50;
  broadCandidates.sort(
    (left, right) =>
      right.force - left.force ||
      right.chartConstant - left.chartConstant ||
      String(left.md5 || "").localeCompare(String(right.md5 || "")),
  );
  const best50Total = best50.reduce((sum, chart) => sum + chart.force, 0);
  const best50Average = best50Total / 50;
  const broadTotal = broadCandidates.reduce((sum, chart) => sum + chart.force, 0);
  const broadDenominator = danCandidate ? 51 : 50;
  const broadAverage = broadTotal / broadDenominator;
  const best20 = broadCandidates.slice(0, 20);
  const best20Total = best20.reduce((sum, chart) => sum + chart.force, 0);
  const best20Average = best20.length >= 20 ? best20Total / 20 : broadAverage;
  const rating = clampForceRating(broadAverage);
  const ratingTier = getForceRatingTier(rating);

  return {
    available: true,
    rating,
    title: ratingTier.title,
    tier: ratingTier.tier,
    best50Total,
    top50Count: best50.length,
    broadCount: broadCandidates.length,
    playedCharts: candidates.length,
    constantCharts: constants.length,
    best20Average,
    best50Average,
    broadAverage,
    danCandidate,
    cutoff: broadCandidates.at(-1)?.force ?? 0,
    topCharts: broadCandidates.map((chart, index) => ({
      rank: index + 1,
      ...chart,
    })),
  };
}

function calculateForceScoreCoefficient(scoreRatio) {
  const clampedRatio = Math.min(Math.max(Number(scoreRatio), 0), 1);
  if (clampedRatio < FORCE_SCORE_AAA_THRESHOLD) {
    return Math.round(clampedRatio * 1000) / 1000;
  }
  if (clampedRatio < FORCE_SCORE_FULL_BONUS_THRESHOLD) {
    const aaaRange = FORCE_SCORE_FULL_BONUS_THRESHOLD - FORCE_SCORE_AAA_THRESHOLD;
    const aaaProgress = aaaRange > 0 ? (clampedRatio - FORCE_SCORE_AAA_THRESHOLD) / aaaRange : 1;
    const coefficient =
      FORCE_SCORE_AAA_BASE + (FORCE_SCORE_FULL_BONUS_BASE - FORCE_SCORE_AAA_BASE) * aaaProgress;
    return Math.round(Math.min(Math.max(coefficient, FORCE_SCORE_AAA_BASE), FORCE_SCORE_FULL_BONUS_BASE) * 1000) / 1000;
  }

  const bonusRange = 1 - FORCE_SCORE_FULL_BONUS_THRESHOLD;
  const bonusProgress = bonusRange > 0 ? (clampedRatio - FORCE_SCORE_FULL_BONUS_THRESHOLD) / bonusRange : 1;
  const coefficient = FORCE_SCORE_FULL_BONUS_BASE + (1 - FORCE_SCORE_FULL_BONUS_BASE) * bonusProgress;
  return Math.round(Math.min(Math.max(coefficient, FORCE_SCORE_FULL_BONUS_BASE), 1) * 1000) / 1000;
}

function clampForceRating(ratingValue) {
  const rating = Number(ratingValue);
  if (!Number.isFinite(rating)) {
    return 0;
  }
  return Math.max(0, Math.min(rating, FORCE_RATING_MAX));
}

function getForceRatingTier(ratingValue) {
  const rating = Number.isFinite(Number(ratingValue)) ? Number(ratingValue) : 0;
  if (rating >= 25) return { title: "EVENT HORIZONE", tier: "event-horizone" };
  if (rating >= 24) return { title: "SINGULARITY", tier: "singularity" };
  if (rating >= 23) return { title: "ASTRAL IV", tier: "astral-4" };
  if (rating >= 22) return { title: "ASTRAL III", tier: "astral-3" };
  if (rating >= 21) return { title: "ASTRAL II", tier: "astral-2" };
  if (rating >= 20) return { title: "ASTRAL I", tier: "astral-1" };
  if (rating >= 19) return { title: "OBSIDIAN", tier: "obsidian" };
  if (rating >= 18) return { title: "AURUM", tier: "aurum" };
  if (rating >= 17) return { title: "ARGENT", tier: "argent" };
  if (rating >= 16) return { title: "CRIMSON", tier: "crimson" };
  if (rating >= 15) return { title: "AMETHYST", tier: "amethyst" };
  if (rating >= 14) return { title: "JADE", tier: "jade" };
  if (rating >= 12) return { title: "AMBER", tier: "amber" };
  if (rating >= 10) return { title: "AZURE", tier: "azure" };
  return { title: "SLATE", tier: "slate" };
}

function buildOverallSummary(tables) {
  const uniqueCharts = new Map();
  let tableEntryCount = 0;

  for (const table of tables) {
    tableEntryCount += table.charts.length;
    for (const chart of table.charts) {
      if (!uniqueCharts.has(chart.key)) {
        uniqueCharts.set(chart.key, chart);
      }
    }
  }

  const charts = [...uniqueCharts.values()];

  return {
    tableCount: tables.length,
    tableEntryCount,
    uniqueChartCount: charts.length,
    summary: countLampStatuses(charts),
    clearRate: calculateClearRate(charts),
    playedRate: calculatePlayedRate(charts),
    clearCount: countClearCharts(charts),
    playedCount: countPlayedCharts(charts),
    matchableCount: countMatchableCharts(charts),
  };
}

function buildLevelSummaries(charts, levelOrder) {
  const grouped = new Map();

  for (const chart of charts) {
    if (!grouped.has(chart.level)) {
      grouped.set(chart.level, []);
    }
    grouped.get(chart.level).push(chart);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => compareLevels(left, right, levelOrder))
    .map(([level, levelCharts]) => ({
      level,
      totalCharts: levelCharts.length,
      summary: countLampStatuses(levelCharts),
      clearRate: calculateClearRate(levelCharts),
      playedRate: calculatePlayedRate(levelCharts),
    }));
}

function countLampStatuses(charts) {
  const counts = Object.fromEntries(LAMP_ORDER.map((lamp) => [lamp, 0]));
  for (const chart of charts) {
    counts[chart.lampStatus] = (counts[chart.lampStatus] ?? 0) + 1;
  }
  return counts;
}

function countClearCharts(charts) {
  return charts.filter((chart) =>
    ["FULL COMBO", "HARD CLEAR", "CLEAR", "EASY CLEAR"].includes(chart.lampStatus),
  ).length;
}

function countPlayedCharts(charts) {
  return charts.filter((chart) =>
    ["FULL COMBO", "HARD CLEAR", "CLEAR", "EASY CLEAR", "FAILED"].includes(chart.lampStatus),
  ).length;
}

function countMatchableCharts(charts) {
  return charts.filter((chart) => !["UNMATCHED", "UNSUPPORTED"].includes(chart.lampStatus)).length;
}

function calculateClearRate(charts) {
  const matchableCount = countMatchableCharts(charts);
  if (!matchableCount) {
    return null;
  }
  return roundPercent((countClearCharts(charts) / matchableCount) * 100);
}

function calculatePlayedRate(charts) {
  const matchableCount = countMatchableCharts(charts);
  if (!matchableCount) {
    return null;
  }
  return roundPercent((countPlayedCharts(charts) / matchableCount) * 100);
}

function dedupeCharts(charts) {
  const map = new Map();
  for (const chart of charts) {
    if (!map.has(chart.key)) {
      map.set(chart.key, chart);
    }
  }
  return [...map.values()];
}

function setLimitedCache(cache, key, value) {
  if (cache.has(key)) {
    cache.delete(key);
  }
  while (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey == null) {
      break;
    }
    cache.delete(oldestKey);
  }
  cache.set(key, value);
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchRemoteText(rawUrl, options = {}) {
  const safeUrl = normalizeRemoteUrl(rawUrl);
  const useCache = options.useCache !== false;

  if (useCache && responseCache.has(safeUrl)) {
    return responseCache.get(safeUrl);
  }

  const response = await fetchRemoteWithValidatedRedirects(safeUrl);

  if (!response.ok) {
    throw new Error(`URL取得に失敗しました: ${response.status} ${response.statusText}`);
  }

  const bytes = response.bytes;
  const contentType = getHeaderValue(response.headers, "content-type");
  const text = decodeRemoteText(bytes, contentType);
  const result = {
    contentType,
    finalUrl: response.url,
    text,
  };

  if (useCache) {
    setLimitedCache(responseCache, safeUrl, result);
  }
  return result;
}

function normalizeRemoteUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    throw new Error(`URLが不正です: ${rawUrl}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("http / https のURLのみ読み込めます。");
  }

  const hostname = parsed.hostname.toLowerCase();
  const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

  if (blockedHosts.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("ローカルURLは読み込めません。");
  }

  return parsed.toString();
}

async function resolvePublicRemoteTarget(rawUrl) {
  const normalizedUrl = normalizeRemoteUrl(rawUrl);
  const parsed = new URL(normalizedUrl);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!hostname) {
    throw new Error("URLのホスト名が空です。");
  }
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("ローカルネットワーク宛てのURLは読み込めません。");
  }

  const directIpVersion = net.isIP(hostname);
  const addresses = directIpVersion
    ? [{ address: hostname, family: directIpVersion }]
    : await dns.lookup(hostname, { all: true, verbatim: true }).catch(() => []);

  if (!addresses.length) {
    throw new Error(`ホスト名を解決できませんでした: ${parsed.hostname}`);
  }

  for (const entry of addresses) {
    if (isBlockedIpAddress(entry.address)) {
      throw new Error("ローカルまたはプライベートネットワーク宛てのURLは読み込めません。");
    }
  }

  const selected = addresses[0];
  return {
    url: normalizedUrl,
    parsed,
    address: selected.address,
    family: Number(selected.family) || net.isIP(selected.address),
  };
}

function isBlockedIpAddress(address) {
  const value = String(address ?? "").trim().toLowerCase();
  const ipVersion = net.isIP(value);
  if (ipVersion === 4) {
    return isBlockedIpv4(value);
  }
  if (ipVersion === 6) {
    return isBlockedIpv6(value);
  }
  return true;
}

function isBlockedIpv4(address) {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedIpv6(address) {
  const value = address.toLowerCase();
  if (value === "::1" || value === "::" || value.startsWith("fe80:") || value.startsWith("fc") || value.startsWith("fd")) {
    return true;
  }

  const mappedIpv4 = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) {
    return isBlockedIpv4(mappedIpv4[1]);
  }

  return false;
}

async function fetchRemoteWithValidatedRedirects(initialUrl) {
  let currentUrl = initialUrl;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const target = await resolvePublicRemoteTarget(currentUrl);
    currentUrl = target.url;
    const response = await fetchRemoteViaResolvedAddress(target);

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = getHeaderValue(response.headers, "location");
    if (!location) {
      return response;
    }
    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error("リダイレクト回数が多すぎます。");
}

function fetchRemoteViaResolvedAddress(target) {
  return new Promise((resolve, reject) => {
    const parsed = target.parsed;
    const isHttps = parsed.protocol === "https:";
    const defaultPort = isHttps ? 443 : 80;
    const port = parsed.port ? Number.parseInt(parsed.port, 10) : defaultPort;
    const requestOptions = {
      hostname: target.address,
      family: target.family,
      port,
      path: `${parsed.pathname}${parsed.search}`,
      method: "GET",
      headers: {
        Host: parsed.host,
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "User-Agent": USER_AGENT,
      },
      timeout: 20_000,
    };

    if (isHttps) {
      requestOptions.servername = parsed.hostname;
      requestOptions.rejectUnauthorized = true;
    }

    const client = isHttps ? https : http;
    const request = client.request(requestOptions, (response) => {
      const headers = normalizeResponseHeaders(response.headers);
      const contentLength = Number.parseInt(getHeaderValue(headers, "content-length"), 10);
      if (Number.isFinite(contentLength) && contentLength > MAX_REMOTE_RESPONSE_BYTES) {
        response.destroy();
        reject(new Error("取得先のデータサイズが大きすぎます。"));
        return;
      }

      const chunks = [];
      let totalBytes = 0;
      response.on("data", (chunk) => {
        const buffer = Buffer.from(chunk);
        totalBytes += buffer.length;
        if (totalBytes > MAX_REMOTE_RESPONSE_BYTES) {
          request.destroy(new Error("取得先のデータサイズが大きすぎます。"));
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode || 0,
          statusText: response.statusMessage || "",
          headers,
          url: target.url,
          bytes: Buffer.concat(chunks),
        });
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("URL取得がタイムアウトしました。"));
    });
    request.on("error", reject);
    request.end();
  });
}

function normalizeResponseHeaders(headers) {
  const normalized = new Map();
  for (const [name, value] of Object.entries(headers || {})) {
    normalized.set(
      name.toLowerCase(),
      Array.isArray(value) ? value.join(", ") : String(value ?? ""),
    );
  }
  return normalized;
}

function getHeaderValue(headers, name) {
  if (!headers) {
    return "";
  }
  if (typeof headers.get === "function") {
    return String(headers.get(name) ?? "");
  }
  return String(headers[name.toLowerCase()] ?? headers[name] ?? "");
}

function decodeRemoteText(bytes, contentType) {
  const headerCharset = extractCharsetFromContentType(contentType);
  const metaCharset = extractCharsetFromHtml(bytes);
  const encoding = normalizeEncodingName(headerCharset || metaCharset || "utf-8");
  return new TextDecoder(encoding).decode(bytes);
}

function extractCharsetFromContentType(contentType) {
  const match = contentType.match(/charset=([^;]+)/i);
  return match ? match[1].trim() : "";
}

function extractCharsetFromHtml(bytes) {
  const snippet = bytes.subarray(0, 2048).toString("latin1");
  const directCharset = snippet.match(/<meta[^>]+charset=["']?\s*([^"'>\s/]+)/i);
  if (directCharset) {
    return directCharset[1];
  }
  const httpEquivCharset = snippet.match(/<meta[^>]+content=["'][^"']*charset=([^"'>; ]+)/i);
  return httpEquivCharset ? httpEquivCharset[1] : "";
}

function normalizeEncodingName(name) {
  const normalized = String(name).trim().toLowerCase();

  if (!normalized) {
    return "utf-8";
  }

  if (["shift-jis", "shift_jis", "sjis", "windows-31j", "cp932", "ms932"].includes(normalized)) {
    return "shift_jis";
  }

  if (normalized === "utf8") {
    return "utf-8";
  }

  return normalized;
}

function extractBmstableHeaderUrl(html) {
  for (const metaTag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attributes = parseHtmlAttributes(metaTag);
    if ((attributes.name ?? "").toLowerCase() === "bmstable" && attributes.content) {
      return htmlToText(attributes.content);
    }
  }
  return "";
}

function parseHtmlAttributes(tagText) {
  const attributes = {};
  const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  for (const match of tagText.matchAll(attributePattern)) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    attributes[key] = value;
  }

  return attributes;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} のJSON解析に失敗しました。`);
  }
}

function looksLikeJson(text) {
  const trimmed = String(text).trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function htmlToText(value) {
  return normalizeText(
    String(value ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&"),
  );
}

function normalizeText(value) {
  const text = String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function normalizeLocalPath(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "");
}

function sanitizeLocalPlayerName(value) {
  const text = normalizeText(value);
  if (!text) {
    return "";
  }

  if (/^[a-z]:[\\/].+\.db$/i.test(text) || /(^|[\\/])[^\\/]+\.db$/i.test(text)) {
    return "";
  }

  return text;
}

function resolveSongDbPathFromScoreDb(scoreDbPath, songDbPath) {
  const explicitPath = normalizeLocalPath(songDbPath);
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  const scorePath = normalizeLocalPath(scoreDbPath);
  if (!scorePath) {
    return "";
  }

  const databaseDir = path.dirname(path.dirname(path.resolve(scorePath)));
  return path.join(databaseDir, "song.db");
}

async function loadSongDbCatalogData(songDbPath) {
  const resolvedPath = normalizeLocalPath(songDbPath);
  if (!resolvedPath) {
    return {
      path: "",
      localSongHashes: new Set(),
      songInfoByHash: new Map(),
      hasSongCatalog: false,
    };
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return {
      path: "",
      localSongHashes: new Set(),
      songInfoByHash: new Map(),
      hasSongCatalog: false,
    };
  }

  const cacheKey = `${resolvedPath}|${buildFileFingerprint(stat)}`;
  if (songDbCatalogCache.has(cacheKey)) {
    return songDbCatalogCache.get(cacheKey);
  }

  let songDatabase;
  try {
    songDatabase = new DatabaseSync(resolvedPath, { readonly: true });
    const localSongHashes = new Set();
    const songInfoByHash = new Map();

    let hasSongCatalog = false;
    try {
      const songRows = songDatabase.prepare("SELECT hash, title, subtitle, artist FROM song").all();
      hasSongCatalog = true;

      for (const row of songRows) {
        const md5 = normalizeHex(row.hash, 32);
        if (md5) {
          localSongHashes.add(md5);
          if (!songInfoByHash.has(md5)) {
            const subtitle = normalizeText(row.subtitle);
            songInfoByHash.set(md5, {
              title: `${normalizeText(row.title)}${subtitle}`.trim(),
              artist: normalizeText(row.artist),
            });
          }
        }
      }
    } catch {
      // Without the song table we cannot safely mark charts as missing.
    }

    const result = {
      path: resolvedPath,
      localSongHashes,
      songInfoByHash,
      hasSongCatalog,
    };

    setLimitedCache(songDbCatalogCache, cacheKey, result);
    return result;
  } catch {
    return {
      path: "",
      localSongHashes: new Set(),
      songInfoByHash: new Map(),
      hasSongCatalog: false,
    };
  } finally {
    songDatabase?.close();
  }
}

function buildFileFingerprint(stat) {
  const size = Number.isFinite(stat?.size) ? stat.size : 0;
  const mtimeMs = Number.isFinite(stat?.mtimeMs) ? stat.mtimeMs : 0;
  return `${size}:${mtimeMs}`;
}

async function loadRivalFolderData(rivalFolderPath) {
  const resolvedPath = normalizeLocalPath(rivalFolderPath);
  if (!resolvedPath) {
    return { path: "", rivals: [], byHash: new Map() };
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isDirectory()) {
    return { path: "", rivals: [], byHash: new Map() };
  }

  const files = await fsp.readdir(resolvedPath).catch(() => []);
  const dbFiles = files.filter((file) => /\.db$/i.test(file));
  const rivals = [];
  const byHash = new Map();

  for (const file of dbFiles) {
    const dbPath = path.join(resolvedPath, file);
    const id = path.basename(file, path.extname(file));
    const rival = await loadRivalDb(dbPath, {
      id,
      name: await loadRivalName(resolvedPath, id),
    });
    if (!rival) {
      continue;
    }

    rivals.push(rival);
    for (const entry of rival.entries) {
      if (!byHash.has(entry.md5)) {
        byHash.set(entry.md5, []);
      }
      byHash.get(entry.md5).push({
        id: rival.id,
        name: rival.name,
        lampStatus: entry.lampStatus,
        exScore: entry.exScore,
        maxExScore: entry.maxExScore,
        scoreRate: entry.scoreRate,
        missCount: entry.missCount,
      });
    }
  }

  return { path: resolvedPath, rivals, byHash };
}

async function loadRivalDb(dbPath, rivalInfo) {
  let database;
  try {
    database = new DatabaseSync(dbPath, { readonly: true });
    const rows = database
      .prepare(
        "SELECT hash, r_clear, r_totalnotes, r_perfect, r_great, r_bad, r_poor, r_minbp FROM rival",
      )
      .all();
    const entries = [];

    for (const row of rows) {
      const md5 = normalizeHex(row.hash, 32);
      if (!md5) {
        continue;
      }
      const scoreInfo = buildRivalScoreInfo(row);
      entries.push({
        md5,
        lampStatus: normalizeLocalScoreLamp(row.r_clear, 1),
        ...scoreInfo,
      });
    }

    return {
      id: rivalInfo.id,
      name: rivalInfo.name || rivalInfo.id,
      dbPath,
      scoreCount: entries.length,
      entries,
    };
  } catch {
    return null;
  } finally {
    database?.close();
  }
}

async function loadRivalName(rivalFolderPath, id) {
  const folderPath = path.join(rivalFolderPath, `${id}.lr2folder`);
  const buffer = await fsp.readFile(folderPath).catch(() => null);
  if (!buffer) {
    return id;
  }

  const text = decodeShiftJis(buffer);
  const titleLine = text
    .split(/\r?\n/)
    .find((line) => line.trim().toUpperCase().startsWith("#TITLE "));
  return normalizeText(titleLine?.replace(/^#TITLE\s+/i, "")) || id;
}

function decodeShiftJis(buffer) {
  try {
    return new TextDecoder("shift_jis").decode(buffer).replace(/\0/g, "");
  } catch {
    return buffer.toString("utf8").replace(/\0/g, "");
  }
}

function buildRivalScoreInfo(row) {
  const perfect = toNonNegativeInteger(row?.r_perfect);
  const great = toNonNegativeInteger(row?.r_great);
  const totalNotes = toNonNegativeInteger(row?.r_totalnotes);
  const badCount = toNonNegativeInteger(row?.r_bad);
  const poorCount = toNonNegativeInteger(row?.r_poor);
  const minBp = toNonNegativeInteger(row?.r_minbp);
  const bpFromBadPoor = badCount != null && poorCount != null ? badCount + poorCount : null;
  const missCount = minBp ?? bpFromBadPoor;

  if (perfect == null || great == null || totalNotes == null || totalNotes <= 0) {
    return {
      exScore: null,
      maxExScore: null,
      scoreRate: null,
      missCount,
    };
  }

  const exScore = perfect * 2 + great;
  const maxExScore = totalNotes * 2;
  return {
    exScore,
    maxExScore,
    scoreRate: maxExScore > 0 ? roundPercent((exScore / maxExScore) * 100) : null,
    missCount,
  };
}

async function loadLocalSkillAnalyzerProgress(songDbPath, scoreRows) {
  const resolvedPath = normalizeLocalPath(songDbPath);
  if (!resolvedPath) {
    return null;
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return null;
  }

  const scoreByHash = new Map();
  for (const row of Array.isArray(scoreRows) ? scoreRows : []) {
    for (const hash of getLocalScoreLookupHashes(row)) {
      if (!scoreByHash.has(hash)) {
        scoreByHash.set(hash, row);
      }
    }
  }

  let songDatabase;
  try {
    songDatabase = new DatabaseSync(resolvedPath, { readonly: true });
    const gradeRows = songDatabase.prepare("SELECT title, hash FROM grade").all();
    const aggregates = {
      st: { totalCount: 0, playedCount: 0, clearedCount: 0, highestCleared: null },
      sl: { totalCount: 0, playedCount: 0, clearedCount: 0, highestCleared: null },
    };

    for (const row of gradeRows) {
      const parsed = parseSkillAnalyzerLevel(row?.title);
      if (!parsed) {
        continue;
      }

      const aggregate = aggregates[parsed.kind];
      if (!aggregate) {
        continue;
      }

      aggregate.totalCount += 1;
      const hash = normalizeText(row?.hash).toLowerCase();
      if (!hash) {
        continue;
      }

      const courseState = getLocalCourseScoreState(scoreByHash, hash, LOCAL_SKILL_ANALYZER_PASS_CLEAR_MIN);
      if (!courseState.played) {
        continue;
      }

      aggregate.playedCount += 1;

      if (courseState.passed) {
        aggregate.clearedCount += 1;
        if (aggregate.highestCleared == null || parsed.level > aggregate.highestCleared) {
          aggregate.highestCleared = parsed.level;
        }
      }
    }

    const st = buildSkillAnalyzerSummaryEntry(aggregates.st, "st", "Stella Skill Simulator 4th");
    const sl = buildSkillAnalyzerSummaryEntry(aggregates.sl, "sl", "Satellite Skill Analyzer 2nd");
    if (!st && !sl) {
      return null;
    }

    return {
      st,
      sl,
    };
  } catch {
    return null;
  } finally {
    songDatabase?.close();
  }
}

async function inferLocalGradeFromSongDbGrades(songDbPath, scoreRows) {
  const gradeInfo = await inferLocalGradeInfoFromSongDbGrades(songDbPath, scoreRows);
  return gradeInfo?.grade || "";
}

async function inferLocalGradeInfoFromSongDbGrades(songDbPath, scoreRows) {
  const resolvedPath = normalizeLocalPath(songDbPath);
  if (!resolvedPath) {
    return null;
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return null;
  }

  const scoreByHash = new Map();
  for (const row of Array.isArray(scoreRows) ? scoreRows : []) {
    for (const hash of getLocalScoreLookupHashes(row)) {
      if (!scoreByHash.has(hash)) {
        scoreByHash.set(hash, row);
      }
    }
  }

  let bestGrade = null;
  let songDatabase;
  try {
    songDatabase = new DatabaseSync(resolvedPath, { readonly: true });
    const gradeRows = songDatabase.prepare("SELECT title, hash FROM grade").all();

    for (const row of gradeRows) {
      const parsed = parseLocalDanGradeTitle(row?.title);
      if (!parsed) {
        continue;
      }

      const courseHash = normalizeText(row?.hash).toLowerCase();
      const courseState = getLocalCourseScoreState(scoreByHash, courseHash);
      if (!courseState.passed) {
        continue;
      }

      if (!bestGrade || parsed.rank > bestGrade.rank) {
        bestGrade = {
          ...parsed,
          courseHash,
          clear: courseState.clear,
          lampStatus: courseState.lampStatus,
          title: normalizeText(row?.title),
        };
      }
    }
  } catch {
    return null;
  } finally {
    songDatabase?.close();
  }

  return bestGrade;
}

function buildForceDanCandidateFromGradeInfo(gradeInfo) {
  if (!gradeInfo) {
    return null;
  }

  const danConstant = FORCE_DAN_CONSTANTS.get(Number(gradeInfo.rank));
  if (!danConstant) {
    return null;
  }

  const lampStatus = normalizeForceDanLampStatus(gradeInfo.lampStatus, gradeInfo.clear);
  const lampCoefficient = getForceDanLampCoefficient(lampStatus, danConstant);
  if (!lampCoefficient) {
    return null;
  }

  const force = danConstant.constant * lampCoefficient;
  return {
    candidateType: "dan",
    force,
    chartConstant: danConstant.constant,
    danConstant: danConstant.constant,
    rankValue: Number(gradeInfo.rank),
    grade: gradeInfo.grade || danConstant.grade,
    title: `GENOSIDE2018 ${danConstant.label}`,
    label: danConstant.label,
    courseId: danConstant.courseId,
    md5: normalizeText(gradeInfo.courseHash).toLowerCase(),
    source: "dan",
    lampStatus,
    scoreCoefficient: null,
    lampCoefficient,
  };
}

function normalizeForceDanLampStatus(lampStatus, clearValue) {
  const normalizedLamp = normalizeText(lampStatus).toUpperCase();
  if (normalizedLamp === "HARD CLEAR" || normalizedLamp === "FULL COMBO") {
    return "HARD CLEAR";
  }
  if (normalizedLamp === "CLEAR") {
    return "CLEAR";
  }

  const clear = Number.parseInt(clearValue, 10);
  if (Number.isFinite(clear) && clear >= 4) {
    return "HARD CLEAR";
  }
  if (Number.isFinite(clear) && clear >= LOCAL_GRADE_PASS_CLEAR_MIN) {
    return "CLEAR";
  }
  return "";
}

async function hasLocalOverjoyTripleCrown(songDbPath, scoreRows) {
  const passedTitles = await collectPassedLocalGradeTitleKeys(songDbPath, scoreRows, HISTORICAL_OVERJOY_TITLE_KEYS);
  return passedTitles.size === HISTORICAL_OVERJOY_TITLE_KEYS.size;
}

async function collectPassedLocalGradeTitleKeys(songDbPath, scoreRows, targetTitleKeys) {
  const resolvedPath = normalizeLocalPath(songDbPath);
  if (!resolvedPath) {
    return new Set();
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return new Set();
  }

  const scoreByHash = new Map();
  for (const row of Array.isArray(scoreRows) ? scoreRows : []) {
    for (const hash of getLocalScoreLookupHashes(row)) {
      if (!scoreByHash.has(hash)) {
        scoreByHash.set(hash, row);
      }
    }
  }

  const passedTitles = new Set();
  let songDatabase;
  try {
    songDatabase = new DatabaseSync(resolvedPath, { readonly: true });
    const rows = songDatabase.prepare("SELECT title, hash FROM grade").all();

    for (const row of rows) {
      const titleKey = normalizeGradeTitleKey(row?.title);
      if (!targetTitleKeys.has(titleKey)) {
        continue;
      }

      const courseHash = normalizeText(row?.hash).toLowerCase();
      if (isPassedLocalGradeCourseHash(scoreByHash, courseHash)) {
        passedTitles.add(titleKey);
      }
    }
  } catch {
    return new Set();
  } finally {
    songDatabase?.close();
  }

  return passedTitles;
}

function parseLocalDanGradeTitle(title) {
  const text = normalizeText(title);
  if (!text) {
    return null;
  }

  const compact = text.replace(/\s+/g, "");
  const lower = compact.toLowerCase();
  if (lower.includes("stellaskill") || lower.includes("satelliteskill")) {
    return null;
  }

  const titleKey = normalizeGradeTitleKey(text);
  if (!isGenoside2018DanGradeTitleKey(titleKey)) {
    return null;
  }

  if (titleKey === GENOSIDE2018_OVERJOY_TITLE_KEY) {
    return { rank: 22, grade: "(^^)" };
  }
  const danTitleBody = titleKey.slice(GENOSIDE2018_DAN_TITLE_PREFIX.length);
  if (danTitleBody.includes("overjoy") || danTitleBody.includes("オーバージョイ")) {
    return null;
  }

  if (danTitleBody.includes("皆伝")) {
    return danTitleBody.includes("発狂") || danTitleBody.includes("★★")
      ? { rank: 21, grade: "★★" }
      : null;
  }

  const level = parseLocalDanTitleLevel(danTitleBody);
  if (!Number.isFinite(level) || level < 1 || level > 10) {
    return null;
  }

  const isInsaneDan = danTitleBody.includes("発狂") || danTitleBody.includes("★");
  return isInsaneDan
    ? { rank: level + 10, grade: `★${level}` }
    : { rank: level, grade: `☆${level}` };
}

function normalizeGradeTitleKey(title) {
  return normalizeText(title)
    .replace(/[！-～]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function isGenoside2018DanGradeTitleKey(titleKey) {
  return String(titleKey || "").startsWith(GENOSIDE2018_DAN_TITLE_PREFIX);
}

function parseLocalDanTitleLevel(text) {
  const numericMatch = String(text).match(/(\d{1,2})段/);
  if (numericMatch) {
    const level = Number.parseInt(numericMatch[1], 10);
    return Number.isFinite(level) ? level : null;
  }

  const japaneseMatch = String(text).match(/(初|一|二|三|四|五|六|七|八|九|十)段/);
  if (!japaneseMatch) {
    return null;
  }

  return LOCAL_DAN_TEXT_LEVELS.get(japaneseMatch[1]) ?? null;
}

function isPassedLocalGradeCourse(scoreRow, passClearMin = LOCAL_GRADE_PASS_CLEAR_MIN) {
  if (!scoreRow) {
    return false;
  }

  const clear = Number.parseInt(scoreRow.clear, 10);
  return Number.isFinite(clear) && clear >= passClearMin;
}

function isPassedLocalGradeCourseHash(scoreByHash, courseHash) {
  return getLocalCourseScoreState(scoreByHash, courseHash).passed;
}

function getLocalCourseScoreState(scoreByHash, courseHash, passClearMin = LOCAL_GRADE_PASS_CLEAR_MIN) {
  const normalizedCourseHash = normalizeText(courseHash).toLowerCase();
  if (!normalizedCourseHash) {
    return { played: false, passed: false };
  }

  const directScoreRow = scoreByHash.get(normalizedCourseHash);
  if (!directScoreRow) {
    return { played: false, passed: false };
  }

  const playCount = toNonNegativeInteger(directScoreRow?.playcount) ?? 0;
  const clear = Number.parseInt(directScoreRow?.clear, 10);
  return {
    played: playCount > 0 || directScoreRow?.clear != null,
    passed: isPassedLocalGradeCourse(directScoreRow, passClearMin),
    clear: Number.isFinite(clear) ? clear : null,
    lampStatus: normalizeLocalScoreLamp(directScoreRow?.clear, directScoreRow?.playcount),
  };
}

function readScoreRowsForLocalGrade(database) {
  try {
    return database.prepare("SELECT hash, scorehash, clear, playcount FROM score").all();
  } catch {
    return database.prepare("SELECT hash, clear, playcount FROM score").all();
  }
}

function getLocalScoreLookupHashes(row) {
  const hashes = [];
  for (const value of [row?.hash, row?.scorehash]) {
    const hash = normalizeText(value).toLowerCase();
    if (hash && !hashes.includes(hash)) {
      hashes.push(hash);
    }
  }
  return hashes;
}

function readPlayerProfileFromScoreDb(database, playerRow = {}, mode = "legacy") {
  const normalizedMode = normalizeScoreDbMode(mode);
  const directProfile = {
    name: pickProfileNameFromRow(playerRow, buildProfileIdCandidates(playerRow)),
    id: pickProfileIdFromRow(playerRow),
    source: "player",
  };

  if (normalizedMode !== "stellaverse") {
    return directProfile.name || directProfile.id ? directProfile : null;
  }

  return readStellaverseProfileFromScoreDb(database, playerRow) || (directProfile.name || directProfile.id ? directProfile : null);
}

function readStellaverseProfileFromScoreDb(database, playerRow = {}) {
  if (!database) {
    return null;
  }

  const idCandidates = buildProfileIdCandidates(playerRow);
  const directName = pickProfileNameFromRow(playerRow, idCandidates);
  const directId = pickProfileIdFromRow(playerRow);
  if (directName && isExplicitStellaverseProfileRow(playerRow, "player", Object.keys(playerRow), idCandidates)) {
    return {
      name: directName,
      id: directId,
      source: "player",
    };
  }

  const tables = readSqliteTableNames(database);
  for (const tableName of tables) {
    if (!STELLAVERSE_PROFILE_TABLE_PATTERN.test(tableName)) {
      continue;
    }

    const columns = readSqliteTableColumns(database, tableName);
    const columnNames = columns.map((column) => normalizeText(column?.name)).filter(Boolean);
    if (!columnNames.length || !STELLAVERSE_PROFILE_TABLE_PATTERN.test(`${tableName} ${columnNames.join(" ")}`)) {
      continue;
    }

    const selectableColumns = columnNames.filter((name) => !SENSITIVE_PROFILE_COLUMN_PATTERN.test(name));
    const nameColumns = selectableColumns.filter((name) => PROFILE_NAME_COLUMN_PATTERN.test(name));
    if (!selectableColumns.length || (!nameColumns.length && !/player|profile|account|user|ir/i.test(tableName))) {
      continue;
    }

    let rows = [];
    try {
      rows = database
        .prepare(
          `SELECT ${selectableColumns.map(quoteSqlIdentifier).join(", ")} FROM ${quoteSqlIdentifier(tableName)} LIMIT 50`,
        )
        .all();
    } catch {
      continue;
    }

    for (const row of rows) {
      const name = pickProfileNameFromRow(row, idCandidates, nameColumns);
      if (!name || !isExplicitStellaverseProfileRow(row, tableName, columnNames, idCandidates)) {
        continue;
      }

      return {
        name,
        id: pickProfileIdFromRow(row) || directId,
        source: tableName,
      };
    }
  }

  return directName || directId
    ? {
        name: directName,
        id: directId,
        source: "player",
      }
    : null;
}

async function fetchStellaverseIrPlayerProfile(playerId) {
  const normalizedId = normalizeText(playerId);
  if (!/^\d{1,10}$/.test(normalizedId)) {
    return null;
  }

  const url = `https://ir.stellabms.xyz/players/${encodeURIComponent(normalizedId)}`;
  try {
    const response = await fetchRemoteText(url, { useCache: false });
    const parsed = parseStellaverseIrPlayerProfile(response.text, normalizedId);
    return parsed ? { ...parsed, id: normalizedId, url } : null;
  } catch {
    return null;
  }
}

function parseStellaverseIrPlayerProfile(html, playerId = "") {
  const source = String(html ?? "");
  const idCandidates = new Set([normalizeText(playerId).toLowerCase()].filter(Boolean));
  const nameCandidates = [];

  const headingMatch = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (headingMatch) {
    nameCandidates.push(stripHtmlToText(headingMatch[1]));
  }

  const titleMatch = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    nameCandidates.push(stripStellaverseIrBrandText(decodeBasicHtmlEntities(stripHtmlToText(titleMatch[1]))));
  }

  const metaMatch = source.match(/\bproperty\s*=\s*(["'])og:title\1[^>]*\bcontent\s*=\s*(["'])(.*?)\2/i);
  if (metaMatch) {
    nameCandidates.push(metaMatch[3]);
  }

  const text = decodeBasicHtmlEntities(stripHtmlToText(source)).replace(/\s+/g, " ").trim();
  const textNameMatch = text.match(/(?:Player|プレイヤー)\s*[:：]\s*([^|#]+?)(?:\s{2,}|$)/i);
  if (textNameMatch) {
    nameCandidates.push(textNameMatch[1]);
  }

  for (const candidate of nameCandidates) {
    const name = sanitizeStellaverseIrPlayerName(candidate, idCandidates);
    if (name) {
      return { name };
    }
  }

  return null;
}

function sanitizeStellaverseIrPlayerName(value, idCandidates = new Set()) {
  const name = stripStellaverseIrBrandText(sanitizeProfileDisplayName(value, idCandidates));
  if (!name || /^(?:STELLAVERSE IR|Players?|Player|Home)$/i.test(name)) {
    return "";
  }
  return name;
}

function stripStellaverseIrBrandText(value) {
  return String(value ?? "")
    .replace(/\s*(?:[-\u2010-\u2015|｜:：]|&mdash;|&ndash;)\s*STELLAVERSE\s+IR\s*$/i, "")
    .replace(/^\s*STELLAVERSE\s+IR\s*(?:[-\u2010-\u2015|｜:：]|&mdash;|&ndash;)\s*/i, "")
    .trim();
}

function readSqliteTableNames(database) {
  try {
    return database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => normalizeText(row?.name))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readSqliteTableColumns(database, tableName) {
  try {
    return database.prepare(`PRAGMA table_info(${quoteSqlIdentifier(tableName)})`).all();
  } catch {
    return [];
  }
}

function quoteSqlIdentifier(identifier) {
  return `"${String(identifier ?? "").replace(/"/g, "\"\"")}"`;
}

function buildProfileIdCandidates(row) {
  const candidates = new Set();
  for (const [key, value] of Object.entries(row ?? {})) {
    if (!PROFILE_ID_COLUMN_PATTERN.test(key)) {
      continue;
    }
    const text = normalizeText(value);
    if (text) {
      candidates.add(text.toLowerCase());
    }
  }
  return candidates;
}

function pickProfileNameFromRow(row, idCandidates, preferredColumns = []) {
  const preferred = new Set(preferredColumns.map((column) => column.toLowerCase()));
  const candidates = [];
  for (const [key, value] of Object.entries(row ?? {})) {
    if (SENSITIVE_PROFILE_COLUMN_PATTERN.test(key)) {
      continue;
    }
    if (!PROFILE_NAME_COLUMN_PATTERN.test(key) && !preferred.has(key.toLowerCase())) {
      continue;
    }
    candidates.push(value);
  }

  for (const value of candidates) {
    const name = sanitizeProfileDisplayName(value, idCandidates);
    if (name) {
      return name;
    }
  }
  return "";
}

function pickProfileIdFromRow(row) {
  const preferredKeys = ["irid", "ir_id", "user_id", "player_id", "account_id", "id", "uid"];
  for (const key of preferredKeys) {
    if (!(key in (row ?? {}))) {
      continue;
    }
    const id = normalizeText(row[key]);
    if (id) {
      return id;
    }
  }
  for (const [key, value] of Object.entries(row ?? {})) {
    if (!PROFILE_ID_COLUMN_PATTERN.test(key)) {
      continue;
    }
    const id = normalizeText(value);
    if (id) {
      return id;
    }
  }
  return "";
}

function sanitizeProfileDisplayName(value, idCandidates = new Set()) {
  const name = sanitizeLocalPlayerName(value);
  if (!name || name.length > 64) {
    return "";
  }
  const lowered = name.toLowerCase();
  if (idCandidates.has(lowered) || /^[a-f0-9]{32,64}$/i.test(name)) {
    return "";
  }
  return name;
}

function isExplicitStellaverseProfileRow(row, tableName, columnNames, idCandidates = new Set()) {
  const schemaText = `${tableName} ${columnNames.join(" ")}`;
  const rowText = Object.entries(row ?? {})
    .filter(([key]) => !SENSITIVE_PROFILE_COLUMN_PATTERN.test(key))
    .map(([, value]) => normalizeText(value))
    .filter(Boolean)
    .join(" ");
  if (STELLAVERSE_PROFILE_SIGNAL_PATTERN.test(`${schemaText} ${rowText}`)) {
    return true;
  }
  return /\bir(name|id)?\b|profile|account|user/i.test(schemaText) && Boolean(pickProfileNameFromRow(row, idCandidates));
}

function mergeSkillAnalyzerProgress(primary, fallback, mode = "both") {
  const normalizedMode = normalizeSkillAnalyzerFetchMode(mode);
  const st = normalizedMode === "sl" ? null : primary?.st || fallback?.st || null;
  const sl = normalizedMode === "st" ? null : primary?.sl || fallback?.sl || null;
  if (!st && !sl) {
    return null;
  }
  return { st, sl };
}

function normalizeScoreDbMode(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (["auto", "legacy", "bms-ir", "stellaverse"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "bmsir" || normalized === "bms_ir") {
    return "bms-ir";
  }
  if (normalized === "stellaverse-ir" || normalized === "stellaverse_ir" || normalized === "stellaverseir") {
    return "stellaverse";
  }
  if (normalized === "lr2ir" || normalized === "old") {
    return "legacy";
  }
  return "auto";
}

function resolveScoreDbMode(mode, scoreDbPath) {
  const normalizedMode = normalizeScoreDbMode(mode);
  if (normalizedMode !== "auto") {
    return normalizedMode;
  }

  const fileName = path.basename(String(scoreDbPath ?? ""), path.extname(String(scoreDbPath ?? "")));
  return /^\d+$/.test(fileName) ? "stellaverse" : "legacy";
}

function normalizeSkillAnalyzerFetchMode(value) {
  const normalized = normalizeText(value).toLowerCase();
  return ["both", "st", "sl"].includes(normalized) ? normalized : "both";
}

function stripHtmlToText(html) {
  return String(html ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function decodeBasicHtmlEntities(text) {
  return String(text ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildUnlistedUpdateCharts(playerMyList, tables) {
  const listedHashes = new Set();
  for (const table of Array.isArray(tables) ? tables : []) {
    for (const chart of table?.charts ?? []) {
      const md5 = normalizeHex(chart?.md5 || chart?.hintedBmsMd5, 32);
      if (md5) {
        listedHashes.add(md5);
      }
    }
  }

  return (playerMyList?.entries ?? [])
    .filter((entry) => entry?.md5 && !listedHashes.has(entry.md5))
    .map((entry) => ({
      key: `unlisted:${entry.md5}`,
      md5: entry.md5,
      title: entry.title,
      artist: entry.artist || "",
      level: "",
      lampStatus: entry.lampStatus,
      playCount: entry.playCount ?? null,
      exScore: entry.exScore ?? null,
      maxExScore: entry.maxExScore ?? null,
      scoreRate: entry.scoreRate ?? null,
      maxOffset: entry.maxOffset ?? null,
      badCount: entry.badCount ?? null,
      poorCount: entry.poorCount ?? null,
      missCount: entry.missCount ?? null,
      isUnlisted: true,
    }));
}

function buildLocalScoreState(playerMyList) {
  const entries = [];
  for (const entry of playerMyList?.entries ?? []) {
    if (!entry?.md5) {
      continue;
    }
    entries.push({
      key: `unlisted:${entry.md5}`,
      md5: entry.md5,
      lampStatus: entry.lampStatus,
      exScore: entry.exScore ?? null,
      scoreRate: entry.scoreRate ?? null,
      missCount: entry.missCount ?? null,
    });
  }
  return { entries };
}

function parseSkillAnalyzerLevel(title) {
  const text = normalizeText(title);
  if (!text) {
    return null;
  }

  const stMatch = text.match(/^Stella Skill Simulator 4th\b[\s\S]*?\bst\s*0*(\d{1,2})\b/i);
  if (stMatch) {
    const level = Number.parseInt(stMatch[1], 10);
    if (Number.isFinite(level)) {
      return { kind: "st", level };
    }
  }

  const slMatch = text.match(/^Satellite Skill Analyzer 2nd\b[\s\S]*?\bsl\s*0*(\d{1,2})\b/i);
  if (slMatch) {
    const level = Number.parseInt(slMatch[1], 10);
    if (Number.isFinite(level)) {
      return { kind: "sl", level };
    }
  }

  return null;
}

function buildSkillAnalyzerSummaryEntry(aggregate, prefix, formalName) {
  if (!aggregate || !Number.isFinite(aggregate.totalCount) || aggregate.totalCount <= 0) {
    return null;
  }

  return {
    grade:
      Number.isFinite(aggregate.highestCleared) && aggregate.highestCleared >= 0
        ? `${prefix}${aggregate.highestCleared}`
        : "",
    formalName,
    clearedCount: aggregate.clearedCount,
    playedCount: aggregate.playedCount,
    totalCount: aggregate.totalCount,
  };
}

function buildLocalScoreInfo(scoreRow) {
  const perfect = toNonNegativeInteger(scoreRow?.perfect);
  const great = toNonNegativeInteger(scoreRow?.great);
  const totalNotes = toNonNegativeInteger(scoreRow?.totalnotes);
  const playCount = toNonNegativeInteger(scoreRow?.playcount);
  const badCount = toNonNegativeInteger(scoreRow?.bad);
  const poorCount = toNonNegativeInteger(scoreRow?.poor);
  const minBp = toNonNegativeInteger(scoreRow?.minbp);
  const bpFromBadPoor = badCount != null && poorCount != null ? badCount + poorCount : null;
  const hasPlay = playCount != null && playCount > 0;
  const bpCount = hasPlay ? (minBp ?? bpFromBadPoor) : null;

  if (playCount <= 0 || perfect == null || great == null || totalNotes == null || totalNotes <= 0) {
    return {
      exScore: null,
      maxExScore: null,
      scoreRate: null,
      maxOffset: null,
      badCount,
      poorCount,
      missCount: bpCount,
    };
  }

  const exScore = perfect * 2 + great;
  const maxExScore = totalNotes * 2;
  const scoreRate = maxExScore > 0 ? roundPercent((exScore / maxExScore) * 100) : null;
  const maxOffset = maxExScore >= exScore ? maxExScore - exScore : null;

  return {
    exScore,
    maxExScore,
    scoreRate,
    maxOffset,
    badCount,
    poorCount,
    missCount: bpCount,
  };
}

function buildLocalHitTotalsFromPlayerRow(playerRow) {
  const perfect = toNonNegativeInteger(playerRow?.perfect) ?? 0;
  const great = toNonNegativeInteger(playerRow?.great) ?? 0;
  const good = toNonNegativeInteger(playerRow?.good) ?? 0;
  const bad = toNonNegativeInteger(playerRow?.bad) ?? 0;
  const poorRaw = toNonNegativeInteger(playerRow?.poor) ?? 0;
  const poor = 0;

  return {
    perfect,
    great,
    good,
    bad,
    poor,
    poorRaw,
    poorMode: "excluded",
    total: perfect + great + good + bad + poor,
  };
}

function buildLocalPlayTimeTotalFromPlayerRow(playerRow) {
  if (!playerRow || typeof playerRow !== "object") {
    return null;
  }

  const entries = Object.entries(playerRow);
  const candidates = [
    "playtime",
    "play_time",
    "play_time_sec",
    "playtime_sec",
    "playseconds",
    "play_seconds",
    "totalplaytime",
    "total_play_time",
    "total_play_seconds",
  ];

  for (const candidate of candidates) {
    const found = entries.find(([key]) => key.toLowerCase() === candidate);
    if (!found) {
      continue;
    }

    const rawSeconds = normalizePlayTimeSeconds(found[1], found[0]);
    if (rawSeconds != null) {
      return {
        totalSeconds: rawSeconds,
        sourceColumn: found[0],
      };
    }
  }

  const loose = entries.find(([key]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normalized.includes("play") && normalized.includes("time");
  });
  if (!loose) {
    return null;
  }

  const rawSeconds = normalizePlayTimeSeconds(loose[1], loose[0]);
  return rawSeconds == null
    ? null
    : {
        totalSeconds: rawSeconds,
        sourceColumn: loose[0],
      };
}

function normalizePlayTimeSeconds(value, columnName = "") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  const normalizedColumn = String(columnName).toLowerCase();
  let seconds = numeric;
  if (/(msec|millis|milliseconds|_ms$|ms$)/.test(normalizedColumn)) {
    seconds = numeric / 1000;
  } else if (/(minute|minutes|_min$|mins$)/.test(normalizedColumn)) {
    seconds = numeric * 60;
  } else if (/(hour|hours|_hr$|hrs$)/.test(normalizedColumn)) {
    seconds = numeric * 3600;
  }

  const rounded = Math.trunc(seconds);
  return Number.isFinite(rounded) && rounded >= 0 ? rounded : null;
}

function toNonNegativeInteger(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return numeric;
}

function normalizeHex(value, length) {
  const text = normalizeText(value).toLowerCase();
  return new RegExp(`^[0-9a-f]{${length}}$`).test(text) ? text : "";
}

function buildArtistText(item) {
  const artist = normalizeText(item?.artist);
  const subartist = normalizeText(item?.subartist);

  if (artist && subartist) {
    return `${artist} / ${subartist}`;
  }

  return artist || subartist || "";
}

function normalizeLevel(value) {
  const normalized = normalizeText(value);
  if (normalized) {
    return normalized;
  }
  return "未設定";
}

function normalizeLocalScoreLamp(clearValue, playCount) {
  const clear = Number.parseInt(clearValue, 10);
  const plays = Number.parseInt(playCount, 10);
  const normalizedPlayCount = Number.isFinite(plays) ? plays : 0;

  if (clear === 0 && normalizedPlayCount <= 0) {
    return "NO PLAY";
  }

  switch (clear) {
    case 5:
      return "FULL COMBO";
    case 4:
      return "HARD CLEAR";
    case 3:
      return "CLEAR";
    case 2:
      return "EASY CLEAR";
    case 1:
      return "FAILED";
    case 0:
      return "NO PLAY";
    default:
      return normalizedPlayCount > 0 ? "FAILED" : "NO PLAY";
  }
}

function formatLocalGrade(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  if (LOCAL_DAN_STAR_MAP.has(numeric)) {
    return LOCAL_DAN_STAR_MAP.get(numeric);
  }

  if (numeric >= 101 && numeric <= 110) {
    return `☆${numeric - 100}`;
  }
  if (numeric >= 111 && numeric <= 120) {
    return `★${numeric - 110}`;
  }
  if (numeric === 121) {
    return "★★";
  }
  if (numeric === 122) {
    return "(^^)";
  }

  return "";
}

function combineLocalGrades(gradeSp, gradeDp) {
  const sp = normalizeText(gradeSp);
  const dp = normalizeText(gradeDp);
  if (sp && dp) {
    return `${sp}/${dp}`;
  }
  return sp || dp || "";
}

function compareLevels(left, right, levelOrder) {
  const levelIndex = new Map(levelOrder.map((level, index) => [String(level), index]));
  const leftIndex = levelIndex.get(left);
  const rightIndex = levelIndex.get(right);

  if (leftIndex != null && rightIndex != null) {
    return leftIndex - rightIndex;
  }
  if (leftIndex != null) {
    return -1;
  }
  if (rightIndex != null) {
    return 1;
  }

  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const leftNumeric = Number.isFinite(leftNumber);
  const rightNumeric = Number.isFinite(rightNumber);

  if (leftNumeric && rightNumeric) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, "ja");
}

function roundPercent(value) {
  return Math.round(value * 100) / 100;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  __test: {
    buildForceDanCandidateFromGradeInfo,
    calculateForceScoreCoefficient,
    parseLocalDanGradeTitle,
  },
  buildForceRating,
  clampForceRating,
  createAppServer,
  getForceRatingTier,
  startServer,
};
