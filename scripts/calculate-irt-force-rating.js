const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { __test } = require("../server");

const projectRoot = path.resolve(__dirname, "..");
const constantsPath = path.resolve(
  process.argv[2] ||
    path.join(
      projectRoot,
      "outputs",
      "force-irt-pretest-20260623",
      "irt-force-constant-pretest-data.json",
    ),
);
const localScoreDbPath = "D:/LR2beta3/LR2files/Database/Score/190114.db";
const localSongDbPath = "D:/LR2beta3/LR2files/Database/song.db";
const archiveDbPath = path.resolve(projectRoot, "..", "lr2ir-archive.db");

const FORCE_RATING_MAX = 30;
const FORCE_LAMP_COEFFICIENTS = new Map([
  ["FULL COMBO", 1],
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
  ["HARD", 1],
  ["HARD CLEAR", 1],
  ["FULL COMBO", 1],
  ["FULLCOMBO", 1],
  ["★FULLCOMBO", 1],
  ["CLEAR", 1],
  ["NORMAL CLEAR", 1],
]);
const FORCE_DAN_CONSTANTS = new Map([
  [11, { label: "Hakkyou 1st Dan", grade: "★1", courseId: 11110, constant: 4.29 }],
  [12, { label: "Hakkyou 2nd Dan", grade: "★2", courseId: 11109, constant: 6.24 }],
  [13, { label: "Hakkyou 3rd Dan", grade: "★3", courseId: 11108, constant: 8.32 }],
  [14, { label: "Hakkyou 4th Dan", grade: "★4", courseId: 11107, constant: 9.72 }],
  [15, { label: "Hakkyou 5th Dan", grade: "★5", courseId: 11106, constant: 12.4 }],
  [16, { label: "Hakkyou 6th Dan", grade: "★6", courseId: 11105, constant: 14.22 }],
  [17, { label: "Hakkyou 7th Dan", grade: "★7", courseId: 11104, constant: 17.28 }],
  [18, { label: "Hakkyou 8th Dan", grade: "★8", courseId: 11103, constant: 18.68 }],
  [19, { label: "Hakkyou 9th Dan", grade: "★9", courseId: 11102, constant: 21.35 }],
  [20, { label: "Hakkyou 10th Dan", grade: "★10", courseId: 11101, constant: 23.41 }],
  [21, { label: "Hakkyou Kaiden", grade: "★★", courseId: 11100, constant: 24.44 }],
  [22, { label: "Overjoy", grade: "(^^)", courseId: 11099, constant: 26.81 }],
]);

function getForceDanLampCoefficient(lampStatus, danConstant) {
  if (!danConstant) {
    return null;
  }
  if (Number(danConstant.courseId) === 11099) {
    return lampStatus === "HARD CLEAR" || lampStatus === "CLEAR" ? 1 : null;
  }
  return FORCE_DAN_LAMP_COEFFICIENTS.get(lampStatus) ?? null;
}

function calculateForceDanScoreCoefficient(scoreRatio, danConstant) {
  if (Number(danConstant?.courseId) === 11099) {
    return 1;
  }
  if (!Number.isFinite(scoreRatio)) {
    return 1;
  }
  return __test.calculateForceScoreCoefficient(scoreRatio);
}

const LOCAL_DAN_TEXT_LEVELS = new Map([
  ["初", 1],
  ["一", 1],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", 10],
]);

