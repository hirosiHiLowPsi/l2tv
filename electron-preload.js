"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lr2irDesktop", {
  pickFile: (options) => ipcRenderer.invoke("lr2ir:pick-file", options ?? {}),
  pickDirectory: (options) => ipcRenderer.invoke("lr2ir:pick-directory", options ?? {}),
  saveImage: (options) => ipcRenderer.invoke("lr2ir:save-image", options ?? {}),
});
