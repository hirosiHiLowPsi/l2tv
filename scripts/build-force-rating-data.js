const fs = require("node:fs");
const path = require("node:path");

const LAMP_DISTRIBUTION_WEIGHTS = Object.freeze({
  fullcombo: 2,
  hard: 0.85,
  normal: 0.7,
  easy: 0.5,
  failed: 0,
});
const BAYESIAN_PRIOR_STRENGTH = 50;
const CONSTANT_MIN = 1;
const CONSTANT_MAX = 27;
const DEFAULT_OVERJOY_ALLOWLIST_PATH = path.join(
  __dirname,
  "data",
  "overjoy-second-period-md5s.json",
);
const ARCHIVE_LAMP_FIELDS = Object.freeze({
  FULLCOMBO: "fullcombo",
  HARD: "hard",
  NORMAL: "normal",
  EASY: "easy",
  FAILED: "failed",
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const headers = (rows.shift() ?? []).map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header,
  );
  return rows
    .filter((values) => values.some(Boolean))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function requireFile(filePath, label) {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`${label} not found: ${resolvedPath}`);
  }
  return resolvedPath;
}

function normalizeMd5Set(values, label) {
  if (!Array.isArray(values)) {
    throw new Error(`${label} must contain an MD5 array.`);
  }
  const md5s = new Set();
  for (const value of values) {
    const md5 = String(value ?? "").trim().toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(md5)) {
      throw new Error(`Invalid MD5 in ${label}: ${value}`);
    }
    md5s.add(md5);
  }
  return md5s;
}

function readOverjoyAllowlist(filePath) {
  const resolvedPath = requireFile(filePath, "Overjoy second-period allowlist");
  const payload = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  const md5s = normalizeMd5Set(Array.isArray(payload) ? payload : payload?.md5s, resolvedPath);
  const declaredCount = Number(payload?.count);
  if (Number.isFinite(declaredCount) && declaredCount !== md5s.size) {
    throw new Error(
      `Overjoy allowlist count mismatch: declared ${declaredCount}, actual ${md5s.size}`,
    );
  }

  return {
    md5s,
    source: Array.isArray(payload) ? null : payload?.source ?? null,
    description: Array.isArray(payload) ? null : payload?.description ?? null,
    path: resolvedPath,
  };
}

function loadOptionalOverjoyAllowlist(filePath) {
  if (filePath) {
    return readOverjoyAllowlist(filePath);
  }
  if (fs.existsSync(DEFAULT_OVERJOY_ALLOWLIST_PATH)) {
    return readOverjoyAllowlist(DEFAULT_OVERJOY_ALLOWLIST_PATH);
  }
  return null;
}

function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function normalizeArchiveStats(chart) {
  const normalized = {
    players: Number(chart?.players),
    fullcombo: Number(chart?.fullcombo),
    hard: Number(chart?.hard),
    normal: Number(chart?.normal),
    easy: Number(chart?.easy),
    failed: Number(chart?.failed),
  };
  const values = Object.values(normalized);
  if (!Number.isFinite(normalized.players) || normalized.players <= 0) {
    return null;
  }
  if (values.slice(1).some((value) => !Number.isFinite(value) || value < 0)) {
    return null;
  }
  return normalized;
}

function computeWeightedAchievement(stats) {
  return (
    stats.fullcombo * LAMP_DISTRIBUTION_WEIGHTS.fullcombo +
    stats.hard * LAMP_DISTRIBUTION_WEIGHTS.hard +
    stats.normal * LAMP_DISTRIBUTION_WEIGHTS.normal +
    stats.easy * LAMP_DISTRIBUTION_WEIGHTS.easy
  );
}