function normalizeText(value) {
  return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function normalizeHash(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeHex32(value) {
  const text = normalizeHash(value);
  return /^[0-9a-f]{32}$/.test(text) ? text : "";
}

function normalizeGradeTitleKey(title) {
  return normalizeText(title)
    .replace(/[！-～]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function parseLocalDanTitleLevel(text) {
  const numericMatch = String(text).match(/(\d{1,2})段/);
  if (numericMatch) {
    const level = Number.parseInt(numericMatch[1], 10);
    return Number.isFinite(level) ? level : null;
  }

  const japaneseMatch = String(text).match(/(初|一|二|三|四|五|六|七|八|九|十)段/);
  if (!japaneseMatch) {
    return null;
  }

  return LOCAL_DAN_TEXT_LEVELS.get(japaneseMatch[1]) ?? null;
}

function parseLocalDanGradeTitle(title) {
  const titleKey = normalizeGradeTitleKey(title);
  const prefix = "genoside2018段位認定";
  if (!titleKey.startsWith(prefix)) {
    return null;
  }
  if (titleKey === "genoside2018段位認定overjoy") {
    return { rank: 22, grade: "(^^)" };
  }
  const body = titleKey.slice(prefix.length);
  if (body.includes("overjoy") || body.includes("オーバージョイ")) {
    return null;
  }
  if (body.includes("皆伝")) {
    return body.includes("発狂") || body.includes("★★")
      ? { rank: 21, grade: "★★" }
      : null;
  }
  const level = parseLocalDanTitleLevel(body);
  if (!Number.isFinite(level) || level < 1 || level > 10) {
    return null;
  }
  const isInsaneDan = body.includes("発狂") || body.includes("★");
  return isInsaneDan
    ? { rank: level + 10, grade: `★${level}` }
    : { rank: level, grade: `☆${level}` };
}

function lampByLocalClear(clear, playCount = 0) {
  const value = Number.parseInt(clear, 10);
  if (value >= 5) return "FULL COMBO";
  if (value === 4) return "HARD CLEAR";
  if (value === 3) return "CLEAR";
  if (value === 2) return "EASY CLEAR";
  if (value === 1 || Number(playCount) > 0) return "FAILED";
  return "NO PLAY";
}

function normalizeArchiveLamp(value) {
  const text = normalizeText(value).toUpperCase();
  if (text === "FULLCOMBO" || text === "★FULLCOMBO" || text === "FULL COMBO") return "FULL COMBO";
  if (text === "HARD" || text === "HARD CLEAR") return "HARD CLEAR";
  if (text === "CLEAR" || text === "NORMAL CLEAR") return "CLEAR";
  if (text === "EASY" || text === "EASY CLEAR") return "EASY CLEAR";
  if (text === "FAILED") return "FAILED";
  return text;
}

function getForceRatingTier(ratingValue) {
  const rating = Number.isFinite(Number(ratingValue)) ? Number(ratingValue) : 0;
  if (rating >= 25) return { title: "EVENT HORIZONE", tier: "event-horizone" };
  if (rating >= 24) return { title: "SINGULARITY", tier: "singularity" };
  if (rating >= 23) return { title: "ASTRAL IV", tier: "astral-4" };
  if (rating >= 22) return { title: "ASTRAL III", tier: "astral-3" };
  if (rating >= 21) return { title: "ASTRAL II", tier: "astral-2" };
  if (rating >= 20) return { title: "ASTRAL I", tier: "astral-1" };
  if (rating >= 19) return { title: "OBSIDIAN", tier: "obsidian" };
  if (rating >= 18) return { title: "AURUM", tier: "aurum" };
  if (rating >= 17) return { title: "ARGENT", tier: "argent" };
  if (rating >= 16) return { title: "CRIMSON", tier: "crimson" };
  if (rating >= 15) return { title: "AMETHYST", tier: "amethyst" };
  if (rating >= 14) return { title: "JADE", tier: "jade" };
  if (rating >= 12) return { title: "AMBER", tier: "amber" };
  if (rating >= 10) return { title: "AZURE", tier: "azure" };
  return { title: "SLATE", tier: "slate" };
}

function loadIrtConstants() {
  const payload = JSON.parse(fs.readFileSync(constantsPath, "utf8"));
  return payload.charts
    .map((chart) => ({
      md5: normalizeHex32(chart.md5),
      chartConstant: Number(chart.newConstant),
      source: normalizeText(chart.source),
      sourceTable: normalizeText(chart.sourceTable),
      difficulty: normalizeText(chart.difficulty),
      title: normalizeText(chart.title),
      rank: Number(chart.rank),
    }))
    .filter((chart) => chart.md5 && Number.isFinite(chart.chartConstant));
}

function buildForceRating(candidates, danCandidate = null) {
  candidates.sort(
    (left, right) =>
      right.force - left.force ||
      right.chartConstant - left.chartConstant ||
      String(left.md5 || "").localeCompare(String(right.md5 || "")),
  );
  const best50 = candidates.slice(0, 50);
  const broadCandidates = danCandidate ? [...best50, danCandidate] : best50;
  broadCandidates.sort(
    (left, right) =>
      right.force - left.force ||
      right.chartConstant - left.chartConstant ||
      String(left.md5 || "").localeCompare(String(right.md5 || "")),
  );

  const best50Total = best50.reduce((sum, chart) => sum + chart.force, 0);
  const best50Average = best50Total / 50;
  const broadDenominator = danCandidate ? 51 : 50;
  const broadTotal = broadCandidates.reduce((sum, chart) => sum + chart.force, 0);
  const broadAverage = broadTotal / broadDenominator;
  const best20 = broadCandidates.slice(0, 20);
  const best20Average = best20.length >= 20
    ? best20.reduce((sum, chart) => sum + chart.force, 0) / 20
    : broadAverage;
  const rating = Math.max(0, Math.min(broadAverage, FORCE_RATING_MAX));
  const tier = getForceRatingTier(rating);
  return {
    rating,
    title: tier.title,
    playedCharts: candidates.length,
    top50Count: best50.length,
    broadCount: broadCandidates.length,
    best50Average,
    broadAverage,
    best20Average,
    cutoff: broadCandidates.at(-1)?.force ?? 0,
    danCandidate,
    topCharts: broadCandidates.map((chart, index) => ({ rank: index + 1, ...chart })),
  };
}

function buildLocalScoreMaps(scoreDbPath) {
  const database = new DatabaseSync(scoreDbPath, { readonly: true });
  try {
    const rows = database
      .prepare("SELECT hash, scorehash, clear, playcount, perfect, great, totalnotes FROM score")
      .all();
    const byHash = new Map();
    for (const row of rows) {
      for (const rawHash of [row.hash, row.scorehash]) {
        const hash = normalizeHash(rawHash);
        if (!hash || byHash.has(hash)) {
          continue;
        }
        byHash.set(hash, row);
      }
    }
    return { rows, byHash };
  } finally {
    database.close();
  }
}

function buildLocalCandidates(constants, scoreDbPath) {
  const { rows, byHash } = buildLocalScoreMaps(scoreDbPath);
  const candidates = [];
  for (const chart of constants) {
    const row = byHash.get(chart.md5);
    if (!row || Number(row.playcount) <= 0) {
      continue;
    }
    const lampStatus = lampByLocalClear(row.clear, row.playcount);
    const lampCoefficient = FORCE_LAMP_COEFFICIENTS.get(lampStatus);
    const exScore = Number(row.perfect) * 2 + Number(row.great);
    const maxExScore = Number(row.totalnotes) * 2;
    if (!lampCoefficient || !Number.isFinite(exScore) || !Number.isFinite(maxExScore) || maxExScore <= 0) {
      continue;
    }
    const scoreRatio = Math.min(Math.max(exScore / maxExScore, 0), 1);
    const scoreCoefficient = __test.calculateForceScoreCoefficient(scoreRatio);
    candidates.push({
      candidateType: "chart",
      md5: chart.md5,
      title: chart.title,
      sourceTable: chart.sourceTable,
      difficulty: chart.difficulty,
      lampStatus,
      exScore,
      maxExScore,
      scoreRate: scoreRatio * 100,
      scoreCoefficient,
      lampCoefficient,
      chartConstant: chart.chartConstant,
      force: chart.chartConstant * scoreCoefficient * lampCoefficient,
    });
  }
  return { candidates, scoreRows: rows, scoreByHash: byHash };
}

function buildLocalDanCandidate(songDbPath, scoreByHash) {
  if (!fs.existsSync(songDbPath)) {
    return null;
  }
  const database = new DatabaseSync(songDbPath, { readonly: true });
  try {
    const rows = database.prepare("SELECT title, hash FROM grade").all();
    let bestGrade = null;
    for (const row of rows) {
      const parsed = parseLocalDanGradeTitle(row.title);
      if (!parsed) {
        continue;
      }
      const score = scoreByHash.get(normalizeHash(row.hash));
      if (!score) {
        continue;
      }
      const clear = Number.parseInt(score.clear, 10);
      if (!Number.isFinite(clear) || clear < 3) {
        continue;
      }
      if (!bestGrade || parsed.rank > bestGrade.rank) {
        const exScore = Number(score.perfect) * 2 + Number(score.great);
        const maxExScore = Number(score.totalnotes) * 2;
        bestGrade = {
          ...parsed,
          courseHash: normalizeHash(row.hash),
          title: normalizeText(row.title),
          clear,
          lampStatus: lampByLocalClear(score.clear, score.playcount),
          exScore: Number.isFinite(exScore) ? exScore : null,
          maxExScore: Number.isFinite(maxExScore) && maxExScore > 0 ? maxExScore : null,
        };
      }
    }
    if (!bestGrade) {
      return null;
    }
    return buildDanCandidate(
      bestGrade.rank,
      bestGrade.lampStatus,
      bestGrade.courseHash,
      bestGrade.title,
      bestGrade.exScore,
      bestGrade.maxExScore,
    );
  } finally {
    database.close();
  }
}

function buildDanCandidate(rankValue, lampStatus, md5 = "", title = "", exScore = null, maxExScore = null) {
  const dan = FORCE_DAN_CONSTANTS.get(Number(rankValue));
  if (!dan) {
    return null;
  }
  const normalizedLamp = normalizeArchiveLamp(lampStatus);
  const lampCoefficient = getForceDanLampCoefficient(normalizedLamp, dan);
  if (!lampCoefficient) {
    return null;
  }
  const score = Number(exScore);
  const scoreMax = Number(maxExScore);
  const scoreRatio =
    Number.isFinite(score) && Number.isFinite(scoreMax) && scoreMax > 0
      ? Math.min(Math.max(score / scoreMax, 0), 1)
      : null;
  const scoreCoefficient = calculateForceDanScoreCoefficient(scoreRatio, dan);
  return {
    candidateType: "dan",
    md5,
    title: title || `GENOSIDE2018 ${dan.label}`,
    sourceTable: "Dan",
    difficulty: dan.grade,
    lampStatus: normalizedLamp,
    exScore: Number.isFinite(score) ? score : null,
    maxExScore: Number.isFinite(scoreMax) ? scoreMax : null,
    scoreRate: scoreRatio == null ? null : scoreRatio * 100,
    scoreCoefficient,
    lampCoefficient,
    chartConstant: dan.constant,
    danConstant: dan.constant,
    force: dan.constant * lampCoefficient * scoreCoefficient,
  };
}

function calculateLocal(constants) {
  const { candidates, scoreByHash } = buildLocalCandidates(constants, localScoreDbPath);
  const danCandidate = buildLocalDanCandidate(localSongDbPath, scoreByHash);
  return buildForceRating(candidates, danCandidate);
}

function calculateArchive(constants, playerId) {
  const database = new DatabaseSync(archiveDbPath, { readonly: true });
  try {
    const constantsByMd5 = new Map(constants.map((chart) => [chart.md5, chart]));
    const md5s = constants.map((chart) => chart.md5);
    const candidates = [];
    const batchSize = 700;
    for (let index = 0; index < md5s.length; index += batchSize) {
      const batch = md5s.slice(index, index + batchSize);
      const placeholders = batch.map(() => "?").join(",");
      const rows = database
        .prepare(
          `SELECT pb.md5, pb.clear_type, pb.score, pb.score_max, chart.title
           FROM pb
           LEFT JOIN chart ON chart.md5 = pb.md5
           WHERE pb.player_id = ?
             AND pb.is_cheated = 0
             AND pb.md5 IN (${placeholders})`,
        )
        .all(playerId, ...batch);
      for (const row of rows) {
        const chart = constantsByMd5.get(normalizeHex32(row.md5));
        if (!chart) {
          continue;
        }
        const lampStatus = normalizeArchiveLamp(row.clear_type);
        const lampCoefficient = FORCE_LAMP_COEFFICIENTS.get(lampStatus);
        const exScore = Number(row.score);
        const maxExScore = Number(row.score_max);
        if (!lampCoefficient || !Number.isFinite(exScore) || !Number.isFinite(maxExScore) || maxExScore <= 0) {
          continue;
        }
        const scoreRatio = Math.min(Math.max(exScore / maxExScore, 0), 1);
        const scoreCoefficient = __test.calculateForceScoreCoefficient(scoreRatio);
        candidates.push({
          candidateType: "chart",
          md5: chart.md5,
          title: chart.title || normalizeText(row.title),
          sourceTable: chart.sourceTable,
          difficulty: chart.difficulty,
          lampStatus,
          exScore,
          maxExScore,
          scoreRate: scoreRatio * 100,
          scoreCoefficient,
          lampCoefficient,
          chartConstant: chart.chartConstant,
          force: chart.chartConstant * scoreCoefficient * lampCoefficient,
        });
      }
    }

    const danRows = database
      .prepare(
        `SELECT course_id, clear_type, score, score_max
         FROM course_ranking
         WHERE player_id = ?
           AND is_cheated = 0`,
      )
      .all(playerId);
    let danCandidate = null;
    for (const row of danRows) {
      const danEntry = [...FORCE_DAN_CONSTANTS.entries()].find(([, value]) => value.courseId === Number(row.course_id));
      if (!danEntry) {
        continue;
      }
      const [rankValue] = danEntry;
      const candidate = buildDanCandidate(rankValue, row.clear_type, "", "", row.score, row.score_max);
      if (!candidate) {
        continue;
      }
      if (!danCandidate || candidate.difficultyRank > danCandidate.difficultyRank || rankValue > danCandidate.rankValue) {
        candidate.rankValue = rankValue;
        danCandidate = candidate;
      }
    }
    return buildForceRating(candidates, danCandidate);
  } finally {
    database.close();
  }
}

function summarize(result) {
  return {
    rating: Number(result.rating.toFixed(3)),
    title: result.title,
    playedCharts: result.playedCharts,
    top50Count: result.top50Count,
    broadCount: result.broadCount,
    best20Average: Number(result.best20Average.toFixed(3)),
    broadAverage: Number(result.broadAverage.toFixed(3)),
    cutoff: Number(result.cutoff.toFixed(3)),
    danCandidate: result.danCandidate
      ? {
          title: result.danCandidate.title,
          grade: result.danCandidate.difficulty,
          lamp: result.danCandidate.lampStatus,
          constant: result.danCandidate.chartConstant,
          force: Number(result.danCandidate.force.toFixed(3)),
        }
      : null,
    top10: result.topCharts.slice(0, 10).map((chart) => ({
      rank: chart.rank,
      title: chart.title,
      difficulty: chart.difficulty,
      lamp: chart.lampStatus,
      constant: chart.chartConstant,
      scoreRate: chart.scoreRate == null ? null : Number(chart.scoreRate.toFixed(2)),
      force: Number(chart.force.toFixed(3)),
    })),
  };
}

const constants = loadIrtConstants();
const localResult = calculateLocal(constants);
const archive187038Result = calculateArchive(constants, 187038);

console.log(
  JSON.stringify(
    {
      constants: {
        source: constantsPath,
        count: constants.length,
      },
      local190114: summarize(localResult),
      archive187038: summarize(archive187038Result),
    },
    null,
    2,
  ),
);
