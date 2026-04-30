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

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) L2TV/0.1 Safari/537.36";
const API_TOKEN = crypto.randomBytes(32).toString("hex");
const MAX_REMOTE_RESPONSE_BYTES = 25 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 300;
const MAX_REDIRECTS = 5;
const LOOPBACK_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"]);

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
const playerMyListCache = new Map();
const songDbIrCache = new Map();
const LOCAL_DAN_STAR_MAP = new Map(
  Array.from({ length: 10 }, (_, index) => [index + 1, `☆${index + 1}`]),
);
for (let index = 1; index <= 10; index += 1) {
  LOCAL_DAN_STAR_MAP.set(index + 10, `★${index}`);
}
LOCAL_DAN_STAR_MAP.set(21, "★★");
LOCAL_DAN_STAR_MAP.set(22, "(^^)");

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

const OVERJOY_TRIPLE_CROWN_TITLES = new Set([
  "overjoy",
  "段位認定overjoy",
  "genoside2018段位認定overjoy",
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

  const playerMyList = await loadPlayerMyListFromScoreDb(scoreDbPath, songDbPath);
  const rivalData = await loadRivalFolderData(rivalFolderPath);
  const playerProfile = playerMyList.localProfile ?? {
    playerId: playerMyList.playerId || "",
    name: "",
    grade: "",
    gradeSp: "",
    gradeDp: "",
    skillAnalyzer: null,
    stellaSkill4th: null,
    overjoyTripleCrown: false,
    irVerifiedId: "",
    irProfileFetched: false,
    hitTotals: null,
  };

  const lookupMap = new Map();
  const enrichedTables = hasTableInputs ? tables.map((table) => enrichTable(table, lookupMap, playerMyList, rivalData)) : [];
  const overall = buildOverallSummary(enrichedTables);
  const localDbState = useLocalScoreDb ? await buildLocalDbState(scoreDbPath, songDbPath) : null;

  return {
    analyzedAt: new Date().toISOString(),
    localDbState,
    overall,
    player: {
      id: playerMyList.playerId || "local",
      sourceType: playerMyList.sourceType,
      name: playerProfile.name,
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
      irVerifiedId: playerProfile.irVerifiedId || "",
      irProfileFetched: Boolean(playerProfile.irProfileFetched),
      registeredChartCount: playerMyList.entries.length,
      fetchedPages: playerMyList.fetchedPages,
      localDbPath: playerMyList.localDbPath || "",
      localSongDbPath: playerMyList.localSongDbPath || "",
      hitTotals: playerMyList.localProfile?.hitTotals ?? null,
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
    const playerRow = database
      .prepare("SELECT id, name, irid, irname, grade_7, grade_14 FROM player LIMIT 1")
      .get();

    if (!playerRow) {
      throw new Error("score.db の player テーブルを読み取れませんでした。");
    }

    const localPlayerId = normalizeNumericId(playerRow.irid) || "";
    const scoreRows = database
      .prepare("SELECT hash, clear, playcount FROM score")
      .all();
    const inferredGradeSp = await inferLocalGradeFromSongDbGrades(resolvedSongDbPath, scoreRows);
    const overjoyTripleCrown = await hasLocalOverjoyTripleCrown(resolvedSongDbPath, scoreRows);
    const localSkillAnalyzer = await loadLocalSkillAnalyzerProgress(resolvedSongDbPath, scoreRows);

    const localProfile = {
      playerId: localPlayerId,
      name: sanitizeLocalPlayerName(playerRow.irname) || sanitizeLocalPlayerName(playerRow.name) || "",
      grade: "",
      gradeSp: formatLocalGrade(playerRow.grade_7) || inferredGradeSp,
      gradeDp: formatLocalGrade(playerRow.grade_14),
      irVerifiedId: "",
      irProfileFetched: false,
      skillAnalyzer: localSkillAnalyzer,
      stellaSkill4th: localSkillAnalyzer?.st ?? null,
      overjoyTripleCrown,
    };
    localProfile.grade = combineLocalGrades(localProfile.gradeSp, localProfile.gradeDp);

    return {
      fetchedAt: new Date().toISOString(),
      player: {
        id: localProfile.playerId || "local",
        sourceType: "local-score-db",
        name: localProfile.name || "",
        grade: localProfile.grade || "",
        gradeSp: localProfile.gradeSp || "",
        gradeDp: localProfile.gradeDp || "",
        skillAnalyzer: localProfile.skillAnalyzer || null,
        stellaSkill4th: localProfile.stellaSkill4th || localProfile.skillAnalyzer?.st || null,
        overjoyTripleCrown: Boolean(localProfile.overjoyTripleCrown),
        irVerifiedId: "",
        irProfileFetched: false,
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
  const parsed = parseHostHeader(req.headers.host);
  if (!parsed) {
    return false;
  }

  return isAllowedLoopbackHostAndPort(parsed.hostname, parsed.port, req);
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

async function loadTableFromUrl(sourceUrl) {
  const safeUrl = normalizeRemoteUrl(sourceUrl);

  if (tableCache.has(safeUrl)) {
    return structuredClone(tableCache.get(safeUrl));
  }

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

async function loadPlayerMyListFromScoreDb(scoreDbPath, songDbPath = "") {
  const resolvedPath = path.resolve(scoreDbPath);
  const resolvedSongDbPath = resolveSongDbPathFromScoreDb(resolvedPath, songDbPath);
  const cacheKey = `scoredb:${resolvedPath}|songdb:${resolvedSongDbPath || "-"}`;

  if (playerMyListCache.has(cacheKey)) {
    return playerMyListCache.get(cacheKey);
  }

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

    const localPlayerId = normalizeNumericId(playerRow.irid) || normalizeText(playerRow.id) || "";
    const localPlayerName =
      sanitizeLocalPlayerName(playerRow.irname) ||
      sanitizeLocalPlayerName(playerRow.name) ||
      "";
    let localGradeSp = formatLocalGrade(playerRow.grade_7);
    const localGradeDp = formatLocalGrade(playerRow.grade_14);
    const irData = await loadSongDbIrData(resolvedSongDbPath);
    let scoreRows = [];
    try {
      scoreRows = database
        .prepare("SELECT hash, clear, playcount, perfect, great, totalnotes, bad, poor, minbp FROM score")
        .all();
    } catch {
      try {
        scoreRows = database
          .prepare("SELECT hash, clear, playcount, perfect, great, totalnotes, bad, poor FROM score")
          .all();
      } catch {
        scoreRows = database
          .prepare("SELECT hash, clear, playcount, perfect, great, totalnotes FROM score")
          .all();
      }
    }
    const byHash = new Map();
    for (const row of scoreRows) {
      const md5 = normalizeHex(row.hash, 32);
      if (!md5 || byHash.has(md5)) {
        continue;
      }
      const irEntry = irData.byHash.get(md5);
      const scoreInfo = buildLocalScoreInfo(row);

      const entry = {
        md5,
        lampStatus: normalizeLocalScoreLamp(row.clear, row.playcount),
        playCount: Number.isFinite(row.playcount) ? row.playcount : null,
        exScore: scoreInfo.exScore,
        maxExScore: scoreInfo.maxExScore,
        scoreRate: scoreInfo.scoreRate,
        maxOffset: scoreInfo.maxOffset,
        badCount: scoreInfo.badCount,
        poorCount: scoreInfo.poorCount,
        missCount: scoreInfo.missCount,
        rankingText: irEntry?.rankingText || "",
        rankingRank: irEntry?.rankingRank ?? null,
        rankingTotal: irEntry?.rankingTotal ?? null,
      };
      byHash.set(md5, entry);
    }

    if (!localGradeSp) {
      localGradeSp = await inferLocalGradeFromSongDbGrades(resolvedSongDbPath, scoreRows);
    }
    const overjoyTripleCrown = await hasLocalOverjoyTripleCrown(resolvedSongDbPath, scoreRows);
    const localSkillAnalyzer = await loadLocalSkillAnalyzerProgress(resolvedSongDbPath, scoreRows);

    const result = {
      playerId: localPlayerId,
      fetchedPages: null,
      entries: [...byHash.values()],
      byBmsId: new Map(),
      byHash,
      localSongHashes: irData.localSongHashes,
      hasLocalSongCatalog: irData.hasSongCatalog,
      sourceType: "local-score-db",
      localDbPath: resolvedPath,
      localSongDbPath: irData.path,
      localProfile: {
        playerId: localPlayerId,
        name: localPlayerName,
        grade: combineLocalGrades(localGradeSp, localGradeDp),
        gradeSp: localGradeSp,
        gradeDp: localGradeDp,
        skillAnalyzer: localSkillAnalyzer,
        stellaSkill4th: localSkillAnalyzer?.st ?? null,
        overjoyTripleCrown,
        irVerifiedId: "",
        irProfileFetched: false,
        hitTotals: buildLocalHitTotalsFromPlayerRow(playerRow),
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
      rankingUrl: "",
      rankingRank: null,
      rankingTotal: null,
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
        rankingRank: playerEntry.rankingRank ?? null,
        rankingTotal: playerEntry.rankingTotal ?? null,
        statusDetail: playerEntry.rankingText || "",
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

async function loadSongDbIrData(songDbPath) {
  const resolvedPath = normalizeLocalPath(songDbPath);
  if (!resolvedPath) {
    return { path: "", byHash: new Map(), localSongHashes: new Set(), hasSongCatalog: false };
  }

  if (songDbIrCache.has(resolvedPath)) {
    return songDbIrCache.get(resolvedPath);
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return { path: "", byHash: new Map(), localSongHashes: new Set(), hasSongCatalog: false };
  }

  let songDatabase;
  try {
    songDatabase = new DatabaseSync(resolvedPath, { readonly: true });
    const byHash = new Map();
    const localSongHashes = new Set();

    try {
      const rows = songDatabase.prepare("SELECT hash, rank, players_num FROM ir_data").all();

      for (const row of rows) {
        const md5 = normalizeHex(row.hash, 32);
        if (!md5 || byHash.has(md5)) {
          continue;
        }

        const rank = toPositiveInteger(row.rank);
        const total = toPositiveInteger(row.players_num);
        byHash.set(md5, {
          rankingRank: rank,
          rankingTotal: total,
          rankingText: rank && total ? `${rank}/${total}` : "",
        });
      }
    } catch {
      // Older or trimmed song.db files may not have cached IR data.
    }

    let hasSongCatalog = false;
    try {
      const songRows = songDatabase.prepare("SELECT hash FROM song").all();
      hasSongCatalog = true;

      for (const row of songRows) {
        const md5 = normalizeHex(row.hash, 32);
        if (md5) {
          localSongHashes.add(md5);
        }
      }
    } catch {
      // Without the song table we cannot safely mark charts as missing.
    }

    const result = {
      path: resolvedPath,
      byHash,
      localSongHashes,
      hasSongCatalog,
    };

    setLimitedCache(songDbIrCache, resolvedPath, result);
    return result;
  } catch {
    return { path: "", byHash: new Map(), localSongHashes: new Set(), hasSongCatalog: false };
  } finally {
    songDatabase?.close();
  }
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
    const hash = normalizeText(row?.hash).toLowerCase();
    if (!hash || scoreByHash.has(hash)) {
      continue;
    }
    scoreByHash.set(hash, row);
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

      const scoreRow = scoreByHash.get(hash);
      if (!scoreRow) {
        continue;
      }

      const playCount = toNonNegativeInteger(scoreRow?.playcount) ?? 0;
      if (playCount > 0) {
        aggregate.playedCount += 1;
      }

      const lamp = normalizeLocalScoreLamp(scoreRow?.clear, scoreRow?.playcount);
      if (["FULL COMBO", "HARD CLEAR", "CLEAR", "EASY CLEAR"].includes(lamp)) {
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
  const resolvedPath = normalizeLocalPath(songDbPath);
  if (!resolvedPath) {
    return "";
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return "";
  }

  const scoreByHash = new Map();
  for (const row of Array.isArray(scoreRows) ? scoreRows : []) {
    const hash = normalizeText(row?.hash).toLowerCase();
    if (!hash || scoreByHash.has(hash)) {
      continue;
    }
    scoreByHash.set(hash, row);
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
      const scoreRow = courseHash ? scoreByHash.get(courseHash) : null;
      if (!isPassedLocalGradeCourse(scoreRow)) {
        continue;
      }

      if (!bestGrade || parsed.rank > bestGrade.rank) {
        bestGrade = parsed;
      }
    }
  } catch {
    return "";
  } finally {
    songDatabase?.close();
  }

  return bestGrade?.grade || "";
}

async function hasLocalOverjoyTripleCrown(songDbPath, scoreRows) {
  const resolvedPath = normalizeLocalPath(songDbPath);
  if (!resolvedPath) {
    return false;
  }

  const stat = await fsp.stat(resolvedPath).catch(() => null);
  if (!stat?.isFile()) {
    return false;
  }

  const scoreByHash = new Map();
  for (const row of Array.isArray(scoreRows) ? scoreRows : []) {
    const hash = normalizeText(row?.hash).toLowerCase();
    if (!hash || scoreByHash.has(hash)) {
      continue;
    }
    scoreByHash.set(hash, row);
  }

  const passedTitles = new Set();
  let songDatabase;
  try {
    songDatabase = new DatabaseSync(resolvedPath, { readonly: true });
    const placeholders = [...OVERJOY_TRIPLE_CROWN_TITLES].map(() => "?").join(",");
    const rows = songDatabase
      .prepare(
        `SELECT title, hash FROM grade WHERE lower(replace(title, ' ', '')) IN (${placeholders})`,
      )
      .all(...OVERJOY_TRIPLE_CROWN_TITLES);

    for (const row of rows) {
      const titleKey = normalizeGradeTitleKey(row?.title);
      const courseHash = normalizeText(row?.hash).toLowerCase();
      if (OVERJOY_TRIPLE_CROWN_TITLES.has(titleKey) && isPassedLocalGradeCourse(scoreByHash.get(courseHash))) {
        passedTitles.add(titleKey);
      }
    }
  } catch {
    return false;
  } finally {
    songDatabase?.close();
  }

  return passedTitles.size === OVERJOY_TRIPLE_CROWN_TITLES.size;
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

  if (lower.includes("overjoy") || compact.includes("オーバージョイ")) {
    return { rank: 22, grade: "(^^)" };
  }

  const isInsaneDan = compact.includes("発狂") || lower.includes("genoside");
  if (compact.includes("皆伝")) {
    return isInsaneDan ? { rank: 21, grade: "★★" } : null;
  }

  const level = parseLocalDanTitleLevel(compact);
  if (!Number.isFinite(level) || level < 1 || level > 10) {
    return null;
  }

  if (isInsaneDan) {
    return { rank: level + 10, grade: `★${level}` };
  }
  return { rank: level, grade: `☆${level}` };
}

function normalizeGradeTitleKey(title) {
  return normalizeText(title)
    .replace(/[！-～]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
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

function isPassedLocalGradeCourse(scoreRow) {
  if (!scoreRow) {
    return false;
  }

  const clear = Number.parseInt(scoreRow.clear, 10);
  return Number.isFinite(clear) && clear >= 2;
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

function toPositiveInteger(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  return numeric;
}

function toNonNegativeInteger(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return numeric;
}

function normalizeNumericId(value) {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? text : "";
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
  createAppServer,
  startServer,
};
