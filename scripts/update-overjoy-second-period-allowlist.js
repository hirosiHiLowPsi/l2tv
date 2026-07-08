const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.resolve(
  process.argv[2] || path.join(__dirname, "data", "overjoy-second-period-score.json"),
);
const outputPath = path.resolve(
  process.argv[3] || path.join(__dirname, "data", "overjoy-second-period-md5s.json"),
);

const rows = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
if (!Array.isArray(rows)) {
  throw new Error("Overjoy score data must be a JSON array.");
}

const charts = rows
  .map((row) => ({
    md5: String(row?.md5 || "").trim().toLowerCase(),
    title: String(row?.title || "").trim(),
    level: Number(row?.level),
  }))
  .filter((row) => /^[0-9a-f]{32}$/.test(row.md5));
const md5s = [...new Set(charts.map((row) => row.md5))].sort();

if (md5s.length !== charts.length) {
  throw new Error(
    `Duplicate or invalid Overjoy entries detected: ${charts.length} valid rows, ${md5s.length} unique MD5s.`,
  );
}

const payload = {
  description:
    "Second-period Overjoy MD5 allowlist for L2TV FORCE RATE. Charts not listed here are excluded from Overjoy FORCE constants.",
  source: "https://lr2.sakura.ne.jp/overjoy.php",
  dataSource: "https://lr2.sakura.ne.jp/data/score.json",
  generatedFrom: path.relative(projectRoot, sourcePath).replaceAll("\\", "/"),
  count: md5s.length,
  md5s,
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Wrote ${md5s.length} second-period Overjoy MD5s to ${outputPath}`);
