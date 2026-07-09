const assert = require("node:assert/strict");
const test = require("node:test");

const constants = require("../public/data/force-chart-constants.json");
const { __test, buildForceRating, clampForceRating, getForceRatingTier } = require("../server");
const {
  applyExcludedPlayerScores,
  buildEntries,
  buildGlobalArchiveConstants,
  computeWeightedAchievement,
} = require("./build-force-rating-data");

const tierCases = [
  [0, "SLATE", "slate"],
  [9.999, "SLATE", "slate"],
  [10, "AZURE", "azure"],
  [12, "AMBER", "amber"],
  [14, "JADE", "jade"],
  [15, "AMETHYST", "amethyst"],
  [16, "CRIMSON", "crimson"],
  [17, "ARGENT", "argent"],
  [18, "AURUM", "aurum"],
  [19, "OBSIDIAN", "obsidian"],
  [20, "ASTRAL I", "astral-1"],
  [21, "ASTRAL II", "astral-2"],
  [22, "ASTRAL III", "astral-3"],
  [23, "ASTRAL IV", "astral-4"],
  [24, "SINGULARITY", "singularity"],
  [24.999, "SINGULARITY", "singularity"],
  [25, "EVENT HORIZONE", "event-horizone"],
  [26, "EVENT HORIZONE", "event-horizone"],
  [30, "EVENT HORIZONE", "event-horizone"],
];

test("FORCE constants contain the expected unique chart set", () => {
  assert.equal(constants.charts.length, 1265);
  assert.equal(constants.insaneCharts, 1030);
  assert.equal(constants.overjoyCharts, 235);
  assert.equal(constants.overjoyOldOnlyCharts, 17);
  assert.equal(constants.overjoySecondOnlyCharts, 24);
  assert.equal(constants.overjoyOldAndSecondCharts, 194);
  assert.deepEqual(
    Object.fromEntries(
      [...new Set(constants.charts.map((chart) => chart.sourceTable))]
        .sort()
        .map((sourceTable) => [
          sourceTable,
          constants.charts.filter((chart) => chart.sourceTable === sourceTable).length,
        ]),
    ),
    {
      "初代/第二期Overjoy": 194,
      "初代Overjoy": 17,
      "第二期Overjoy": 24,
      "発狂BMS難易度表": 1030,
    },
  );
  assert.equal(constants.overjoyOverlapCount, 37);
  assert.equal(constants.sourceTables.overjoy, "https://lr2.sakura.ne.jp/overjoy.php");
  assert.equal(constants.sourceTables.overjoyOld, "https://darksabun.club/table/archive/old-overjoy/");
  assert.equal(constants.overjoySourceScope, "old-and-second-period");
  assert.equal(constants.overjoyAllowlistCharts, 255);
  assert.equal(constants.overjoyOldCharts, 250);
  assert.equal(constants.overjoyAllowlistSource, "https://lr2.sakura.ne.jp/overjoy.php");
  assert.equal(constants.overjoyOldSource, "https://darksabun.club/table/archive/old-overjoy/");
  assert.equal(constants.overjoyExcludedByAllowlistCount, 157);
  assert.match(constants.overjoyDuplicatePolicy, /same MD5/);
  assert.equal(constants.archiveCharts, 1265);
  assert.equal(constants.archiveMissingCharts, 0);
  assert.deepEqual(constants.archiveMissingMd5s, []);
  assert.equal(constants.excludedPlayerScoreCount, 740);
  assert.deepEqual(
    constants.excludedPlayers.map((player) => player.playerId),
    [114328, 108312, 144372, 141249, 159674, 162280, 120831, 153667, 139857],
  );
  assert.equal(constants.excludedPlayerUnmatchedScores.length, 0);
  assert.equal(constants.charts.every((chart) => !chart.archiveDataMissing), true);
  assert.equal(new Set(constants.charts.map((chart) => chart.md5)).size, constants.charts.length);
});

test("GENOSIDE2018 normal dan and insane dan titles are not conflated", () => {
  assert.deepEqual(__test.parseLocalDanGradeTitle("GENOSIDE2018 段位認定 五段"), {
    rank: 5,
    grade: "☆5",
  });
  assert.deepEqual(__test.parseLocalDanGradeTitle("GENOSIDE2018 段位認定 発狂五段"), {
    rank: 15,
    grade: "★5",
  });
  assert.deepEqual(__test.parseLocalDanGradeTitle("GENOSIDE2018 段位認定 10段"), {
    rank: 10,
    grade: "☆10",
  });
  assert.deepEqual(__test.parseLocalDanGradeTitle("GENOSIDE2018 段位認定 発狂10段"), {
    rank: 20,
    grade: "★10",
  });
});

