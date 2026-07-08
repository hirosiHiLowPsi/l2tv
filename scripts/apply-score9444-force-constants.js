const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const currentConstantsPath = path.join(projectRoot, "public", "data", "force-chart-constants.json");
const irtConstantsPath = path.join(
  projectRoot,
  "outputs",
  "force-irt-pretest-high17-27-20260623",
  "irt-force-constant-pretest-data.json",
);
const archiveDbPath = path.resolve(projectRoot, "..", "lr2ir-archive.db");
const outputDir = path.join(projectRoot, "outputs", "force-score9444-constants-20260623");
const auditPath = path.join(outputDir, "force-chart-constants-score9444-audit.json");

const SCORE_TARGET_RATE = 0.9444;
const SCORE_BONUS_BASE_RATE = 0.2;
const SCORE_BONUS_SCALE = 0.35;
const SCORE_BONUS_MIN = -0.5;
const SCORE_BONUS_MAX = 1.5;
const SCORE_BONUS_RELIABILITY_CLEAR_COUNT = 100;
const SCORE_BONUS_MIN_ACHIEVERS = 10;

const DEVIATION_WEIGHT = 0.75;
const DEVIATION_MIN = -3.0;
const DEVIATION_MAX = 2.0;
const CONSTANT_MIN = 1;
const CONSTANT_MAX = 27;

const CLEAR_LAMPS = [
  "EASY",
  "EASY CLEAR",
  "CLEAR",
  "NORMAL CLEAR",
  "HARD",
  "HARD CLEAR",
  "FULLCOMBO",
  "★FULLCOMBO",
];

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function md5Of(chart) {
  return normalizeText(chart?.md5).toLowerCase();
}

function cappedDeviationConstant(chart) {
  const nominalLevel = Number(chart.nominalLevel);
  if (nominalLevel >= 28) {
    return CONSTANT_MAX;
  }
  const base = clamp(nominalLevel, CONSTANT_MIN, CONSTANT_MAX);
  const irt = Number(chart.newConstant);
  const deviation = clamp((irt - base) * DEVIATION_WEIGHT, DEVIATION_MIN, DEVIATION_MAX);
  return round(clamp(base + deviation, CONSTANT_MIN, CONSTANT_MAX), 2);
}

function calculateScore9444Bonus(clearPlayers, score9444Players) {
  if (score9444Players < SCORE_BONUS_MIN_ACHIEVERS) {
    return {
      score9444Rate: 0,
      rawScoreBonus: 0,
      reliability: 0,
      scoreBonus: 0,
      applied: false,
    };
  }
  const score9444Rate = (score9444Players + 1) / (clearPlayers + 2);
  const rawScoreBonus = clamp(
    Math.log2(SCORE_BONUS_BASE_RATE / score9444Rate) * SCORE_BONUS_SCALE,
    SCORE_BONUS_MIN,
    SCORE_BONUS_MAX,
  );
  const reliability = clamp(clearPlayers / SCORE_BONUS_RELIABILITY_CLEAR_COUNT, 0, 1);
  return {
    score9444Rate,
    rawScoreBonus,
    reliability,
    scoreBonus: rawScoreBonus * reliability,
    applied: true,
  };
}

function loadScore9444Stats(database, md5s) {
  const placeholders = CLEAR_LAMPS.map(() => "?").join(",");
  const statement = database.prepare(
    `SELECT
       COUNT(DISTINCT pb.player_id) AS clear_players,
       COUNT(DISTINCT CASE
         WHEN CAST(pb.score AS REAL) / NULLIF(pb.score_max, 0) >= ?
         THEN pb.player_id
       END) AS score9444_players
     FROM pb
     JOIN user u ON u.player_id = pb.player_id
     WHERE pb.md5 = ?
       AND pb.is_cheated = 0
       AND u.is_cheater = 0
       AND pb.score_max > 0
       AND pb.clear_type IN (${placeholders})`,
  );

  const result = new Map();
  for (const md5 of md5s) {
    const row = statement.get(SCORE_TARGET_RATE, md5, ...CLEAR_LAMPS);
    result.set(md5, {
      clearPlayers: Number(row?.clear_players || 0),
      score9444Players: Number(row?.score9444_players || 0),
    });
  }
  return result;
}

