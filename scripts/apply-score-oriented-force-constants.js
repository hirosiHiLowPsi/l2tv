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
const archiveDbPath = path.resolve(
  process.argv[2] || path.resolve(projectRoot, "..", "lr2ir-archive.db"),
);

const now = new Date();
const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
const outputDir = path.join(projectRoot, "outputs", `force-score-oriented-constants-${dateStamp}`);
const auditPath = path.join(outputDir, "force-chart-constants-score-oriented-audit.json");

const CONSTANT_VERSION = "score-oriented-v2";
const CONSTANT_MIN = 1;
const CONSTANT_MAX = 27;
const SAMPLE_LIMIT_PER_BAND = 2000;
const MIN_COVERAGE_RATE = 0.5;
const SCORE_DEVIATION_MIN = -1;
const SCORE_DEVIATION_MAX = 3;
const LAMP_DEVIATION_WEIGHT = 0.35;
const LAMP_DEVIATION_MIN = -1;
const LAMP_DEVIATION_MAX = 1;

const BANDS = Object.freeze([
  { id: "low", label: "低難度", min: 1, max: 8, seed: 0x1f123bb5 },
  { id: "mid", label: "中難度", min: 9, max: 16, seed: 0x54a32d19 },
  { id: "high", label: "高難度", min: 17, max: 27, seed: 0x7c91e2ab },
  { id: "unreachable", label: "到達不能", min: 28, max: Number.POSITIVE_INFINITY, seed: 0x3ad8f041 },
]);

