const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { DatabaseSync } = require("node:sqlite");

const { __test, createAppServer } = require("../server");

const {
  buildLocalScoreInfo,
  buildRivalScoreInfo,
  buildUnlistedUpdateCharts,
  isBlockedIpAddress,
  isSpTableListEntry,
  loadPlayerMyListFromScoreDb,
  loadRivalFolderData,
  normalizeLocalScoreLamp,
  normalizeRemoteUrl,
  parseTableListHtml,
  parseTableListJson,
} = __test;

const TEST_HASH = "0123456789abcdef0123456789abcdef";
const OTHER_HASH = "fedcba9876543210fedcba9876543210";

async function withTempDirectory(callback) {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), "l2tv-test-"));
  try {
    return await callback(directory);
  } finally {
    await fsp.rm(directory, { recursive: true, force: true });
  }
}

function createDatabase(filePath, statements) {
  const database = new DatabaseSync(filePath);
  try {
    for (const statement of statements) {
      database.exec(statement);
    }
  } finally {
    database.close();
  }
}

function request(port, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: "127.0.0.1",
      port,
      path: requestPath,
      method: options.method || "GET",
      headers: {
        Host: `127.0.0.1:${port}`,
        ...(options.headers || {}),
      },
    };

    const clientRequest = http.request(requestOptions, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode,
          headers: response.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });
    clientRequest.on("error", reject);
    if (options.body) {
      clientRequest.write(options.body);
    }
    clientRequest.end();
  });
}

test("LR2 score.db and song.db are read without changing the source files", async () => {
  await withTempDirectory(async (directory) => {
    const scoreDbPath = path.join(directory, "score.db");
    const songDbPath = path.join(directory, "song.db");

    createDatabase(songDbPath, [
      "CREATE TABLE song (hash TEXT, title TEXT, subtitle TEXT, artist TEXT)",
      `INSERT INTO song VALUES ('${TEST_HASH}', 'Test Song', ' [HYPER]', 'Test Artist')`,
      "CREATE TABLE grade (title TEXT, hash TEXT)",
    ]);
    createDatabase(scoreDbPath, [
      "CREATE TABLE player (id TEXT, name TEXT, irid TEXT, grade_7 INTEGER, grade_14 INTEGER, playtime INTEGER, perfect INTEGER, great INTEGER, good INTEGER, bad INTEGER, poor INTEGER)",
      "INSERT INTO player VALUES ('local-player', 'Local Player', '187038', 111, 0, 926408, 100, 4, 0, 1, 2)",
      "CREATE TABLE score (hash TEXT, scorehash TEXT, clear INTEGER, playcount INTEGER, perfect INTEGER, great INTEGER, totalnotes INTEGER, bad INTEGER, poor INTEGER, minbp INTEGER)",
      `INSERT INTO score VALUES ('${TEST_HASH}', '${TEST_HASH}', 4, 3, 90, 10, 100, 1, 2, 3)`,
      `INSERT INTO score VALUES ('${OTHER_HASH}', '${OTHER_HASH}', 0, 0, 0, 0, 50, 0, 0, 0)`,
    ]);

    const scoreBefore = fs.readFileSync(scoreDbPath);
    const songBefore = fs.readFileSync(songDbPath);
    const result = await loadPlayerMyListFromScoreDb(scoreDbPath, songDbPath, {
      scoreDbMode: "legacy",
    });

    assert.equal(result.playerId, "local-player");
    assert.equal(result.localProfile.name, "Local Player");
    assert.equal(result.localProfile.lr2Id, "187038");
    assert.equal(result.localProfile.gradeSp, "★1");
    assert.equal(result.localProfile.playTimeTotal.totalSeconds, 926408);
    assert.equal(result.entries.length, 2);

    const played = result.byHash.get(TEST_HASH);
    assert.equal(played.title, "Test Song[HYPER]");
    assert.equal(played.artist, "Test Artist");
    assert.equal(played.lampStatus, "HARD CLEAR");
    assert.equal(played.exScore, 190);
    assert.equal(played.maxExScore, 200);
    assert.equal(played.scoreRate, 95);
    assert.equal(played.missCount, 3);

    const unplayed = result.byHash.get(OTHER_HASH);
    assert.equal(unplayed.lampStatus, "NO PLAY");
    assert.equal(unplayed.exScore, null);
    assert.equal(unplayed.scoreRate, null);
    assert.deepEqual(fs.readFileSync(scoreDbPath), scoreBefore);
    assert.deepEqual(fs.readFileSync(songDbPath), songBefore);
  });
});

