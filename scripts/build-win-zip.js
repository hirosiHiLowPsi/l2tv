const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { path7za } = require("7zip-bin");

const projectRoot = path.resolve(__dirname, "..");
const distDir = path.join(projectRoot, "dist");
const unpackedDir = path.join(distDir, "win-unpacked");
const stageDir = path.join(distDir, "zip-stage");
const appDir = path.join(stageDir, "L2TV");
const builderDebugPath = path.join(distDir, "builder-debug.yml");
const builderConfigPath = path.join(distDir, "builder-effective-config.yaml");
const packageJson = require(path.join(projectRoot, "package.json"));
const forcePretestNotesPath = path.join(projectRoot, "FORCE_RATE_PRETEST.txt");
const suffixArgument = process.argv.find((argument) => argument.startsWith("--suffix="));
const artifactSuffix = String(suffixArgument?.slice("--suffix=".length) || "")
  .trim()
  .replace(/[^a-z0-9._-]+/gi, "-")
  .replace(/^-+|-+$/g, "");
const artifactLabel = artifactSuffix ? `-${artifactSuffix}` : "";
const archiveFormatArgument = process.argv.find(
  (argument) => argument.startsWith("--format=") || argument.startsWith("--archive="),
);
const archiveFormat = String(archiveFormatArgument?.split("=").slice(1).join("=") || "zip")
  .trim()
  .toLowerCase();
if (!["zip", "7z"].includes(archiveFormat)) {
  throw new Error(`Unsupported archive format: ${archiveFormat}`);
}
let archivePath = path.join(distDir, `L2TV-${packageJson.version}${artifactLabel}-win-x64.${archiveFormat}`);
const electronBuilderCli = require.resolve("electron-builder/cli.js");

function assertInsideDist(targetPath) {
  const relative = path.relative(distDir, path.resolve(targetPath));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to modify a path outside dist: ${targetPath}`);
  }
}

function removeBuildPath(targetPath) {
  assertInsideDist(targetPath);
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} exited with code ${result.status}.`);
  }
}

fs.mkdirSync(distDir, { recursive: true });
removeBuildPath(stageDir);
removeBuildPath(unpackedDir);
try {
  removeBuildPath(archivePath);
} catch (error) {
  if (error?.code !== "EPERM") {
    throw error;
  }
  archivePath = path.join(distDir, `L2TV-${packageJson.version}${artifactLabel}-win-x64-new.${archiveFormat}`);
  removeBuildPath(archivePath);
}
removeBuildPath(builderDebugPath);
removeBuildPath(builderConfigPath);

run(process.execPath, [electronBuilderCli, "--win", "--dir"]);

if (!fs.existsSync(path.join(unpackedDir, "L2TV.exe"))) {
  throw new Error("The unpacked Windows build was not created.");
}

fs.mkdirSync(stageDir, { recursive: true });
fs.cpSync(unpackedDir, appDir, { recursive: true });
if (artifactSuffix.startsWith("force-rate-pretest")) {
  fs.copyFileSync(forcePretestNotesPath, path.join(appDir, path.basename(forcePretestNotesPath)));
}
const archiveArgs =
  archiveFormat === "7z"
    ? ["a", "-t7z", "-mx=9", "-m0=lzma2", "-ms=on", archivePath, "L2TV"]
    : ["a", "-tzip", "-mx=7", archivePath, "L2TV"];
run(path7za, archiveArgs, { cwd: stageDir });

removeBuildPath(stageDir);
removeBuildPath(unpackedDir);
removeBuildPath(builderDebugPath);
removeBuildPath(builderConfigPath);

console.log(`Created ${path.relative(projectRoot, archivePath)} with top-level L2TV folder.`);
