const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputPath = path.join(projectRoot, "public", "data", "local-course-hashes.json");

const sourceFiles = {
  genoside2018Sp: process.argv[2],
  stellaSkillSimulator4th: process.argv[3],
  satelliteSkillAnalyzer2nd: process.argv[4],
};

function requireFile(filePath, label) {
  const normalized = String(filePath ?? "").trim();
  if (!normalized) {
    throw new Error(`${label} path is required.`);
  }
  if (!fs.existsSync(normalized)) {
    throw new Error(`${label} file was not found: ${normalized}`);
  }
  return normalized;
}

function readCourseRows(filePath) {
  const buffer = fs.readFileSync(filePath);
  const text = new TextDecoder("shift_jis").decode(buffer);
  const rows = [];
  const coursePattern =
    /<course>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<hash>([0-9a-fA-F]+)<\/hash>[\s\S]*?<\/course>/g;

  for (const match of text.matchAll(coursePattern)) {
    const title = String(match[1] ?? "").trim();
    const hash = String(match[2] ?? "").trim().toLowerCase();
    if (title && /^[0-9a-f]{32,}$/i.test(hash)) {
      rows.push({ title, hash });
    }
  }
  return rows;
}

const genosidePath = requireFile(sourceFiles.genoside2018Sp, "GENOSIDE2018 lr2crs");
const stellaPath = requireFile(sourceFiles.stellaSkillSimulator4th, "Stella Skill Simulator lr2crs");
const satellitePath = requireFile(sourceFiles.satelliteSkillAnalyzer2nd, "Satellite Skill Analyzer lr2crs");

const genoside2018Sp = readCourseRows(genosidePath).filter((row) =>
  /^GENOSIDE 2018 段位認定 /.test(row.title),
);

const payload = {
  version: 1,
  generatedAt: "2026-07-10T00:00:00.000+09:00",
  description: "Bundled LR2 course hashes extracted from lr2crs files for local grade fallback matching.",
  sources: {
    genoside2018Sp: path.basename(genosidePath),
    stellaSkillSimulator4th: path.basename(stellaPath),
    satelliteSkillAnalyzer2nd: path.basename(satellitePath),
  },
  genoside2018Sp,
  stellaSkillSimulator4th: readCourseRows(stellaPath),
  satelliteSkillAnalyzer2nd: readCourseRows(satellitePath),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `Wrote ${outputPath}: GENOSIDE SP ${payload.genoside2018Sp.length}, st ${payload.stellaSkillSimulator4th.length}, sl ${payload.satelliteSkillAnalyzer2nd.length}`,
);
