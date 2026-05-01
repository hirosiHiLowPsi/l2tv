[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$Installer
)

$ErrorActionPreference = "Stop"

function Assert-CommandExists {
  param([Parameter(Mandatory = $true)][string]$CommandName)
  if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
    throw "'$CommandName' が見つかりません。Node.js (npm同梱) をインストールしてから再実行してください。"
  }
}

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Title,
    [Parameter(Mandatory = $true)][scriptblock]$Script
  )

  Write-Host $Title
  & $Script
  if ($LASTEXITCODE -ne 0) {
    throw "'$Title' に失敗しました。直前のログを確認してください。"
  }
}

function Test-IsAdmin {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = [Security.Principal.WindowsPrincipal]::new($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-DeveloperModeEnabled {
  $registryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock"
  try {
    $value = Get-ItemPropertyValue -Path $registryPath -Name "AllowDevelopmentWithoutDevLicense" -ErrorAction Stop
    return [int]$value -eq 1
  } catch {
    return $false
  }
}

$projectRoot = Split-Path -Parent $PSCommandPath
Set-Location $projectRoot

Write-Host "=== L2TV Windows Build ===" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"

Assert-CommandExists "node"
Assert-CommandExists "npm"

$isAdmin = Test-IsAdmin
$developerModeEnabled = Test-DeveloperModeEnabled
if (-not $isAdmin -and -not $developerModeEnabled) {
  Write-Warning "管理者権限または Developer Mode が無効です。"
  Write-Warning "electron-builder の展開で 'Cannot create symbolic link' が出る場合があります。"
  Write-Warning "その場合は管理者PowerShellで実行するか、Windowsの開発者モードをONにしてください。"
}

Write-Host "`n[1/4] Runtime check"
node -v
npm -v

if (-not $SkipInstall) {
  Invoke-Step "`n[2/4] Install dependencies" { npm install }
} else {
  Write-Host "`n[2/4] Skip dependency install (-SkipInstall)"
}

$buildCommand = if ($Installer) { "dist:win:installer" } else { "dist:win" }
$buildLabel = if ($Installer) { "Build installer (.exe)" } else { "Build portable zip" }
Invoke-Step "`n[3/4] $buildLabel" { npm run $buildCommand }

Write-Host "`n[4/4] Locate artifacts"
$distDir = Join-Path $projectRoot "dist"
if (-not (Test-Path $distDir)) {
  throw "dist フォルダが見つかりません。ビルドログを確認してください。"
}

$zip = Get-ChildItem -Path $distDir -Filter "*.zip" -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($zip) {
  Write-Host "Zip:       $($zip.FullName)" -ForegroundColor Green
} else {
  Write-Warning "dist 直下に zip が見つかりませんでした。ビルドログにエラーがないか確認してください。"
}

$installer = Get-ChildItem -Path $distDir -Filter "*Setup*.exe" -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($installer) {
  Write-Host "Installer: $($installer.FullName)" -ForegroundColor Green
}

$unpackedExe = Get-ChildItem -Path (Join-Path $distDir "win-unpacked") -Filter "*.exe" -File -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if ($unpackedExe) {
  Write-Host "Unpacked:  $($unpackedExe.FullName)" -ForegroundColor Green
}

Write-Host "`nDone." -ForegroundColor Cyan
