const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const archiveDbPath = path.resolve(projectRoot, "..", "lr2ir-archive.db");
const constantsPath = path.join(projectRoot, "public", "data", "force-chart-constants.json");
const reportDataPath = path.join(
  projectRoot,
  "outputs",
  "force-reports-second-overjoy-only-20260623",
  "report-data.json",
);
const outputDir = path.resolve(
  process.argv[2] || path.join(projectRoot, "outputs", "force-irt-pretest-20260623"),
);

const SAMPLE_LIMIT_PER_BAND = 2000;
const MIN_COVERAGE_RATE = 0.5;
const RASCH_ITERATIONS = 18;
const RASCH_PRIOR_VARIANCE = 9;
const ITEM_SHRINKAGE_STRENGTH = 50;
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
const BANDS = Object.freeze([
  { id: "low", label: "低難度", min: 1, max: 8, seed: 0x1f123bb5 },
  { id: "mid", label: "中難度", min: 9, max: 16, seed: 0x54a32d19 },
  { id: "high", label: "高難度", min: 17, max: 27, seed: 0x7c91e2ab },
  { id: "unreachable", label: "到達不能", min: 28, max: 28, seed: 0x3ad8f041, fixedConstant: 27 },
]);
const LAMP_ORDINAL = new Map([
  ["FAILED", 0],
  ["EASY", 1],
  ["EASY CLEAR", 1],
  ["CLEAR", 2],
  ["NORMAL CLEAR", 2],
  ["HARD", 3],
  ["HARD CLEAR", 3],
  ["FULLCOMBO", 4],
  ["★FULLCOMBO", 4],
]);

