const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
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
const archiveFormat = String(archiveFormatArgument?.split("=").slice(1).join("=") || "7z")
  .trim()
  .toLowerCase();
if (archiveFormat !== "7z") {
  throw new Error("L2TVの配布形式は7zのみです。");
}
let archivePath = path.join(distDir, `L2TV-${packageJson.version}${artifactLabel}-win-x64.${archiveFormat}`);
const electronBuilderCli = require.resolve("electron-builder/cli.js");
const localElectronDist = path.join(projectRoot, "node_modules", "electron", "dist");

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

function directorySize(targetPath) {
  return fs.readdirSync(targetPath, { withFileTypes: true }).reduce((total, entry) => {
    const entryPath = path.join(targetPath, entry.name);
    return total + (entry.isDirectory() ? directorySize(entryPath) : fs.statSync(entryPath).size);
  }, 0);
}

function verifyElectronLocales() {
  const localeDir = path.join(unpackedDir, "locales");
  const locales = fs
    .readdirSync(localeDir)
    .filter((name) => name.endsWith(".pak"))
    .sort();
  const expected = ["en-US.pak", "ja.pak"];
  if (JSON.stringify(locales) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected Electron locales: ${locales.join(", ")}`);
  }
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
  removeBuildPath(`${archivePath}.sha256`);
} catch (error) {
  if (error?.code !== "EPERM") {
    throw error;
  }
  archivePath = path.join(distDir, `L2TV-${packageJson.version}${artifactLabel}-win-x64-new.${archiveFormat}`);
  removeBuildPath(archivePath);
  removeBuildPath(`${archivePath}.sha256`);
}
removeBuildPath(builderDebugPath);
removeBuildPath(builderConfigPath);

const electronBuilderArgs = [electronBuilderCli, "--win", "--dir"];
if (fs.existsSync(path.join(localElectronDist, "electron.exe"))) {
  electronBuilderArgs.push(`--config.electronDist=${localElectronDist}`);
}
run(process.execPath, electronBuilderArgs);

if (!fs.existsSync(path.join(unpackedDir, "L2TV.exe"))) {
  throw new Error("The unpacked Windows build was not created.");
}
verifyElectronLocales();
run(process.execPath, [path.join(projectRoot, "scripts", "verify-electron-fuses.js"), path.join(unpackedDir, "L2TV.exe")]);
run(process.execPath, [path.join(projectRoot, "scripts", "verify-packaged-launch.js"), path.join(unpackedDir, "L2TV.exe")]);

const unpackedBytes = directorySize(unpackedDir);

fs.mkdirSync(stageDir, { recursive: true });
fs.cpSync(unpackedDir, appDir, { recursive: true });
if (artifactSuffix.startsWith("force-rate-pretest")) {
  fs.copyFileSync(forcePretestNotesPath, path.join(appDir, path.basename(forcePretestNotesPath)));
}
const archiveArgs = ["a", "-t7z", "-mx=9", "-m0=lzma2", "-ms=on", archivePath, "L2TV"];
run(path7za, archiveArgs, { cwd: stageDir });

const digest = crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex");
fs.writeFileSync(`${archivePath}.sha256`, `${digest} *${path.basename(archivePath)}\n`, "utf8");

removeBuildPath(stageDir);
removeBuildPath(unpackedDir);
removeBuildPath(builderDebugPath);
removeBuildPath(builderConfigPath);

console.log(`Created ${path.relative(projectRoot, archivePath)} with top-level L2TV folder.`);
console.log(`Unpacked size ${(unpackedBytes / 1024 / 1024).toFixed(1)} MiB.`);
console.log(`SHA256 ${digest}`);