test("normal GENOSIDE2018 dan courses are not added as FORCE dan targets", () => {
  assert.equal(
    __test.buildForceDanCandidateFromGradeInfo({
      rank: 5,
      grade: "☆5",
      lampStatus: "CLEAR",
      courseHash: "normal-dan",
    }),
    null,
  );
  const insaneCandidate = __test.buildForceDanCandidateFromGradeInfo({
    rank: 15,
    grade: "★5",
    lampStatus: "CLEAR",
    courseHash: "insane-dan",
  });
  assert.equal(insaneCandidate?.label, "発狂五段");
});

test("specific Overjoy chart remains available in FORCE constants", () => {
  const chart = constants.charts.find((entry) => entry.md5 === "8f2a82e4f1f3e299c5d761a4c673b9ae");
  assert.equal(chart?.difficulty, "★★5");
  assert.equal(Number.isFinite(chart?.chartConstant), true);
});

test("Overjoy entries can be restricted to the second-period allowlist", () => {
  const insaneText = "md5,chart_constant\n11111111111111111111111111111111,10\n";
  const allowedMd5 = "22222222222222222222222222222222";
  const disallowedMd5 = "33333333333333333333333333333333";
  const overjoyText = [
    "md5,chart_constant,overjoy_level",
    `${allowedMd5},21.25,1`,
    `${disallowedMd5},22.5,2`,
  ].join("\n");
  const result = buildEntries(insaneText, overjoyText, {
    overjoyAllowedMd5s: new Set([allowedMd5]),
  });
  const md5s = new Set(result.entries.map((entry) => entry.md5));

  assert.equal(md5s.has(allowedMd5), true);
  assert.equal(md5s.has(disallowedMd5), false);
  assert.equal(result.overjoyFilteredOutCount, 1);
  assert.equal(result.overjoyAllowlistCount, 1);
});

test("excluded player scores are subtracted before chart constants are calculated", () => {
  const archive = {
    charts: [{
      md5: "00000000000000000000000000000001",
      players: 3,
      fullcombo: 1,
      hard: 1,
      normal: 0,
      easy: 0,
      failed: 1,
    }],
  };
  const result = applyExcludedPlayerScores(archive, {
    scores: [
      { playerId: 1, md5: archive.charts[0].md5, lamp: "FULLCOMBO" },
      { playerId: 2, md5: archive.charts[0].md5, lamp: "FAILED" },
    ],
  });

  assert.deepEqual(result.archivePayload.charts[0], {
    ...archive.charts[0],
    players: 1,
    fullcombo: 0,
    failed: 0,
  });
  assert.equal(result.appliedScoreCount, 2);
  assert.deepEqual(result.unmatchedScores, []);
  assert.equal(archive.charts[0].players, 3);
});

test("Overjoy level 8 and charts with no clear players use constant 27", () => {
  const entries = [
    { md5: "00000000000000000000000000000001", legacyChartConstant: 10, source: "overjoy", level: 8 },
    { md5: "00000000000000000000000000000002", legacyChartConstant: 10, source: "insane", level: null },
    { md5: "00000000000000000000000000000003", legacyChartConstant: 10, source: "insane", level: null },
  ];
  const generated = buildGlobalArchiveConstants(entries, {
    charts: [
      { md5: entries[0].md5, players: 100, fullcombo: 100, hard: 0, normal: 0, easy: 0, failed: 0 },
      { md5: entries[1].md5, players: 100, fullcombo: 0, hard: 0, normal: 0, easy: 0, failed: 100 },
      { md5: entries[2].md5, players: 100, fullcombo: 0, hard: 100, normal: 0, easy: 0, failed: 0 },
    ],
  });
  const byMd5 = new Map(generated.charts.map((chart) => [chart.md5, chart]));

  assert.equal(byMd5.get(entries[0].md5).chartConstant, 27);
  assert.equal(byMd5.get(entries[0].md5).chartConstantOverride, "overjoy-level-8");
  assert.equal(byMd5.get(entries[1].md5).chartConstant, 27);
  assert.equal(byMd5.get(entries[1].md5).chartConstantOverride, "no-clear-players");
  assert.equal(byMd5.get(entries[2].md5).chartConstantOverride, undefined);
});

