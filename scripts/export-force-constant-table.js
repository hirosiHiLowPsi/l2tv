const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const inputPath = path.join(projectRoot, "public", "data", "force-chart-constants.json");
const defaultOutputPath = path.join(projectRoot, "dist", "FORCE_CHART_CONSTANTS.csv");
const outputPath = path.resolve(process.argv[2] || defaultOutputPath);

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function tableName(source) {
  if (source === "overjoy") {
    return "初代/第二期Overjoy";
  }
  if (source === "insane") {
    return "発狂BMS難易度表";
  }
  return source || "";
}

const payload = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const charts = [...payload.charts].sort(
  (left, right) => right.chartConstant - left.chartConstant || left.md5.localeCompare(right.md5),
);
const headers = [
  "rank",
  "chart_constant",
  "source_table",
  "source_level",
  "md5",
  "players",
  "fc",
  "hc",
  "nc",
  "ec",
  "failed",
  "weighted_achievement_percent",
  "archive_status",
  "lr2ir_url",
];
const rows = charts.map((chart, index) => [
  index + 1,
  Number(chart.chartConstant).toFixed(2),
  tableName(chart.source),
  chart.level ?? "",
  chart.md5,
  chart.archivePlayers ?? "",
  chart.archiveFullCombo ?? "",
  chart.archiveHardClear ?? "",
  chart.archiveNormalClear ?? "",
  chart.archiveEasyClear ?? "",
  chart.archiveFailed ?? "",
  Number.isFinite(chart.archiveAchievementRate)
    ? (chart.archiveAchievementRate * 100).toFixed(4)
    : "",
  chart.archiveDataMissing ? "missing (legacy constant)" : "available",
  `https://lr2ir.com/charts/${chart.md5}`,
]);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
fs.writeFileSync(outputPath, `\uFEFF${csv}\r\n`, "utf8");
console.log(`Created ${path.relative(projectRoot, outputPath)} (${rows.length} charts).`);
