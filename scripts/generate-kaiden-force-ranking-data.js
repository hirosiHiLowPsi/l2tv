const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { __test, getForceRatingTier } = require("../server");

const projectRoot = path.resolve(__dirname, "..");
const archiveDbPath = path.resolve(
  process.argv[2] ||
    "C:/Users/turug/Downloads/lr2ir-archive-v3.db/lr2ir-archive.db",
);
const constantsPath = path.resolve(
  process.argv[3] || path.join(projectRoot, "public", "data", "force-chart-constants.json"),
);
const outputDir = path.resolve(
  process.argv[4] || path.join(projectRoot, "outputs", "force-kaiden-ranking-20260709"),
);

const FORCE_RATING_MAX = 30;
const KAI_DEN_COURSE_ID = 11100;
const KAI_DEN_CONSTANT = 24.44;
const TARGET_COUNT = 51;
const CHART_TARGET_COUNT = 50;
const BEST_TARGET_COUNT = 20;

const MANUAL_EXCLUDED_PLAYER_IDS = new Set([
  114328,
  108312,
  144372,
  141249,
  159674,
  162280,
  120831,
  153667,
  139857,
]);

const FORCE_LAMP_COEFFICIENTS = new Map([
  ["FULLCOMBO", 1],
  ["★FULLCOMBO", 1],
  ["FULL COMBO", 1],
  ["MAX", 1],
  ["PERFECT", 1],
  ["EX HARD CLEAR", 1],
  ["HARD", 1],
  ["HARD CLEAR", 1],
  ["CLEAR", 1],
  ["NORMAL CLEAR", 1],
  ["EASY", 1],
  ["EASY CLEAR", 1],
  ["FAILED", 1],
]);