test("rival databases and lr2folder names are imported read-only", async () => {
  await withTempDirectory(async (directory) => {
    const rivalDbPath = path.join(directory, "187038.db");
    const folderPath = path.join(directory, "187038.lr2folder");
    fs.writeFileSync(folderPath, "#TITLE Test Rival\n", "utf8");
    createDatabase(rivalDbPath, [
      "CREATE TABLE rival (hash TEXT, r_clear INTEGER, r_totalnotes INTEGER, r_perfect INTEGER, r_great INTEGER, r_bad INTEGER, r_poor INTEGER, r_minbp INTEGER)",
      `INSERT INTO rival VALUES ('${TEST_HASH}', 4, 100, 95, 5, 0, 0, 0)`,
    ]);

    const before = fs.readFileSync(rivalDbPath);
    const result = await loadRivalFolderData(directory);

    assert.equal(result.rivals.length, 1);
    assert.equal(result.rivals[0].id, "187038");
    assert.equal(result.rivals[0].name, "Test Rival");
    assert.equal(result.rivals[0].scoreCount, 1);
    assert.equal(result.byHash.get(TEST_HASH)[0].scoreRate, 97.5);
    assert.deepEqual(fs.readFileSync(rivalDbPath), before);
  });
});

test("table list parsers preserve SP and tag2 metadata", () => {
  const jsonEntries = parseTableListJson(
    [
      {
        symbol: "★",
        name: "Insane",
        url: "https://example.test/insane/header.json",
        tag1: "SP",
        tag2: "General",
      },
      {
        symbol: "DP",
        name: "Double",
        url: "https://example.test/dp/header.json",
        tag1: "DP",
        tag2: "General",
      },
    ],
    "https://example.test/tables.json",
  );

  assert.equal(jsonEntries.length, 2);
  assert.equal(jsonEntries[0].tag1, "SP");
  assert.equal(jsonEntries[0].tag2, "General");
  assert.equal(isSpTableListEntry(jsonEntries[0]), true);
  assert.equal(isSpTableListEntry(jsonEntries[1]), false);

  const htmlEntries = parseTableListHtml(
    '<table><tr><th>Symbol</th><th>Name</th><th>Play</th><th>Category</th></tr>' +
      '<tr><td>★</td><td><a href="/insane/header.json">Insane</a></td><td>SP</td><td>Personal</td></tr></table>',
    "https://example.test/tablelist.html",
  );
  assert.equal(htmlEntries.length, 1);
  assert.equal(htmlEntries[0].name, "Insane");
  assert.equal(htmlEntries[0].tag1, "SP");
  assert.equal(htmlEntries[0].tag2, "Personal");
});

test("unlisted update filtering keeps only charts outside loaded tables", () => {
  const updates = buildUnlistedUpdateCharts(
    {
      entries: [
        { md5: TEST_HASH, title: "Listed", lampStatus: "CLEAR" },
        { md5: OTHER_HASH, title: "Unlisted", lampStatus: "FAILED" },
      ],
    },
    [{ charts: [{ md5: TEST_HASH }] }],
  );

  assert.deepEqual(updates.map((entry) => entry.md5), [OTHER_HASH]);
  assert.equal(updates[0].isUnlisted, true);
});

test("score, lamp, and URL safety helpers reject unsafe or invalid values", () => {
  assert.equal(buildLocalScoreInfo({ perfect: 100, great: 0, totalnotes: 100, playcount: 1 }).scoreRate, 100);
  assert.equal(normalizeLocalScoreLamp(5, 1), "FULL COMBO");
  assert.equal(normalizeLocalScoreLamp(0, 0), "NO PLAY");
  assert.equal(buildRivalScoreInfo({ r_perfect: 95, r_great: 5, r_totalnotes: 100 }).scoreRate, 97.5);

  assert.equal(isBlockedIpAddress("127.0.0.1"), true);
  assert.equal(isBlockedIpAddress("192.168.1.10"), true);
  assert.equal(isBlockedIpAddress("8.8.8.8"), false);
  assert.throws(() => normalizeRemoteUrl("file:///C:/secret.db"), /http \/ https/);
  assert.throws(() => normalizeRemoteUrl("http://127.0.0.1:4173/"), /ローカルURL/);
});

test("local API accepts loopback health requests and rejects invalid hosts or tokens", async () => {
  const appServer = createAppServer();
  await new Promise((resolve) => appServer.listen(0, "127.0.0.1", resolve));
  const address = appServer.address();
  const port = address.port;

  try {
    const health = await request(port, "/api/health");
    assert.equal(health.statusCode, 200);
    assert.deepEqual(JSON.parse(health.body), { ok: true });

    const invalidHost = await request(port, "/api/health", {
      headers: { Host: `example.test:${port}` },
    });
    assert.equal(invalidHost.statusCode, 403);

    const missingToken = await request(port, "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(missingToken.statusCode, 403);
  } finally {
    await new Promise((resolve, reject) => appServer.close((error) => (error ? reject(error) : resolve())));
  }
});
