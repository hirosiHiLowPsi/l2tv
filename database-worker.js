"use strict";

const { parentPort } = require("node:worker_threads");
const { analyzeRequest, loadProfileFromScoreDbRequest } = require("./server");

if (!parentPort) {
  throw new Error("database-worker.js must run inside a Worker thread.");
}

parentPort.on("message", async (message) => {
  const id = message?.id;
  try {
    let value;
    if (message?.task === "analyze") {
      value = await analyzeRequest(message.body);
    } else if (message?.task === "profile") {
      value = await loadProfileFromScoreDbRequest(message.body);
    } else {
      throw new Error("未対応のDB処理です。");
    }
    parentPort.postMessage({ id, ok: true, value });
  } catch (error) {
    parentPort.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : "DB処理に失敗しました。",
    });
  }
});