test("global chart constants use every FC, HC, NC, EC and failed total", () => {
  const lamps = [
    ["fc", { fullcombo: 100, hard: 0, normal: 0, easy: 0, failed: 0 }],
    ["hc", { fullcombo: 0, hard: 100, normal: 0, easy: 0, failed: 0 }],
    ["nc", { fullcombo: 0, hard: 0, normal: 100, easy: 0, failed: 0 }],
    ["ec", { fullcombo: 0, hard: 0, normal: 0, easy: 100, failed: 0 }],
    ["failed", { fullcombo: 0, hard: 0, normal: 0, easy: 0, failed: 100 }],
  ];
  const entries = lamps.map(([name], index) => ({
    md5: String(index + 1).padStart(32, "0"),
    legacyChartConstant: 10,
    source: "insane",
    level: null,
    name,
  }));
  const archive = {
    charts: lamps.map(([name, counts], index) => ({
      md5: entries[index].md5,
      players: 100,
      ...counts,
      name,
    })),
  };

  assert.equal(computeWeightedAchievement({ players: 100, ...lamps[0][1] }), 200);
  assert.equal(computeWeightedAchievement({ players: 100, ...lamps[1][1] }), 85);
  assert.equal(computeWeightedAchievement({ players: 100, ...lamps[2][1] }), 70);
  assert.equal(computeWeightedAchievement({ players: 100, ...lamps[3][1] }), 50);
  assert.equal(computeWeightedAchievement({ players: 100, ...lamps[4][1] }), 0);

  const generated = buildGlobalArchiveConstants(entries, archive);
  const byMd5 = new Map(generated.charts.map((chart) => [chart.md5, chart]));
  assert.deepEqual(
    entries.map((entry) => byMd5.get(entry.md5).chartConstant),
    [1, 7.5, 14, 20.5, 27],
  );
  assert.deepEqual(
    entries.map((entry) => byMd5.get(entry.md5).difficultyPercentile),
    [0, 0.25, 0.5, 0.75, 1],
  );
});

test("charts missing from LR2IR Archive keep their legacy constant", () => {
  const entries = [
    { md5: "00000000000000000000000000000001", legacyChartConstant: 8, source: "insane", level: null },
    { md5: "00000000000000000000000000000002", legacyChartConstant: 19.36, source: "insane", level: null },
  ];
  const generated = buildGlobalArchiveConstants(entries, {
    charts: [{
      md5: entries[0].md5,
      players: 100,
      fullcombo: 10,
      hard: 40,
      normal: 20,
      easy: 10,
      failed: 20,
    }],
  });
  const missing = generated.charts.find((chart) => chart.md5 === entries[1].md5);

  assert.equal(generated.archiveChartCount, 1);
  assert.deepEqual(generated.missingMd5s, [entries[1].md5]);
  assert.equal(missing.chartConstant, 19.36);
  assert.equal(missing.archiveDataMissing, true);
});

test("FORCE title boundaries match the specification", () => {
  for (const [rating, title, tier] of tierCases) {
    assert.deepEqual(getForceRatingTier(rating), { title, tier });
  }
});

test("FORCE RATE is capped at 30 without changing values below the cap", () => {
  assert.equal(clampForceRating(23.826), 23.826);
  assert.equal(clampForceRating(30), 30);
  assert.equal(clampForceRating(31.25), 30);
});

test("a single chart uses the FORCE score coefficient and still divides by 50", () => {
  const chart = constants.charts[0];
  const maxExScore = 1800;
  const exScore = 1782;
  const result = buildForceRating({
    byHash: new Map([
      [
        chart.md5,
        {
          title: "Test Chart",
          artist: "Test Artist",
          lampStatus: "HARD CLEAR",
          exScore,
          maxExScore,
        },
      ],
    ]),
  });
  const expectedScoreCoefficient = __test.calculateForceScoreCoefficient(exScore / maxExScore);
  const expectedForce = chart.chartConstant * expectedScoreCoefficient;

  assert.equal(result.available, true);
  assert.equal(result.top50Count, 1);
  assert.equal(result.playedCharts, 1);
  assert.equal(result.topCharts.length, 1);
  assert.equal(result.topCharts[0].rank, 1);
  assert.equal(result.topCharts[0].md5, chart.md5);
  assert.equal(result.topCharts[0].title, "Test Chart");
  assert.equal(result.topCharts[0].artist, "Test Artist");
  assert.equal(result.topCharts[0].scoreCoefficient, expectedScoreCoefficient);
  assert.equal(result.topCharts[0].scoreRate, 99);
  assert.ok(Math.abs(result.best50Total - expectedForce) < 1e-12);
  assert.ok(Math.abs(result.best50Average - expectedForce / 50) < 1e-12);
  assert.ok(Math.abs(result.best20Average - expectedForce / 50) < 1e-12);
  assert.ok(Math.abs(result.rating - expectedForce / 50) < 1e-12);
});