function applyExcludedPlayerScores(archivePayload, exclusionPayload) {
  const charts = (archivePayload?.charts ?? []).map((chart) => ({ ...chart }));
  const chartByMd5 = new Map(
    charts.map((chart) => [String(chart?.md5 ?? "").toLowerCase(), chart]),
  );
  const seenScores = new Set();
  const unmatchedScores = [];
  let appliedScoreCount = 0;

  for (const score of exclusionPayload?.scores ?? []) {
    const playerId = Number(score?.playerId);
    const md5 = String(score?.md5 ?? "").trim().toLowerCase();
    const lamp = String(score?.lamp ?? "").trim().toUpperCase();
    const lampField = ARCHIVE_LAMP_FIELDS[lamp];
    if (!Number.isFinite(playerId) || !/^[0-9a-f]{32}$/.test(md5) || !lampField) {
      throw new Error(`Invalid excluded player score: ${JSON.stringify(score)}`);
    }

    const scoreKey = `${playerId}:${md5}`;
    if (seenScores.has(scoreKey)) {
      throw new Error(`Duplicate excluded player score: ${scoreKey}`);
    }
    seenScores.add(scoreKey);

    const chart = chartByMd5.get(md5);
    if (!chart) {
      unmatchedScores.push({ playerId, md5, lamp });
      continue;
    }
    if (Number(chart.players) <= 0 || Number(chart[lampField]) <= 0) {
      throw new Error(`Excluded score cannot be subtracted from archive totals: ${scoreKey}`);
    }

    chart.players = Number(chart.players) - 1;
    chart[lampField] = Number(chart[lampField]) - 1;
    appliedScoreCount += 1;
  }

  return {
    archivePayload: { ...archivePayload, charts },
    appliedScoreCount,
    unmatchedScores,
  };
}

function buildGlobalArchiveConstants(entries, archivePayload, options = {}) {
  const priorStrength = Number.isFinite(Number(options.priorStrength))
    ? Math.max(Number(options.priorStrength), 0)
    : BAYESIAN_PRIOR_STRENGTH;
  const archiveByMd5 = new Map(
    (archivePayload?.charts ?? []).map((chart) => [String(chart?.md5 ?? "").toLowerCase(), chart]),
  );
  const eligible = entries
    .map((entry) => {
      const stats = normalizeArchiveStats(archiveByMd5.get(entry.md5));
      return stats ? { entry, stats, weightedAchievement: computeWeightedAchievement(stats) } : null;
    })
    .filter(Boolean);

  if (!eligible.length) {
    throw new Error("No valid LR2IR Archive chart statistics were found.");
  }

  const totalPlayers = eligible.reduce((sum, row) => sum + row.stats.players, 0);
  const totalWeightedAchievement = eligible.reduce((sum, row) => sum + row.weightedAchievement, 0);
  const globalAchievementPrior = totalWeightedAchievement / totalPlayers;

  for (const row of eligible) {
    row.rawAchievementRate = row.weightedAchievement / row.stats.players;
    row.smoothedAchievementRate = (
      row.weightedAchievement + globalAchievementPrior * priorStrength
    ) / (row.stats.players + priorStrength);
    const boundedRate = Math.min(Math.max(row.smoothedAchievementRate, 1e-9), 1 - 1e-9);
    row.difficultyIndex = Math.log((1 - boundedRate) / boundedRate);
  }

  eligible.sort(
    (left, right) =>
      left.difficultyIndex - right.difficultyIndex || left.entry.md5.localeCompare(right.entry.md5),
  );

  const rankedByMd5 = new Map();
  for (let start = 0; start < eligible.length;) {
    let end = start + 1;
    while (
      end < eligible.length &&
      Math.abs(eligible[end].difficultyIndex - eligible[start].difficultyIndex) < 1e-12
    ) {
      end += 1;
    }
    const averageRank = (start + end - 1) / 2;
    const percentile = eligible.length === 1 ? 0.5 : averageRank / (eligible.length - 1);
    const chartConstant = round(CONSTANT_MIN + (CONSTANT_MAX - CONSTANT_MIN) * percentile, 2);
    for (let index = start; index < end; index += 1) {
      rankedByMd5.set(eligible[index].entry.md5, {
        ...eligible[index],
        difficultyPercentile: percentile,
        chartConstant,
      });
    }
    start = end;
  }

  const charts = entries.map((entry) => {
    const ranked = rankedByMd5.get(entry.md5);
    if (!ranked) {
      return {
        md5: entry.md5,
        chartConstant: entry.legacyChartConstant,
        source: entry.source,
        ...(entry.level === null ? {} : { level: entry.level }),
        archiveDataMissing: true,
      };
    }

    const lampTotal =
      ranked.stats.fullcombo +
      ranked.stats.hard +
      ranked.stats.normal +
      ranked.stats.easy +
      ranked.stats.failed;
    const clearTotal =
      ranked.stats.fullcombo +
      ranked.stats.hard +
      ranked.stats.normal +
      ranked.stats.easy;
    const isOverjoyLevel8 = entry.source === "overjoy" && entry.level === 8;
    const hasNoClearPlayers = clearTotal === 0;
    const chartConstantOverride = isOverjoyLevel8
      ? "overjoy-level-8"
      : hasNoClearPlayers
        ? "no-clear-players"
        : null;
    return {
      md5: entry.md5,
      chartConstant: chartConstantOverride ? CONSTANT_MAX : ranked.chartConstant,
      source: entry.source,
      ...(entry.level === null ? {} : { level: entry.level }),
      ...(chartConstantOverride ? { chartConstantOverride } : {}),
      archivePlayers: ranked.stats.players,
      archiveFullCombo: ranked.stats.fullcombo,
      archiveHardClear: ranked.stats.hard,
      archiveNormalClear: ranked.stats.normal,
      archiveEasyClear: ranked.stats.easy,
      archiveFailed: ranked.stats.failed,
      archiveUnclassified: Math.max(ranked.stats.players - lampTotal, 0),
      archiveAchievementRate: round(ranked.rawAchievementRate, 6),
      archiveSmoothedAchievementRate: round(ranked.smoothedAchievementRate, 6),
      difficultyPercentile: round(ranked.difficultyPercentile, 6),
    };
  });

  return {
    charts,
    globalAchievementPrior,
    archiveChartCount: eligible.length,
    missingMd5s: entries.filter((entry) => !rankedByMd5.has(entry.md5)).map((entry) => entry.md5),
    priorStrength,
  };
}

