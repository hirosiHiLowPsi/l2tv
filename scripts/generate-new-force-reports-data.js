const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { __test, getForceRatingTier } = require("../server");

const projectRoot = path.resolve(__dirname, "..");
const archiveDbPath = path.resolve(projectRoot, "..", "lr2ir-archive.db");
const outputDir = path.resolve(
  process.argv[2] || path.join(projectRoot, "outputs", "force-reports-new-constants-20260623"),
);
const constants = require("../public/data/force-chart-constants.json");
const previousPublicRows = require("../outputs/force-constants-public-20260623/force-constants-public-data.json");

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
  ["HARD", 1],
  ["HARD CLEAR", 1],
  ["CLEAR", 1],
  ["NORMAL CLEAR", 1],
  ["EASY", 1],
  ["EASY CLEAR", 1],
  ["FAILED", 1],
]);
const OVERJOY_DAN_CONSTANT = 26.81;
const OVERJOY_DAN_LAMP_COEFFICIENT = 1;
const MISSING_CHART_METADATA = new Map([
  [
    "ff2d2ffa4ae22da44b8cc3f20597a899",
    { title: "Dandelion Sparkle!! -ふわふわ-", difficulty: "★19" },
  ],
  [
    "ff82e0003d07d1933f7a12c87c84218f",
    { title: "失望Choco (・ω・)", difficulty: "★21" },
  ],
  [
    "fff439eaf47b9c8a9d2cd00f128ca902",
    { title: "Aqua Regia Squall [F]", difficulty: "★12" },
  ],
]);

