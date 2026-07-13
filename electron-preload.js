"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lr2irDesktop", {
  getApiToken: () => ipcRenderer.invoke("lr2ir:get-api-token"),
  pickFile: (options) => ipcRenderer.invoke("lr2ir:pick-file", options ?? {}),
  pickDirectory: (options) => ipcRenderer.invoke("lr2ir:pick-directory", options ?? {}),
  saveImage: (options) => ipcRenderer.invoke("lr2ir:save-image", options ?? {}),
  exportDataTransfer: (options) => ipcRenderer.invoke("lr2ir:export-data-transfer", options ?? {}),
  importDataTransfer: () => ipcRenderer.invoke("lr2ir:import-data-transfer"),
  fetchStellaverseRival: (options) => ipcRenderer.invoke("lr2ir:fetch-stellaverse-rival", options ?? {}),
  fetchStellaverseRankings: (options) => ipcRenderer.invoke("lr2ir:fetch-stellaverse-rankings", options ?? {}),
});
