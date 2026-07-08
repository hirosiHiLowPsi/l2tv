const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { getForceRatingTier } = require("../server");

const projectRoot = path.resolve(__dirname, "..");
const archiveDbPath = path.resolve(projectRoot, "..", "lr2ir-archive.db");
const constantsPath = path.resolve(
  process.argv[2] || path.join(projectRoot, "public", "data", "force-chart-constants.json"),
);
const outputDir = path.resolve(
  process.argv[3] ||
    path.join(projectRoot, "outputs", "force-score9444-reports-20260623"),
);

const FORCE_RATING_MAX = 30;
const OVERJOY_COURSE_ID = 11099;
const OVERJOY_DAN_CONSTANT = 26.81;
function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}
const FORCE_FC_COEFFICIENT = envNumber("FORCE_FC_COEFFICIENT", 1.02);
const FORCE_HC_COEFFICIENT = envNumber("FORCE_HC_COEFFICIENT", 0.98);
const FORCE_NC_COEFFICIENT = envNumber("FORCE_NC_COEFFICIENT", 0.93);
const FORCE_EC_COEFFICIENT = envNumber("FORCE_EC_COEFFICIENT", 0.86);
const FORCE_FAILED_COEFFICIENT = envNumber("FORCE_FAILED_COEFFICIENT", 0.5);
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
  ["FULLCOMBO", FORCE_FC_COEFFICIENT],
  ["★FULLCOMBO", FORCE_FC_COEFFICIENT],
  ["HARD", FORCE_HC_COEFFICIENT],
  ["HARD CLEAR", FORCE_HC_COEFFICIENT],
  ["CLEAR", FORCE_NC_COEFFICIENT],
  ["NORMAL CLEAR", FORCE_NC_COEFFICIENT],
  ["EASY", FORCE_EC_COEFFICIENT],
  ["EASY CLEAR", FORCE_EC_COEFFICIENT],
  ["FAILED", FORCE_FAILED_COEFFICIENT],
]);
const FORCE_DAN_LAMP_COEFFICIENTS = new Map([
  ["FULLCOMBO", 1],
  ["★FULLCOMBO", 1],
  ["HARD", 1],
  ["HARD CLEAR", 1],
  ["CLEAR", 1],
  ["NORMAL CLEAR", 1],
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeLamp(value) {
  return normalizeText(value).toUpperCase();
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function loadConstants() {
  const payload = JSON.parse(fs.readFileSync(constantsPath, "utf8"));
  const charts = (payload.charts || [])
    .map((chart) => ({
      md5: normalizeText(chart.md5).toLowerCase(),
      title: normalizeText(chart.title),
      sourceTable: normalizeText(chart.sourceTable),
      difficulty: normalizeText(chart.difficulty),
      nominalLevel: Number(chart.nominalLevel),
      irtConstant: Number(chart.irtConstant),
      cappedDeviationConstant: Number(chart.cappedDeviationConstant),
      score9444ClearPlayers: Number(chart.score9444ClearPlayers),
      score9444Players: Number(chart.score9444Players),
      score9444Rate: Number(chart.score9444Rate),
      score9444Bonus: Number(chart.score9444Bonus),
      chartConstant: Number(chart.chartConstant),
    }))
    .filter(
      (chart) =>
        /^[0-9a-f]{32}$/.test(chart.md5) && Number.isFinite(chart.chartConstant),
    );
  const constantRows = charts
    .map((chart) => ({
      sourceTable: chart.sourceTable,
      difficulty: chart.difficulty,
      title: chart.title,
      chartConstant: chart.chartConstant,
      nominalLevel: chart.nominalLevel,
      irtConstant: chart.irtConstant,
      cappedDeviationConstant: chart.cappedDeviationConstant,
      score9444ClearPlayers: chart.score9444ClearPlayers,
      score9444Players: chart.score9444Players,
      score9444Rate: chart.score9444Rate,
      score9444Bonus: chart.score9444Bonus,
    }))
    .sort(
      (left, right) =>
        right.chartConstant - left.chartConstant ||
        right.nominalLevel - left.nominalLevel ||
        left.sourceTable.localeCompare(right.sourceTable, "ja") ||
        left.difficulty.localeCompare(right.difficulty, "ja", { numeric: true }) ||
        left.title.localeCompare(right.title, "ja"),
    )
    .map((row, index) => ({ rank: index + 1, ...row }));
  return { payload, charts, constantRows };
}

function loadOverjoyPassers(database) {
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
    .all(OVERJOY_COURSE_ID);
  return rows.filter((row) => !MANUAL_EXCLUDED_PLAYER_IDS.has(Number(row.player_id)));
}

function buildOverjoyRanking(database, charts) {
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
      const scoreCoefficient = round(scoreRate, 3);
      player.candidates.push({
        candidateType: "chart",
        md5: chart.md5,
        title: chart.title,
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
    if (player.candidates.length < 50) {
      excluded.push({
        playerId: Number(player.player_id),
        playerName: player.player_name,
        playedForceCharts: player.candidates.length,
        reason: "FORCE対象譜面のプレイ数が50未満",
      });
      continue;
    }

    const courseLamp = normalizeLamp(player.course_lamp);
    const danLampCoefficient = FORCE_DAN_LAMP_COEFFICIENTS.get(courseLamp) || 1;
    const best50 = player.candidates.slice(0, 50);
    const targets = [
      ...best50,
      {
        candidateType: "dan",
        md5: "",
        title: "GENOSIDE2018 Overjoy",
        sourceTable: "段位認定",
        difficulty: "(^^)",
        lamp: courseLamp,
        letterRank: normalizeText(player.course_letter_rank),
        score: Number(player.course_score),
        scoreMax: Number(player.course_score_max),
        scoreRate: null,
        scoreCoefficient: null,
        lampCoefficient: danLampCoefficient,
        chartConstant: OVERJOY_DAN_CONSTANT,
        force: OVERJOY_DAN_CONSTANT * danLampCoefficient,
      },
    ].sort(
      (left, right) =>
        right.force - left.force ||
        right.chartConstant - left.chartConstant ||
        left.md5.localeCompare(right.md5),
    );
    const broadAverage = targets.reduce((sum, target) => sum + target.force, 0) / 51;
    const best20Average =
      targets.slice(0, 20).reduce((sum, target) => sum + target.force, 0) / 20;
    const forceRate = clamp(best20Average * 0.8 + broadAverage * 0.2, 0, FORCE_RATING_MAX);
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
      right.best20Average - left.best20Average ||
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
if (!fs.existsSync(constantsPath)) {
  throw new Error(`Force constants not found: ${constantsPath}`);
}

fs.mkdirSync(outputDir, { recursive: true });
const { payload, charts, constantRows } = loadConstants();
const database = new DatabaseSync(archiveDbPath, { readonly: true });
try {
  const overjoy = buildOverjoyRanking(database, charts);
  const report = {
    generatedAt: new Date().toISOString(),
    constantsPath,
    chartConstantMethod: payload.chartConstantMethod,
    score9444Correction: payload.score9444Correction,
    forceFormula: payload.formula,
    lampCoefficients: {
      fullCombo: FORCE_FC_COEFFICIENT,
      hardClear: FORCE_HC_COEFFICIENT,
      normalClear: FORCE_NC_COEFFICIENT,
      easyClear: FORCE_EC_COEFFICIENT,
      failed: FORCE_FAILED_COEFFICIENT,
    },
    forceRateFormula: "BEST20 average * 0.8 + 51-target average * 0.2",
    overjoyDanConstant: OVERJOY_DAN_CONSTANT,
    sourceTables: payload.sourceTables,
    constantRows,
    overjoy,
  };
  fs.writeFileSync(
    path.join(outputDir, "report-data.json"),
    `${JSON.stringify(report, null, 2)}\n`,
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