function buildEntries(insaneText, overjoyText, options = {}) {
  const entries = new Map();
  for (const rowData of parseCsv(insaneText)) {
    const md5 = String(rowData.md5 || "").trim().toLowerCase();
    const legacyChartConstant = Number(rowData.chart_constant);
    if (/^[0-9a-f]{32}$/.test(md5) && Number.isFinite(legacyChartConstant)) {
      entries.set(md5, { md5, legacyChartConstant, source: "insane", level: null });
    }
  }

  let overjoyOverlapCount = 0;
  let overjoyFilteredOutCount = 0;
  const overjoyAllowedMd5s =
    options.overjoyAllowedMd5s instanceof Set ? options.overjoyAllowedMd5s : null;
  for (const rowData of parseCsv(overjoyText)) {
    const md5 = String(rowData.md5 || "").trim().toLowerCase();
    const legacyChartConstant = Number(rowData.chart_constant);
    if (!/^[0-9a-f]{32}$/.test(md5) || !Number.isFinite(legacyChartConstant)) {
      continue;
    }
    if (overjoyAllowedMd5s && !overjoyAllowedMd5s.has(md5)) {
      overjoyFilteredOutCount += 1;
      continue;
    }
    if (entries.has(md5)) {
      overjoyOverlapCount += 1;
      continue;
    }
    entries.set(md5, {
      md5,
      legacyChartConstant,
      source: "overjoy",
      level: Number.isFinite(Number(rowData.overjoy_level)) ? Number(rowData.overjoy_level) : null,
    });
  }

  return {
    entries: [...entries.values()].sort((left, right) => left.md5.localeCompare(right.md5)),
    overjoyOverlapCount,
    overjoyFilteredOutCount,
    overjoyAllowlistCount: overjoyAllowedMd5s ? overjoyAllowedMd5s.size : null,
  };
}