function normalizeTitle(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function round(value, digits = 3) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function median(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sigmoid(value) {
  if (value >= 0) {
    const exp = Math.exp(-value);
    return 1 / (1 + exp);
  }
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function deterministicSampleKey(playerId, seed) {
  let value = (Number(playerId) ^ seed) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function bandForLevel(level) {
  return BANDS.find((band) => level >= band.min && level <= band.max) || null;
}

function buildDifficultyLookup(reportData) {
  const byTitle = new Map();
  for (const row of reportData.constantRows || []) {
    if (row.sourceTable !== "発狂BMS難易度表") {
      continue;
    }
    const match = String(row.difficulty || "").match(/^★(\d+)$/);
    if (!match) {
      continue;
    }
    const title = normalizeTitle(row.title);
    if (!byTitle.has(title)) {
      byTitle.set(title, new Set());
    }
    byTitle.get(title).add(Number(match[1]));
  }
  return byTitle;
}

function loadChartRows(database, constants, reportData) {
  const difficultyLookup = buildDifficultyLookup(reportData);
  const chartStatement = database.prepare("SELECT title, artist FROM chart WHERE md5 = ?");
  const rows = [];
  const unresolved = [];

  for (const chart of constants.charts) {
    const metadata = chartStatement.get(chart.md5);
    const fallback = MISSING_CHART_METADATA.get(chart.md5);
    const title = normalizeTitle(metadata?.title || fallback?.title || "");
    let nominalLevel = null;
    let difficulty = "";
    if (chart.source === "overjoy") {
      nominalLevel = 20 + Number(chart.level);
      difficulty = `★★${chart.level}`;
    } else {
      const candidates = difficultyLookup.get(title);
      const fallbackDifficulty = String(fallback?.difficulty || "").match(/^★(\d+)$/);
      if (candidates?.size === 1) {
        nominalLevel = [...candidates][0];
        difficulty = `★${nominalLevel}`;
      } else if (fallbackDifficulty) {
        nominalLevel = Number(fallbackDifficulty[1]);
        difficulty = fallback.difficulty;
      }
    }

    const band = Number.isFinite(nominalLevel) ? bandForLevel(nominalLevel) : null;
    if (!band) {
      unresolved.push({
        md5: chart.md5,
        source: chart.source,
        title,
        nominalLevel,
      });
      continue;
    }
    rows.push({
      index: rows.length,
      md5: chart.md5,
      title: title || "曲名未取得",
      artist: normalizeTitle(metadata?.artist || ""),
      source: chart.source,
      sourceTable: chart.source === "overjoy" ? "第二期Overjoy" : "発狂BMS難易度表",
      difficulty,
      nominalLevel,
      bandId: band.id,
      bandLabel: band.label,
      oldConstant: Number(chart.chartConstant),
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

function loadBandSamples(database, chartRows) {
  const bandSamples = new Map();
  const coverageStatement = database.prepare(
    `SELECT pb.player_id, COUNT(*) AS played
       FROM target_chart target
       JOIN pb ON pb.md5 = target.md5
       JOIN user player ON player.player_id = pb.player_id
      WHERE target.band_id = ?
        AND pb.is_cheated = 0
        AND player.is_cheater = 0
      GROUP BY pb.player_id
     HAVING COUNT(*) >= ?`,
  );

  for (const band of BANDS) {
    const chartCount = chartRows.filter((chart) => chart.bandId === band.id).length;
    const minimumPlayed = Math.ceil(chartCount * MIN_COVERAGE_RATE);
    const eligible = coverageStatement
      .all(band.id, minimumPlayed)
      .filter((row) => !MANUAL_EXCLUDED_PLAYER_IDS.has(Number(row.player_id)))
      .map((row) => ({
        playerId: Number(row.player_id),
        played: Number(row.played),
        sampleKey: deterministicSampleKey(row.player_id, band.seed),
      }))
      .sort(
        (left, right) =>
          left.sampleKey - right.sampleKey || left.playerId - right.playerId,
      );
    const sampled = eligible.slice(0, SAMPLE_LIMIT_PER_BAND);
    bandSamples.set(band.id, {
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

  const highSample = bandSamples.get("high");
  const unreachableSample = bandSamples.get("unreachable");
  if (highSample && unreachableSample?.sampled?.length) {
    const existingPlayerIds = new Set(highSample.sampled.map((player) => player.playerId));
    const addedPlayers = [];
    for (const player of unreachableSample.sampled) {
      if (existingPlayerIds.has(player.playerId)) {
        continue;
      }
      highSample.sampled.push({
        ...player,
        addedFromBand: "unreachable",
      });
      existingPlayerIds.add(player.playerId);
      addedPlayers.push(player.playerId);
    }
    highSample.addedFromUnreachableCount = addedPlayers.length;
    console.log(
      `${highSample.label}: added ${addedPlayers.length} players sampled from ${unreachableSample.label}`,
    );
  }
  return bandSamples;
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

function loadObservations(database, chartRows, bandSamples) {
  const playerIds = [
    ...new Set(
      [...bandSamples.values()].flatMap((sample) =>
        sample.sampled.map((player) => player.playerId),
      ),
    ),
  ].sort((left, right) => left - right);
  const userIndexById = new Map(playerIds.map((playerId, index) => [playerId, index]));
  const observationUsers = [];
  const observationItems = [];
  const observationScores = [];
  const itemObservationCounts = new Uint32Array(chartRows.length);
  const itemLampCounts = chartRows.map(() => [0, 0, 0, 0, 0]);
  const responseStatement = database.prepare(
    `SELECT score.player_id, score.clear_type
       FROM sampled_player sample
       JOIN pb score
         ON score.md5 = ?
        AND score.player_id = sample.player_id
      WHERE sample.band_id = ?
        AND score.is_cheated = 0`,
  );

  for (const chart of chartRows) {
    const rows = responseStatement.all(chart.md5, chart.bandId);
    for (const row of rows) {
      const score = LAMP_ORDINAL.get(String(row.clear_type || "").toUpperCase());
      const userIndex = userIndexById.get(Number(row.player_id));
      if (!Number.isInteger(score) || userIndex === undefined) {
        continue;
      }
      observationUsers.push(userIndex);
      observationItems.push(chart.index);
      observationScores.push(score);
      itemObservationCounts[chart.index] += 1;
      itemLampCounts[chart.index][score] += 1;
    }
  }

  return {
    playerIds,
    users: Uint32Array.from(observationUsers),
    items: Uint16Array.from(observationItems),
    scores: Uint8Array.from(observationScores),
    itemObservationCounts,
    itemLampCounts,
  };
}

function fitRaschThreshold(observations, userCount, itemCount, threshold) {
  const theta = new Float64Array(userCount);
  const beta = new Float64Array(itemCount);
  const passCounts = new Uint32Array(itemCount);
  const totalCounts = new Uint32Array(itemCount);
  const priorPrecision = 1 / RASCH_PRIOR_VARIANCE;

  for (let index = 0; index < observations.scores.length; index += 1) {
    const item = observations.items[index];
    totalCounts[item] += 1;
    if (observations.scores[index] >= threshold) {
      passCounts[item] += 1;
    }
  }
  for (let item = 0; item < itemCount; item += 1) {
    beta[item] = Math.log((totalCounts[item] - passCounts[item] + 0.5) / (passCounts[item] + 0.5));
  }

  let finalDelta = null;
  let completedIterations = 0;
  for (let iteration = 0; iteration < RASCH_ITERATIONS; iteration += 1) {
    const userGradient = new Float64Array(userCount);
    const userInformation = new Float64Array(userCount);
    for (let index = 0; index < observations.scores.length; index += 1) {
      const user = observations.users[index];
      const item = observations.items[index];
      const probability = sigmoid(theta[user] - beta[item]);
      const actual = observations.scores[index] >= threshold ? 1 : 0;
      userGradient[user] += actual - probability;
      userInformation[user] += probability * (1 - probability);
    }

    let maxDelta = 0;
    for (let user = 0; user < userCount; user += 1) {
      const delta =
        (userGradient[user] - theta[user] * priorPrecision) /
        (userInformation[user] + priorPrecision);
      theta[user] = clamp(theta[user] + delta, -8, 8);
      maxDelta = Math.max(maxDelta, Math.abs(delta));
    }

    const itemGradient = new Float64Array(itemCount);
    const itemInformation = new Float64Array(itemCount);
    for (let index = 0; index < observations.scores.length; index += 1) {
      const user = observations.users[index];
      const item = observations.items[index];
      const probability = sigmoid(theta[user] - beta[item]);
      const actual = observations.scores[index] >= threshold ? 1 : 0;
      itemGradient[item] += probability - actual;
      itemInformation[item] += probability * (1 - probability);
    }
    for (let item = 0; item < itemCount; item += 1) {
      const delta =
        (itemGradient[item] - beta[item] * priorPrecision) /
        (itemInformation[item] + priorPrecision);
      beta[item] = clamp(beta[item] + delta, -8, 8);
      maxDelta = Math.max(maxDelta, Math.abs(delta));
    }

    const thetaMean = theta.reduce((sum, value) => sum + value, 0) / Math.max(userCount, 1);
    for (let user = 0; user < userCount; user += 1) {
      theta[user] -= thetaMean;
    }
    for (let item = 0; item < itemCount; item += 1) {
      beta[item] -= thetaMean;
    }
    completedIterations = iteration + 1;
    finalDelta = maxDelta;
    if (maxDelta < 0.001) {
      break;
    }
  }

  return {
    threshold,
    beta,
    completedIterations,
    finalDelta,
  };
}

function fitRobustScale(chartRows, itemDifficulty) {
  const levelMedians = new Map();
  for (const level of [...new Set(chartRows.map((chart) => chart.nominalLevel))]) {
    const values = chartRows
      .filter((chart) => chart.nominalLevel === level)
      .map((chart) => itemDifficulty[chart.index])
      .filter(Number.isFinite);
    levelMedians.set(level, median(values));
  }
  const points = [...levelMedians.entries()]
    .filter(([level, beta]) => Number.isFinite(beta) && level <= 27)
    .map(([level, beta]) => ({ beta, target: Math.min(level, 27) }));
  const slopes = [];
  for (let left = 0; left < points.length; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const betaDifference = points[right].beta - points[left].beta;
      if (Math.abs(betaDifference) > 1e-9) {
        slopes.push((points[right].target - points[left].target) / betaDifference);
      }
    }
  }
  const slope = median(slopes.filter((value) => value > 0));
  const intercept = median(points.map((point) => point.target - slope * point.beta));
  return { slope, intercept, levelMedians };
}

function pearsonCorrelation(leftValues, rightValues) {
  const count = Math.min(leftValues.length, rightValues.length);
  const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / count;
  const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / count;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < count; index += 1) {
    const left = leftValues[index] - leftMean;
    const right = rightValues[index] - rightMean;
    covariance += left * right;
    leftVariance += left * left;
    rightVariance += right * right;
  }
  return covariance / Math.sqrt(leftVariance * rightVariance);
}

function buildResults(chartRows, observations, thresholdFits) {
  const rawDifficulty = new Float64Array(chartRows.length);
  const thresholdBetas = chartRows.map(() => []);
  for (const fit of thresholdFits) {
    for (const chart of chartRows) {
      thresholdBetas[chart.index].push(fit.beta[chart.index]);
    }
  }
  for (const chart of chartRows) {
    thresholdBetas[chart.index].sort((left, right) => left - right);
    rawDifficulty[chart.index] =
      thresholdBetas[chart.index].reduce((sum, value) => sum + value, 0) /
      thresholdBetas[chart.index].length;
  }

  const levelMedianDifficulty = new Map();
  for (const level of [...new Set(chartRows.map((chart) => chart.nominalLevel))]) {
    levelMedianDifficulty.set(
      level,
      median(
        chartRows
          .filter((chart) => chart.nominalLevel === level)
          .map((chart) => rawDifficulty[chart.index]),
      ),
    );
  }
  const shrunkDifficulty = new Float64Array(chartRows.length);
  for (const chart of chartRows) {
    const count = observations.itemObservationCounts[chart.index];
    const reliability = count / (count + ITEM_SHRINKAGE_STRENGTH);
    const levelMedian = levelMedianDifficulty.get(chart.nominalLevel);
    shrunkDifficulty[chart.index] =
      rawDifficulty[chart.index] * reliability + levelMedian * (1 - reliability);
  }
  const scale = fitRobustScale(chartRows, shrunkDifficulty);
  const results = chartRows.map((chart) => {
    const betas = thresholdBetas[chart.index];
    const band = bandForLevel(chart.nominalLevel);
    const chartConstant = Number.isFinite(band?.fixedConstant)
      ? band.fixedConstant
      : clamp(
          scale.intercept + scale.slope * shrunkDifficulty[chart.index],
          1,
          27,
        );
    const lampCounts = observations.itemLampCounts[chart.index];
    return {
      ...chart,
      sampledPlayers: observations.itemObservationCounts[chart.index],
      sampledFailed: lampCounts[0],
      sampledEasy: lampCounts[1],
      sampledNormal: lampCounts[2],
      sampledHard: lampCounts[3],
      sampledFullCombo: lampCounts[4],
      betaEasy: round(betas[0], 6),
      betaNormal: round(betas[1], 6),
      betaHard: round(betas[2], 6),
      betaFullCombo: round(betas[3], 6),
      irtDifficulty: round(rawDifficulty[chart.index], 6),
      shrunkIrtDifficulty: round(shrunkDifficulty[chart.index], 6),
      newConstant: round(chartConstant, 2),
      difference: round(chartConstant - chart.oldConstant, 2),
    };
  });
  results.sort(
    (left, right) =>
      right.newConstant - left.newConstant ||
      right.nominalLevel - left.nominalLevel ||
      left.title.localeCompare(right.title, "ja"),
  );
  results.forEach((row, index) => {
    row.rank = index + 1;
  });
  return { results, scale };
}

function buildLevelSummary(results) {
  const levels = [...new Set(results.map((row) => row.nominalLevel))].sort(
    (left, right) => left - right,
  );
  return levels.map((level) => {
    const rows = results.filter((row) => row.nominalLevel === level);
    return {
      nominalLevel: level,
      difficulty:
        level <= 25
          ? `★${level}`
          : `★★${level - 20}`,
      charts: rows.length,
      sampledPlayersMedian: round(median(rows.map((row) => row.sampledPlayers)), 0),
      oldConstantMedian: round(median(rows.map((row) => row.oldConstant)), 2),
      newConstantMedian: round(median(rows.map((row) => row.newConstant)), 2),
      newConstantMin: round(Math.min(...rows.map((row) => row.newConstant)), 2),
      newConstantMax: round(Math.max(...rows.map((row) => row.newConstant)), 2),
    };
  });
}

function main() {
  if (!fs.existsSync(archiveDbPath)) {
    throw new Error(`LR2IR Archive database not found: ${archiveDbPath}`);
  }
  const constants = JSON.parse(fs.readFileSync(constantsPath, "utf8"));
  const reportData = JSON.parse(fs.readFileSync(reportDataPath, "utf8"));
  fs.mkdirSync(outputDir, { recursive: true });
  const database = new DatabaseSync(archiveDbPath, { readOnly: true });
  try {
    const loaded = loadChartRows(database, constants, reportData);
    if (loaded.unresolved.length) {
      throw new Error(
        `Could not resolve ${loaded.unresolved.length} chart levels: ${JSON.stringify(loaded.unresolved.slice(0, 10))}`,
      );
    }
    createTargetTable(database, loaded.rows);
    const bandSamples = loadBandSamples(database, loaded.rows);
    createSampleTable(database, bandSamples);
    const observations = loadObservations(database, loaded.rows, bandSamples);
    console.log(
      `Observations=${observations.scores.length}, unique sampled players=${observations.playerIds.length}`,
    );
    const thresholdFits = [1, 2, 3, 4].map((threshold) => {
      const fit = fitRaschThreshold(
        observations,
        observations.playerIds.length,
        loaded.rows.length,
        threshold,
      );
      console.log(
        `Threshold ${threshold}: iterations=${fit.completedIterations}, finalDelta=${fit.finalDelta}`,
      );
      return fit;
    });
    const built = buildResults(loaded.rows, observations, thresholdFits);
    const result = {
      generatedAt: new Date().toISOString(),
      status: "pretest",
      method: "four-threshold 1PL Rasch model with level-median shrinkage and robust nominal-level calibration; level 28 is treated as an unreachable 27.00 fixed cap",
      sourceDatabase: archiveDbPath,
      chartSources: constants.sourceTables,
      levelConversion: "Second-period Overjoy ★★n = ★(20+n)",
      bands: [...bandSamples.values()].map((sample) => ({
        id: sample.id,
        label: sample.label,
        levelRange: `${sample.min}-${sample.max}`,
        chartCount: sample.chartCount,
        minimumPlayed: sample.minimumPlayed,
        eligiblePlayers: sample.eligibleCount,
        sampledPlayers: sample.sampled.length,
        addedFromUnreachablePlayers: sample.addedFromUnreachableCount || 0,
      })),
      sampleLimitPerBand: SAMPLE_LIMIT_PER_BAND,
      minimumCoverageRate: MIN_COVERAGE_RATE,
      uniqueSampledPlayers: observations.playerIds.length,
      observations: observations.scores.length,
      raschIterations: RASCH_ITERATIONS,
      itemShrinkageStrength: ITEM_SHRINKAGE_STRENGTH,
      scale: {
        slope: round(built.scale.slope, 8),
        intercept: round(built.scale.intercept, 8),
      },
      comparison: {
        oldNewCorrelation: round(
          pearsonCorrelation(
            built.results.map((row) => row.oldConstant),
            built.results.map((row) => row.newConstant),
          ),
          6,
        ),
        meanAbsoluteDifference: round(
          built.results.reduce((sum, row) => sum + Math.abs(row.difference), 0) /
            built.results.length,
          4,
        ),
      },
      thresholdFits: thresholdFits.map((fit) => ({
        threshold: fit.threshold,
        completedIterations: fit.completedIterations,
        finalDelta: round(fit.finalDelta, 8),
      })),
      levelSummary: buildLevelSummary(built.results),
      charts: built.results,
    };
    const outputPath = path.join(outputDir, "irt-force-constant-pretest-data.json");
    fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(
      JSON.stringify(
        {
          outputPath,
          charts: result.charts.length,
          bands: result.bands,
          uniqueSampledPlayers: result.uniqueSampledPlayers,
          observations: result.observations,
          comparison: result.comparison,
          top10: result.charts.slice(0, 10).map((row) => ({
            title: row.title,
            difficulty: row.difficulty,
            oldConstant: row.oldConstant,
            newConstant: row.newConstant,
          })),
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
