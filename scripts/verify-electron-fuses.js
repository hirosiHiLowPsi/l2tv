"use strict";

const { getCurrentFuseWire, FuseV1Options } = require("@electron/fuses");

async function main() {
  const executablePath = process.argv[2];
  if (!executablePath) {
    throw new Error("Electron executable path is required.");
  }
  const wire = await getCurrentFuseWire(executablePath);
  const expected = new Map([
    [FuseV1Options.RunAsNode, false],
    [FuseV1Options.EnableCookieEncryption, true],
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable, false],
    [FuseV1Options.EnableNodeCliInspectArguments, false],
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation, true],
    [FuseV1Options.OnlyLoadAppFromAsar, true],
  ]);
  for (const [option, enabled] of expected) {
    const actual = wire[option] === "1".charCodeAt(0);
    if (actual !== enabled) {
      throw new Error(`Electron fuse ${FuseV1Options[option]} was not applied.`);
    }
  }
  console.log("Verified Electron security fuses.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