const FORCE_DAN_LAMP_COEFFICIENTS = new Map([
  ["HARD", 1],
  ["HARD CLEAR", 1],
  ["FULL COMBO", 1],
  ["FULLCOMBO", 1],
  ["★FULLCOMBO", 1],
  ["CLEAR", 1],
  ["NORMAL CLEAR", 1],
]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeLamp(clearType) {
  const value = normalizeText(clearType).toUpperCase();
  if (value.includes("FULL")) return "FULL COMBO";
  if (value.includes("EX HARD")) return "EX HARD CLEAR";
  if (value.includes("HARD")) return "HARD CLEAR";
  if (value.includes("EASY")) return "EASY CLEAR";
  if (value.includes("CLEAR") || value === "NC") return "CLEAR";
  if (value.includes("FAILED") || value === "FAIL") return "FAILED";
  return value || "NO PLAY";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function loadConstants() {
  const payload = JSON.parse(fs.readFileSync(constantsPath, "utf8"));
  const charts = (payload.charts || [])
    .map((chart) => ({
      md5: normalizeText(chart.md5).toLowerCase(),
      chartConstant: Number(chart.chartConstant),
      source: normalizeText(chart.source),
      sourceTable: normalizeText(chart.sourceTable),
      difficulty: normalizeText(chart.difficulty),
    }))
    .filter((chart) => chart.md5 && Number.isFinite(chart.chartConstant));
  return { payload, charts };
}

function loadChartTitles(database, charts) {
  const byMd5 = new Map();
  const statement = database.prepare("SELECT title, artist FROM chart WHERE md5 = ?");
  for (const chart of charts) {
    const row = statement.get(chart.md5);
    byMd5.set(chart.md5, {
      title: normalizeText(row?.title),
      artist: normalizeText(row?.artist),
    });
  }
  return byMd5;
}

function loadKaidenPassers(database) {
  const rows = database
    .prepare(
      `SELECT
         cr.rank AS course_rank,
         cr.player_id,
         cr.player_name,
         cr.dan,
         cr.clear_type AS course_lamp,
         cr.letter_rank AS course_letter_rank,
         cr.score AS course_score,
         cr.score_max AS course_score_max,
         u.songs_played,
         u.play_count
       FROM course_ranking cr
       JOIN user u ON u.player_id = cr.player_id
       WHERE cr.course_id = ?
         AND cr.clear_type <> 'FAILED'
         AND cr.is_cheated = 0
         AND u.is_cheater = 0
         AND u.songs_played >= 50
       ORDER BY cr.rank`,
    )
    .all(KAI_DEN_COURSE_ID);
  return rows.filter((row) => !MANUAL_EXCLUDED_PLAYER_IDS.has(Number(row.player_id)));
}

function buildKaidenRanking(database, charts) {
  const titleByMd5 = loadChartTitles(database, charts);
  const passers = loadKaidenPassers(database);
  const passersById = new Map(
    passers.map((passer) => [
      Number(passer.player_id),
      {
        ...passer,
        candidates: [],
      },
    ]),
  );
  const playerIds = [...passersById.keys()];
  if (!playerIds.length) {
    return { ranking: [], details: [], excluded: [] };
  }

  const placeholders = playerIds.map(() => "?").join(",");
  const scoreStatement = database.prepare(
    `SELECT
       pb.md5,
       pb.player_id,
       pb.clear_type,
       pb.letter_rank,
       pb.score,
       pb.score_max
     FROM pb
     WHERE pb.md5 = ?
       AND pb.player_id IN (${placeholders})
       AND pb.is_cheated = 0`,
  );

  for (const chart of charts) {
    const scoreRows = scoreStatement.all(chart.md5, ...playerIds);
    const titleInfo = titleByMd5.get(chart.md5) || {};
    for (const score of scoreRows) {
      const player = passersById.get(Number(score.player_id));
      const lamp = normalizeLamp(score.clear_type);
      const lampCoefficient = FORCE_LAMP_COEFFICIENTS.get(lamp);
      const scoreMax = Number(score.score_max);
      const exScore = Number(score.score);
      if (
        !player ||
        !lampCoefficient ||
        !Number.isFinite(exScore) ||
        !Number.isFinite(scoreMax) ||
        scoreMax <= 0
      ) {
        continue;
      }
      const scoreRate = clamp(exScore / scoreMax, 0, 1);
      const scoreCoefficient = __test.calculateForceScoreCoefficient(scoreRate);
      player.candidates.push({
        candidateType: "chart",
        md5: chart.md5,
        title: titleInfo.title || chart.md5,
        artist: titleInfo.artist || "",
        sourceTable: chart.sourceTable,
        difficulty: chart.difficulty,
        lamp,
        letterRank: normalizeText(score.letter_rank),
        score: exScore,
        scoreMax,
        scoreRate,
        scoreCoefficient,
        lampCoefficient,
        chartConstant: chart.chartConstant,
        force: chart.chartConstant * scoreCoefficient * lampCoefficient,
      });
    }
  }

  const excluded = [];
  const ranking = [];
  const details = [];
  for (const player of passersById.values()) {
    player.candidates.sort(
      (left, right) =>
        right.force - left.force ||
        right.chartConstant - left.chartConstant ||
        left.md5.localeCompare(right.md5),
    );
    if (player.candidates.length < CHART_TARGET_COUNT) {
      excluded.push({
        playerId: Number(player.player_id),
        playerName: normalizeText(player.player_name),
        playedForceCharts: player.candidates.length,
        reason: "FORCE対象譜面のプレイ数が50未満",
      });
      continue;
    }

    const courseLamp = normalizeLamp(player.course_lamp);
    const danLampCoefficient = FORCE_DAN_LAMP_COEFFICIENTS.get(courseLamp) || 1;
    const courseScore = Number(player.course_score);
    const courseScoreMax = Number(player.course_score_max);
    const courseScoreRate =
      Number.isFinite(courseScore) && Number.isFinite(courseScoreMax) && courseScoreMax > 0
        ? clamp(courseScore / courseScoreMax, 0, 1)
        : null;
    const danScoreCoefficient =
      courseScoreRate == null
        ? 1
        : __test.calculateForceDanScoreCoefficient(courseScoreRate, { courseId: KAI_DEN_COURSE_ID });
    const best50 = player.candidates.slice(0, CHART_TARGET_COUNT);
    const targets = [
      ...best50,
      {
        candidateType: "dan",
        md5: "",
        title: "GENOSIDE2018 発狂皆伝",
        artist: "",
        sourceTable: "段位認定",
        difficulty: "★★",
        lamp: courseLamp,
        letterRank: normalizeText(player.course_letter_rank),
        score: courseScore,
        scoreMax: courseScoreMax,
        scoreRate: courseScoreRate,
        scoreCoefficient: danScoreCoefficient,
        lampCoefficient: danLampCoefficient,
        chartConstant: KAI_DEN_CONSTANT,
        force: KAI_DEN_CONSTANT * danLampCoefficient * danScoreCoefficient,
      },
    ].sort(
      (left, right) =>
        right.force - left.force ||
        right.chartConstant - left.chartConstant ||
        left.md5.localeCompare(right.md5),
    );
    const broadAverage = targets.reduce((sum, target) => sum + target.force, 0) / TARGET_COUNT;
    const best20Average =
      targets.slice(0, BEST_TARGET_COUNT).reduce((sum, target) => sum + target.force, 0) /
      BEST_TARGET_COUNT;
    const forceRate = clamp(broadAverage, 0, FORCE_RATING_MAX);
    const tier = getForceRatingTier(forceRate);

    ranking.push({
      playerId: Number(player.player_id),
      playerName: normalizeText(player.player_name),
      dan: normalizeText(player.dan),
      songsPlayed: Number(player.songs_played),
      playCount: Number(player.play_count),
      courseRank: Number(player.course_rank),
      courseLamp,
      forceRate,
      title: tier.title,
      best20Average,
      broadAverage,
      playedForceCharts: player.candidates.length,
    });
    targets.forEach((target, index) => {
      details.push({
        playerId: Number(player.player_id),
        playerName: normalizeText(player.player_name),
        targetRank: index + 1,
        ...target,
      });
    });
  }

  ranking.sort(
    (left, right) =>
      right.forceRate - left.forceRate ||
      right.broadAverage - left.broadAverage ||
      left.playerId - right.playerId,
  );
  ranking.forEach((row, index) => {
    row.ratingRank = index + 1;
  });
  const rankByPlayerId = new Map(ranking.map((row) => [row.playerId, row.ratingRank]));
  details.sort(
    (left, right) =>
      rankByPlayerId.get(left.playerId) - rankByPlayerId.get(right.playerId) ||
      left.targetRank - right.targetRank,
  );

  return { ranking: ranking.slice(0, 50), details: details.filter((row) => (rankByPlayerId.get(row.playerId) || 999) <= 50), excluded };
}

if (!fs.existsSync(archiveDbPath)) {
  throw new Error(`LR2IR Archive database not found: ${archiveDbPath}`);
}
if (!fs.existsSync(constantsPath)) {
  throw new Error(`Force constants not found: ${constantsPath}`);
}

fs.mkdirSync(outputDir, { recursive: true });
const { payload, charts } = loadConstants();
const database = new DatabaseSync(archiveDbPath, { readonly: true });
try {
  const kaiden = buildKaidenRanking(database, charts);
  const report = {
    generatedAt: new Date().toISOString(),
    archiveDbPath,
    constantsPath,
    constantsVersion: payload.version,
    chartConstantMethod: payload.chartConstantMethod,
    forceFormula: {
      chartForce: "chartConstant * scoreCoefficient",
      forceRate: "51-target average",
      scoreCoefficient:
        "below AAA: rounded EX score rate; AAA to 94.44%: linearly maps 0.900 to 0.980; 94.44% to MAX: linearly maps 0.980 to 1.000",
      lampCoefficient: "not used; played clear lamps are valued by score only",
    },
    targetCourse: {
      courseId: KAI_DEN_COURSE_ID,
      title: "GENOSIDE2018 発狂皆伝",
      chartConstant: KAI_DEN_CONSTANT,
    },
    sourceTables: payload.sourceTables,
    summary: {
      forceCharts: charts.length,
      passers: loadKaidenPassers(database).length,
      rankedPlayers: kaiden.ranking.length,
      detailRows: kaiden.details.length,
      excludedPlayers: kaiden.excluded.length,
    },
    kaiden,
  };
  const outputPath = path.join(outputDir, "GENOSIDE2018_Hakkyou_Kaiden_FORCE_RATE_TOP50.json");
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        outputPath,
        ...report.summary,
        top5: kaiden.ranking.slice(0, 5).map((row) => ({
          rank: row.ratingRank,
          playerName: row.playerName,
          playerId: row.playerId,
          forceRate: round(row.forceRate, 3),
          title: row.title,
        })),
      },
      null,
      2,
    ),
  );
} finally {
  database.close();
}