function buildUpdatedChart(existingChart, irtChart, scoreStats) {
  const baseConstant = cappedDeviationConstant(irtChart);
  const bonus = calculateScore9444Bonus(scoreStats.clearPlayers, scoreStats.score9444Players);
  const chartConstant = round(
    clamp(baseConstant + bonus.scoreBonus, CONSTANT_MIN, CONSTANT_MAX),
    2,
  );

  const updated = {
    md5: md5Of(existingChart),
    title: normalizeText(irtChart.title),
    chartConstant,
    source: existingChart.source,
    sourceTable: normalizeText(irtChart.sourceTable),
    difficulty: normalizeText(irtChart.difficulty),
    nominalLevel: Number(irtChart.nominalLevel),
    irtConstant: round(Number(irtChart.newConstant), 2),
    cappedDeviationConstant: baseConstant,
    score9444ClearPlayers: scoreStats.clearPlayers,
    score9444Players: scoreStats.score9444Players,
    score9444Rate: round(bonus.score9444Rate, 6),
    score9444RawBonus: round(bonus.rawScoreBonus, 6),
    score9444Reliability: round(bonus.reliability, 6),
    score9444Bonus: round(bonus.scoreBonus, 6),
    score9444CorrectionApplied: bonus.applied,
    sampledPlayers: Number(irtChart.sampledPlayers || 0),
    sampledFailed: Number(irtChart.sampledFailed || 0),
    sampledEasy: Number(irtChart.sampledEasy || 0),
    sampledNormal: Number(irtChart.sampledNormal || 0),
    sampledHard: Number(irtChart.sampledHard || 0),
    sampledFullCombo: Number(irtChart.sampledFullCombo || 0),
  };

  if (existingChart.level !== undefined) {
    updated.level = existingChart.level;
  }
  for (const key of [
    "archivePlayers",
    "archiveFullCombo",
    "archiveHardClear",
    "archiveNormalClear",
    "archiveEasyClear",
    "archiveFailed",
    "archiveUnclassified",
  ]) {
    if (existingChart[key] !== undefined) {
      updated[key] = existingChart[key];
    }
  }

  return updated;
}

function assertSameChartSet(currentCharts, irtCharts) {
  const currentMd5s = new Set(currentCharts.map(md5Of));
  const irtMd5s = new Set(irtCharts.map(md5Of));
  const missingFromIrt = [...currentMd5s].filter((md5) => !irtMd5s.has(md5));
  const missingFromCurrent = [...irtMd5s].filter((md5) => !currentMd5s.has(md5));
  if (missingFromIrt.length || missingFromCurrent.length) {
    throw new Error(
      [
        "The current FORCE chart set and IRT chart set do not match.",
        `missingFromIrt=${missingFromIrt.slice(0, 5).join(",")}`,
        `missingFromCurrent=${missingFromCurrent.slice(0, 5).join(",")}`,
      ].join(" "),
    );
  }
}

function summarize(charts) {
  const constants = charts.map((chart) => Number(chart.chartConstant));
  const bonuses = charts.map((chart) => Number(chart.score9444Bonus));
  return {
    charts: charts.length,
    minConstant: round(Math.min(...constants), 2),
    maxConstant: round(Math.max(...constants), 2),
    averageConstant: round(constants.reduce((sum, value) => sum + value, 0) / constants.length, 3),
    maxedCharts: charts.filter((chart) => chart.chartConstant >= CONSTANT_MAX).length,
    minScore9444Bonus: round(Math.min(...bonuses), 3),
    maxScore9444Bonus: round(Math.max(...bonuses), 3),
    averageScore9444Bonus: round(bonuses.reduce((sum, value) => sum + value, 0) / bonuses.length, 3),
    insufficientScore9444ChartsSkipped: charts.filter(
      (chart) =>
        chart.score9444Players < SCORE_BONUS_MIN_ACHIEVERS &&
        !chart.score9444CorrectionApplied,
    ).length,
  };
}

