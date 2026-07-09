const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { __test, getForceRatingTier } = require("../server");

const projectRoot = path.resolve(__dirname, "..");
const archiveDbPath = path.resolve(projectRoot, "..", "lr2ir-archive.db");
const inputPath = path.resolve(
  process.argv[2] ||
    path.join(
      projectRoot,
      "outputs",
      "force-irt-pretest-high17-27-20260623",
      "irt-force-constant-pretest-data.json",
    ),
);
const playerId = Number(process.argv[3] || 3906);

const SCORE_TARGET_RATE = 0.9444;
const SCORE_BONUS_BASE_RATE = 0.2;
const SCORE_BONUS_SCALE = 0.35;
const SCORE_BONUS_MIN = -0.5;
const SCORE_BONUS_MAX = 1.5;
const SCORE_BONUS_RELIABILITY_CLEAR_COUNT = 100;
const DEVIATION_WEIGHT = 0.75;
const DEVIATION_MIN = -3.0;
const DEVIATION_MAX = 2.0;
const OVERJOY_COURSE_ID = 11099;
const OVERJOY_DAN_CONSTANT = 26.81;
const FORCE_RATING_MAX = 30;
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
const FORCE_DAN_LAMP_COEFFICIENTS = new Map([
  ["FULLCOMBO", 1],
  ["★FULLCOMBO", 1],
  ["HARD", 1],
  ["HARD CLEAR", 1],
  ["CLEAR", 1],
  ["NORMAL CLEAR", 1],
]);
const CLEAR_LAMPS = new Set([
  "EASY",
  "EASY CLEAR",
  "CLEAR",
  "NORMAL CLEAR",
  "HARD",
  "HARD CLEAR",
  "FULLCOMBO",
  "★FULLCOMBO",
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeLamp(value) {
  return normalizeText(value).toUpperCase();
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function cappedDeviationConstant(chart) {
  const nominalLevel = Number(chart.nominalLevel);
  if (nominalLevel >= 28) {
    return 27;
  }
  const base = clamp(nominalLevel, 1, 27);
  const irt = Number(chart.newConstant);
  const deviation = clamp((irt - base) * DEVIATION_WEIGHT, DEVIATION_MIN, DEVIATION_MAX);
  return round(clamp(base + deviation, 1, 27), 2);
}

function loadCharts() {
  const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  return payload.charts
    .map((chart) => ({
      md5: normalizeText(chart.md5).toLowerCase(),
      title: normalizeText(chart.title),
      sourceTable: normalizeText(chart.sourceTable),
      difficulty: normalizeText(chart.difficulty),
      nominalLevel: Number(chart.nominalLevel),
      irtConstant: Number(chart.newConstant),
      baseConstant: cappedDeviationConstant(chart),
    }))
    .filter((chart) => /^[0-9a-f]{32}$/.test(chart.md5) && Number.isFinite(chart.baseConstant));
}

function calculateScoreBonus(clearPlayers, score9444Players) {
  const p = (score9444Players + 1) / (clearPlayers + 2);
  const rawBonus = clamp(
    Math.log2(SCORE_BONUS_BASE_RATE / p) * SCORE_BONUS_SCALE,
    SCORE_BONUS_MIN,
    SCORE_BONUS_MAX,
  );
  const reliability = clamp(clearPlayers / SCORE_BONUS_RELIABILITY_CLEAR_COUNT, 0, 1);
  return {
    score9444Rate: p,
    rawScoreBonus: rawBonus,
    reliability,
    scoreBonus: rawBonus * reliability,
  };
}

function applyScore9444Bonus(database, charts) {
  const statement = database.prepare(
    `SELECT
       COUNT(*) AS clear_players,
       SUM(CASE WHEN CAST(pb.score AS REAL) / NULLIF(pb.score_max, 0) >= ? THEN 1 ELSE 0 END) AS score9444_players
     FROM pb
     JOIN user u ON u.player_id = pb.player_id
     WHERE pb.md5 = ?
       AND pb.is_cheated = 0
       AND u.is_cheater = 0
       AND pb.score_max > 0
       AND pb.clear_type IN ('EASY', 'EASY CLEAR', 'CLEAR', 'NORMAL CLEAR', 'HARD', 'HARD CLEAR', 'FULLCOMBO', '★FULLCOMBO')`,
  );
  return charts.map((chart) => {
    const row = statement.get(SCORE_TARGET_RATE, chart.md5);
    const clearPlayers = Number(row?.clear_players || 0);
    const score9444Players = Number(row?.score9444_players || 0);
    const bonus = calculateScoreBonus(clearPlayers, score9444Players);
    const chartConstant = round(clamp(chart.baseConstant + bonus.scoreBonus, 1, 27), 2);
    return {
      ...chart,
      clearPlayers,
      score9444Players,
      score9444Rate: bonus.score9444Rate,
      rawScoreBonus: bonus.rawScoreBonus,
      scoreBonusReliability: bonus.reliability,
      scoreBonus: bonus.scoreBonus,
      chartConstant,
    };
  });
}

function buildPlayerCandidates(database, charts, targetPlayerId) {
  const constantsByMd5 = new Map(charts.map((chart) => [chart.md5, chart]));
  const candidates = [];
  const md5s = charts.map((chart) => chart.md5);
  const batchSize = 700;
  for (let index = 0; index < md5s.length; index += batchSize) {
    const batch = md5s.slice(index, index + batchSize);
    const placeholders = batch.map(() => "?").join(",");
    const rows = database
      .prepare(
        `SELECT pb.md5, pb.clear_type, pb.letter_rank, pb.score, pb.score_max, chart.title
         FROM pb
         LEFT JOIN chart ON chart.md5 = pb.md5
         WHERE pb.player_id = ?
           AND pb.is_cheated = 0
           AND pb.md5 IN (${placeholders})`,
      )
      .all(targetPlayerId, ...batch);
    for (const row of rows) {
      const chart = constantsByMd5.get(normalizeText(row.md5).toLowerCase());
      if (!chart) {
        continue;
      }
      const lamp = normalizeLamp(row.clear_type);
      const lampCoefficient = FORCE_LAMP_COEFFICIENTS.get(lamp);
      const scoreMax = Number(row.score_max);
      const exScore = Number(row.score);
      if (!lampCoefficient || !Number.isFinite(exScore) || !Number.isFinite(scoreMax) || scoreMax <= 0) {
        continue;
      }
      const scoreRate = clamp(exScore / scoreMax, 0, 1);
      const scoreCoefficient = __test.calculateForceScoreCoefficient(scoreRate);
      const force = chart.chartConstant * scoreCoefficient * lampCoefficient;
      candidates.push({
        candidateType: "chart",
        md5: chart.md5,
        title: chart.title || normalizeText(row.title),
        sourceTable: chart.sourceTable,
        difficulty: chart.difficulty,
        lamp,
        letterRank: row.letter_rank,
        score: exScore,
        scoreMax,
        scoreRate: scoreRate * 100,
        scoreCoefficient,
        lampCoefficient,
        baseConstant: chart.baseConstant,
        scoreBonus: chart.scoreBonus,
        chartConstant: chart.chartConstant,
        clearPlayers: chart.clearPlayers,
        score9444Players: chart.score9444Players,
        force,
      });
    }
  }
  return candidates;
}

function buildOverjoyDanCandidate(database, targetPlayerId) {
  const row = database
    .prepare(
      `SELECT clear_type, letter_rank, score, score_max
       FROM course_ranking
       WHERE player_id = ?
         AND course_id = ?
         AND clear_type <> 'FAILED'
         AND is_cheated = 0
       ORDER BY rank
       LIMIT 1`,
    )
    .get(targetPlayerId, OVERJOY_COURSE_ID);
  if (!row) {
    return null;
  }
  const lamp = normalizeLamp(row.clear_type);
  const lampCoefficient = FORCE_DAN_LAMP_COEFFICIENTS.get(lamp);
  if (!lampCoefficient) {
    return null;
  }
  return {
    candidateType: "dan",
    md5: "",
    title: "GENOSIDE2018 Overjoy",
    sourceTable: "段位認定",
    difficulty: "(^^)",
    lamp,
    letterRank: row.letter_rank,
    score: Number(row.score),
    scoreMax: Number(row.score_max),
    scoreRate: (Number(row.score) / Number(row.score_max)) * 100,
    scoreCoefficient: null,
    lampCoefficient,
    baseConstant: OVERJOY_DAN_CONSTANT,
    scoreBonus: 0,
    chartConstant: OVERJOY_DAN_CONSTANT,
    force: OVERJOY_DAN_CONSTANT * lampCoefficient,
  };
}

function buildForceRating(candidates, danCandidate) {
  candidates.sort(
    (left, right) =>
      right.force - left.force ||
      right.chartConstant - left.chartConstant ||
      String(left.md5 || "").localeCompare(String(right.md5 || "")),
  );
  const best50 = candidates.slice(0, 50);
  const targets = (danCandidate ? [...best50, danCandidate] : best50).sort(
    (left, right) =>
      right.force - left.force ||
      right.chartConstant - left.chartConstant ||
      String(left.md5 || "").localeCompare(String(right.md5 || "")),
  );
  const broadAverage = targets.reduce((sum, chart) => sum + chart.force, 0) / targets.length;
  const best20 = targets.slice(0, 20);
  const best20Average = best20.reduce((sum, chart) => sum + chart.force, 0) / 20;
  const rating = clamp(broadAverage, 0, FORCE_RATING_MAX);
  const tier = getForceRatingTier(rating);
  return {
    rating,
    title: tier.title,
    candidates: candidates.length,
    targetCount: targets.length,
    best20Average,
    broadAverage,
    targets,
  };
}

if (!fs.existsSync(archiveDbPath)) {
  throw new Error(`LR2IR Archive database not found: ${archiveDbPath}`);
}
if (!fs.existsSync(inputPath)) {
  throw new Error(`IRT constants data not found: ${inputPath}`);
}

const database = new DatabaseSync(archiveDbPath, { readonly: true });
try {
  const charts = applyScore9444Bonus(database, loadCharts());
  const candidates = buildPlayerCandidates(database, charts, playerId);
  const danCandidate = buildOverjoyDanCandidate(database, playerId);
  const result = buildForceRating(candidates, danCandidate);
  const summary = {
    playerId,
    rating: round(result.rating, 3),
    title: result.title,
    playedForceCharts: result.candidates,
    targetCount: result.targetCount,
    best20Average: round(result.best20Average, 3),
    broadAverage: round(result.broadAverage, 3),
    averageScoreBonusTop50: round(
      result.targets
        .filter((target) => target.candidateType === "chart")
        .reduce((sum, target) => sum + target.scoreBonus, 0) /
        result.targets.filter((target) => target.candidateType === "chart").length,
      3,
    ),
    top10: result.targets.slice(0, 10).map((target) => ({
      rank: target.rank,
      type: target.candidateType,
      title: target.title,
      difficulty: target.difficulty,
      lamp: target.lamp,
      scoreRate: target.scoreRate == null ? null : round(target.scoreRate, 2),
      baseConstant: round(target.baseConstant, 2),
      scoreBonus: round(target.scoreBonus, 3),
      finalConstant: round(target.chartConstant, 2),
      clearPlayers: target.clearPlayers ?? null,
      score9444Players: target.score9444Players ?? null,
      force: round(target.force, 3),
    })),
  };
  result.targets.forEach((target, index) => {
    target.rank = index + 1;
  });
  console.log(JSON.stringify(summary, null, 2));
} finally {
  database.close();
}
