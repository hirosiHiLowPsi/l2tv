"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lr2irDesktop", {
  pickFile: (options) => ipcRenderer.invoke("lr2ir:pick-file", options ?? {}),
  pickDirectory: (options) => ipcRenderer.invoke("lr2ir:pick-directory", options ?? {}),
  saveImage: (options) => ipcRenderer.invoke("lr2ir:save-image", options ?? {}),
  fetchStellaverseRival: (options) => ipcRenderer.invoke("lr2ir:fetch-stellaverse-rival", options ?? {}),
  fetchStellaverseRankings: (options) => ipcRenderer.invoke("lr2ir:fetch-stellaverse-rankings", options ?? {}),
});