const SCORE_THRESHOLDS = Object.freeze([
  {
    id: "aaa",
    label: "AAA",
    threshold: 0.8889,
    baselineRate: 0.45,
    coefficient: 0.18,
    minCorrection: -0.3,
    maxCorrection: 0.45,
  },
  {
    id: "score9444",
    label: "94.44%",
    threshold: 0.9444,
    baselineRate: 0.2,
    coefficient: 0.35,
    minCorrection: -0.5,
    maxCorrection: 1.2,
  },
  {
    id: "score9700",
    label: "97.00%",
    threshold: 0.97,
    baselineRate: 0.08,
    coefficient: 0.45,
    minCorrection: -0.4,
    maxCorrection: 1.4,
  },
  {
    id: "score9900",
    label: "99.00%",
    threshold: 0.99,
    baselineRate: 0.02,
    coefficient: 0.55,
    minCorrection: -0.3,
    maxCorrection: 1.6,
  },
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function md5Of(chart) {
  return normalizeText(chart?.md5).toLowerCase();
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function bandForLevel(level) {
  return BANDS.find((band) => level >= band.min && level <= band.max) || null;
}

function deterministicSampleKey(playerId, seed) {
  let value = (Number(playerId) ^ seed) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function loadExcludedPlayerIds(constants) {
  return new Set(
    (constants.excludedPlayers || [])
      .map((player) => Number(player.playerId))
      .filter(Number.isFinite),
  );
}

function assertArchiveDatabase(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`LR2IR Archive database not found: ${filePath}`);
  }
  const size = fs.statSync(filePath).size;
  if (size <= 0) {
    throw new Error(
      `LR2IR Archive database is empty: ${filePath}. Place the real archive DB here or pass its path as the first argument.`,
    );
  }
}

function assertArchiveSchema(database) {
  const tables = new Set(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String(row.name)),
  );
  for (const table of ["pb", "user", "chart"]) {
    if (!tables.has(table)) {
      throw new Error(`LR2IR Archive database is missing required table: ${table}`);
    }
  }
}

function resolveNominalLevel(currentChart, irtChart) {
  const irtLevel = Number(irtChart?.nominalLevel);
  if (Number.isFinite(irtLevel)) {
    return irtLevel;
  }
  const currentLevel = Number(currentChart?.nominalLevel);
  if (Number.isFinite(currentLevel)) {
    return currentLevel;
  }
  if (currentChart?.source === "overjoy") {
    const overjoyLevel = Number(currentChart.level);
    if (Number.isFinite(overjoyLevel)) {
      return 20 + overjoyLevel;
    }
  }
  return null;
}

function resolveDifficulty(currentChart, irtChart, nominalLevel) {
  const difficulty = normalizeText(irtChart?.difficulty || currentChart?.difficulty);
  if (difficulty) {
    return difficulty;
  }
  if (currentChart?.source === "overjoy" && currentChart.level !== undefined) {
    return `★★${currentChart.level}`;
  }
  if (Number.isFinite(nominalLevel)) {
    return nominalLevel > 25 ? `★★${nominalLevel - 20}` : `★${nominalLevel}`;
  }
  return "";
}

function loadChartRows(database, current, irtPayload) {
  const irtByMd5 = new Map((irtPayload.charts || []).map((chart) => [md5Of(chart), chart]));
  const chartStatement = database.prepare("SELECT title, artist FROM chart WHERE md5 = ?");
  const rows = [];
  const unresolved = [];

  for (const currentChart of current.charts || []) {
    const md5 = md5Of(currentChart);
    const irtChart = irtByMd5.get(md5);
    const nominalLevel = resolveNominalLevel(currentChart, irtChart);
    const band = Number.isFinite(nominalLevel) ? bandForLevel(nominalLevel) : null;
    if (!md5 || !band) {
      unresolved.push({ md5, source: currentChart.source, nominalLevel });
      continue;
    }

    const metadata = chartStatement.get(md5);
    rows.push({
      index: rows.length,
      md5,
      source: normalizeText(currentChart.source),
      sourceTable: normalizeText(
        irtChart?.sourceTable ||
          currentChart.sourceTable ||
          (currentChart.source === "overjoy" ? "第二期Overjoy" : "発狂BMS難易度表"),
      ),
      difficulty: resolveDifficulty(currentChart, irtChart, nominalLevel),
      nominalLevel,
      bandId: band.id,
      bandLabel: band.label,
      title: normalizeText(irtChart?.title || currentChart.title || metadata?.title),
      artist: normalizeText(irtChart?.artist || currentChart.artist || metadata?.artist),
      currentChart,
      irtChart,
      lampIrtConstant: Number.isFinite(Number(irtChart?.newConstant))
        ? Number(irtChart.newConstant)
        : Number(currentChart.chartConstant),
    });
  }

  return { rows, unresolved };
}

function createTargetTable(database, chartRows) {
  database.exec(
    "CREATE TEMP TABLE target_chart (md5 TEXT PRIMARY KEY, item_index INTEGER NOT NULL, nominal_level INTEGER NOT NULL, band_id TEXT NOT NULL)",
  );
  database.exec("CREATE INDEX target_chart_band_md5 ON target_chart (band_id, md5)");
  const insert = database.prepare(
    "INSERT INTO target_chart (md5, item_index, nominal_level, band_id) VALUES (?, ?, ?, ?)",
  );
  database.exec("BEGIN");
  try {
    for (const row of chartRows) {
      insert.run(row.md5, row.index, row.nominalLevel, row.bandId);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function loadBandSamples(database, chartRows, excludedPlayerIds) {
  const samples = new Map();
  const coverageStatement = database.prepare(
    `SELECT pb.player_id, COUNT(DISTINCT target.md5) AS played
       FROM target_chart target
       JOIN pb
         ON pb.md5 = target.md5
       JOIN user player
         ON player.player_id = pb.player_id
      WHERE target.band_id = ?
        AND pb.is_cheated = 0
        AND player.is_cheater = 0
        AND pb.score_max > 0
        AND pb.score >= 0
      GROUP BY pb.player_id
     HAVING COUNT(DISTINCT target.md5) >= ?`,
  );

  for (const band of BANDS) {
    const chartCount = chartRows.filter((chart) => chart.bandId === band.id).length;
    const minimumPlayed = Math.ceil(chartCount * MIN_COVERAGE_RATE);
    const eligible =
      chartCount > 0
        ? coverageStatement
            .all(band.id, minimumPlayed)
            .filter((row) => !excludedPlayerIds.has(Number(row.player_id)))
            .map((row) => ({
              playerId: Number(row.player_id),
              played: Number(row.played),
              sampleKey: deterministicSampleKey(row.player_id, band.seed),
            }))
            .sort(
              (left, right) =>
                left.sampleKey - right.sampleKey || left.playerId - right.playerId,
            )
        : [];
    const sampled = eligible.slice(0, SAMPLE_LIMIT_PER_BAND);
    samples.set(band.id, {
      ...band,
      chartCount,
      minimumPlayed,
      eligibleCount: eligible.length,
      sampled,
    });
    console.log(
      `${band.label}: charts=${chartCount}, minimum=${minimumPlayed}, eligible=${eligible.length}, sampled=${sampled.length}`,
    );
  }

  return samples;
}

function createSampleTable(database, bandSamples) {
  database.exec(
    "CREATE TEMP TABLE sampled_player (band_id TEXT NOT NULL, player_id INTEGER NOT NULL, PRIMARY KEY (band_id, player_id))",
  );
  const insert = database.prepare(
    "INSERT INTO sampled_player (band_id, player_id) VALUES (?, ?)",
  );
  database.exec("BEGIN");
  try {
    for (const sample of bandSamples.values()) {
      for (const player of sample.sampled) {
        insert.run(sample.id, player.playerId);
      }
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function loadScoreStats(database, chartRows) {
  const statement = database.prepare(
    `SELECT
       COUNT(DISTINCT score.player_id) AS valid_score_players,
       COUNT(DISTINCT CASE
         WHEN CAST(score.score AS REAL) / NULLIF(score.score_max, 0) >= ?
         THEN score.player_id
       END) AS achieved_players
       FROM sampled_player sample
       JOIN pb score
         ON score.player_id = sample.player_id
        AND score.md5 = ?
      WHERE sample.band_id = ?
        AND score.is_cheated = 0
        AND score.score_max > 0
        AND score.score >= 0`,
  );

  const result = new Map();
  for (const chart of chartRows) {
    const thresholds = {};
    for (const threshold of SCORE_THRESHOLDS) {
      const row = statement.get(threshold.threshold, chart.md5, chart.bandId);
      const validScorePlayers = Number(row?.valid_score_players || 0);
      const achievedPlayers = Number(row?.achieved_players || 0);
      const achievedRate = (achievedPlayers + 1) / (validScorePlayers + 2);
      const rawCorrection =
        achievedPlayers < 10
          ? 0
          : clamp(
              Math.log2(threshold.baselineRate / achievedRate) * threshold.coefficient,
              threshold.minCorrection,
              threshold.maxCorrection,
            );
      const confidence =
        achievedPlayers < 10 ? 0 : clamp(validScorePlayers / 100, 0, 1);
      thresholds[threshold.id] = {
        label: threshold.label,
        threshold: threshold.threshold,
        baselineRate: threshold.baselineRate,
        validScorePlayers,
        achievedPlayers,
        achievedRate: round(achievedRate, 6),
        rawCorrection: round(rawCorrection, 6),
        confidence: round(confidence, 6),
        correction: round(rawCorrection * confidence, 6),
        correctionApplied: achievedPlayers >= 10,
      };
    }
    result.set(chart.md5, thresholds);
  }
  return result;
}

function buildUpdatedChart(chart, scoreStats) {
  const thresholdStats = scoreStats.get(chart.md5) || {};
  const scoreDeviation = clamp(
    SCORE_THRESHOLDS.reduce(
      (sum, threshold) => sum + Number(thresholdStats[threshold.id]?.correction || 0),
      0,
    ),
    SCORE_DEVIATION_MIN,
    SCORE_DEVIATION_MAX,
  );
  const lampDeviation = clamp(
    (Number(chart.lampIrtConstant) - chart.nominalLevel) * LAMP_DEVIATION_WEIGHT,
    LAMP_DEVIATION_MIN,
    LAMP_DEVIATION_MAX,
  );
  const chartConstant =
    chart.nominalLevel >= 28
      ? CONSTANT_MAX
      : round(
          clamp(
            chart.nominalLevel + scoreDeviation + lampDeviation,
            CONSTANT_MIN,
            CONSTANT_MAX,
          ),
          2,
        );

  const updated = {
    md5: chart.md5,
    title: chart.title,
    chartConstant,
    source: chart.source,
    sourceTable: chart.sourceTable,
    difficulty: chart.difficulty,
    nominalLevel: chart.nominalLevel,
    constantVersion: CONSTANT_VERSION,
    lampIrtConstant: round(Number(chart.lampIrtConstant), 2),
    scoreDeviation: round(scoreDeviation, 6),
    lampDeviation: round(lampDeviation, 6),
    scoreThresholds: thresholdStats,
    scoreValidPlayers: Math.max(
      0,
      ...SCORE_THRESHOLDS.map((threshold) =>
        Number(thresholdStats[threshold.id]?.validScorePlayers || 0),
      ),
    ),
  };

  if (chart.artist) {
    updated.artist = chart.artist;
  }
  if (chart.currentChart.level !== undefined) {
    updated.level = chart.currentChart.level;
  }
  for (const key of [
    "archivePlayers",
    "archiveFullCombo",
    "archiveHardClear",
    "archiveNormalClear",
    "archiveEasyClear",
    "archiveFailed",
    "archiveUnclassified",
    "archiveAchievementRate",
    "archiveSmoothedAchievementRate",
    "difficultyPercentile",
  ]) {
    if (chart.currentChart[key] !== undefined) {
      updated[key] = chart.currentChart[key];
    }
  }
  for (const key of [
    "sampledPlayers",
    "sampledFailed",
    "sampledEasy",
    "sampledNormal",
    "sampledHard",
    "sampledFullCombo",
  ]) {
    if (chart.irtChart?.[key] !== undefined) {
      updated[key] = chart.irtChart[key];
    }
  }

  return updated;
}

function summarize(charts) {
  const constants = charts.map((chart) => Number(chart.chartConstant));
  const scoreDeviations = charts.map((chart) => Number(chart.scoreDeviation));
  const lampDeviations = charts.map((chart) => Number(chart.lampDeviation));
  const thresholdSummaries = {};
  for (const threshold of SCORE_THRESHOLDS) {
    const stats = charts.map((chart) => chart.scoreThresholds?.[threshold.id]).filter(Boolean);
    thresholdSummaries[threshold.id] = {
      label: threshold.label,
      appliedCharts: stats.filter((stat) => stat.correctionApplied).length,
      averageCorrection: round(
        stats.reduce((sum, stat) => sum + Number(stat.correction || 0), 0) /
          Math.max(stats.length, 1),
        4,
      ),
      maxAchievedPlayers: Math.max(0, ...stats.map((stat) => Number(stat.achievedPlayers || 0))),
    };
  }
  return {
    charts: charts.length,
    minConstant: round(Math.min(...constants), 2),
    maxConstant: round(Math.max(...constants), 2),
    averageConstant: round(
      constants.reduce((sum, value) => sum + value, 0) / Math.max(constants.length, 1),
      3,
    ),
    maxedCharts: charts.filter((chart) => chart.chartConstant >= CONSTANT_MAX).length,
    minScoreDeviation: round(Math.min(...scoreDeviations), 3),
    maxScoreDeviation: round(Math.max(...scoreDeviations), 3),
    averageScoreDeviation: round(
      scoreDeviations.reduce((sum, value) => sum + value, 0) /
        Math.max(scoreDeviations.length, 1),
      3,
    ),
    minLampDeviation: round(Math.min(...lampDeviations), 3),
    maxLampDeviation: round(Math.max(...lampDeviations), 3),
    thresholdSummaries,
  };
}

function buildRuntimePayload(payload) {
  return {
    version: payload.version,
    generatedAt: payload.generatedAt,
    formula: payload.formula,
    constantVersion: payload.constantVersion,
    chartConstantMethod: payload.chartConstantMethod,
    archiveSource: payload.archiveSource,
    sourceTables: payload.sourceTables,
    overjoySourceScope: payload.overjoySourceScope,
    overjoyAllowlistCharts: payload.overjoyAllowlistCharts,
    overjoyAllowlistSource: payload.overjoyAllowlistSource,
    overjoyExcludedByAllowlistCount: payload.overjoyExcludedByAllowlistCount,
    forceRatingTargetCount: payload.forceRatingTargetCount,
    insaneCharts: payload.insaneCharts,
    overjoyCharts: payload.overjoyCharts,
    overjoyOverlapCount: payload.overjoyOverlapCount,
    archiveCharts: payload.archiveCharts,
    archiveMissingCharts: payload.archiveMissingCharts,
    archiveMissingMd5s: payload.archiveMissingMd5s,
    excludedPlayers: payload.excludedPlayers,
    excludedPlayerScoreCount: payload.excludedPlayerScoreCount,
    excludedPlayerUnmatchedScores: payload.excludedPlayerUnmatchedScores,
    summary: payload.summary,
    charts: payload.charts.map((chart) => ({
      md5: chart.md5,
      chartConstant: chart.chartConstant,
      source: chart.source,
    })),
  };
}

function main() {
  assertArchiveDatabase(archiveDbPath);

  const current = readJson(currentConstantsPath);
  const irtPayload = fs.existsSync(irtConstantsPath)
    ? readJson(irtConstantsPath)
    : { charts: [] };
  const excludedPlayerIds = loadExcludedPlayerIds(current);

  const database = new DatabaseSync(archiveDbPath, { readOnly: true });
  try {
    assertArchiveSchema(database);
    const loaded = loadChartRows(database, current, irtPayload);
    if (loaded.unresolved.length) {
      throw new Error(
        `Could not resolve ${loaded.unresolved.length} chart levels: ${JSON.stringify(
          loaded.unresolved.slice(0, 10),
        )}`,
      );
    }
    createTargetTable(database, loaded.rows);
    const bandSamples = loadBandSamples(database, loaded.rows, excludedPlayerIds);
    createSampleTable(database, bandSamples);
    const scoreStats = loadScoreStats(database, loaded.rows);
    const charts = loaded.rows.map((chart) => buildUpdatedChart(chart, scoreStats));

    const updated = {
      version: 7,
      generatedAt: now.toISOString(),
      formula: current.formula,
      constantVersion: CONSTANT_VERSION,
      chartConstantMethod:
        "score-oriented threshold distribution using LR2IR Archive valid EX scores, plus weak lamp IRT helper",
      archiveSource: current.archiveSource,
      archiveDatabase: archiveDbPath,
      sourceTables: current.sourceTables,
      overjoySourceScope: current.overjoySourceScope,
      overjoyAllowlistCharts: current.overjoyAllowlistCharts,
      overjoyAllowlistSource: current.overjoyAllowlistSource,
      overjoyExcludedByAllowlistCount: current.overjoyExcludedByAllowlistCount,
      levelConversion: "Second-period Overjoy ★★n = ★(20+n)",
      scoreOrientedCorrection: {
        finalFormula:
          "nominalLevel >= 28 ? 27.00 : roundTo2(clamp(nominalLevel + scoreDeviation + lampDeviation, 1.00, 27.00))",
        scoreDeviation: "clamp(sum(thresholdCorrections), -1.00, +3.00)",
        lampDeviation:
          "clamp((lampIrtConstant - nominalLevel) * 0.35, -1.00, +1.00)",
        validScorePlayers:
          "sampled band players with a valid EX score for the chart; FAILED is included when score exists",
        minimumAchievers: 10,
        thresholdCorrection:
          "if achievedPlayers < 10 then 0 else clamp(log2(baselineRate / achievedRate) * coefficient, min, max) * clamp(validScorePlayers / 100, 0, 1)",
        thresholds: SCORE_THRESHOLDS,
      },
      sampling: {
        sampleLimitPerBand: SAMPLE_LIMIT_PER_BAND,
        minimumCoverageRate: MIN_COVERAGE_RATE,
        bands: [...bandSamples.values()].map((sample) => ({
          id: sample.id,
          label: sample.label,
          levelRange:
            Number.isFinite(sample.max) && sample.max < 100
              ? `${sample.min}-${sample.max}`
              : `${sample.min}+`,
          chartCount: sample.chartCount,
          minimumPlayed: sample.minimumPlayed,
          eligiblePlayers: sample.eligibleCount,
          sampledPlayers: sample.sampled.length,
        })),
      },
      forceRatingTargetCount: "BEST50 charts plus highest passed dan course when available",
      insaneCharts: charts.filter((chart) => chart.source === "insane").length,
      overjoyCharts: charts.filter((chart) => chart.source === "overjoy").length,
      overjoyOverlapCount: current.overjoyOverlapCount,
      archiveCharts: charts.length,
      archiveMissingCharts: 0,
      archiveMissingMd5s: [],
      excludedPlayers: current.excludedPlayers,
      excludedPlayerScoreCount: current.excludedPlayerScoreCount,
      excludedPlayerUnmatchedScores: current.excludedPlayerUnmatchedScores,
      summary: summarize(charts),
      charts,
    };
    const runtimePayload = buildRuntimePayload(updated);

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(currentConstantsPath, `${JSON.stringify(runtimePayload)}\n`);
    fs.writeFileSync(auditPath, `${JSON.stringify(updated, null, 2)}\n`);

    console.log(
      JSON.stringify(
        {
          output: currentConstantsPath,
          audit: auditPath,
          runtimeBytes: Buffer.byteLength(JSON.stringify(runtimePayload)),
          auditBytes: Buffer.byteLength(JSON.stringify(updated)),
          summary: updated.summary,
        },
        null,
        2,
      ),
    );
  } finally {
    database.close();
  }
}

main();