test("the score coefficient is capped between zero and one", () => {
  const [overChart, negativeChart] = constants.charts;
  const result = buildForceRating({
    byHash: new Map([
      [overChart.md5, { lampStatus: "FULL COMBO", exScore: 1810, maxExScore: 1800 }],
      [negativeChart.md5, { lampStatus: "FULL COMBO", exScore: -10, maxExScore: 1800 }],
    ]),
  });

  assert.equal(result.topCharts.find((chart) => chart.md5 === overChart.md5)?.scoreCoefficient, 1);
  assert.equal(result.topCharts.find((chart) => chart.md5 === negativeChart.md5)?.scoreCoefficient, 0);
});

test("played lamps use a neutral FORCE lamp coefficient", () => {
  const chart = constants.charts[0];
  const result = buildForceRating({
    byHash: new Map([
      [chart.md5, { lampStatus: "FULL COMBO", exScore: 1800, maxExScore: 1800 }],
    ]),
  });

  assert.equal(result.topCharts[0]?.lampCoefficient, 1);
  assert.ok(Math.abs(result.topCharts[0]?.force - chart.chartConstant) < 1e-12);
});

test("beatoraja extended lamps also use the neutral FORCE coefficient", () => {
  const [maxChart, perfectChart, exHardChart, failedChart] = constants.charts;
  const result = buildForceRating({
    byHash: new Map([
      [maxChart.md5, { lampStatus: "MAX", exScore: 1800, maxExScore: 1800 }],
      [perfectChart.md5, { lampStatus: "PERFECT", exScore: 1800, maxExScore: 1800 }],
      [exHardChart.md5, { lampStatus: "EX HARD CLEAR", exScore: 1800, maxExScore: 1800 }],
      [failedChart.md5, { lampStatus: "FAILED", exScore: 1800, maxExScore: 1800 }],
    ]),
  });
  const byMd5 = new Map(result.topCharts.map((chart) => [chart.md5, chart]));

  assert.equal(byMd5.get(maxChart.md5)?.lampCoefficient, 1);
  assert.equal(byMd5.get(perfectChart.md5)?.lampCoefficient, 1);
  assert.equal(byMd5.get(exHardChart.md5)?.lampCoefficient, 1);
  assert.equal(byMd5.get(failedChart.md5)?.lampCoefficient, 1);
});

test("the score coefficient follows EX rate below AAA and scales AAA to MAX", () => {
  const [belowAaaChart, aaaChart, ninetyChart, thresholdChart, highChart, maxChart, fractionalChart] =
    constants.charts;
  const result = buildForceRating({
    byHash: new Map([
      [belowAaaChart.md5, { lampStatus: "FULL COMBO", exScore: 1584, maxExScore: 1800 }],
      [aaaChart.md5, { lampStatus: "FULL COMBO", exScore: 1600, maxExScore: 1800 }],
      [ninetyChart.md5, { lampStatus: "FULL COMBO", exScore: 9000, maxExScore: 10000 }],
      [thresholdChart.md5, { lampStatus: "FULL COMBO", exScore: 9444, maxExScore: 10000 }],
      [highChart.md5, { lampStatus: "FULL COMBO", exScore: 9900, maxExScore: 10000 }],
      [maxChart.md5, { lampStatus: "FULL COMBO", exScore: 10000, maxExScore: 10000 }],
      [fractionalChart.md5, { lampStatus: "FULL COMBO", exScore: 9353, maxExScore: 10000 }],
    ]),
  });
  const byMd5 = new Map(result.topCharts.map((chart) => [chart.md5, chart]));

  assert.equal(byMd5.get(belowAaaChart.md5)?.scoreCoefficient, 0.88);
  assert.equal(byMd5.get(aaaChart.md5)?.scoreCoefficient, 0.9);
  assert.equal(byMd5.get(ninetyChart.md5)?.scoreCoefficient, 0.916);
  assert.equal(byMd5.get(thresholdChart.md5)?.scoreCoefficient, 0.98);
  assert.equal(byMd5.get(highChart.md5)?.scoreCoefficient, 0.996);
  assert.equal(byMd5.get(maxChart.md5)?.scoreCoefficient, 1);
  assert.equal(byMd5.get(fractionalChart.md5)?.scoreCoefficient, 0.967);
  assert.equal(byMd5.get(fractionalChart.md5)?.scoreRate, 93.53);
});