function normalizeTitle(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function tableLabel(source) {
  return source === "overjoy" ? "第二期Overjoy" : "発狂BMS難易度表";
}

function buildPreviousDifficultyLookup() {
  const lookup = new Map();
  for (const row of previousPublicRows) {
    const key = `${row["難易度表"]}|${normalizeTitle(row["曲名"])}`;
    if (!lookup.has(key)) {
      lookup.set(key, row["難易度"]);
    }
  }
  return lookup;
}

function buildConstantRows(database) {
  const previousDifficulty = buildPreviousDifficultyLookup();
  const chartStatement = database.prepare("SELECT title FROM chart WHERE md5 = ?");
  const rows = constants.charts.map((chart) => {
    const fallback = MISSING_CHART_METADATA.get(chart.md5);
    const archiveChart = chartStatement.get(chart.md5);
    const title = archiveChart?.title || fallback?.title || "曲名未取得";
    const sourceTable = tableLabel(chart.source);
    const difficulty =
      chart.source === "overjoy"
        ? `★★${chart.level ?? "?"}`
        : previousDifficulty.get(`${sourceTable}|${normalizeTitle(title)}`) ||
          fallback?.difficulty ||
          "不明";
    return {
      sourceTable,
      difficulty,
      title: normalizeTitle(title),
      chartConstant: Number(chart.chartConstant),
    };
  });

  rows.sort(
    (left, right) =>
      right.chartConstant - left.chartConstant ||
      left.sourceTable.localeCompare(right.sourceTable, "ja") ||
      left.difficulty.localeCompare(right.difficulty, "ja", { numeric: true }) ||
      left.title.localeCompare(right.title, "ja"),
  );
  return rows.map((row, index) => ({ rank: index + 1, ...row }));
}

function loadOverjoyPassers(database) {
  const rows = database
    .prepare(
      `SELECT
         cr.course_id,
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
       WHERE cr.course_id = 11099
         AND cr.clear_type <> 'FAILED'
         AND cr.is_cheated = 0
         AND u.is_cheater = 0
         AND u.songs_played >= 50
       ORDER BY cr.rank`,
    )
    .all();
  return rows.filter((row) => !MANUAL_EXCLUDED_PLAYER_IDS.has(Number(row.player_id)));
}

function buildOverjoyRanking(database) {
  const passers = loadOverjoyPassers(database);
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
  const placeholders = playerIds.map(() => "?").join(",");
  const scoreStatement = database.prepare(
    `SELECT
       pb.md5,
       pb.player_id,
       pb.player_name,
       pb.clear_type,
       pb.letter_rank,
       pb.score,
       pb.score_max,
       chart.title,
       chart.artist,
       chart.level
     FROM pb
     LEFT JOIN chart ON chart.md5 = pb.md5
     WHERE pb.md5 = ?
       AND pb.player_id IN (${placeholders})
       AND pb.is_cheated = 0`,
  );

  for (const chart of constants.charts) {
    const scoreRows = scoreStatement.all(chart.md5, ...playerIds);
    for (const score of scoreRows) {
      const player = passersById.get(Number(score.player_id));
      const lampCoefficient = FORCE_LAMP_COEFFICIENTS.get(String(score.clear_type || ""));
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
      const scoreRate = Math.min(Math.max(exScore / scoreMax, 0), 1);
      const scoreCoefficient = __test.calculateForceScoreCoefficient(scoreRate);
      const force = Number(chart.chartConstant) * scoreCoefficient * lampCoefficient;
      player.candidates.push({
        candidateType: "chart",
        md5: chart.md5,
        title: normalizeTitle(score.title),
        sourceTable: tableLabel(chart.source),
        difficulty: chart.source === "overjoy" ? `★★${chart.level ?? "?"}` : "",
        lamp: score.clear_type,
        letterRank: score.letter_rank,
        score: exScore,
        scoreMax,
        scoreRate: scoreRate * 100,
        scoreCoefficient,
        lampCoefficient,
        chartConstant: Number(chart.chartConstant),
        force,
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
    if (player.candidates.length < 50) {
      excluded.push({
        playerId: Number(player.player_id),
        playerName: player.player_name,
        playedForceCharts: player.candidates.length,
        reason: "対象譜面のプレイ数が50未満",
      });
      continue;
    }

    const best50 = player.candidates.slice(0, 50);
    const danForce = OVERJOY_DAN_CONSTANT * OVERJOY_DAN_LAMP_COEFFICIENT;
    const targets = [
      ...best50,
      {
        candidateType: "dan",
        md5: "",
        title: "GENOSIDE2018 Overjoy",
        sourceTable: "段位認定",
        difficulty: "(^^)",
        lamp: player.course_lamp,
        letterRank: player.course_letter_rank,
        score: Number(player.course_score),
        scoreMax: Number(player.course_score_max),
        scoreRate: (Number(player.course_score) / Number(player.course_score_max)) * 100,
        scoreCoefficient: null,
        lampCoefficient: OVERJOY_DAN_LAMP_COEFFICIENT,
        chartConstant: OVERJOY_DAN_CONSTANT,
        force: danForce,
      },
    ].sort(
      (left, right) =>
        right.force - left.force ||
        right.chartConstant - left.chartConstant ||
        left.md5.localeCompare(right.md5),
    );
    const broadTotal = targets.reduce((sum, target) => sum + target.force, 0);
    const broadAverage = broadTotal / 51;
    const best20Average = targets.slice(0, 20).reduce((sum, target) => sum + target.force, 0) / 20;
    const forceRate = Math.min(broadAverage, 30);
    const tier = getForceRatingTier(forceRate);

    ranking.push({
      playerId: Number(player.player_id),
      playerName: player.player_name,
      dan: player.dan,
      songsPlayed: Number(player.songs_played),
      playCount: Number(player.play_count),
      courseRank: Number(player.course_rank),
      courseLamp: player.course_lamp,
      forceRate,
      title: tier.title,
      best20Average,
      broadAverage,
      best50ChartCount: best50.length,
      playedForceCharts: player.candidates.length,
    });
    targets.forEach((target, index) => {
      details.push({
        playerId: Number(player.player_id),
        playerName: player.player_name,
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

  return { ranking, details, excluded };
}

if (!fs.existsSync(archiveDbPath)) {
  throw new Error(`LR2IR Archive database not found: ${archiveDbPath}`);
}

fs.mkdirSync(outputDir, { recursive: true });
const database = new DatabaseSync(archiveDbPath, { readonly: true });
try {
  const constantRows = buildConstantRows(database);
  const overjoy = buildOverjoyRanking(database);
  fs.writeFileSync(
    path.join(outputDir, "report-data.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        lampDistributionWeights: constants.lampDistributionWeights,
        constantRows,
        overjoy,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(
    JSON.stringify(
      {
        outputDir,
        constants: constantRows.length,
        overjoyPlayers: overjoy.ranking.length,
        overjoyDetails: overjoy.details.length,
        excluded: overjoy.excluded.length,
        top5: overjoy.ranking.slice(0, 5),
      },
      null,
      2,
    ),
  );
} finally {
  database.close();
}