function main() {
  const [
    ,
    ,
    insaneArgument,
    overjoyArgument,
    archiveArgument,
    outputArgument,
    exclusionArgument,
    overjoyAllowlistArgument,
  ] = process.argv;
  if (!insaneArgument || !overjoyArgument || !archiveArgument) {
    throw new Error(
      "Usage: node scripts/build-force-rating-data.js <insane-constants.csv> <overjoy-constants.csv> <archive-stats.json> [output.json] [excluded-player-scores.json] [overjoy-allowlist.json]",
    );
  }

  const insanePath = requireFile(insaneArgument, "Insane constants CSV");
  const overjoyPath = requireFile(overjoyArgument, "Overjoy constants CSV");
  const archivePath = requireFile(archiveArgument, "LR2IR Archive statistics JSON");
  const exclusionPath = exclusionArgument
    ? requireFile(exclusionArgument, "Excluded player scores JSON")
    : null;
  const outputPath = path.resolve(
    outputArgument || path.join(__dirname, "..", "public", "data", "force-chart-constants.json"),
  );
  const overjoyAllowlist = loadOptionalOverjoyAllowlist(overjoyAllowlistArgument);
  const {
    entries,
    overjoyOverlapCount,
    overjoyFilteredOutCount,
    overjoyAllowlistCount,
  } = buildEntries(
    fs.readFileSync(insanePath, "utf8"),
    fs.readFileSync(overjoyPath, "utf8"),
    { overjoyAllowedMd5s: overjoyAllowlist?.md5s },
  );
  const archivePayload = JSON.parse(fs.readFileSync(archivePath, "utf8"));
  const exclusionPayload = exclusionPath
    ? JSON.parse(fs.readFileSync(exclusionPath, "utf8"))
    : { excludedPlayers: [], scores: [] };
  const exclusionResult = applyExcludedPlayerScores(archivePayload, exclusionPayload);
  const generated = buildGlobalArchiveConstants(entries, exclusionResult.archivePayload);
  const charts = generated.charts.sort((left, right) => left.md5.localeCompare(right.md5));
  const payload = {
    version: 2,
    generatedAt: String(archivePayload.generatedAt || new Date().toISOString()).slice(0, 10),
    formula: "chartConstant * round(exScore/maxExScore, 3) * lampCoefficient",
    chartConstantMethod: "global percentile of Bayesian-smoothed LR2IR Archive lamp achievement",
    archiveSource: archivePayload.source || "https://github.com/zkldi/lr2ir-dataset",
    sourceTables: {
      insane: "https://darksabun.club/table/archive/insane1/",
      overjoy: overjoyAllowlist?.source || "https://lr2.sakura.ne.jp/overjoy.php",
    },
    overjoySourceScope: overjoyAllowlist ? "second-period-only" : "input-csv",
    overjoyAllowlistCharts: overjoyAllowlistCount,
    overjoyAllowlistSource: overjoyAllowlist?.source ?? null,
    overjoyExcludedByAllowlistCount: overjoyFilteredOutCount,
    lampDistributionWeights: LAMP_DISTRIBUTION_WEIGHTS,
    bayesianPriorStrength: generated.priorStrength,
    globalAchievementPrior: round(generated.globalAchievementPrior, 6),
    insaneCharts: charts.filter((chart) => chart.source === "insane").length,
    overjoyCharts: charts.filter((chart) => chart.source === "overjoy").length,
    overjoyOverlapCount,
    archiveCharts: generated.archiveChartCount,
    archiveMissingCharts: generated.missingMd5s.length,
    archiveMissingMd5s: generated.missingMd5s,
    excludedPlayers: exclusionPayload.excludedPlayers ?? [],
    excludedPlayerScoreCount: exclusionResult.appliedScoreCount,
    excludedPlayerUnmatchedScores: exclusionResult.unmatchedScores,
    overjoyLevel8OverrideCharts: charts.filter(
      (chart) => chart.chartConstantOverride === "overjoy-level-8",
    ).length,
    noClearOverrideCharts: charts.filter(
      (chart) => chart.chartConstantOverride === "no-clear-players",
    ).length,
    charts,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
  console.log(`Wrote ${charts.length} global FORCE chart constants to ${outputPath}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  applyExcludedPlayerScores,
  BAYESIAN_PRIOR_STRENGTH,
  LAMP_DISTRIBUTION_WEIGHTS,
  buildEntries,
  buildGlobalArchiveConstants,
  computeWeightedAchievement,
  readOverjoyAllowlist,
};
