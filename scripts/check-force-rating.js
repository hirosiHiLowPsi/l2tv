const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { buildForceRating } = require("../server");

const scoreDbArgument = String(process.argv[2] || "").trim();
if (!scoreDbArgument) {
  throw new Error("Usage: node scripts/check-force-rating.js <score.db>");
}
const scoreDbPath = path.resolve(scoreDbArgument);

const lampByClear = new Map([
  [5, "FULL COMBO"],
  [4, "HARD CLEAR"],
  [3, "CLEAR"],
  [2, "EASY CLEAR"],
  [1, "FAILED"],
  [0, "NO PLAY"],
]);
const database = new DatabaseSync(scoreDbPath, { readonly: true });
try {
  const rows = database
    .prepare("SELECT hash, clear, playcount, perfect, great, totalnotes FROM score")
    .all();
  const byHash = new Map();
  for (const row of rows) {
    const md5 = String(row.hash || "").trim().toLowerCase();
    const playCount = Number(row.playcount) || 0;
    if (!/^[0-9a-f]{32}$/.test(md5) || playCount <= 0 || byHash.has(md5)) {
      continue;
    }
    byHash.set(md5, {
      lampStatus: lampByClear.get(Number(row.clear)) || "FAILED",
      exScore: Number(row.perfect) * 2 + Number(row.great),
      maxExScore: Number(row.totalnotes) * 2,
    });
  }
  console.log(JSON.stringify(buildForceRating({ byHash }), null, 2));
} finally {
  database.close();
}