function main() {
  const current = readJson(currentConstantsPath);
  const irtPayload = readJson(irtConstantsPath);
  const currentCharts = current.charts || [];
  const irtCharts = irtPayload.charts || [];
  assertSameChartSet(currentCharts, irtCharts);

  const irtByMd5 = new Map(irtCharts.map((chart) => [md5Of(chart), chart]));
  const md5s = currentCharts.map(md5Of);
  const database = new DatabaseSync(archiveDbPath, { readonly: true });
  const score9444Stats = loadScore9444Stats(database, md5s);
  database.close();

  const charts = currentCharts.map((existingChart) => {
    const md5 = md5Of(existingChart);
    return buildUpdatedChart(existingChart, irtByMd5.get(md5), score9444Stats.get(md5));
  });

  const updated = {
    version: 6,
    generatedAt: "2026-06-23",
    formula: current.formula,
    chartConstantMethod:
      "IRT 2000-sample nominal capped deviation plus clear-player 94.44% score difficulty bonus; fewer than 10 achievers receive no score bonus",
    archiveSource: current.archiveSource,
    sourceTables: current.sourceTables,
    overjoySourceScope: current.overjoySourceScope,
    overjoyAllowlistCharts: current.overjoyAllowlistCharts,
    overjoyAllowlistSource: current.overjoyAllowlistSource,
    overjoyExcludedByAllowlistCount: current.overjoyExcludedByAllowlistCount,
    levelConversion: irtPayload.levelConversion,
    irtSampling: {
      sourceDatabase: irtPayload.sourceDatabase,
      sampleLimitPerBand: irtPayload.sampleLimitPerBand,
      minimumCoverageRate: irtPayload.minimumCoverageRate,
      uniqueSampledPlayers: irtPayload.uniqueSampledPlayers,
      observations: irtPayload.observations,
      raschIterations: irtPayload.raschIterations,
      itemShrinkageStrength: irtPayload.itemShrinkageStrength,
      bands: irtPayload.bands,
    },
    nominalDeviationCorrection: {
      base: "difficulty table nominal level; ★★0 is treated as ★20",
      unreachableLevel: "nominalLevel >= 28 is fixed to 27.00",
      deviationWeight: DEVIATION_WEIGHT,
      deviationMinimum: DEVIATION_MIN,
      deviationMaximum: DEVIATION_MAX,
      constantMinimum: CONSTANT_MIN,
      constantMaximum: CONSTANT_MAX,
    },
    score9444Correction: {
      targetScoreRate: SCORE_TARGET_RATE,
      countedPlayers: "players who cleared the chart with EC or higher",
      ignoredPlayers: "CHEATED scores and cheater accounts",
      minimumAchievers: SCORE_BONUS_MIN_ACHIEVERS,
      insufficientAchieverRule:
        "if score9444Players is fewer than 10, the score difficulty bonus is not applied",
      smoothedRate: "(score9444Players + 1) / (score9444ClearPlayers + 2)",
      rawBonus: "clamp(log2(0.20 / smoothedRate) * 0.35, -0.50, +1.50)",
      reliability: "clamp(score9444ClearPlayers / 100, 0, 1)",
      finalBonus: "rawBonus * reliability",
    },
    forceRatingTargetCount: "BEST50 charts plus highest passed dan course when available",
    insaneCharts: current.insaneCharts,
    overjoyCharts: current.overjoyCharts,
    overjoyOverlapCount: current.overjoyOverlapCount,
    archiveCharts: current.archiveCharts,
    archiveMissingCharts: current.archiveMissingCharts,
    archiveMissingMd5s: current.archiveMissingMd5s,
    excludedPlayers: current.excludedPlayers,
    excludedPlayerScoreCount: current.excludedPlayerScoreCount,
    excludedPlayerUnmatchedScores: current.excludedPlayerUnmatchedScores,
    summary: summarize(charts),
    charts,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(currentConstantsPath, `${JSON.stringify(updated)}\n`);
  fs.writeFileSync(auditPath, `${JSON.stringify(updated, null, 2)}\n`);

  console.log(JSON.stringify({
    output: currentConstantsPath,
    audit: auditPath,
    summary: updated.summary,
  }, null, 2));
}

main();