test("NO PLAY and unmatched charts are excluded from FORCE candidates", () => {
  const [noPlayChart, unknownChart] = constants.charts;
  const result = buildForceRating({
    byHash: new Map([
      [noPlayChart.md5, { lampStatus: "NO PLAY", exScore: 1800, maxExScore: 1800 }],
      [unknownChart.md5, { lampStatus: "NO SONG", exScore: 1800, maxExScore: 1800 }],
    ]),
  });

  assert.equal(result.top50Count, 0);
  assert.equal(result.playedCharts, 0);
  assert.deepEqual(result.topCharts, []);
  assert.equal(result.rating, 0);
});

test("only the strongest 50 chart FORCE values are used", () => {
  const selected = [...constants.charts]
    .sort((left, right) => right.chartConstant - left.chartConstant)
    .slice(0, 60);
  const result = buildForceRating({
    byHash: new Map(
      selected.map((chart) => [
        chart.md5,
        { lampStatus: "FULL COMBO", exScore: 1800, maxExScore: 1800 },
      ]),
    ),
  });
  const expectedTotal = selected
    .slice(0, 50)
    .reduce((sum, chart) => sum + chart.chartConstant, 0);
  const expectedBest20Average = selected
    .slice(0, 20)
    .reduce((sum, chart) => sum + chart.chartConstant, 0) / 20;
  const expectedBest50Average = expectedTotal / 50;
  const expectedRating = expectedBest50Average;

  assert.equal(result.playedCharts, 60);
  assert.equal(result.top50Count, 50);
  assert.equal(result.topCharts.length, 50);
  assert.deepEqual(result.topCharts.map((chart) => chart.rank), Array.from({ length: 50 }, (_, index) => index + 1));
  assert.ok(Math.abs(result.best50Total - expectedTotal) < 1e-12);
  assert.ok(Math.abs(result.best20Average - expectedBest20Average) < 1e-12);
  assert.ok(Math.abs(result.best50Average - expectedBest50Average) < 1e-12);
  assert.ok(Math.abs(result.rating - expectedRating) < 1e-12);
});

test("the highest passed dan candidate is added after the strongest 50 charts", () => {
  const selected = [...constants.charts]
    .sort((left, right) => right.chartConstant - left.chartConstant)
    .slice(0, 60);
  const danCandidate = {
    candidateType: "dan",
    force: 26.81,
    chartConstant: 26.81,
    title: "GENOSIDE2018 Overjoy",
    source: "dan",
    lampStatus: "CLEAR",
    lampCoefficient: 1,
  };
  const result = buildForceRating({
    byHash: new Map(
      selected.map((chart) => [
        chart.md5,
        { lampStatus: "FULL COMBO", exScore: 1800, maxExScore: 1800 },
      ]),
    ),
    localProfile: {
      forceDanCandidate: danCandidate,
    },
  });
  const best50ChartForces = selected.slice(0, 50).map((chart) => chart.chartConstant);
  const broadForces = [...best50ChartForces, danCandidate.force].sort((left, right) => right - left);
  const expectedBroadAverage = broadForces.reduce((sum, force) => sum + force, 0) / 51;
  const expectedBest20Average = broadForces.slice(0, 20).reduce((sum, force) => sum + force, 0) / 20;
  const expectedRating = expectedBroadAverage;

  assert.equal(result.playedCharts, 60);
  assert.equal(result.top50Count, 50);
  assert.equal(result.broadCount, 51);
  assert.equal(result.topCharts.length, 51);
  assert.equal(result.topCharts.filter((chart) => chart.candidateType === "dan").length, 1);
  assert.ok(Math.abs(result.broadAverage - expectedBroadAverage) < 1e-12);
  assert.ok(Math.abs(result.best20Average - expectedBest20Average) < 1e-12);
  assert.ok(Math.abs(result.rating - expectedRating) < 1e-12);
});
