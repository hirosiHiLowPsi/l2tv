const form = document.getElementById("analyze-form");
const scoreDbPathInput = document.getElementById("score-db-path");
const songDbPathInput = document.getElementById("song-db-path");
const screenshotDirPathInput = document.getElementById("screenshot-dir-path");
const rivalFolderPathInput = document.getElementById("rival-folder-path");
const browseScoreDbButton = document.getElementById("browse-score-db");
const browseSongDbButton = document.getElementById("browse-song-db");
const browseScreenshotDirButton = document.getElementById("browse-screenshot-dir");
const browseRivalFolderButton = document.getElementById("browse-rival-folder");
const tableUrlsInput = document.getElementById("table-urls");
const manualTableUrlTogglesContainer = document.getElementById("manual-table-url-toggles");
const languageSelect = document.getElementById("language-select");
const scoreDbModeSelect = document.getElementById("score-db-mode-select");
const themeSelect = document.getElementById("theme-select");
const includeBpUpdatesInput = document.getElementById("include-bp-updates");
const includeUnlistedUpdatesInput = document.getElementById("include-unlisted-updates");
const skillFetchStOnlyInput = document.getElementById("skill-fetch-st-only");
const skillFetchSlOnlyInput = document.getElementById("skill-fetch-sl-only");
const openTableListButton = document.getElementById("open-table-list-button");
const tableListModal = document.getElementById("table-list-modal");
const tableListCloseButton = document.getElementById("table-list-close-button");
const tablePresetsContainer = document.getElementById("table-presets");
const refreshTableListButton = document.getElementById("refresh-table-list-button");
const addCustomTableUrlButton = document.getElementById("add-custom-table-url-button");
const customTableUrlInput = document.getElementById("custom-table-url-input");
const tableListSearchModeButton = document.getElementById("table-list-search-mode-button");
const tableListUrlModeButton = document.getElementById("table-list-url-mode-button");
const tableListFilterInput = document.getElementById("table-list-filter");
const tableListStatus = document.getElementById("table-list-status");
const tableListModalStatus = document.getElementById("table-list-modal-status");
const tableListSelectionSummary = document.getElementById("table-list-selection-summary");
const tableListTagFilters = document.getElementById("table-list-tag-filters");
const tableListSelectedOnlyToggle = document.getElementById("table-list-selected-only-toggle");
const tableListSelectedOnlyCount = document.getElementById("table-list-selected-only-count");
const analyzeButton = document.getElementById("analyze-button");
const clearSavedButton = document.getElementById("clear-saved-button");
const statusBox = document.getElementById("status-box");
const mainFeedback = document.getElementById("main-feedback");
const resultsRoot = document.getElementById("results-root");
const levelModeToggleButton = document.getElementById("level-mode-toggle-button");
const tableSectionTemplate = document.getElementById("table-section-template");
const menuToggleButton = document.getElementById("menu-toggle-button");
const rivalToggleButton = document.getElementById("rival-toggle-button");
const rivalPanel = document.getElementById("rival-panel");
const menuCloseButton = document.getElementById("menu-close-button");
const menuBackdrop = document.getElementById("menu-backdrop");
const controlDrawer = document.getElementById("control-drawer");
const exportMessageModal = document.getElementById("export-message-modal");
const exportMessageText = document.getElementById("export-message-text");
const exportMessageOkButton = document.getElementById("export-message-ok");

const lampOptions = [
  "FULL COMBO",
  "HARD CLEAR",
  "CLEAR",
  "EASY CLEAR",
  "FAILED",
  "NO PLAY",
  "NO SONG",
];

const lampLabels = {
  "FULL COMBO": "FC",
  "HARD CLEAR": "HC",
  CLEAR: "NC",
  "EASY CLEAR": "EC",
  FAILED: "FL",
  "NO PLAY": "NP",
  "NO SONG": "NS",
};

const lampSnapshotColors = {
  "FULL COMBO": "#fff0a3",
  "HARD CLEAR": "#ff9ca4",
  CLEAR: "#5aa1ff",
  "EASY CLEAR": "#7ee7a1",
  FAILED: "#9aa4b6",
  "NO PLAY": "#e8e8ea",
  "NO SONG": "#111827",
};

const levelChartLampOrder = [
  "FULL COMBO",
  "HARD CLEAR",
  "CLEAR",
  "EASY CLEAR",
  "FAILED",
  "NO PLAY",
  "NO SONG",
];

const levelChartScoreOrder = ["AAA", "AA", "A", "B", "C", "D", "E", "F", "NO_PLAY", "NO_SONG"];
const levelChartScoreLabels = {
  AAA: "AAA",
  AA: "AA",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  E: "E",
  F: "F",
  NO_PLAY: "NP",
  NO_SONG: "NS",
};

const scoreSnapshotColors = {
  AAA: "#f4d35e",
  AA: "#c9d2df",
  A: "#cf8d52",
  B: "#7fdfff",
  C: "#5fc4ff",
  D: "#3fa9ff",
  E: "#2388f2",
  F: "#005cff",
  NO_PLAY: "#e8e8ea",
  NO_SONG: "#111827",
};

const chartSortColumns = [
  { key: "level", label: "Lv" },
  { key: "title", label: "Title" },
  { key: "artist", label: "Artist" },
  { key: "lampStatus", label: "Lamp" },
  { key: "scoreTier", label: "Rank" },
  { key: "scoreRate", label: "EX/Rate" },
  { key: "missCount", label: "BP" },
  { key: "playCount", label: "Play Count" },
  { key: "rival", label: "Rival" },
];

const DEFAULT_TABLE_LIST_ENTRIES = [
  {
    id: "stella",
    name: "Stella",
    url: "https://stellabms.xyz/st/table.html",
    type: "SP",
    tag1: "SP",
    tag: "General",
    tag2: "General",
  },
  {
    id: "satellite",
    name: "Satellite",
    url: "https://stellabms.xyz/sl/table.html",
    type: "SP",
    tag1: "SP",
    tag: "General",
    tag2: "General",
  },
  {
    id: "insane",
    name: "発狂BMS難易度表",
    url: "https://darksabun.club/table/archive/insane1/",
    type: "SP",
    tag1: "SP",
    tag: "General",
    tag2: "General",
  },
  {
    id: "overjoy",
    name: "Overjoy",
    url: "https://lr2.sakura.ne.jp/overjoy.php",
    type: "SP",
    tag1: "SP",
    tag: "General",
    tag2: "General",
  },
  {
    id: "dystopia",
    name: "Dystopia",
    url: "https://monibms.github.io/Dystopia/dystopia.html",
    type: "SP",
    tag1: "SP",
    tag: "General",
    tag2: "General",
  },
];

const LEGACY_TABLE_URL_REPLACEMENTS = new Map([
  [
    "https://rattoto10.jounin.jp/table_overjoy.html",
    "https://lr2.sakura.ne.jp/overjoy.php",
  ],
]);

const TABLE_LIST_TAG_FILTERS = new Set(["all", "general", "personal", "self-made-chart-only"]);
const THEME_MODES = ["l2tv-pop", "lr2ir-dark"];
const DEFAULT_THEME_MODE = "l2tv-pop";
const LANGUAGE_OPTIONS = ["ja", "en"];
const DEFAULT_LANGUAGE = "ja";
const STARTUP_PARAMS = new URLSearchParams(window.location.search);
const IS_PYWEBVIEW_DESKTOP = STARTUP_PARAMS.get("l2tvWebView") === "1";
const PYWEBVIEW_STARTUP_LANGUAGE = STARTUP_PARAMS.get("l2tvLanguage");

const PERSISTENCE_DB_NAME = "lr2ir-table-lamp-viewer";
const PERSISTENCE_STORE_NAME = "app-state";
const PERSISTENCE_SCHEMA_VERSION = 1;
const PERSISTENCE_OPEN_TIMEOUT_MS = 2000;
const PERSISTENCE_LOCAL_STORAGE_PREFIX = `${PERSISTENCE_DB_NAME}:`;
const FORM_STATE_KEY = "form-state";
const LAST_ANALYSIS_KEY = "last-analysis";
const TABLE_PRESET_SELECTION_KEY = "table-preset-selection";
const CUSTOM_TABLE_LIST_KEY = "custom-table-list-entries";
const LAMP_UPDATES_SNAPSHOT_MAX_ITEMS_PER_IMAGE = 250;

let latestAnalysis = null;
let persistenceDbPromise = null;
let levelChartMode = "lamp";
let selectedThemeMode = DEFAULT_THEME_MODE;
let selectedLanguage = DEFAULT_LANGUAGE;
let hasStoredLanguagePreference = false;
let includeBpUpdatesInLampUpdates = false;
let includeUnlistedChartsInLampUpdates = false;
let skillAnalyzerFetchMode = "both";
let scoreDbMode = "auto";
let disabledManualTableUrls = new Set();
let autoDbProfileFetchToken = 0;
let baseTableListEntries = DEFAULT_TABLE_LIST_ENTRIES.map((entry) => ({ ...entry }));
let customTableListEntries = [];
let availableTableListEntries = mergeTableListEntries(baseTableListEntries, customTableListEntries);
let selectedTableUrls = new Set();
let tableListFilterText = "";
let tableListInputMode = "search";
let selectedTableTagFilter = "all";
let tableListSelectedOnly = false;
let tableListLoadedFromRemote = false;
let draggedTableListUrl = "";
let selectedRivalIds = new Set();
let knownRivalIds = new Set();
let rivalSelectionInitialized = false;
let selectedRivalStatsScope = "all";
let selectedRivalSortKey = "win";
const tableInfoPanelOpenState = new Map();
const chartDetailsOpenState = new Map();
const chartListOpenLevelsState = new Map();
const chartListStateByTable = new Map();
let forceBest50Open = false;
const forceBest50SortState = {
  sortKey: "rank",
  sortDirection: "asc",
};
let activeLevelGroupCloseButton = null;
let activeLevelGroupCloseTarget = null;
let activeLevelGroupOptionButton = null;
let floatingChartHeaderRequested = false;
let floatingChartHeader = null;
let floatingChartHeaderSource = null;
let latestLampImprovements = [];
let latestComparisonBaseAnalysis = null;
let hasComparedLampImprovements = false;
let latestKeyHitCountDelta = null;
let latestPlayTimeDeltaSeconds = null;
let mainFeedbackTimeoutId = null;
let apiTokenPromise = null;
const persistFormStateDebounced = debounce(() => {
  persistFormState().catch((error) => console.error("Failed to persist form state", error));
}, 250);
const levelChartTooltip = createFloatingTooltip();
const localizedTextNodeOriginals = new WeakMap();

const I18N_TEXT = {
  "メニュー": "Menu",
  "閉じる": "Close",
  "読み込み設定": "Load Settings",
  "難易度表一覧から、読み込む表を選択できます。": "Choose tables to load from the table list.",
  "LR2 score.db パス": "LR2 score.db Path",
  "song.db パス": "song.db Path",
  "スクショ保存先": "Screenshot Folder",
  "ライバルフォルダ": "Rival Folder",
  "難易度表一覧": "Table List",
  "難易度表管理": "Table Management",
  "一覧を開く": "Open List",
  "一覧を更新": "Refresh List",
  "検索": "Search",
  "URL指定": "URL",
  "追加": "Add",
  "追加する難易度表URLを入力してください。": "Enter the difficulty table URL to add.",
  "URL欄に難易度表URLを入力してください。": "Enter a difficulty table URL in the URL field.",
  "URL指定で追加された表": "Table added by URL",
  "URLを追加しました。": "Added the URL.",
  "難易度表情報を取得しています。": "Loading table information.",
  "難易度表情報を取得しました。": "Loaded table information.",
  "難易度表情報の取得に失敗しました。URL名で追加します。": "Failed to load table information. Added it with a URL-based name.",
  "このURLはすでに一覧にあります。": "This URL is already in the list.",
  "難易度表一覧から選択します。": "Choose from the table list.",
  "チェックした難易度表が読み込み対象になります。": "Checked tables will be loaded.",
  "難易度表一覧を取得しています。": "Loading the table list.",
  "難易度表一覧を取得しました。": "Loaded the table list.",
  "難易度表一覧の取得に失敗しました。代表的な表だけ表示します。": "Failed to load the table list. Showing common tables only.",
  "該当する難易度表がありません。": "No matching tables.",
  "選択中": "Selected",
  "追加済み": "Added",
  "一覧に戻る": "Back to List",
  "上へ": "Move Up",
  "下へ": "Move Down",
  "追加済みの難易度表だけ表示しています。": "Showing added tables only.",
  "表示言語": "Language",
  "日本語": "Japanese",
  "score.db仕様": "score.db Mode",
  "自動判別": "Auto Detect",
  "従来LR2IR互換": "Legacy LR2IR Compatible",
  "StellaverseIR": "StellaverseIR",
  "BMS-IR": "BMS-IR",
  "テーマ": "Theme",
  "プレイ回数": "Play Count",
  "本日更新にBPが減った譜面も表示する": "Include charts with lower BP in Lamp Updates",
  "表外譜面も更新楽曲として表示する": "Include updated charts outside loaded tables",
  "表外": "Unlisted",
  "表とランプを読み込む": "Load Tables and Lamps",
  "保存データを消す": "Clear Saved Data",
  "進行状況": "Status",
  "バックエンドが難易度表またはプレイヤーデータを読み込みます。": "The backend loads table or player data.",
  "待機中です。": "Waiting.",
  "ランプ内訳": "Lamp Breakdown",
  "スコア内訳": "Score Breakdown",
  "譜面一覧を開く": "Open Chart List",
  "譜面一覧を閉じる": "Close Chart List",
  "参照": "Browse",
  "すべて": "All",
  "検索": "Search",
  "全譜面": "All Charts",
  "難易度表": "Table",
  "勝敗表示": "Win/Loss Scope",
  "WIN数順": "Win Rate",
  "LOSE順": "Loss Rate",
  "WIN率順": "Win Rate",
  "LOSE率順": "Loss Rate",
  "名前順": "Name",
  "全選択": "Select All",
  "全解除": "Clear All",
  "対戦なし": "No matches",
  "プレイヤー名": "Player Name",
  "SP段位": "SP Grade",
  "st段位": "st Grade",
  "sl段位": "sl Grade",
  "今回の打鍵回数": "Key Hits This Run",
  "プレイ時間": "Play Time",
  "今日の更新を画像出力": "Export Today's Updates",
  "出力中…": "Exporting...",
  "スクショ保存完了！": "Screenshot saved!",
  "新規 FC": "New FC",
  "新規 HC": "New HC",
  "新規 NC": "New NC",
  "新規 EC": "New EC",
  "新規 FL": "New FL",
  "新規 NP": "New NP",
  "新規 NS": "New NS",
  "BP更新": "BP Update",
  "スコア更新": "Score Update",
  "総譜面数": "Total Charts",
  "クリア率": "Clear Rate",
  "プレイ率": "Played Rate",
  "この画面を画像出力": "Export This View",
  "条件に一致する譜面はありません。": "No charts match the current filters.",
  "曲名 / アーティスト / EX / Rate / プレイ回数": "Title / Artist / EX / Rate / Play Count",
  "タイトル不明": "Unknown Title",
  "見つかりません": "Not Found",
  "未設定": "Not Set",
  "段位未取得": "No Grade",
  "発狂皆伝": "Insane Kaiden",
  "発狂段位": "Insane Grade",
  "初段": "1st Dan",
  "二段": "2nd Dan",
  "三段": "3rd Dan",
  "四段": "4th Dan",
  "五段": "5th Dan",
  "六段": "6th Dan",
  "七段": "7th Dan",
  "八段": "8th Dan",
  "九段": "9th Dan",
  "十段": "10th Dan",
  "あなたは歴代のOverjoyすべてに合格しました": "You have cleared every historical Overjoy course",
  "まずはメニューから読み込み設定を行ってください。": "Open Menu and configure loading settings first.",
  "表示対象の難易度表がありません。": "No tables are currently visible.",
  "難易度表が未選択のため、プレイヤーデータのみ表示しています。": "No table is selected, so only player data is shown.",
  "API設定の取得に失敗しました。": "Failed to load API settings.",
  "APIリクエストに失敗しました。": "API request failed.",
  "参照ボタンはデスクトップ版(.exe)で利用できます。ブラウザ版ではパスを直接入力してください。": "Browse is available in the desktop app (.exe). In the browser version, enter the path directly.",
  "LR2 score.db パスを入力してください。": "Enter the LR2 score.db path.",
  "プレイヤーデータを読み込んでいます。": "Loading player data.",
  "難易度表とローカルのLR2 score.dbを読み込んでいます。\n表の数や曲数によっては少し時間がかかります。": "Loading tables and the local LR2 score.db.\nThis may take a little while depending on the number of tables and charts.",
  "ローカルのLR2 score.dbからプレイヤーデータを読み込んでいます。": "Loading player data from the local LR2 score.db.",
  "score.db を選択": "Select score.db",
  "song.db を選択": "Select song.db",
  "スクショ保存先を選択": "Select Screenshot Folder",
  "LR2 Rival フォルダを選択": "Select LR2 Rival Folder",
  "保存してある入力内容と前回の読み込み結果を削除しますか？\n※難易度表の選択状態は保持されます。": "Delete saved input and the previous load result?\nTable selections will be kept.",
  "保存済みデータを削除しました。難易度表の選択状態は保持しています。": "Saved data was deleted. Table selections were kept.",
  "プレイ更新を検知しました": "Play Updates Detected",
  "プレイ更新がありました、反映しますか？": "Play updates were detected. Apply them now?",
  "前回読み込み後に score.db / song.db が更新されています。": "score.db / song.db has changed since the previous load.",
  "反映する": "Apply",
  "あとで": "Later",
  "プレイ更新を反映しています。": "Applying play updates.",
  "プレイ更新を検知しました。反映する場合は読み込みボタンを押してください。": "Play updates were detected. Press the load button when you want to apply them.",
  "画像出力が完了しました。": "Image export finished.",
  "画像を分割して保存しました。": "Saved split images.",
  "画像を分割してダウンロードしました。": "Downloaded split images.",
  "画像出力データの作成に失敗しました。": "Failed to create image export data.",
  "表外譜面の表示設定は、次回の読み込みから反映されます。": "The unlisted chart setting will take effect on the next load.",
  "st/sl段位の取得設定は、次回の読み込みから反映されます。": "The st/sl grade fetch setting will take effect on the next load.",
  "前回読み込みから更新されたクリアランプ、BP、スコアはありません。": "No clear lamp, BP, or score updates since the previous load.",
  "前回読み込みから更新されたクリアランプまたはスコアはありません。": "No clear lamp or score updates since the previous load.",
  "score.db からプロフィールを取得しました。": "Loaded the profile from score.db.",
  "score.db からプレイヤー名と段位を取得しています。": "Loading the player name and grade from score.db.",
  "score.db からプロフィールを取得できませんでした。": "Could not load the profile from score.db.",
  "Canvas初期化に失敗しました。": "Failed to initialize the canvas.",
  "更新データはありません。": "No update data.",
  "URLが空です。": "The URL is empty.",
  "許可されていないホストです。": "This host is not allowed.",
  "許可されていないメソッドです。": "This method is not allowed.",
  "不明なエラーが発生しました。": "An unknown error occurred.",
  "LR2 score.db のパスを入力してください。": "Enter the LR2 score.db path.",
  "難易度表の読み込みに失敗しました。": "Failed to load the difficulty table.",
  "難易度表を1件も読み込めませんでした。": "No difficulty tables could be loaded.",
  "指定された LR2 score.db が見つかりません。": "The specified LR2 score.db was not found.",
  "score.db の player テーブルを読み取れませんでした。": "Could not read the player table in score.db.",
  "アクセスできません。": "Access denied.",
  "ファイルが見つかりません。": "File not found.",
  "許可されていない送信元です。": "This origin is not allowed.",
  "Content-Type は application/json を指定してください。": "Content-Type must be application/json.",
  "APIトークンが不正です。": "Invalid API token.",
  "リクエストが大きすぎます。": "The request is too large.",
  "JSONの解析に失敗しました。": "Failed to parse JSON.",
  "URLは table.html または header.json を指定してください。": "The URL must point to table.html or header.json.",
  "bmstableメタタグを見つけられませんでした。": "Could not find the bmstable meta tag.",
  "ヘッダーJSONの形式が不正です。": "The header JSON format is invalid.",
  "header.json に data_url がありません。": "header.json does not contain data_url.",
  "score.json は配列形式である必要があります。": "score.json must be an array.",
  "score.db の読み込みに失敗しました。": "Failed to load score.db.",
  "http / https のURLのみ読み込めます。": "Only http / https URLs can be loaded.",
  "ローカルURLは読み込めません。": "Local URLs cannot be loaded.",
  "URLのホスト名が空です。": "The URL host name is empty.",
  "ローカルネットワーク宛てのURLは読み込めません。": "URLs to local networks cannot be loaded.",
  "ローカルまたはプライベートネットワーク宛てのURLは読み込めません。": "URLs to local or private networks cannot be loaded.",
  "リダイレクト回数が多すぎます。": "Too many redirects.",
  "取得先のデータサイズが大きすぎます。": "The fetched data is too large.",
  "URL取得がタイムアウトしました。": "Fetching the URL timed out.",
  "未設定": "Not Set",
  "PNGデータの保存に失敗しました。": "Failed to save PNG data.",
  "画像データが大きすぎます。": "The image data is too large.",
  "画像データが空です。": "The image data is empty.",
  "許可されていない画面からの操作です。": "This operation is not allowed from this screen.",
  "指定されたスクショ保存先に書き込めませんでした。": "Could not write to the selected screenshot folder.",
  "スクリーンショット保存先フォルダを作成できませんでした。": "Could not create the screenshot save folder.",
};

const I18N_ATTRS = {
  "例: D:\\LR2\\LR2files\\Database\\Score\\player.db": "Example: D:\\LR2\\LR2files\\Database\\Score\\player.db",
  "例: D:\\LR2\\LR2files\\Database\\song.db": "Example: D:\\LR2\\LR2files\\Database\\song.db",
  "空欄の場合は既定のscreenshotフォルダに保存": "Leave blank to use the default screenshot folder",
  "例: D:\\LR2\\LR2files\\Rival": "Example: D:\\LR2\\LR2files\\Rival",
  "表名で検索": "Search by table name",
  "https://...": "https://...",
  "参照ボタンはデスクトップ版(.exe)で利用できます。": "Browse is available in the desktop app (.exe).",
};

renderTablePresetPicker();
renderManualTableUrlToggles();
configureDbBrowseButtons();
configureScreenshotDirectoryBrowseButton();
configureRivalFolderBrowseButton();
initializeControlMenu();
initializeRivalPanel();
initializeLevelModeToggleButton();
initializeLanguageSelector();
initializeThemeSelector();
initializeExportMessageDialog();
initializeFloatingChartHeader();
applyTheme(selectedThemeMode, { persist: false });
applyLanguage(selectedLanguage, { persist: false });

function initializeControlMenu() {
  if (!menuToggleButton || !menuBackdrop || !controlDrawer) {
    return;
  }

  setControlMenuOpen(false, { restoreFocus: false });

  menuToggleButton.addEventListener("click", () => {
    setControlMenuOpen(!isControlMenuOpen());
  });

  if (menuCloseButton) {
    menuCloseButton.addEventListener("click", () => {
      setControlMenuOpen(false);
    });
  }

  menuBackdrop.addEventListener("click", () => {
    setControlMenuOpen(false);
    setRivalPanelOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    if (isControlMenuOpen()) {
      setControlMenuOpen(false);
    }
  });
}

function isControlMenuOpen() {
  return document.body.classList.contains("menu-open");
}

function setControlMenuOpen(open, options = {}) {
  if (!menuToggleButton || !menuBackdrop || !controlDrawer) {
    return;
  }

  const { restoreFocus = true, closeOther = true } = options;
  const shouldOpen = Boolean(open);
  if (shouldOpen && closeOther) {
    setRivalPanelOpen(false, { closeOther: false });
  }
  document.body.classList.toggle("menu-open", shouldOpen);
  menuToggleButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  setLocalizedText(menuToggleButton, shouldOpen ? "閉じる" : "メニュー");
  controlDrawer.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  updateDrawerBackdrop();

  if (!restoreFocus) {
    return;
  }

  if (shouldOpen) {
    controlDrawer.focus();
  } else {
    menuToggleButton.focus();
  }
}

function initializeRivalPanel() {
  if (!rivalToggleButton || !rivalPanel) {
    return;
  }

  rivalToggleButton.addEventListener("click", () => {
    setRivalPanelOpen(!isRivalPanelOpen());
  });
}

function isRivalPanelOpen() {
  return rivalPanel?.getAttribute("aria-hidden") === "false";
}

function setRivalPanelOpen(open, options = {}) {
  if (!rivalToggleButton || !rivalPanel) {
    return;
  }

  const { closeOther = true } = options;
  const shouldOpen = Boolean(open);
  if (shouldOpen && closeOther) {
    setControlMenuOpen(false, { restoreFocus: false, closeOther: false });
  }
  document.body.classList.toggle("rival-open", shouldOpen);
  rivalToggleButton.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  rivalPanel.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  rivalPanel.classList.toggle("hidden", !shouldOpen);
  updateDrawerBackdrop();
}

function updateDrawerBackdrop() {
  if (!menuBackdrop) {
    return;
  }
  const anyDrawerOpen = isControlMenuOpen() || isRivalPanelOpen();
  menuBackdrop.setAttribute("aria-hidden", anyDrawerOpen ? "false" : "true");
  menuBackdrop.classList.toggle("hidden", !anyDrawerOpen);
}

function initializeExportMessageDialog() {
  if (!exportMessageModal || !exportMessageOkButton) {
    return;
  }

  exportMessageOkButton.addEventListener("click", () => {
    hideExportMessage();
  });

  exportMessageModal.addEventListener("click", (event) => {
    if (event.target === exportMessageModal && !exportMessageOkButton.classList.contains("hidden")) {
      hideExportMessage();
    }
  });
}

function showExportMessage(message, options = {}) {
  if (!exportMessageModal || !exportMessageText || !exportMessageOkButton) {
    return;
  }

  const { closable = true } = options;
  setLocalizedText(exportMessageText, message);
  exportMessageOkButton.classList.toggle("hidden", !closable);
  exportMessageModal.classList.remove("hidden");
  exportMessageModal.setAttribute("aria-hidden", "false");
}

function hideExportMessage() {
  if (!exportMessageModal) {
    return;
  }
  exportMessageModal.classList.add("hidden");
  exportMessageModal.setAttribute("aria-hidden", "true");
}

function initializeLevelModeToggleButton() {
  if (!levelModeToggleButton) {
    return;
  }
  updateLevelModeToggleButton();
  levelModeToggleButton.addEventListener("click", () => {
    levelChartMode = levelChartMode === "lamp" ? "score" : "lamp";
    updateLevelModeToggleButton();
    persistFormStateDebounced();
    if (latestAnalysis) {
      renderAnalysis();
    }
  });
}

function updateLevelModeToggleButton() {
  if (!levelModeToggleButton) {
    return;
  }
  levelModeToggleButton.textContent = getLevelSummaryTitle(levelChartMode);
}

function initializeThemeSelector() {
  initializeScoreDbModeSelector();

  if (!themeSelect) {
    return;
  }

  themeSelect.value = selectedThemeMode;
  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });

  if (includeBpUpdatesInput) {
    includeBpUpdatesInput.checked = includeBpUpdatesInLampUpdates;
    includeBpUpdatesInput.addEventListener("change", () => {
      includeBpUpdatesInLampUpdates = includeBpUpdatesInput.checked;
      if (latestComparisonBaseAnalysis && latestAnalysis) {
        latestLampImprovements = collectLampImprovements(latestComparisonBaseAnalysis, latestAnalysis, {
          includeBpUpdates: includeBpUpdatesInLampUpdates,
        });
      }
      persistFormStateDebounced();
      if (latestAnalysis) {
        renderAnalysis();
      }
    });
  }

  if (includeUnlistedUpdatesInput) {
    includeUnlistedUpdatesInput.checked = includeUnlistedChartsInLampUpdates;
    includeUnlistedUpdatesInput.addEventListener("change", () => {
      includeUnlistedChartsInLampUpdates = includeUnlistedUpdatesInput.checked;
      persistFormStateDebounced();
      if (latestAnalysis) {
        setStatus("表外譜面の表示設定は、次回の読み込みから反映されます。");
      }
    });
  }

  initializeSkillAnalyzerFetchModeControls();
}

function initializeScoreDbModeSelector() {
  scoreDbMode = normalizeScoreDbMode(scoreDbMode);
  if (!scoreDbModeSelect) {
    return;
  }

  scoreDbModeSelect.value = scoreDbMode;
  scoreDbModeSelect.addEventListener("change", () => {
    scoreDbMode = normalizeScoreDbMode(scoreDbModeSelect.value);
    scoreDbModeSelect.value = scoreDbMode;
    syncSkillAnalyzerFetchModeControls();
    persistFormStateDebounced();
  });
}

function initializeSkillAnalyzerFetchModeControls() {
  syncSkillAnalyzerFetchModeControls();

  if (skillFetchStOnlyInput) {
    skillFetchStOnlyInput.addEventListener("change", () => {
      skillAnalyzerFetchMode = skillFetchStOnlyInput.checked ? "st" : "both";
      syncSkillAnalyzerFetchModeControls();
      persistFormStateDebounced();
      if (latestAnalysis) {
        setStatus("st/sl段位の取得設定は、次回の読み込みから反映されます。");
      }
    });
  }

  if (skillFetchSlOnlyInput) {
    skillFetchSlOnlyInput.addEventListener("change", () => {
      skillAnalyzerFetchMode = skillFetchSlOnlyInput.checked ? "sl" : "both";
      syncSkillAnalyzerFetchModeControls();
      persistFormStateDebounced();
      if (latestAnalysis) {
        setStatus("st/sl段位の取得設定は、次回の読み込みから反映されます。");
      }
    });
  }
}

function syncSkillAnalyzerFetchModeControls() {
  skillAnalyzerFetchMode = normalizeSkillAnalyzerFetchMode(skillAnalyzerFetchMode);
  const isLegacyMode = normalizeScoreDbMode(scoreDbMode) === "legacy";
  if (skillFetchStOnlyInput) {
    skillFetchStOnlyInput.checked = skillAnalyzerFetchMode === "st";
    skillFetchStOnlyInput.disabled = isLegacyMode;
  }
  if (skillFetchSlOnlyInput) {
    skillFetchSlOnlyInput.checked = skillAnalyzerFetchMode === "sl";
    skillFetchSlOnlyInput.disabled = isLegacyMode;
  }
}

function normalizeScoreDbMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["auto", "legacy", "bms-ir", "stellaverse"].includes(normalized)) {
    return normalized;
  }
  if (normalized === "stellaverse-ir" || normalized === "stellaverse_ir" || normalized === "stellaverseir") {
    return "stellaverse";
  }
  if (normalized === "bmsir" || normalized === "bms_ir") {
    return "bms-ir";
  }
  return "auto";
}

function normalizeSkillAnalyzerFetchMode(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["both", "st", "sl"].includes(normalized) ? normalized : "both";
}

function initializeLanguageSelector() {
  if (!languageSelect) {
    return;
  }

  languageSelect.value = selectedLanguage;
  languageSelect.addEventListener("change", () => {
    applyLanguage(languageSelect.value);
  });
}

function normalizeLanguage(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return LANGUAGE_OPTIONS.includes(normalized) ? normalized : DEFAULT_LANGUAGE;
}

function shouldSkipInitialLanguagePrompt() {
  return IS_PYWEBVIEW_DESKTOP;
}

function getStartupLanguagePreference() {
  return normalizeLanguage(PYWEBVIEW_STARTUP_LANGUAGE || DEFAULT_LANGUAGE);
}

function applyLanguage(language, options = {}) {
  const { persist = true } = options;
  selectedLanguage = normalizeLanguage(language);
  hasStoredLanguagePreference = hasStoredLanguagePreference || persist;
  document.documentElement.lang = selectedLanguage;
  if (languageSelect) {
    languageSelect.value = selectedLanguage;
  }
  translateApp();
  updateTableListSelectionSummary(getFilteredTableListEntries().length);
  if (persist) {
    void persistFormState().catch((error) => console.error("Failed to persist form state", error));
  }
}

function showInitialLanguagePrompt() {
  if (shouldSkipInitialLanguagePrompt()) {
    hasStoredLanguagePreference = true;
    applyLanguage(getStartupLanguagePreference(), { persist: false });
    return;
  }

  if (document.querySelector(".language-startup-modal")) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "language-startup-modal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.dataset.i18nSkip = "true";

  const card = document.createElement("div");
  card.className = "language-startup-card";

  const title = document.createElement("h2");
  title.textContent = "表示言語 / Display Language";

  const description = document.createElement("p");
  description.textContent = "最初に表示言語を選択してください。Please choose a display language.";

  const actions = document.createElement("div");
  actions.className = "language-startup-actions";

  const japaneseButton = document.createElement("button");
  japaneseButton.type = "button";
  japaneseButton.textContent = "日本語";

  const englishButton = document.createElement("button");
  englishButton.type = "button";
  englishButton.className = "button-secondary";
  englishButton.textContent = "English";

  const chooseLanguage = (language) => {
    overlay.remove();
    hasStoredLanguagePreference = true;
    applyLanguage(language);
  };

  japaneseButton.addEventListener("click", () => chooseLanguage("ja"));
  englishButton.addEventListener("click", () => chooseLanguage("en"));

  actions.append(japaneseButton, englishButton);
  card.append(title, description, actions);
  overlay.append(card);
  document.body.append(overlay);
  japaneseButton.focus();
}

function showAppConfirm(message, options = {}) {
  return showAppChoiceDialog({
    message,
    description: options.description ?? "",
    confirmLabel: options.confirmLabel ?? "OK",
    cancelLabel: options.cancelLabel ?? "キャンセル",
    defaultValue: false,
  });
}

function showAppChoiceDialog(options = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "language-startup-modal app-choice-modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.dataset.i18nSkip = "true";

    const card = document.createElement("div");
    card.className = "language-startup-card app-choice-card";

    const message = document.createElement("p");
    message.textContent = localizeString(options.message ?? "");

    const descriptionText = String(options.description ?? "");
    const description = document.createElement("p");
    description.className = "play-update-description";
    description.textContent = localizeString(descriptionText);
    description.classList.toggle("hidden", !descriptionText);

    const actions = document.createElement("div");
    actions.className = "language-startup-actions app-choice-actions";

    const confirmButton = document.createElement("button");
    confirmButton.type = "button";
    confirmButton.textContent = localizeString(options.confirmLabel ?? "OK");

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "button-secondary";
    cancelButton.textContent = localizeString(options.cancelLabel ?? "キャンセル");

    const close = (value) => {
      overlay.remove();
      document.removeEventListener("keydown", handleKeyDown);
      resolve(value);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        close(Boolean(options.defaultValue));
      }
    };

    confirmButton.addEventListener("click", () => close(true));
    cancelButton.addEventListener("click", () => close(false));
    document.addEventListener("keydown", handleKeyDown);

    actions.append(confirmButton, cancelButton);
    card.append(message, description, actions);
    overlay.append(card);
    document.body.append(overlay);
    confirmButton.focus();
  });
}

function showPlayUpdatePrompt() {
  if (document.querySelector(".play-update-modal")) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "language-startup-modal play-update-modal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "play-update-prompt-title");
    overlay.setAttribute("aria-describedby", "play-update-prompt-description");
    overlay.dataset.i18nSkip = "true";

    const card = document.createElement("div");
    card.className = "language-startup-card play-update-card";

    const title = document.createElement("h2");
    title.id = "play-update-prompt-title";
    title.textContent = localizeString("プレイ更新を検知しました");

    const message = document.createElement("p");
    message.textContent = localizeString("プレイ更新がありました、反映しますか？");

    const description = document.createElement("p");
    description.id = "play-update-prompt-description";
    description.className = "play-update-description";
    description.textContent = localizeString("前回読み込み後に score.db / song.db が更新されています。");

    const actions = document.createElement("div");
    actions.className = "language-startup-actions play-update-actions";

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = localizeString("反映する");

    const laterButton = document.createElement("button");
    laterButton.type = "button";
    laterButton.className = "button-secondary";
    laterButton.textContent = localizeString("あとで");

    const close = (shouldApply) => {
      overlay.remove();
      document.removeEventListener("keydown", handleKeyDown);
      resolve(shouldApply);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        close(false);
      }
    };

    applyButton.addEventListener("click", () => close(true));
    laterButton.addEventListener("click", () => close(false));
    document.addEventListener("keydown", handleKeyDown);

    actions.append(applyButton, laterButton);
    card.append(title, message, description, actions);
    overlay.append(card);
    document.body.append(overlay);
    applyButton.focus();
  });
}

function setLocalizedText(element, value) {
  if (!element) {
    return;
  }

  const original = String(value ?? "");
  element.textContent = selectedLanguage === "en" ? localizeString(original) : original;
  if (element.firstChild) {
    localizedTextNodeOriginals.set(element.firstChild, original);
  }
}

function setUntranslatedText(element, value) {
  if (!element) {
    return;
  }

  element.dataset.i18nSkip = "true";
  element.textContent = String(value ?? "");
}

function translateApp(root = document.body) {
  if (!root) {
    return;
  }

  translateTextNodes(root);
  translateAttributes(root);
}

function translateTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = String(node.nodeValue ?? "");
      if (!text.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      const parent = node.parentElement;
      if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.closest("[data-i18n-skip]")) {
        return NodeFilter.FILTER_REJECT;
      }
      if (parent.tagName === "INPUT") {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  for (const node of nodes) {
    if (!localizedTextNodeOriginals.has(node)) {
      localizedTextNodeOriginals.set(node, String(node.nodeValue ?? ""));
    }
    const original = localizedTextNodeOriginals.get(node);
    node.nodeValue = selectedLanguage === "en" ? localizeString(original) : original;
  }
}

function translateAttributes(root) {
  const elements = root.querySelectorAll("[placeholder], [title], [aria-label]");
  for (const element of elements) {
    if (element.closest("[data-i18n-skip]")) {
      continue;
    }
    for (const attr of ["placeholder", "title", "aria-label"]) {
      if (!element.hasAttribute(attr)) {
        continue;
      }
      const originalAttr = `data-i18n-original-${attr}`;
      if (!element.hasAttribute(originalAttr)) {
        element.setAttribute(originalAttr, element.getAttribute(attr) ?? "");
      }
      const original = element.getAttribute(originalAttr) ?? "";
      element.setAttribute(attr, selectedLanguage === "en" ? localizeString(original) : original);
    }
  }
}

function localizeString(value) {
  if (selectedLanguage !== "en") {
    return value;
  }

  const text = String(value ?? "");
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }

  const exact = I18N_TEXT[trimmed] ?? I18N_ATTRS[trimmed];
  if (exact) {
    return text.replace(trimmed, exact);
  }

  return text
    .replace(/前回読み込みからランプ、BP、スコアが更新された譜面: ([0-9,]+)件/g, "Updated charts with lamp, BP, or score changes since the previous load: $1")
    .replace(/前回読み込みからランプまたはスコアが更新された譜面: ([0-9,]+)件/g, "Updated charts with lamp or score changes since the previous load: $1")
    .replace(/([0-9,]+)件の難易度表を読み込みました。/g, "Loaded $1 tables.")
    .replace(/難易度表が未選択のため、プレイヤーデータのみ読み込みました。/g, "No table is selected, so only player data was loaded.")
    .replace(/score\.db からプロフィールを取得しました。/g, "Loaded the profile from score.db.")
    .replace(/score\.db からプレイヤー名と段位を取得しています。/g, "Loading the player name and grade from score.db.")
    .replace(/score\.db からプロフィールを取得できませんでした。/g, "Could not load the profile from score.db.")
    .replace(/URL取得に失敗しました:\s*/g, "Failed to fetch URL: ")
    .replace(/URLが不正です:\s*/g, "Invalid URL: ")
    .replace(/ホスト名を解決できませんでした:\s*/g, "Could not resolve host name: ")
    .replace(/(.+?) のJSON解析に失敗しました。/g, "Failed to parse JSON for $1.")
    .replace(/プレイヤー:\s*/g, "Player: ")
    .replace(/SP段位:\s*/g, "SP Grade: ")
    .replace(/DP段位:\s*/g, "DP Grade: ")
    .replace(/SP段位\s*/g, "SP Grade ")
    .replace(/取得時刻:\s*/g, "Fetched At: ")
    .replace(/ヘッダーJSON/g, "Header JSON")
    .replace(/見つかりません/g, "Not Found")
    .replace(/勝敗表示:\s*/g, "Win/Loss Scope: ")
    .replace(/(\d[\d,]*)件/g, "$1 items")
    .replace(/(\d[\d,]*)譜面/g, "$1 charts")
    .replace(/(\d[\d,]*)スコア/g, "$1 scores")
    .replace(/(\d[\d,]*)人/g, "$1 players")
    .replace(/(\d[\d,]*)回/g, "$1 plays")
    .replace(/今回の打鍵数/g, "Key Hits This Run")
    .replace(/プレイ時間/g, "Play Time")
    .replace(/更新譜面数/g, "Updated Charts")
    .replace(/読み込み失敗の難易度表/g, "Failed Tables")
    .replace(/重複除外後の譜面数/g, "Unique Charts")
    .replace(/プレイヤー/g, "Player")
    .replace(/取得時刻/g, "Fetched At")
    .replace(/DP段位/g, "DP Grade")
    .replace(/SP段位/g, "SP Grade")
    .replace(/難易度表/g, "Table")
    .replace(/譜面/g, "charts")
    .replace(/保存された前回の読み込み結果を復元しました。必要なら再読み込みで最新状態を取得してください。/g, "Restored the previous load result. Reload if you need the latest data.")
    .replace(/保存された入力内容を復元しました。/g, "Restored saved input.")
    .replace(/score\.db \/ song\.db の更新を検知したため、自動で再読み込みしています。/g, "Detected score.db / song.db changes. Reloading automatically.")
    .replace(/画像を保存しました/g, "Image saved")
    .replace(/画像をダウンロードしました。/g, "Image downloaded.")
    .replace(/画像出力に失敗しました。/g, "Image export failed.")
    .replace(/出力に失敗しました/g, "Export failed")
    .replace(/画像保存に失敗しました/g, "Image save failed")
    .replace(/読み込みに失敗しました。/g, "Loading failed.")
    .replace(/ファイル選択に失敗しました。/g, "File selection failed.")
    .replace(/フォルダ選択に失敗しました。/g, "Folder selection failed.");
}

function normalizeThemeMode(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return THEME_MODES.includes(normalized) ? normalized : DEFAULT_THEME_MODE;
}

function applyTheme(themeMode, options = {}) {
  const { persist = true } = options;
  selectedThemeMode = normalizeThemeMode(themeMode);
  document.documentElement.dataset.theme = selectedThemeMode;
  document.body.dataset.theme = selectedThemeMode;

  if (themeSelect && themeSelect.value !== selectedThemeMode) {
    themeSelect.value = selectedThemeMode;
  }

  if (includeBpUpdatesInput && includeBpUpdatesInput.checked !== includeBpUpdatesInLampUpdates) {
    includeBpUpdatesInput.checked = includeBpUpdatesInLampUpdates;
  }

  if (persist) {
    void persistFormState().catch((error) => console.error("Failed to persist form state", error));
  }
}

async function getApiToken() {
  if (!apiTokenPromise) {
    apiTokenPromise = fetch("/api/client-config", {
      method: "GET",
      credentials: "same-origin",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.apiToken) {
          throw new Error("API設定の取得に失敗しました。");
        }
        return String(payload.apiToken);
      })
      .catch((error) => {
        apiTokenPromise = null;
        throw error;
      });
  }
  return apiTokenPromise;
}

async function postJsonApi(path, body) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-L2TV-Token": await getApiToken(),
    },
    body: JSON.stringify(body ?? {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || "APIリクエストに失敗しました。");
  }
  return payload;
}

function configureDbBrowseButtons() {
  const available = hasDesktopFileDialog();
  if (available) {
    return;
  }
  const message = "参照ボタンはデスクトップ版(.exe)で利用できます。";
  browseScoreDbButton.title = message;
  browseSongDbButton.title = message;
}

function configureScreenshotDirectoryBrowseButton() {
  if (!browseScreenshotDirButton) {
    return;
  }
  if (hasDesktopDirectoryDialog()) {
    return;
  }
  browseScreenshotDirButton.title = "参照ボタンはデスクトップ版(.exe)で利用できます。";
}

function configureRivalFolderBrowseButton() {
  if (!browseRivalFolderButton) {
    return;
  }
  if (hasDesktopDirectoryDialog()) {
    return;
  }
  browseRivalFolderButton.title = "参照ボタンはデスクトップ版(.exe)で利用できます。";
}

function hasDesktopFileDialog() {
  return Boolean(window?.lr2irDesktop && typeof window.lr2irDesktop.pickFile === "function");
}

function hasDesktopDirectoryDialog() {
  return Boolean(window?.lr2irDesktop && typeof window.lr2irDesktop.pickDirectory === "function");
}

function parseTableUrls(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function getManualTableUrls() {
  if (!manualTableUrlTogglesContainer) {
    return [];
  }
  return [...new Set(parseTableUrls(tableUrlsInput.value))];
}

function collectSelectedTableUrls() {
  const selectedUrls = [...selectedTableUrls];
  const manualUrls = getManualTableUrls().filter((url) => !disabledManualTableUrls.has(url));
  return dedupeTableUrlsByNormalizedKey([...selectedUrls, ...manualUrls]);
}

function dedupeTableUrlsByNormalizedKey(urls) {
  const result = [];
  const seen = new Set();
  for (const url of urls) {
    const value = migrateLegacyTableUrl(url);
    if (!/^https?:\/\//i.test(value)) {
      continue;
    }
    const key = normalizeTableUrlForDisplayLookup(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }
  return result;
}

function isTableUrlSelected(url) {
  const key = normalizeTableUrlForDisplayLookup(url);
  if (!key) {
    return false;
  }
  for (const selectedUrl of selectedTableUrls) {
    if (normalizeTableUrlForDisplayLookup(selectedUrl) === key) {
      return true;
    }
  }
  return false;
}

function selectTableUrl(url) {
  const value = migrateLegacyTableUrl(url);
  if (!/^https?:\/\//i.test(value)) {
    return;
  }
  deselectTableUrl(value);
  selectedTableUrls.add(value);
}

function deselectTableUrl(url) {
  const key = normalizeTableUrlForDisplayLookup(url);
  if (!key) {
    return;
  }
  for (const selectedUrl of [...selectedTableUrls]) {
    if (normalizeTableUrlForDisplayLookup(selectedUrl) === key) {
      selectedTableUrls.delete(selectedUrl);
    }
  }
}

function renderManualTableUrlToggles() {
  if (!manualTableUrlTogglesContainer) {
    return;
  }

  const manualUrls = getManualTableUrls();
  disabledManualTableUrls = new Set([...disabledManualTableUrls].filter((url) => manualUrls.includes(url)));
  manualTableUrlTogglesContainer.innerHTML = "";

  if (!manualUrls.length) {
    manualTableUrlTogglesContainer.classList.add("hidden");
    updateTableListSelectionSummary(getFilteredTableListEntries().length);
    return;
  }

  manualTableUrlTogglesContainer.classList.remove("hidden");
  for (const tableUrl of manualUrls) {
    const label = document.createElement("label");
    label.className = "manual-table-url-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !disabledManualTableUrls.has(tableUrl);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        disabledManualTableUrls.delete(tableUrl);
      } else {
        disabledManualTableUrls.add(tableUrl);
      }
      updateTableListSelectionSummary(getFilteredTableListEntries().length);
      persistFormStateDebounced();
    });

    const text = document.createElement("span");
    setUntranslatedText(text, getManualTableUrlDisplayName(tableUrl));

    label.append(checkbox, text);
    manualTableUrlTogglesContainer.append(label);
  }
  translateApp(manualTableUrlTogglesContainer);
  updateTableListSelectionSummary(getFilteredTableListEntries().length);
}

function getManualTableUrlDisplayName(tableUrl) {
  const normalizedUrl = normalizeTableUrlForDisplayLookup(tableUrl);
  const loadedTable = Array.isArray(latestAnalysis?.tables)
    ? latestAnalysis.tables.find((table) => normalizeTableUrlForDisplayLookup(table?.sourceUrl) === normalizedUrl)
    : null;
  const loadedName = String(loadedTable?.name ?? "").trim();
  if (loadedName) {
    return loadedName;
  }

  const preset = availableTableListEntries.find((entry) => normalizeTableUrlForDisplayLookup(entry.url) === normalizedUrl);
  if (preset?.name) {
    return preset.name;
  }

  return tableUrl;
}

function normalizeTableUrlForDisplayLookup(value) {
  return String(value ?? "").trim().replace(/\/+$/, "").toLowerCase();
}

function migrateLegacyTableUrl(value) {
  const url = String(value ?? "").trim();
  const key = normalizeTableUrlForDisplayLookup(url);
  return LEGACY_TABLE_URL_REPLACEMENTS.get(key) || url;
}

function mergeTableListEntries(baseEntries, extraEntries) {
  const merged = [];
  const seen = new Set();
  for (const entry of [...(Array.isArray(baseEntries) ? baseEntries : []), ...(Array.isArray(extraEntries) ? extraEntries : [])]) {
    const url = migrateLegacyTableUrl(entry?.url);
    if (!/^https?:\/\//i.test(url)) {
      continue;
    }
    const key = normalizeTableUrlForDisplayLookup(url);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push({ ...entry, url });
  }
  return merged;
}

function rebuildAvailableTableListEntries() {
  availableTableListEntries = mergeTableListEntries(baseTableListEntries, customTableListEntries);
  appendSelectedUrlEntriesMissingFromTableList();
}

function appendSelectedUrlEntriesMissingFromTableList() {
  if (!selectedTableUrls.size) {
    return;
  }
  const knownUrls = new Set(
    availableTableListEntries.map((entry) => normalizeTableUrlForDisplayLookup(entry.url)).filter(Boolean),
  );
  for (const url of selectedTableUrls) {
    const key = normalizeTableUrlForDisplayLookup(url);
    if (!key || knownUrls.has(key)) {
      continue;
    }
    const entry = normalizeCustomTableListEntry({
      url,
      comment: "URL指定で追加された表",
    });
    if (!entry) {
      continue;
    }
    entry.id = `selected:${entry.url}`;
    entry.custom = true;
    availableTableListEntries.unshift(entry);
    knownUrls.add(key);
  }
}

function renderTablePresetPicker() {
  if (!tablePresetsContainer) {
    return;
  }

  tablePresetsContainer.innerHTML = "";
  tablePresetsContainer.classList.toggle("table-presets-selected-only", tableListSelectedOnly);
  syncTableListFilterControls();
  const entries = getFilteredTableListEntries();
  updateTableListSelectionSummary(entries.length);

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "table-list-empty";
    setLocalizedText(empty, "該当する難易度表がありません。");
    tablePresetsContainer.append(empty);
    return;
  }

  for (const preset of entries) {
    const label = document.createElement("label");
    label.className = "table-preset-item";
    label.dataset.tableUrl = preset.url;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = isTableUrlSelected(preset.url);
    checkbox.dataset.tableUrl = preset.url;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectTableUrl(preset.url);
        label.classList.add("selected");
      } else {
        deselectTableUrl(preset.url);
        label.classList.remove("selected");
      }
      rebuildAvailableTableListEntries();
      if (tableListSelectedOnly) {
        renderTablePresetPicker();
      } else {
        syncTableListFilterControls();
        updateTableListSelectionSummary(entries.length);
      }
      void persistTablePresetSelection().catch((error) =>
        console.error("Failed to persist table selection", error),
      );
    });

    const textWrap = document.createElement("span");
    textWrap.className = "table-preset-text";

    const name = document.createElement("strong");
    setUntranslatedText(name, formatTableListEntryDisplayName(preset));
    label.title = preset.url;

    textWrap.append(name);
    label.append(checkbox, textWrap);
    const orderControls = createTablePresetOrderControls(preset);
    if (orderControls) {
      label.append(orderControls);
    }
    configureTablePresetDragHandlers(label, preset);
    label.classList.toggle("selected", checkbox.checked);
    tablePresetsContainer.append(label);
  }
  translateApp(tablePresetsContainer);
}

function configureTablePresetDragHandlers(label, preset) {
  if (!tableListSelectedOnly || !isTableUrlSelected(preset?.url)) {
    label.draggable = false;
    return;
  }

  label.draggable = true;
  label.classList.add("table-preset-reorderable");
  label.addEventListener("dragstart", (event) => {
    if (event.target?.closest?.("input, button")) {
      event.preventDefault();
      return;
    }
    draggedTableListUrl = preset.url;
    label.classList.add("dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", preset.url);
    }
  });
  label.addEventListener("dragover", (event) => {
    if (!draggedTableListUrl || normalizeTableUrlForDisplayLookup(draggedTableListUrl) === normalizeTableUrlForDisplayLookup(preset.url)) {
      return;
    }
    event.preventDefault();
    updateTablePresetDragTarget(label, event);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  });
  label.addEventListener("dragleave", () => {
    label.classList.remove("drag-over-before", "drag-over-after");
  });
  label.addEventListener("drop", (event) => {
    if (!draggedTableListUrl) {
      return;
    }
    event.preventDefault();
    const insertAfter = getTablePresetDropInsertAfter(label, event);
    const moved = moveSelectedTableUrlToTarget(draggedTableListUrl, preset.url, insertAfter);
    draggedTableListUrl = "";
    clearTablePresetDragClasses();
    if (!moved) {
      return;
    }
    renderTablePresetPicker();
    if (latestAnalysis) {
      renderAnalysis();
    }
    void persistTablePresetSelection().catch((error) =>
      console.error("Failed to persist table selection order", error),
    );
  });
  label.addEventListener("dragend", () => {
    draggedTableListUrl = "";
    clearTablePresetDragClasses();
  });
}

function updateTablePresetDragTarget(label, event) {
  const insertAfter = getTablePresetDropInsertAfter(label, event);
  label.classList.toggle("drag-over-before", !insertAfter);
  label.classList.toggle("drag-over-after", insertAfter);
}

function getTablePresetDropInsertAfter(label, event) {
  const rect = label.getBoundingClientRect();
  return event.clientY > rect.top + rect.height / 2;
}

function clearTablePresetDragClasses() {
  tablePresetsContainer
    ?.querySelectorAll(".table-preset-item")
    .forEach((element) => element.classList.remove("dragging", "drag-over-before", "drag-over-after"));
}

function createTablePresetOrderControls(preset) {
  if (!tableListSelectedOnly || !isTableUrlSelected(preset?.url)) {
    return null;
  }

  const selectedIndex = getSelectedTableUrlIndex(preset.url);
  if (selectedIndex < 0) {
    return null;
  }

  const selectedCount = selectedTableUrls.size;
  const controls = document.createElement("span");
  controls.className = "table-preset-order-controls";

  const upButton = createTablePresetOrderButton("↑", "上へ", selectedIndex <= 0, () => {
    moveSelectedTableUrl(preset.url, -1);
  });
  const downButton = createTablePresetOrderButton("↓", "下へ", selectedIndex >= selectedCount - 1, () => {
    moveSelectedTableUrl(preset.url, 1);
  });

  controls.append(upButton, downButton);
  return controls;
}

function createTablePresetOrderButton(text, label, disabled, onMove) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "table-preset-order-button";
  button.textContent = text;
  button.title = label;
  button.setAttribute("aria-label", label);
  button.disabled = disabled;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) {
      return;
    }
    onMove();
    renderTablePresetPicker();
    if (latestAnalysis) {
      renderAnalysis();
    }
    void persistTablePresetSelection().catch((error) =>
      console.error("Failed to persist table selection order", error),
    );
  });
  return button;
}

function formatTableListEntryDisplayName(entry) {
  const symbol = String(entry?.symbol ?? "").trim();
  const name = String(entry?.name ?? "").trim();
  if (symbol && name) {
    return `${symbol}: ${name}`;
  }
  return name || symbol || String(entry?.url ?? "").trim();
}

function getFilteredTableListEntries() {
  return sortTableListEntriesForDisplay(
    availableTableListEntries.filter((entry) => {
      if (!doesTableListEntryMatchSearchFilter(entry)) {
        return false;
      }
      if (!doesTableListEntryMatchSelectedOnlyFilter(entry)) {
        return false;
      }
      if (!doesTableListEntryMatchTagFilter(entry)) {
        return false;
      }
      return true;
    }),
  );
}

function sortTableListEntriesForDisplay(entries) {
  return [...entries].sort((a, b) => {
    if (tableListSelectedOnly) {
      const selectedOrderDelta = getSelectedTableUrlIndex(a?.url) - getSelectedTableUrlIndex(b?.url);
      if (selectedOrderDelta !== 0) {
        return selectedOrderDelta;
      }
    }
    const customDelta = Number(Boolean(b?.custom)) - Number(Boolean(a?.custom));
    if (customDelta !== 0) {
      return customDelta;
    }
    const selectedDelta = Number(isTableUrlSelected(b?.url)) - Number(isTableUrlSelected(a?.url));
    if (tableListSelectedOnly && selectedDelta !== 0) {
      return selectedDelta;
    }
    return 0;
  });
}

function getSelectedTableUrlIndex(url) {
  const key = normalizeTableUrlForDisplayLookup(url);
  if (!key) {
    return -1;
  }
  return [...selectedTableUrls].findIndex((selectedUrl) => normalizeTableUrlForDisplayLookup(selectedUrl) === key);
}

function moveSelectedTableUrl(url, direction) {
  const key = normalizeTableUrlForDisplayLookup(url);
  const offset = Number(direction);
  if (!key || !Number.isFinite(offset) || offset === 0) {
    return false;
  }

  const urls = [...selectedTableUrls];
  const currentIndex = urls.findIndex((selectedUrl) => normalizeTableUrlForDisplayLookup(selectedUrl) === key);
  const nextIndex = currentIndex + offset;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= urls.length) {
    return false;
  }

  [urls[currentIndex], urls[nextIndex]] = [urls[nextIndex], urls[currentIndex]];
  selectedTableUrls = new Set(urls);
  return true;
}

function moveSelectedTableUrlToTarget(sourceUrl, targetUrl, insertAfter) {
  const sourceKey = normalizeTableUrlForDisplayLookup(sourceUrl);
  const targetKey = normalizeTableUrlForDisplayLookup(targetUrl);
  if (!sourceKey || !targetKey || sourceKey === targetKey) {
    return false;
  }

  const urls = [...selectedTableUrls];
  const sourceIndex = urls.findIndex((url) => normalizeTableUrlForDisplayLookup(url) === sourceKey);
  if (sourceIndex < 0) {
    return false;
  }

  const [sourceValue] = urls.splice(sourceIndex, 1);
  const targetIndex = urls.findIndex((url) => normalizeTableUrlForDisplayLookup(url) === targetKey);
  if (targetIndex < 0) {
    return false;
  }

  urls.splice(targetIndex + (insertAfter ? 1 : 0), 0, sourceValue);
  selectedTableUrls = new Set(urls);
  return true;
}

function doesTableListEntryMatchSearchFilter(entry) {
  const filterText = normalizeTableListFilterText(tableListFilterText);
  if (!filterText) {
    return true;
  }
  return normalizeTableListFilterText(`${entry.name} ${entry.symbol} ${entry.type} ${entry.tag} ${entry.comment} ${entry.url}`).includes(filterText);
}

function doesTableListEntryMatchSelectedOnlyFilter(entry) {
  return !tableListSelectedOnly || isTableUrlSelected(entry?.url);
}

function doesTableListEntryMatchTagFilter(entry) {
  if (selectedTableTagFilter === "all") {
    return true;
  }
  return getTableListEntryTagKeys(entry).has(selectedTableTagFilter);
}

function getTableListEntryTagKeys(entry) {
  const keys = new Set();
  const values = [entry?.tag];
  for (const rawValue of values) {
    const tagText = String(rawValue ?? "");
    const tagParts = tagText.split(/[,\u3001/|]/);
    for (const value of [tagText, ...tagParts]) {
      const key = normalizeTableListTagKey(value);
      if (key) {
        keys.add(key);
      }
    }
  }
  return keys;
}

function normalizeTableListTagKey(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) {
    return "";
  }
  const compact = text.replace(/[\s_-]+/g, "");
  if (compact.includes("selfmadechartonly") || compact.includes("selfmade") || compact.includes("selfonly")) {
    return "self-made-chart-only";
  }
  if (compact.includes("personal")) {
    return "personal";
  }
  if (compact.includes("general")) {
    return "general";
  }
  return "";
}

function syncTableListFilterControls() {
  if (!tableListTagFilters) {
    return;
  }
  const counts = getTableListTagCounts();
  const buttons = tableListTagFilters.querySelectorAll("[data-table-tag-filter]");
  for (const button of buttons) {
    const key = String(button.dataset.tableTagFilter ?? "all");
    const active = key === selectedTableTagFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    const countElement = button.querySelector("[data-table-tag-count]");
    if (countElement) {
      countElement.textContent = formatInteger(counts[key] ?? 0);
    }
  }
  if (tableListSelectedOnlyToggle) {
    tableListSelectedOnlyToggle.classList.toggle("active", tableListSelectedOnly);
    tableListSelectedOnlyToggle.setAttribute("aria-pressed", tableListSelectedOnly ? "true" : "false");
    const label = tableListSelectedOnlyToggle.querySelector(".table-list-selected-only-label");
    if (label) {
      setLocalizedText(label, tableListSelectedOnly ? "一覧に戻る" : "追加済み");
    }
  }
  if (tableListSelectedOnlyCount) {
    tableListSelectedOnlyCount.classList.toggle("hidden", tableListSelectedOnly);
    tableListSelectedOnlyCount.textContent = formatInteger(countSelectedTableListEntries());
  }
  syncTableListInputModeControls();
}

function syncTableListInputModeControls() {
  const urlMode = tableListInputMode === "url";
  tableListSearchModeButton?.classList.toggle("active", !urlMode);
  tableListSearchModeButton?.setAttribute("aria-pressed", urlMode ? "false" : "true");
  tableListUrlModeButton?.classList.toggle("active", urlMode);
  tableListUrlModeButton?.setAttribute("aria-pressed", urlMode ? "true" : "false");
  tableListFilterInput?.classList.toggle("hidden", urlMode);
  customTableUrlInput?.classList.toggle("hidden", !urlMode);
  addCustomTableUrlButton?.classList.toggle("hidden", !urlMode);
  refreshTableListButton?.classList.toggle("hidden", urlMode);
}

function getTableListTagCounts() {
  const counts = {
    all: 0,
    general: 0,
    personal: 0,
    "self-made-chart-only": 0,
  };
  for (const entry of availableTableListEntries) {
    if (!doesTableListEntryMatchSearchFilter(entry) || !doesTableListEntryMatchSelectedOnlyFilter(entry)) {
      continue;
    }
    counts.all += 1;
    const keys = getTableListEntryTagKeys(entry);
    for (const key of Object.keys(counts)) {
      if (key !== "all" && keys.has(key)) {
        counts[key] += 1;
      }
    }
  }
  return counts;
}

function countSelectedTableListEntries() {
  return collectSelectedTableUrls().length;
}

function updateTableListSelectionSummary(visibleCount = null) {
  if (!tableListSelectionSummary) {
    return;
  }
  const selectedCount = collectSelectedTableUrls().length;
  const visiblePart =
    typeof visibleCount === "number"
      ? selectedLanguage === "en"
        ? ` / Showing: ${formatInteger(visibleCount)}`
        : ` / 表示: ${formatInteger(visibleCount)}件`
      : "";
  tableListSelectionSummary.textContent =
    selectedLanguage === "en"
      ? `Selected: ${formatInteger(selectedCount)}${visiblePart}`
      : `選択中: ${formatInteger(selectedCount)}件${visiblePart}`;
}

function syncPresetCheckboxesFromState() {
  if (!tablePresetsContainer) {
    return;
  }
  const checkboxes = tablePresetsContainer.querySelectorAll('input[type="checkbox"][data-table-url]');
  for (const checkbox of checkboxes) {
    const tableUrl = checkbox.dataset.tableUrl;
    checkbox.checked = isTableUrlSelected(tableUrl);
    checkbox.closest(".table-preset-item")?.classList.toggle("selected", checkbox.checked);
  }
  updateTableListSelectionSummary(getFilteredTableListEntries().length);
}

function normalizeTableListFilterText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

async function refreshTableList({ force = false, silent = false } = {}) {
  if (refreshTableListButton) {
    refreshTableListButton.disabled = true;
  }
  if (!silent) {
    setTableListStatus("難易度表一覧を取得しています。");
  }

  try {
    const payload = await postJsonApi("/api/table-list", { force });
    const remoteEntries = normalizeTableListEntries(payload?.tables);
    if (remoteEntries.length) {
      baseTableListEntries = remoteEntries;
      rebuildAvailableTableListEntries();
      tableListLoadedFromRemote = true;
      setTableListStatus(
        selectedLanguage === "en"
          ? `Loaded the table list. ${formatInteger(remoteEntries.length)} tables`
          : `難易度表一覧を取得しました。${formatInteger(remoteEntries.length)}件`,
      );
      renderTablePresetPicker();
      syncPresetCheckboxesFromState();
      return;
    }
    throw new Error("No table entries");
  } catch (error) {
    tableListLoadedFromRemote = false;
    baseTableListEntries = DEFAULT_TABLE_LIST_ENTRIES.map((entry) => ({ ...entry }));
    rebuildAvailableTableListEntries();
    renderTablePresetPicker();
    syncPresetCheckboxesFromState();
    const message = "難易度表一覧の取得に失敗しました。代表的な表だけ表示します。";
    setTableListStatus(message);
    if (!silent) {
      setStatus(error instanceof Error ? `${message}\n${error.message}` : message);
    }
  } finally {
    if (refreshTableListButton) {
      refreshTableListButton.disabled = false;
    }
  }
}

function normalizeTableListEntries(entries) {
  const seen = new Set();
  const normalizedEntries = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (!isSpTableListEntry(entry)) {
      continue;
    }
    const url = String(entry?.url ?? "").trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) {
      continue;
    }
    seen.add(url);
    const tag1 = String(entry?.tag1 ?? entry?.type ?? "").trim();
    const tag2 = String(entry?.tag2 ?? entry?.tag ?? "").trim();
    normalizedEntries.push({
      id: String(entry?.id ?? url),
      name: String(entry?.name ?? "").trim() || url,
      url,
      symbol: String(entry?.symbol ?? "").trim(),
      type: tag1,
      tag1,
      tag: tag2,
      tag2,
      comment: String(entry?.comment ?? "").trim(),
      year: String(entry?.year ?? "").trim(),
    });
  }
  return normalizedEntries;
}

function isSpTableListEntry(entry) {
  return normalizeTableListPlayMode(entry?.tag1 ?? entry?.type) === "sp";
}

function normalizeTableListPlayMode(value) {
  const compact = String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!compact) {
    return "";
  }
  if (compact === "sp" || compact === "single" || compact === "singleplay") {
    return "sp";
  }
  if (compact === "dp" || compact === "double" || compact === "doubleplay") {
    return "dp";
  }
  return compact;
}

function normalizeCustomTableListEntry(entry) {
  const url = normalizeCustomTableUrl(entry?.url ?? entry);
  if (!url) {
    return null;
  }
  const tag1 = String(entry?.tag1 ?? entry?.type ?? "").trim();
  const tag2 = String(entry?.tag2 ?? entry?.tag ?? "").trim();
  return {
    id: String(entry?.id ?? `custom:${url}`),
    name: String(entry?.name ?? "").trim() || buildCustomTableDisplayName(url),
    url,
    symbol: String(entry?.symbol ?? "").trim(),
    type: tag1,
    tag1,
    tag: tag2,
    tag2,
    comment: String(entry?.comment ?? "").trim() || "URL追加",
    year: String(entry?.year ?? "").trim(),
    custom: true,
  };
}

function normalizeCustomTableUrl(value) {
  const rawUrl = String(value ?? "").trim();
  if (!rawUrl) {
    return "";
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return "";
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return "";
  }
  parsedUrl.hash = "";
  return migrateLegacyTableUrl(parsedUrl.href);
}

function buildCustomTableDisplayName(url) {
  try {
    const parsedUrl = new URL(url);
    const path = parsedUrl.pathname.replace(/\/(?:table\.html|header\.json)?$/i, "") || "/";
    return `URL追加: ${parsedUrl.hostname}${path}`;
  } catch {
    return "URL追加";
  }
}

async function handleAddCustomTableUrl() {
  if (addCustomTableUrlButton) {
    addCustomTableUrlButton.disabled = true;
  }
  if (!customTableUrlInput || customTableUrlInput.classList.contains("hidden")) {
    tableListInputMode = "url";
    syncTableListInputModeControls();
    customTableUrlInput?.focus();
    setTableListStatus("追加する難易度表URLを入力してください。");
    if (addCustomTableUrlButton) {
      addCustomTableUrlButton.disabled = false;
    }
    return;
  }
  const inputUrl = customTableUrlInput.value;

  try {
    const entry = normalizeCustomTableListEntry(inputUrl);
    if (!entry) {
      if (customTableUrlInput && !customTableUrlInput.classList.contains("hidden")) {
        customTableUrlInput.focus();
      }
      setTableListStatus("http / https のURLのみ読み込めます。");
      return;
    }

    const urlKey = normalizeTableUrlForDisplayLookup(entry.url);
    const existingEntry = availableTableListEntries.find(
      (tableEntry) => normalizeTableUrlForDisplayLookup(tableEntry.url) === urlKey,
    );
    const alreadyExists = Boolean(existingEntry);
    let tableEntry = existingEntry || entry;
    if (!existingEntry || existingEntry.custom || !existingEntry.name || !existingEntry.symbol) {
      setTableListStatus("難易度表情報を取得しています。");
      tableEntry = await fetchCustomTableEntryMeta(entry).catch((error) => {
        console.error("Failed to fetch custom table metadata", error);
        setTableListStatus("難易度表情報の取得に失敗しました。URL名で追加します。");
        return entry;
      });
    }
    const customWithoutDuplicate = customTableListEntries.filter(
      (tableEntry) => normalizeTableUrlForDisplayLookup(tableEntry.url) !== urlKey,
    );
    if (!existingEntry || existingEntry.custom) {
      customTableListEntries = [...customWithoutDuplicate, tableEntry];
    } else {
      customTableListEntries = customWithoutDuplicate;
      updateBaseTableListEntryMeta(urlKey, tableEntry);
    }
    rebuildAvailableTableListEntries();
    selectTableUrl(tableEntry.url);
    selectedTableTagFilter = "all";
    tableListSelectedOnly = true;
    tableListFilterText = "";
    if (tableListFilterInput) {
      tableListFilterInput.value = "";
    }
    if (customTableUrlInput) {
      customTableUrlInput.value = "";
    }
    renderTablePresetPicker();
    syncPresetCheckboxesFromState();
    if (alreadyExists) {
      setTableListStatus("このURLはすでに一覧にあります。");
    } else if (tableEntry !== entry) {
      setTableListStatus("難易度表情報を取得しました。");
    } else {
      setTableListStatus("URLを追加しました。");
    }
    await Promise.all([
      persistCustomTableListEntries().catch((error) => console.error("Failed to persist custom table list", error)),
      persistTablePresetSelection().catch((error) => console.error("Failed to persist table selection", error)),
    ]);
  } finally {
    if (addCustomTableUrlButton) {
      addCustomTableUrlButton.disabled = false;
    }
  }
}

async function fetchCustomTableEntryMeta(entry) {
  const payload = await postJsonApi("/api/table-meta", { url: entry.url });
  return normalizeCustomTableListEntry({
    ...entry,
    id: payload?.id || entry.id,
    name: payload?.name || entry.name,
    symbol: payload?.symbol || entry.symbol,
    url: payload?.url || payload?.sourceUrl || entry.url,
    comment: entry.comment || "URL指定で追加された表",
  }) || entry;
}

function updateBaseTableListEntryMeta(urlKey, entry) {
  if (!urlKey || !entry) {
    return;
  }
  baseTableListEntries = baseTableListEntries.map((baseEntry) => {
    if (normalizeTableUrlForDisplayLookup(baseEntry.url) !== urlKey) {
      return baseEntry;
    }
    return {
      ...baseEntry,
      name: entry.name || baseEntry.name,
      symbol: entry.symbol || baseEntry.symbol,
      url: entry.url || baseEntry.url,
    };
  });
}

function setTableListStatus(message) {
  if (tableListStatus) {
    setLocalizedText(tableListStatus, message);
  }
  if (tableListModalStatus) {
    setLocalizedText(tableListModalStatus, message);
  }
}

function isTableListModalOpen() {
  return tableListModal?.getAttribute("aria-hidden") === "false";
}

function setTableListModalOpen(shouldOpen) {
  if (!tableListModal) {
    return;
  }
  tableListModal.classList.toggle("hidden", !shouldOpen);
  tableListModal.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  if (shouldOpen) {
    renderTablePresetPicker();
    syncPresetCheckboxesFromState();
    setTimeout(() => tableListFilterInput?.focus(), 0);
  } else {
    openTableListButton?.focus();
  }
}

async function pickDbPath({ title, defaultPath }) {
  if (!hasDesktopFileDialog()) {
    setStatus("参照ボタンはデスクトップ版(.exe)で利用できます。ブラウザ版ではパスを直接入力してください。");
    return "";
  }

  try {
    const picked = await window.lr2irDesktop.pickFile({
      title: localizeString(title),
      defaultPath,
      filters: [{ name: "DB", extensions: ["db"] }],
    });
    return String(picked ?? "").trim();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "ファイル選択に失敗しました。");
    return "";
  }
}

async function pickDirectoryPath({ title, defaultPath }) {
  if (!hasDesktopDirectoryDialog()) {
    setStatus("参照ボタンはデスクトップ版(.exe)で利用できます。ブラウザ版ではパスを直接入力してください。");
    return "";
  }

  try {
    const picked = await window.lr2irDesktop.pickDirectory({
      title: localizeString(title),
      defaultPath,
    });
    return String(picked ?? "").trim();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "フォルダ選択に失敗しました。");
    return "";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  autoDbProfileFetchToken += 1;
  const previousAnalysis = latestAnalysis;

  const scoreDbPath = scoreDbPathInput.value.trim();
  const songDbPath = songDbPathInput.value.trim();
  const rivalFolderPath = rivalFolderPathInput?.value.trim() ?? "";
  const tableUrls = collectSelectedTableUrls();

  if (!scoreDbPath) {
    setStatus("LR2 score.db パスを入力してください。");
    return;
  }

  setControlMenuOpen(false, { restoreFocus: false });
  showMainLoadingFeedback();
  latestAnalysis = null;
  latestLampImprovements = [];
  latestComparisonBaseAnalysis = previousAnalysis ?? null;
  hasComparedLampImprovements = false;
  latestKeyHitCountDelta = null;
  latestPlayTimeDeltaSeconds = null;
  resultsRoot.classList.add("hidden");
  analyzeButton.disabled = true;

  const loadingPlayerOnly = tableUrls.length === 0;
  let loadingMessage = loadingPlayerOnly
    ? "プレイヤーデータを読み込んでいます。"
    : "難易度表とローカルのLR2 score.dbを読み込んでいます。\n表の数や曲数によっては少し時間がかかります。";
  if (scoreDbPath && !loadingPlayerOnly) {
    loadingMessage =
      "難易度表とローカルのLR2 score.dbを読み込んでいます。\n表の数や曲数によっては少し時間がかかります。";
  } else if (scoreDbPath && loadingPlayerOnly) {
    loadingMessage = "ローカルのLR2 score.dbからプレイヤーデータを読み込んでいます。";
  }
  setStatus(loadingMessage);

  try {
    const payload = await postJsonApi("/api/analyze", {
      scoreDbPath,
      songDbPath,
      rivalFolderPath,
      tableUrls,
      includeUnlistedUpdates: includeUnlistedChartsInLampUpdates,
      skillAnalyzerFetchMode,
      scoreDbMode,
    });

    latestAnalysis = normalizeAnalysisLampStatuses(payload);
    syncSelectedRivalsWithAnalysis(latestAnalysis);
    latestLampImprovements = collectLampImprovements(previousAnalysis, latestAnalysis, {
      includeBpUpdates: includeBpUpdatesInLampUpdates,
    });
    hasComparedLampImprovements = Boolean(previousAnalysis && Array.isArray(previousAnalysis.tables));
    latestKeyHitCountDelta = collectKeyHitCountDelta(previousAnalysis, latestAnalysis);
    latestPlayTimeDeltaSeconds = collectPlayTimeDeltaSeconds(previousAnalysis, latestAnalysis);
    setStatus(buildStatusMessage(latestAnalysis));
    renderAnalysis();
    resultsRoot.classList.remove("hidden");
    showMainDoneFeedback();
    void persistFormState().catch((error) => console.error("Failed to persist form state", error));
    void persistLatestAnalysis(latestAnalysis).catch((error) => console.error("Failed to persist analysis", error));
  } catch (error) {
    setControlMenuOpen(true, { restoreFocus: false });
    hideMainFeedback();
    renderAnalysis();
    setStatus(error instanceof Error ? error.message : "読み込みに失敗しました。");
  } finally {
    analyzeButton.disabled = false;
  }
});

scoreDbPathInput.addEventListener("input", persistFormStateDebounced);
songDbPathInput.addEventListener("input", persistFormStateDebounced);
screenshotDirPathInput?.addEventListener("input", persistFormStateDebounced);
rivalFolderPathInput?.addEventListener("input", persistFormStateDebounced);
tableUrlsInput.addEventListener("input", persistFormStateDebounced);
tableUrlsInput.addEventListener("input", () => {
  renderManualTableUrlToggles();
  updateTableListSelectionSummary(getFilteredTableListEntries().length);
});
openTableListButton?.addEventListener("click", () => {
  setTableListModalOpen(true);
});
tableListCloseButton?.addEventListener("click", () => {
  setTableListModalOpen(false);
});
tableListModal?.addEventListener("click", (event) => {
  if (event.target === tableListModal) {
    setTableListModalOpen(false);
  }
});
refreshTableListButton?.addEventListener("click", () => {
  void refreshTableList({ force: true }).catch((error) => {
    console.error("Failed to refresh table list", error);
  });
});
addCustomTableUrlButton?.addEventListener("click", () => {
  void handleAddCustomTableUrl().catch((error) => {
    console.error("Failed to add custom table URL", error);
  });
});
tableListFilterInput?.addEventListener("input", () => {
  tableListFilterText = tableListFilterInput.value;
  renderTablePresetPicker();
});
tableListSearchModeButton?.addEventListener("click", () => {
  tableListInputMode = "search";
  syncTableListInputModeControls();
  tableListFilterInput?.focus();
});
tableListUrlModeButton?.addEventListener("click", () => {
  tableListInputMode = "url";
  syncTableListInputModeControls();
  customTableUrlInput?.focus();
});
customTableUrlInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }
  event.preventDefault();
  void handleAddCustomTableUrl().catch((error) => {
    console.error("Failed to add custom table URL", error);
  });
});
tableListSelectedOnlyToggle?.addEventListener("click", () => {
  tableListSelectedOnly = !tableListSelectedOnly;
  if (tableListSelectedOnly) {
    setTableListStatus("追加済みの難易度表だけ表示しています。");
  } else {
    setTableListStatus("チェックした難易度表が読み込み対象になります。");
  }
  renderTablePresetPicker();
});
tableListTagFilters?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-table-tag-filter]");
  if (!button || !tableListTagFilters.contains(button)) {
    return;
  }
  const nextFilter = String(button.dataset.tableTagFilter ?? "all");
  selectedTableTagFilter = TABLE_LIST_TAG_FILTERS.has(nextFilter) ? nextFilter : "all";
  renderTablePresetPicker();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isTableListModalOpen()) {
    setTableListModalOpen(false);
  }
});
scoreDbPathInput.addEventListener("input", () => {
  if (latestAnalysis) {
    renderAnalysis();
  }
});
songDbPathInput.addEventListener("input", () => {
  if (latestAnalysis) {
    renderAnalysis();
  }
});
browseScoreDbButton.addEventListener("click", async () => {
  const selectedPath = await pickDbPath({
    title: "score.db を選択",
    defaultPath: scoreDbPathInput.value.trim(),
  });
  if (!selectedPath) {
    return;
  }
  scoreDbPathInput.value = selectedPath;
  scoreDbPathInput.dispatchEvent(new Event("input", { bubbles: true }));
  scoreDbPathInput.dispatchEvent(new Event("change", { bubbles: true }));
});
browseSongDbButton.addEventListener("click", async () => {
  const selectedPath = await pickDbPath({
    title: "song.db を選択",
    defaultPath: songDbPathInput.value.trim(),
  });
  if (!selectedPath) {
    return;
  }
  songDbPathInput.value = selectedPath;
  songDbPathInput.dispatchEvent(new Event("input", { bubbles: true }));
  void persistFormState().catch((error) => console.error("Failed to persist form state", error));
});
screenshotDirPathInput?.addEventListener("change", () => {
  void persistFormState().catch((error) => console.error("Failed to persist form state", error));
});
browseScreenshotDirButton?.addEventListener("click", async () => {
  const selectedPath = await pickDirectoryPath({
    title: "スクショ保存先を選択",
    defaultPath: screenshotDirPathInput?.value.trim() ?? "",
  });
  if (!selectedPath || !screenshotDirPathInput) {
    return;
  }
  screenshotDirPathInput.value = selectedPath;
  screenshotDirPathInput.dispatchEvent(new Event("input", { bubbles: true }));
  screenshotDirPathInput.dispatchEvent(new Event("change", { bubbles: true }));
});
browseRivalFolderButton?.addEventListener("click", async () => {
  const selectedPath = await pickDirectoryPath({
    title: "LR2 Rival フォルダを選択",
    defaultPath: rivalFolderPathInput?.value.trim() ?? "",
  });
  if (!selectedPath || !rivalFolderPathInput) {
    return;
  }
  rivalFolderPathInput.value = selectedPath;
  rivalFolderPathInput.dispatchEvent(new Event("input", { bubbles: true }));
  rivalFolderPathInput.dispatchEvent(new Event("change", { bubbles: true }));
});
scoreDbPathInput.addEventListener("change", () => {
  void persistFormState().catch((error) => console.error("Failed to persist form state", error));
  void autoFetchProfileFromScoreDb().catch((error) => {
    console.error("Failed to auto fetch profile from score.db", error);
  });
});

clearSavedButton.addEventListener("click", async () => {
  const shouldClear = await showAppConfirm("保存してある入力内容と前回の読み込み結果を削除しますか？", {
    description: "※難易度表の選択状態は保持されます。",
    confirmLabel: "削除する",
    cancelLabel: "キャンセル",
  });
  if (!shouldClear) {
    return;
  }

  await clearPersistedState();
  latestAnalysis = null;
  latestLampImprovements = [];
  latestComparisonBaseAnalysis = null;
  selectedRivalIds.clear();
  knownRivalIds.clear();
  rivalSelectionInitialized = false;
  renderRivalPanel();
  hasComparedLampImprovements = false;
  latestKeyHitCountDelta = null;
  latestPlayTimeDeltaSeconds = null;
  tableInfoPanelOpenState.clear();
  chartDetailsOpenState.clear();
  chartListOpenLevelsState.clear();
  chartListStateByTable.clear();
  form.reset();
  scoreDbPathInput.value = "";
  songDbPathInput.value = "";
  if (screenshotDirPathInput) {
    screenshotDirPathInput.value = "";
  }
  if (rivalFolderPathInput) {
    rivalFolderPathInput.value = "";
  }
  syncPresetCheckboxesFromState();
  disabledManualTableUrls.clear();
  renderManualTableUrlToggles();
  levelChartMode = "lamp";
  updateLevelModeToggleButton();
  hasStoredLanguagePreference = false;
  applyLanguage(DEFAULT_LANGUAGE, { persist: false });
  applyTheme(DEFAULT_THEME_MODE, { persist: false });
  includeBpUpdatesInLampUpdates = false;
  if (includeBpUpdatesInput) {
    includeBpUpdatesInput.checked = false;
  }
  includeUnlistedChartsInLampUpdates = false;
  if (includeUnlistedUpdatesInput) {
    includeUnlistedUpdatesInput.checked = false;
  }
  skillAnalyzerFetchMode = "both";
  scoreDbMode = "auto";
  if (scoreDbModeSelect) {
    scoreDbModeSelect.value = scoreDbMode;
  }
  syncSkillAnalyzerFetchModeControls();
  renderAnalysis();
  setStatus("保存済みデータを削除しました。難易度表の選択状態は保持しています。");
});

function renderAnalysis() {
  hideLevelGroupFloatingCloseButton();
  hideFloatingChartHeader();
  if (!latestAnalysis) {
    renderRivalPanel();
    renderInitialGuidePanel();
    translateApp();
    return;
  }
  syncSelectedRivalsWithAnalysis(latestAnalysis);
  renderManualTableUrlToggles();
  renderRivalPanel();
  hideFloatingTooltip();

  resultsRoot.innerHTML = "";
  resultsRoot.append(renderOverviewPanel(latestAnalysis));
  const lampImprovementPanel = renderLampImprovementsPanel(latestLampImprovements, hasComparedLampImprovements);
  if (lampImprovementPanel) {
    resultsRoot.append(lampImprovementPanel);
  }
  const forceBest50Folder = renderForceRatingBest50Folder(latestAnalysis.player?.forceRating);
  if (forceBest50Folder) {
    resultsRoot.append(forceBest50Folder);
  }
  const visibleTables = getAnalysisTablesForDisplay(latestAnalysis.tables);

  const visibleTableKeys = new Set(visibleTables.map((table) => buildTableInfoStateKey(table)));
  for (const key of tableInfoPanelOpenState.keys()) {
    if (!visibleTableKeys.has(key)) {
      tableInfoPanelOpenState.delete(key);
    }
  }
  for (const key of chartDetailsOpenState.keys()) {
    if (!visibleTableKeys.has(key)) {
      chartDetailsOpenState.delete(key);
    }
  }
  for (const key of chartListOpenLevelsState.keys()) {
    if (!visibleTableKeys.has(key)) {
      chartListOpenLevelsState.delete(key);
    }
  }

  if (!visibleTables.length) {
    const emptyPanel = document.createElement("section");
    emptyPanel.className = "panel overview-panel";
    emptyPanel.innerHTML =
      latestAnalysis.tables.length === 0
        ? '<p class="helper">難易度表が未選択のため、プレイヤーデータのみ表示しています。</p>'
        : '<p class="helper">表示対象の難易度表がありません。</p>';
    resultsRoot.append(emptyPanel);
    translateApp();
    return;
  }

  for (const table of visibleTables) {
    resultsRoot.append(renderTableSection(table, table.charts));
  }
  translateApp();
}

function getAnalysisTablesForDisplay(tables) {
  return (Array.isArray(tables) ? tables : [])
    .map((table, index) => ({ table, index, selectedIndex: getSelectedTableUrlIndex(table?.sourceUrl) }))
    .sort((left, right) => {
      const leftSelected = left.selectedIndex >= 0;
      const rightSelected = right.selectedIndex >= 0;
      if (leftSelected && rightSelected && left.selectedIndex !== right.selectedIndex) {
        return left.selectedIndex - right.selectedIndex;
      }
      if (leftSelected !== rightSelected) {
        return leftSelected ? -1 : 1;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.table);
}

function renderInitialGuidePanel() {
  hideFloatingTooltip();
  resultsRoot.innerHTML = "";

  const section = document.createElement("section");
  section.className = "panel overview-panel";

  const title = document.createElement("h2");
  title.textContent = "Welcome";

  const description = document.createElement("p");
  description.className = "helper";
  description.textContent = "まずはメニューから読み込み設定を行ってください。";

  section.append(title, description);
  resultsRoot.append(section);
  resultsRoot.classList.remove("hidden");
  translateApp(section);
}

function syncSelectedRivalsWithAnalysis(analysis) {
  const rivalIds = getAnalysisRivalIds(analysis);
  if (!rivalIds.length) {
    selectedRivalIds.clear();
    knownRivalIds.clear();
    rivalSelectionInitialized = false;
    return;
  }

  if (!rivalSelectionInitialized) {
    selectedRivalIds = new Set(rivalIds);
    knownRivalIds = new Set(rivalIds);
    rivalSelectionInitialized = true;
    return;
  }

  const previousKnownRivalIds = new Set(knownRivalIds);
  selectedRivalIds = new Set([...selectedRivalIds].filter((id) => rivalIds.includes(id)));
  for (const id of rivalIds) {
    if (!previousKnownRivalIds.has(id)) {
      selectedRivalIds.add(id);
    }
  }
  knownRivalIds = new Set(rivalIds);
}

function getAnalysisRivalIds(analysis) {
  return Array.isArray(analysis?.rivals?.players)
    ? analysis.rivals.players.map((rival) => String(rival?.id ?? "").trim()).filter(Boolean)
    : [];
}

function renderRivalPanel() {
  if (!rivalToggleButton || !rivalPanel) {
    return;
  }

  const rivals = Array.isArray(latestAnalysis?.rivals?.players) ? latestAnalysis.rivals.players : [];
  rivalToggleButton.classList.toggle("hidden", rivals.length === 0);
  if (!rivals.length) {
    setRivalPanelOpen(false);
    rivalPanel.innerHTML = "";
    return;
  }

  rivalPanel.innerHTML = "";
  const header = document.createElement("div");
  header.className = "rival-panel-header";

  const title = document.createElement("div");
  title.className = "rival-panel-title";
  title.textContent = "RIVAL";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "button-secondary rival-panel-close";
  closeButton.textContent = "閉じる";
  closeButton.addEventListener("click", () => setRivalPanelOpen(false));

  header.append(title, closeButton);
  rivalPanel.append(header);

  const summary = document.createElement("div");
  summary.className = "rival-panel-summary";

  const summaryLabel = document.createElement("div");
  summaryLabel.className = "rival-panel-summary-label";
  summaryLabel.textContent = "Rival";

  const summaryCount = document.createElement("div");
  summaryCount.className = "rival-panel-summary-count";
  summaryCount.textContent = `${formatInteger(latestAnalysis?.rivals?.count ?? rivals.length)}人`;

  const summaryScores = document.createElement("div");
  summaryScores.className = "rival-panel-summary-scores";
  summaryScores.textContent = `${formatInteger(latestAnalysis?.rivals?.totalScores ?? 0)}スコア`;

  summary.append(summaryLabel, summaryCount, summaryScores);
  rivalPanel.append(summary);

  const rivalScopes = getRivalStatsScopeOptions(latestAnalysis);
  if (!rivalScopes.some((scope) => scope.id === selectedRivalStatsScope)) {
    selectedRivalStatsScope = "all";
  }

  const currentScope = rivalScopes.find((scope) => scope.id === selectedRivalStatsScope) ?? rivalScopes[0];
  const scopePicker = document.createElement("details");
  scopePicker.className = "rival-panel-scope-picker";

  const scopeSummary = document.createElement("summary");
  scopeSummary.className = "rival-panel-scope-summary";
  const scopeSummaryPrefix = document.createElement("span");
  scopeSummaryPrefix.textContent = "勝敗表示: ";
  const scopeSummaryName = document.createElement("span");
  if (currentScope?.isTable) {
    setUntranslatedText(scopeSummaryName, currentScope.label);
  } else {
    scopeSummaryName.textContent = currentScope?.label ?? "全譜面";
  }
  scopeSummary.append(scopeSummaryPrefix, scopeSummaryName);
  scopePicker.append(scopeSummary);

  const scopeList = document.createElement("div");
  scopeList.className = "rival-panel-scope-list";
  for (const scope of rivalScopes) {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "rival-panel-scope-option";
    optionButton.setAttribute("aria-pressed", scope.id === selectedRivalStatsScope ? "true" : "false");
    if (scope.isTable) {
      setUntranslatedText(optionButton, scope.label);
    } else {
      optionButton.textContent = scope.label;
    }
    optionButton.addEventListener("click", () => {
      selectedRivalStatsScope = scope.id;
      renderAnalysis();
    });
    scopeList.append(optionButton);
  }
  scopePicker.append(scopeList);
  rivalPanel.append(scopePicker);

  const rivalStats = buildRivalWinLossStats(latestAnalysis, selectedRivalStatsScope);

  const sortControls = document.createElement("div");
  sortControls.className = "rival-panel-sort-controls";
  const rivalSortOptions = [
    { key: "win", label: "WIN率順" },
    { key: "lose", label: "LOSE率順" },
    { key: "name", label: "名前順" },
  ];
  if (!rivalSortOptions.some((option) => option.key === selectedRivalSortKey)) {
    selectedRivalSortKey = "win";
  }
  for (const option of rivalSortOptions) {
    const sortButton = document.createElement("button");
    sortButton.type = "button";
    sortButton.className = "rival-panel-sort-button";
    sortButton.setAttribute("aria-pressed", option.key === selectedRivalSortKey ? "true" : "false");
    sortButton.textContent = option.label;
    sortButton.addEventListener("click", () => {
      selectedRivalSortKey = option.key;
      renderRivalPanel();
    });
    sortControls.append(sortButton);
  }
  rivalPanel.append(sortControls);

  const actions = document.createElement("div");
  actions.className = "rival-panel-actions";

  const selectAllButton = document.createElement("button");
  selectAllButton.type = "button";
  selectAllButton.className = "button-secondary rival-panel-action";
  selectAllButton.textContent = "全選択";
  selectAllButton.addEventListener("click", () => {
    selectedRivalIds = new Set(getAnalysisRivalIds(latestAnalysis));
    renderAnalysis();
  });

  const clearAllButton = document.createElement("button");
  clearAllButton.type = "button";
  clearAllButton.className = "button-secondary rival-panel-action";
  clearAllButton.textContent = "全解除";
  clearAllButton.addEventListener("click", () => {
    selectedRivalIds.clear();
    renderAnalysis();
  });

  actions.append(selectAllButton, clearAllButton);
  rivalPanel.append(actions);

  const sortedRivals = sortRivalsForPanel(rivals, rivalStats, selectedRivalSortKey);
  for (const rival of sortedRivals) {
    const rivalId = String(rival?.id ?? "").trim();
    if (!rivalId) {
      continue;
    }

    const label = document.createElement("label");
    label.className = "rival-panel-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedRivalIds.has(rivalId);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        selectedRivalIds.add(rivalId);
      } else {
        selectedRivalIds.delete(rivalId);
      }
      renderAnalysis();
    });

    const stats = rivalStats.get(rivalId) ?? { wins: 0, losses: 0 };
    const totalDecided = stats.wins + stats.losses;
    const winPercent = totalDecided > 0 ? (stats.wins / totalDecided) * 100 : 0;
    const lossPercent = totalDecided > 0 ? 100 - winPercent : 0;

    const name = document.createElement("span");
    name.className = "rival-panel-name";
    name.style.setProperty("--rival-win-percent", `${winPercent}%`);

    const nameText = document.createElement("strong");
    nameText.textContent = rival?.name || rivalId;

    const record = document.createElement("span");
    record.className = "rival-panel-record";
    record.textContent = `WIN ${formatInteger(stats.wins)} / LOSE ${formatInteger(stats.losses)}`;

    name.append(nameText, record);

    const meta = document.createElement("small");
    meta.textContent = totalDecided > 0 ? `${winPercent.toFixed(1)}% / ${lossPercent.toFixed(1)}%` : "対戦なし";

    label.append(checkbox, name, meta);
    rivalPanel.append(label);
  }
  translateApp(rivalPanel);
}

function sortRivalsForPanel(rivals, rivalStats, sortKey) {
  return [...rivals].sort((left, right) => {
    const leftId = String(left?.id ?? "").trim();
    const rightId = String(right?.id ?? "").trim();
    const leftStats = rivalStats.get(leftId) ?? { wins: 0, losses: 0 };
    const rightStats = rivalStats.get(rightId) ?? { wins: 0, losses: 0 };
    const leftName = String(left?.name || leftId).trim();
    const rightName = String(right?.name || rightId).trim();

    const leftTotal = leftStats.wins + leftStats.losses;
    const rightTotal = rightStats.wins + rightStats.losses;
    const leftWinRate = leftTotal > 0 ? leftStats.wins / leftTotal : -1;
    const rightWinRate = rightTotal > 0 ? rightStats.wins / rightTotal : -1;
    const leftLossRate = leftTotal > 0 ? leftStats.losses / leftTotal : -1;
    const rightLossRate = rightTotal > 0 ? rightStats.losses / rightTotal : -1;

    if (sortKey === "lose") {
      const lossDiff = rightLossRate - leftLossRate;
      if (lossDiff !== 0) {
        return lossDiff;
      }
    } else if (sortKey === "name") {
      const nameDiff = leftName.localeCompare(rightName, "ja");
      if (nameDiff !== 0) {
        return nameDiff;
      }
    } else {
      const winDiff = rightWinRate - leftWinRate;
      if (winDiff !== 0) {
        return winDiff;
      }
    }

    const decidedDiff = rightTotal - leftTotal;
    if (decidedDiff !== 0) {
      return decidedDiff;
    }
    return leftName.localeCompare(rightName, "ja");
  });
}

function getRivalStatsScopeOptions(analysis) {
  const scopes = [{ id: "all", label: "全譜面" }];
  const tables = Array.isArray(analysis?.tables) ? analysis.tables : [];
  for (const table of tables) {
    const tableId = getRivalStatsTableScopeId(table);
    if (!tableId || scopes.some((scope) => scope.id === tableId)) {
      continue;
    }
    const label = String(table?.name ?? "").trim() || String(table?.symbol ?? "").trim() || "難易度表";
    scopes.push({ id: tableId, label, isTable: true });
  }
  return scopes;
}

function getRivalStatsTableScopeId(table) {
  const key = buildTableInfoStateKey(table);
  return key ? `table:${key}` : "";
}

function buildRivalWinLossStats(analysis, scopeId = "all") {
  const stats = new Map();
  const rivals = Array.isArray(analysis?.rivals?.players) ? analysis.rivals.players : [];
  for (const rival of rivals) {
    const rivalId = String(rival?.id ?? "").trim();
    if (rivalId) {
      stats.set(rivalId, { wins: 0, losses: 0 });
    }
  }

  const tables = Array.isArray(analysis?.tables) ? analysis.tables : [];
  const scopedTables =
    scopeId && scopeId !== "all"
      ? tables.filter((table) => getRivalStatsTableScopeId(table) === scopeId)
      : tables;
  const charts = scopedTables.flatMap((table) => (Array.isArray(table?.charts) ? table.charts : []));
  for (const chart of charts) {
    const selfLamp = normalizeLampStatusForUi(chart?.lampStatus);
    if (selfLamp === "NO PLAY" || selfLamp === "NO SONG") {
      continue;
    }
    const selfExScore = Number.isFinite(Number(chart?.exScore)) ? Number(chart.exScore) : null;
    if (selfExScore == null) {
      continue;
    }

    const rivalScores = Array.isArray(chart?.rivalComparison?.scores) ? chart.rivalComparison.scores : [];
    for (const score of rivalScores) {
      const rivalId = String(score?.id ?? "").trim();
      if (!rivalId || !stats.has(rivalId)) {
        continue;
      }
      const rivalLamp = normalizeLampStatusForUi(score?.lampStatus);
      if (rivalLamp === "NO PLAY" || rivalLamp === "NO SONG") {
        continue;
      }
      const rivalExScore = Number.isFinite(Number(score?.exScore)) ? Number(score.exScore) : null;
      if (rivalExScore == null || selfExScore === rivalExScore) {
        continue;
      }
      if (selfExScore > rivalExScore) {
        stats.get(rivalId).wins += 1;
      } else {
        stats.get(rivalId).losses += 1;
      }
    }
  }

  return stats;
}

function renderOverviewPanel(analysis) {
  const section = document.createElement("section");
  section.className = "panel overview-panel";

  const title = document.createElement("h2");
  title.textContent = "Player Data";

  const metricGrid = document.createElement("div");
  metricGrid.className = "metric-grid";
  const danValue = formatPlayerGrade(analysis.player);
  const danFormalName = getPlayerGradeFormalName(analysis.player);
  const playerId = getPlayerDisplayId(analysis.player);
  metricGrid.append(createMetricCard("プレイヤー名", analysis.player.name || "-", playerId === "-" ? "" : `ID ${playerId}`));
  metricGrid.append(createMetricCard("SP段位", danValue, danFormalName, getDanToneClass(danValue, analysis.player)));
  for (const card of createSkillAnalyzerMetricCards(analysis.player)) {
    metricGrid.append(card);
  }
  const forceRatingCard = createForceRatingCard(analysis.player.forceRating);
  if (forceRatingCard) {
    metricGrid.append(forceRatingCard);
  }
  if (latestKeyHitCountDelta != null && latestKeyHitCountDelta > 0) {
    metricGrid.append(
      createMetricCard(
        "今回の打鍵回数",
        `${formatInteger(latestKeyHitCountDelta)}回`,
        "",
      ),
    );
  }

  section.append(title, metricGrid);

  if (analysis.tableErrors.length) {
    const errorList = document.createElement("ul");
    errorList.className = "note-list";
    for (const entry of analysis.tableErrors) {
      const item = document.createElement("li");
      item.textContent = `${entry.tableUrl} : ${entry.error}`;
      errorList.append(item);
    }
    section.append(errorList);
  }

  return section;
}

function renderForceRatingBest50Folder(forceRating) {
  if (!forceRating || forceRating.available === false) {
    return null;
  }

  const charts = Array.isArray(forceRating.topCharts) ? forceRating.topCharts : [];
  const section = document.createElement("section");
  section.className = "panel table-section force-best50-section";

  const header = document.createElement("div");
  header.className = "table-header force-best50-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "table-title-wrap";
  const heading = document.createElement("h2");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "table-name-toggle";
  toggle.setAttribute("aria-expanded", forceBest50Open ? "true" : "false");
  const title = document.createElement("span");
  title.textContent = "FORCE RATE TARGETS";
  toggle.append(title);
  heading.append(toggle);
  titleWrap.append(heading);

  const count = document.createElement("div");
  count.className = "force-best50-count";
  count.dataset.i18nSkip = "true";
  count.textContent =
    selectedLanguage === "en" ? `${charts.length} targets` : `${charts.length}対象`;
  header.append(titleWrap, count);

  const panel = document.createElement("div");
  panel.className = "table-info-panel force-best50-panel";
  panel.classList.toggle("hidden", !forceBest50Open);

  const summary = document.createElement("div");
  summary.className = "force-best50-summary";
  summary.dataset.i18nSkip = "true";
  const cutoff = Number(forceRating.cutoff);
  const cutoffText = Number.isFinite(cutoff) && charts.length ? cutoff.toFixed(3) : "-";
  const broadCount = Math.max(0, Number.parseInt(forceRating.broadCount, 10) || charts.length);
  const broadAverage = Number(forceRating.broadAverage);
  const best20Average = Number(forceRating.best20Average);
  const broadAverageText = Number.isFinite(broadAverage) ? broadAverage.toFixed(3) : "-";
  const best20AverageText = Number.isFinite(best20Average) ? best20Average.toFixed(3) : "-";
  summary.textContent =
    selectedLanguage === "en"
      ? `Targets ${broadCount}/51 · BEST20 avg ${best20AverageText} · Broad avg ${broadAverageText} · Cutoff ${cutoffText}`
      : `対象 ${broadCount}/51 · BEST20平均 ${best20AverageText} · 全体平均 ${broadAverageText} · 下限 ${cutoffText}`;
  panel.append(summary);

  if (charts.length) {
    panel.append(createForceBest50Table(charts));
  } else {
    const empty = document.createElement("p");
    empty.className = "helper force-best50-empty";
    empty.textContent =
      selectedLanguage === "en"
        ? "There are no played charts eligible for FORCE RATE."
        : "レーティング対象のプレイ済み譜面がありません。";
    panel.append(empty);
  }

  toggle.addEventListener("click", () => {
    forceBest50Open = panel.classList.contains("hidden");
    panel.classList.toggle("hidden", !forceBest50Open);
    toggle.setAttribute("aria-expanded", forceBest50Open ? "true" : "false");
  });

  section.append(header, panel);
  return section;
}

function createForceBest50Table(charts) {
  const wrapper = document.createElement("div");
  wrapper.className = "force-best50-table-wrap";

  const columns =
    selectedLanguage === "en"
      ? [
          { key: "rank", label: "#" },
          { key: "title", label: "Title" },
          { key: "chartConstant", label: "Chart Constant" },
          { key: "lampStatus", label: "Lamp" },
          { key: "scoreRate", label: "EX/Rate" },
          { key: "force", label: "Chart FORCE" },
          { key: "source", label: "Source" },
        ]
      : [
          { key: "rank", label: "#" },
          { key: "title", label: "Title" },
          { key: "chartConstant", label: "譜面定数" },
          { key: "lampStatus", label: "Lamp" },
          { key: "scoreRate", label: "EX/Rate" },
          { key: "force", label: "単曲レート" },
          { key: "source", label: "対象表" },
        ];

  const render = () => {
    wrapper.innerHTML = "";

    const table = document.createElement("table");
    table.className = "chart-table force-best50-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const column of columns) {
      const th = document.createElement("th");
      th.className = `force-best50-column-${column.key}`;
      th.setAttribute(
        "aria-sort",
        forceBest50SortState.sortKey === column.key
          ? forceBest50SortState.sortDirection === "asc"
            ? "ascending"
            : "descending"
          : "none",
      );
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sort-button";
      button.classList.toggle("is-active", forceBest50SortState.sortKey === column.key);
      button.innerHTML =
        `<span>${escapeHtml(column.label)}</span>` +
        `<span class="sort-indicator">${getSortIndicator(column.key, forceBest50SortState)}</span>`;
      button.addEventListener("click", () => {
        if (forceBest50SortState.sortKey === column.key) {
          forceBest50SortState.sortDirection =
            forceBest50SortState.sortDirection === "asc" ? "desc" : "asc";
        } else {
          forceBest50SortState.sortKey = column.key;
          forceBest50SortState.sortDirection = "asc";
        }
        render();
      });
      th.append(button);
      headRow.append(th);
    }
    thead.append(headRow);

    const tbody = document.createElement("tbody");
    for (const chart of sortForceBest50Charts(charts, forceBest50SortState)) {
      const lampStatus = normalizeLampStatusForUi(chart?.lampStatus);
      const lampClass = `lamp-${toLampSlug(lampStatus)}`;
      const row = document.createElement("tr");
      row.className = lampClass;

      const rankCell = document.createElement("td");
      rankCell.className = "force-best50-rank";
      rankCell.textContent = String(chart.rank ?? "-");

      const titleCell = document.createElement("td");
      titleCell.className = `chart-title-cell force-best50-title ${lampClass}`;
      const chartTitle = String(chart.title || "").trim();
      titleCell.innerHTML = `<div class="chart-title">${escapeHtml(chartTitle || "-")}</div>`;

      const constantCell = document.createElement("td");
      constantCell.className = "force-best50-constant";
      constantCell.textContent = Number.isFinite(Number(chart.chartConstant))
        ? Number(chart.chartConstant).toFixed(2)
        : "-";

      const lampCell = document.createElement("td");
      lampCell.className = "chart-lamp-cell force-best50-lamp";
      lampCell.textContent = lampLabels[lampStatus] || lampStatus;

      const scoreCell = createScoreCell({
        lampStatus,
        exScore: Number(chart.exScore),
        maxExScore: Number(chart.maxExScore),
        scoreRate: Number(chart.scoreRate),
        maxOffset: Number(chart.maxExScore) - Number(chart.exScore),
      });
      scoreCell.classList.add("force-best50-score");

      const forceCell = document.createElement("td");
      forceCell.className = "force-best50-value";
      forceCell.textContent = Number.isFinite(Number(chart.force)) ? Number(chart.force).toFixed(3) : "-";

      const sourceCell = document.createElement("td");
      sourceCell.className = "force-best50-source";
      sourceCell.textContent =
        chart.source === "insane"
          ? "発狂BMS"
          : chart.source === "overjoy"
            ? "Overjoy"
            : chart.source === "dan"
              ? selectedLanguage === "en" ? "Dan" : "段位"
              : "-";

      row.append(rankCell, titleCell, constantCell, lampCell, scoreCell, forceCell, sourceCell);
      tbody.append(row);
    }

    table.append(thead, tbody);
    wrapper.append(table);
  };

  render();
  return wrapper;
}

function sortForceBest50Charts(charts, state) {
  return [...charts].sort((left, right) => {
    let compared = 0;
    switch (state.sortKey) {
      case "title":
        compared = applySortDirection(compareText(left.title, right.title), state.sortDirection);
        break;
      case "chartConstant":
        compared = compareNumericNullable(left.chartConstant, right.chartConstant, state.sortDirection);
        break;
      case "lampStatus":
        compared = applySortDirection(
          compareLampStatus(
            normalizeLampStatusForUi(left.lampStatus),
            normalizeLampStatusForUi(right.lampStatus),
          ),
          state.sortDirection,
        );
        break;
      case "scoreRate":
        compared = compareNumericNullable(left.scoreRate, right.scoreRate, state.sortDirection);
        break;
      case "force":
        compared = compareNumericNullable(left.force, right.force, state.sortDirection);
        break;
      case "source":
        compared = applySortDirection(compareText(left.source, right.source), state.sortDirection);
        break;
      case "rank":
      default:
        compared = compareNumericNullable(left.rank, right.rank, state.sortDirection);
        break;
    }
    return compared || compareNumericNullable(left.rank, right.rank, "asc");
  });
}

function getPlayerDisplayId(player) {
  const lr2Id = String(player?.lr2Id ?? "").trim();
  if (lr2Id) {
    return lr2Id;
  }

  const localId = String(player?.id ?? "").trim();
  if (!localId || localId.toLowerCase() === "manual" || localId.toLowerCase() === "local") {
    return "-";
  }
  return localId;
}

function renderLampImprovementsPanel(improvements, compared) {
  if (!compared) {
    return null;
  }

  const section = document.createElement("section");
  section.className = "panel overview-panel lamp-improvements-panel";

  const heading = document.createElement("div");
  heading.className = "lamp-improvements-heading";

  const title = document.createElement("h2");
  title.textContent = "Lamp Updates";
  heading.append(title);

  const saveImageButton = document.createElement("button");
  saveImageButton.type = "button";
  saveImageButton.className = "button-secondary lamp-improvements-save-button";
  setLocalizedText(saveImageButton, "今日の更新を画像出力");
  saveImageButton.addEventListener("click", async () => {
    saveImageButton.disabled = true;
    setLocalizedText(saveImageButton, "出力中…");
    setStatus("出力中…");
    showExportMessage("出力中…", { closable: false });
    try {
      await exportLampUpdatesSnapshot({
        improvements: Array.isArray(improvements) ? improvements : [],
        keyHitCountDelta: latestKeyHitCountDelta,
        playTimeDeltaSeconds: latestPlayTimeDeltaSeconds,
        themeMode: selectedThemeMode,
      });
      setStatus("画像出力が完了しました。");
      showExportMessage("スクショ保存完了！");
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      setStatus(`画像保存に失敗しました: ${details}`);
      showExportMessage(`出力に失敗しました: ${details}`);
    } finally {
      saveImageButton.disabled = false;
      setLocalizedText(saveImageButton, "今日の更新を画像出力");
    }
  });
  heading.append(saveImageButton);
  section.append(heading);

  const sessionMeta = createLampUpdatesSessionMeta();
  if (sessionMeta) {
    section.append(sessionMeta);
  }

  if (!Array.isArray(improvements) || improvements.length === 0) {
    const empty = document.createElement("p");
    empty.className = "helper";
    empty.textContent = includeBpUpdatesInLampUpdates
      ? "前回読み込みから更新されたクリアランプ、BP、スコアはありません。"
      : "前回読み込みから更新されたクリアランプまたはスコアはありません。";
    section.append(empty);
    return section;
  }

  const helper = document.createElement("p");
  helper.className = "helper";
  helper.textContent = includeBpUpdatesInLampUpdates
    ? `前回読み込みからランプ、BP、スコアが更新された譜面: ${improvements.length}件`
    : `前回読み込みからランプまたはスコアが更新された譜面: ${improvements.length}件`;
  section.append(helper);
  const updateDateText = formatDateYmd(new Date());

  const sortedImprovements = [...improvements].sort(compareLampImprovements);
  const groupedByCurrentLamp = new Map();
  for (const item of sortedImprovements) {
    const lamp = getLampImprovementGroupKey(item);
    if (!groupedByCurrentLamp.has(lamp)) {
      groupedByCurrentLamp.set(lamp, []);
    }
    groupedByCurrentLamp.get(lamp).push(item);
  }

  for (const groupDef of getLampImprovementGroupDefs()) {
    const groupItems = groupedByCurrentLamp.get(groupDef.key);
    if (!groupItems || !groupItems.length) {
      continue;
    }

    const group = document.createElement("section");
    group.className = `lamp-improvement-group ${groupDef.className}`;

    const groupTitle = document.createElement("h3");
    groupTitle.className = "lamp-improvement-group-title";
    groupTitle.textContent = groupDef.title;
    group.append(groupTitle);

    const list = document.createElement("ul");
    list.className = "lamp-improvement-list";

    for (const item of groupItems) {
      const row = document.createElement("li");
      row.className = "lamp-improvement-item";

      const mainLine = document.createElement("div");
      mainLine.className = "lamp-improvement-main";

      const levelLine = document.createElement("span");
      levelLine.className = "lamp-improvement-levels";
      levelLine.textContent = item.levelText || "-";

      const titleLine = document.createElement("span");
      titleLine.className = "lamp-improvement-title";
      titleLine.textContent = item.title;

      const detailLine = document.createElement("div");
      detailLine.className = "lamp-improvement-detail";
      const transitionLine = document.createElement("span");
      transitionLine.className = "lamp-improvement-transition";
      const newBadge = createLampImprovementLampBadge(item.currentLamp);
      if (item.updateKind === "lamp") {
        const oldBadge = createLampImprovementLampBadge(item.previousLamp);
        const arrow = document.createElement("span");
        arrow.className = "lamp-improvement-arrow";
        arrow.textContent = "→";
        transitionLine.append(oldBadge, arrow, newBadge);
      } else {
        transitionLine.append(newBadge);
      }
      detailLine.append(transitionLine);

      const detailParts = new Map(
        getLampImprovementDetailParts(item).map((part) => [String(part?.kind ?? "").trim(), part]),
      );
      detailLine.append(
        createLampImprovementMetricSlot(detailParts.get("bp"), "bp"),
        createLampImprovementMetricSlot(detailParts.get("tier"), "tier"),
        createLampImprovementMetricSlot(detailParts.get("ex"), "ex"),
        createLampImprovementMetricSlot(detailParts.get("rate"), "rate"),
      );

      const dateLine = document.createElement("span");
      dateLine.className = "lamp-improvement-date";
      dateLine.textContent = updateDateText;

      mainLine.append(levelLine, titleLine, detailLine, dateLine);
      row.append(mainLine);
      list.append(row);
    }

    group.append(list);
    section.append(group);
  }

  return section;
}

function createLampUpdatesSessionMeta() {
  if (
    (latestKeyHitCountDelta == null || latestKeyHitCountDelta <= 0) &&
    (latestPlayTimeDeltaSeconds == null || latestPlayTimeDeltaSeconds <= 0)
  ) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "lamp-updates-session-meta";

  if (latestKeyHitCountDelta != null && latestKeyHitCountDelta > 0) {
    const keyHits = document.createElement("div");
    keyHits.className = "lamp-updates-session-line";
    keyHits.textContent = `${localizeString("今回の打鍵回数")}: ${formatInteger(latestKeyHitCountDelta)}回`;
    wrapper.append(keyHits);
  }

  if (latestPlayTimeDeltaSeconds != null && latestPlayTimeDeltaSeconds > 0) {
    const playTime = document.createElement("div");
    playTime.className = "lamp-updates-session-line";
    playTime.textContent = `${localizeString("プレイ時間")}: ${formatDuration(latestPlayTimeDeltaSeconds)}`;
    wrapper.append(playTime);
  }

  return wrapper;
}

function appendLampImprovementMetric(container, text, kind, options = {}) {
  if (!container) {
    return;
  }

  container.append(createLampImprovementMetricElement(text, kind, options));
}

function createLampImprovementMetricElement(text, kind, options = {}) {
  const { dimmed = false } = options;
  const metric = document.createElement("span");
  metric.className = `lamp-improvement-metric lamp-improvement-metric-${kind}`;
  if (dimmed) {
    metric.classList.add("dimmed");
  }
  metric.textContent = text;
  return metric;
}

function createLampImprovementMetricSlot(part, defaultKind) {
  const slot = document.createElement("span");
  slot.className = `lamp-improvement-slot lamp-improvement-slot-${defaultKind}`;

  if (!part || !String(part.text ?? "").trim()) {
    slot.classList.add("is-empty");
    return slot;
  }

  slot.append(
    createLampImprovementMetricElement(part.text, part.kind || defaultKind, {
      dimmed: Boolean(part.dimmed),
    }),
  );
  return slot;
}

function createLampImprovementLampBadge(lamp) {
  const badge = document.createElement("span");
  const normalizedLamp = normalizeLampStatusForUi(lamp);
  badge.className = `lamp-badge lamp-${toLampSlug(normalizedLamp)}`;
  badge.textContent = lampLabels[normalizedLamp] || normalizedLamp;
  return badge;
}

function getLampImprovementDetailParts(item) {
  const parts = [];
  if (item.missCount == null) {
    parts.push({
      text: "BP NO Data",
      kind: "bp",
      dimmed: true,
    });
  } else if (item.previousMissCount != null && item.missCount < item.previousMissCount) {
    parts.push({
      text: `BP ${formatInteger(item.previousMissCount)}→${formatInteger(item.missCount)}`,
      kind: "bp",
    });
  } else {
    parts.push({
      text: `BP ${formatInteger(item.missCount)}`,
      kind: "bp",
    });
  }

  if ((item.updateKind === "score" || item.scoreUpdated) && (item.scoreRate != null || item.exScore != null)) {
    if (item.scoreRate != null) {
      const scoreTier = levelChartScoreLabels[classifyScoreTier({ ...item, lampStatus: item.currentLamp })] || classifyScoreTier({ ...item, lampStatus: item.currentLamp });
      parts.push({ text: scoreTier, kind: "tier" });
    }
    if (item.exScore != null) {
      const exText =
        item.updateKind === "score" && item.previousExScore != null && item.exScore > item.previousExScore
          ? `${formatInteger(item.previousExScore)}→${formatInteger(item.exScore)}`
          : formatInteger(item.exScore);
      parts.push({ text: exText, kind: "ex" });
    }
    if (item.scoreRate != null) {
      parts.push({ text: `${item.scoreRate.toFixed(2)}%`, kind: "rate" });
    }
  }
  return parts;
}

function getLampImprovementGroupKey(item) {
  if (item?.updateKind === "bp") {
    return "BP_UPDATE";
  }
  if (item?.updateKind === "score") {
    return "SCORE_UPDATE";
  }
  return normalizeLampStatusForUi(item?.currentLamp);
}

function getLampImprovementGroupDefs() {
  return [
    ...lampOptions.map((lamp) => ({
      key: lamp,
      title: `新規 ${lampLabels[lamp] || lamp}`,
      className: `lamp-improvement-group-${toLampSlug(lamp)}`,
    })),
    {
      key: "BP_UPDATE",
      title: "BP更新",
      className: "lamp-improvement-group-bp-update",
    },
    {
      key: "SCORE_UPDATE",
      title: "スコア更新",
      className: "lamp-improvement-group-score-update",
    },
  ];
}

async function exportLampUpdatesSnapshot({ improvements, keyHitCountDelta, playTimeDeltaSeconds, themeMode }) {
  const snapshotParts = createLampUpdatesSnapshotParts(Array.isArray(improvements) ? improvements : []);
  const totalParts = snapshotParts.length;
  const totalUpdateCount = Array.isArray(improvements) ? improvements.length : 0;
  const timestamp = new Date();

  if (hasDesktopImageSave()) {
    const savedPaths = [];
    for (let index = 0; index < snapshotParts.length; index += 1) {
      const dataUrl = renderLampUpdatesSnapshotDataUrl({
        improvements: snapshotParts[index],
        keyHitCountDelta,
        playTimeDeltaSeconds,
        themeMode,
        totalUpdateCount,
        snapshotPart: { index, total: totalParts },
      });
      assertPngDataUrl(dataUrl);
      const saved = await window.lr2irDesktop.saveImage({
        dataUrl,
        fileName: buildLampUpdatesSnapshotFileName(timestamp, { index, total: totalParts }),
        directoryPath: getScreenshotDirectoryPath(),
      });
      const savedPath = String(saved?.filePath ?? "").trim();
      if (savedPath) {
        savedPaths.push(savedPath);
      }
    }
    if (totalParts > 1) {
      return `${localizeString("画像を分割して保存しました。")} (${totalParts} files)`;
    }
    if (savedPaths[0]) {
      return `画像を保存しました: ${savedPaths[0]}`;
    }
    return "画像を保存しました。";
  }

  for (let index = 0; index < snapshotParts.length; index += 1) {
    const dataUrl = renderLampUpdatesSnapshotDataUrl({
      improvements: snapshotParts[index],
      keyHitCountDelta,
      playTimeDeltaSeconds,
      themeMode,
      totalUpdateCount,
      snapshotPart: { index, total: totalParts },
    });
    assertPngDataUrl(dataUrl);
    downloadDataUrl(dataUrl, buildLampUpdatesSnapshotFileName(timestamp, { index, total: totalParts }));
  }
  if (totalParts > 1) {
    return `${localizeString("画像を分割してダウンロードしました。")} (${totalParts} files)`;
  }
  return "画像をダウンロードしました。";
}

function hasDesktopImageSave() {
  return Boolean(window?.lr2irDesktop && typeof window.lr2irDesktop.saveImage === "function");
}

function getScreenshotDirectoryPath() {
  return screenshotDirPathInput?.value.trim() ?? "";
}

function createLampUpdatesSnapshotParts(improvements) {
  const sortedImprovements = [...(Array.isArray(improvements) ? improvements : [])].sort(compareLampImprovements);
  if (sortedImprovements.length <= LAMP_UPDATES_SNAPSHOT_MAX_ITEMS_PER_IMAGE) {
    return [sortedImprovements];
  }

  const parts = [];
  for (let index = 0; index < sortedImprovements.length; index += LAMP_UPDATES_SNAPSHOT_MAX_ITEMS_PER_IMAGE) {
    parts.push(sortedImprovements.slice(index, index + LAMP_UPDATES_SNAPSHOT_MAX_ITEMS_PER_IMAGE));
  }
  return parts;
}

function assertPngDataUrl(dataUrl) {
  if (typeof dataUrl === "string" && dataUrl.startsWith("data:image/png;base64,")) {
    return;
  }
  throw new Error("画像出力データの作成に失敗しました。");
}

function buildLampUpdatesSnapshotFileName(date = new Date(), partInfo = null) {
  const timestamp = formatSnapshotTimestamp(date);
  if (partInfo && partInfo.total > 1) {
    const width = String(partInfo.total).length;
    const partNumber = String(partInfo.index + 1).padStart(width, "0");
    return `L2TV_Today_${timestamp}_${partNumber}of${partInfo.total}.png`;
  }
  return `L2TV_Today_${timestamp}.png`;
}

async function exportTableSummarySnapshot({ table, charts, mode, themeMode }) {
  const dataUrl = renderTableSummarySnapshotDataUrl({
    table,
    charts: Array.isArray(charts) ? charts : [],
    mode,
    themeMode,
  });
  const fileName = buildTableSummarySnapshotFileName(table);

  if (hasDesktopImageSave()) {
    await window.lr2irDesktop.saveImage({
      dataUrl,
      fileName,
      directoryPath: getScreenshotDirectoryPath(),
    });
    return;
  }

  downloadDataUrl(dataUrl, fileName);
}

function buildTableSummarySnapshotFileName(table) {
  const safeSymbol = String(table?.symbol ?? table?.name ?? "Table")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 32);
  return `L2TV_Table_${safeSymbol || "Table"}_${formatSnapshotTimestamp(new Date())}.png`;
}

function formatSnapshotTimestamp(date) {
  const pad2 = (value) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
    `${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
  );
}

function downloadDataUrl(dataUrl, fileName) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function renderTableSummarySnapshotDataUrl({ table, charts, mode, themeMode }) {
  const normalizedTheme = normalizeThemeMode(themeMode);
  const normalizedMode = normalizeLevelChartMode(mode);
  const segmentDefs = getSnapshotLevelChartDefs(normalizedMode);
  const levelGroups = groupChartsForSnapshot(charts, table?.levelOrder ?? []);

  const metrics = {
    width: 1280,
    padding: 28,
    headerHeight: 58,
    gap: 18,
    leftWidth: 470,
    panelPadding: 20,
    rowHeight: 26,
    rowGap: 7,
    legendHeight: 48,
  };
  const rightWidth = metrics.width - metrics.padding * 2 - metrics.leftWidth - metrics.gap;
  const graphRowsHeight = Math.max(80, levelGroups.length * metrics.rowHeight + Math.max(0, levelGroups.length - 1) * metrics.rowGap);
  const lampRows = Math.ceil(lampOptions.length / 3);
  const scoreRows = Math.ceil(levelChartScoreOrder.length / 4);
  const lampCardHeight = 74;
  const lampCardGap = 12;
  const scoreCardHeight = 68;
  const scoreCardGap = 10;
  const lampStartY = metrics.panelPadding + 44;
  const scoreTitleY = lampStartY + lampRows * (lampCardHeight + lampCardGap) + 34;
  const scoreStartY = scoreTitleY + 42;
  const scoreCardsHeight = scoreRows * scoreCardHeight + Math.max(0, scoreRows - 1) * scoreCardGap;
  const leftPanelHeight = scoreStartY + scoreCardsHeight + metrics.panelPadding;
  const graphPanelHeight = metrics.panelPadding * 2 + 30 + metrics.legendHeight + graphRowsHeight;
  const panelHeight = Math.max(360, leftPanelHeight, graphPanelHeight);
  const height = metrics.padding + metrics.headerHeight + panelHeight + metrics.padding;

  const canvas = document.createElement("canvas");
  canvas.width = metrics.width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas初期化に失敗しました。");
  }

  const palette = getSummarySnapshotPalette(normalizedTheme);
  ctx.fillStyle = palette.page;
  ctx.fillRect(0, 0, metrics.width, height);

  const tableName = String(table?.name ?? localizeString("難易度表")).trim() || localizeString("難易度表");
  ctx.textBaseline = "top";
  ctx.font = "700 30px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textStrong;
  ctx.fillText("L2TV Table Summary", metrics.padding, metrics.padding);

  ctx.font = "600 17px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textMuted;
  const dateText = new Date().toLocaleString(getCurrentLocale());
  const dateWidth = ctx.measureText(dateText).width;
  ctx.fillText(dateText, metrics.width - metrics.padding - dateWidth, metrics.padding + 8);

  ctx.font = "600 18px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textMuted;
  const tableText = truncateTextForWidth(ctx, tableName, metrics.width - metrics.padding * 2, ctx.font);
  ctx.fillText(tableText, metrics.padding, metrics.padding + 36);

  const panelY = metrics.padding + metrics.headerHeight;
  const leftX = metrics.padding;
  const rightX = leftX + metrics.leftWidth + metrics.gap;
  drawRoundedRect(ctx, leftX, panelY, metrics.leftWidth, panelHeight, 16, palette.panelBg);
  drawRoundedRect(ctx, rightX, panelY, rightWidth, panelHeight, 16, palette.panelBg);

  drawSnapshotLampSummary(ctx, charts, {
    x: leftX,
    y: panelY,
    width: metrics.leftWidth,
    height: panelHeight,
    padding: metrics.panelPadding,
    palette,
  });

  drawSnapshotLevelGraph(ctx, levelGroups, segmentDefs, {
    x: rightX,
    y: panelY,
    width: rightWidth,
    height: panelHeight,
    padding: metrics.panelPadding,
    rowHeight: metrics.rowHeight,
    rowGap: metrics.rowGap,
    legendHeight: metrics.legendHeight,
    title: getLevelSummaryTitle(normalizedMode),
    palette,
  });

  return canvas.toDataURL("image/png");
}

function getSummarySnapshotPalette(themeMode) {
  if (themeMode === "lr2ir-dark") {
    return {
      page: "#0b1018",
      panelBg: "#111824",
      panelBorder: "#53617a",
      cardText: "#122033",
      textStrong: "#eef2ff",
      textMuted: "#b8c2d9",
    graphBarBg: "#edf2f8",
    graphBorder: "#667187",
    graphText: "#dce5f5",
    graphInsideText: "#101723",
    scoreCardText: "#122033",
  };
  }

  return {
    page: "#dff4ff",
    panelBg: "#f7fcff",
    panelBorder: "#9fd6f7",
    cardText: "#12324f",
    textStrong: "#12324f",
    textMuted: "#4f7393",
    graphBarBg: "#f7fcff",
    graphBorder: "#9fd6f7",
    graphText: "#12324f",
    graphInsideText: "#102033",
    scoreCardText: "#12324f",
  };
}

function drawSnapshotLampSummary(ctx, charts, metrics) {
  const { x, y, width, padding, palette } = metrics;
  ctx.font = "700 22px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textStrong;
  ctx.fillText(localizeString("ランプ内訳"), x + padding, y + padding);

  const columns = 3;
  const cardGap = 12;
  const cardWidth = (width - padding * 2 - cardGap * (columns - 1)) / columns;
  const cardHeight = 74;
  const startY = y + padding + 44;

  lampOptions.forEach((lamp, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const cardX = x + padding + column * (cardWidth + cardGap);
    const cardY = startY + row * (cardHeight + cardGap);
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 12, getSnapshotLampFill(ctx, lamp, cardX, cardY, cardWidth, cardHeight));
    ctx.fillStyle = getLampSnapshotCardTextColor(lamp, palette);
    ctx.font = "700 20px 'Segoe UI', 'Meiryo', sans-serif";
    const count = charts.filter((chart) => chart.lampStatus === lamp).length;
    ctx.fillText(formatInteger(count), cardX + 14, cardY + 14);
    ctx.font = "700 13px 'Segoe UI', 'Meiryo', sans-serif";
    ctx.fillText(lampLabels[lamp] || lamp, cardX + 14, cardY + 46);
  });

  const lampRows = Math.ceil(lampOptions.length / columns);
  const scoreTitleY = startY + lampRows * cardHeight + Math.max(0, lampRows - 1) * cardGap + 34;
  ctx.font = "700 22px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textStrong;
  ctx.fillText(localizeString("スコア内訳"), x + padding, scoreTitleY);

  const scoreColumns = 4;
  const scoreCardGap = 10;
  const scoreCardWidth = (width - padding * 2 - scoreCardGap * (scoreColumns - 1)) / scoreColumns;
  const scoreCardHeight = 68;
  const scoreStartY = scoreTitleY + 42;

  levelChartScoreOrder.forEach((tier, index) => {
    const row = Math.floor(index / scoreColumns);
    const column = index % scoreColumns;
    const cardX = x + padding + column * (scoreCardWidth + scoreCardGap);
    const cardY = scoreStartY + row * (scoreCardHeight + scoreCardGap);
    drawRoundedRect(ctx, cardX, cardY, scoreCardWidth, scoreCardHeight, 12, scoreSnapshotColors[tier] || "#ffffff");
    ctx.fillStyle = getScoreSnapshotCardTextColor(tier, palette);
    ctx.font = "700 19px 'Segoe UI', 'Meiryo', sans-serif";
    const count = charts.filter((chart) => classifyScoreTier(chart) === tier).length;
    ctx.fillText(formatInteger(count), cardX + 12, cardY + 13);
    ctx.font = "700 12px 'Segoe UI', 'Meiryo', sans-serif";
    ctx.fillText(levelChartScoreLabels[tier] || tier, cardX + 12, cardY + 43);
  });
}

function getLampSnapshotCardTextColor(lamp, palette) {
  return lamp === "NO SONG" ? "#f8fafc" : palette.cardText;
}

function getScoreSnapshotCardTextColor(tier, palette) {
  return tier === "NO_SONG" ? "#f2f8ff" : palette.scoreCardText;
}

function drawSnapshotLevelGraph(ctx, levelGroups, segmentDefs, metrics) {
  const { x, y, width, padding, rowHeight, rowGap, legendHeight, title, palette } = metrics;
  ctx.font = "700 22px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textStrong;
  ctx.fillText(title, x + padding, y + padding);

  let legendX = x + padding;
  const legendY = y + padding + 34;
  ctx.font = "600 13px 'Segoe UI', 'Meiryo', sans-serif";
  for (const def of segmentDefs) {
    drawRoundedRect(ctx, legendX, legendY + 5, 12, 12, 2, getSnapshotSegmentFill(ctx, def, legendX, legendY + 5, 12, 12));
    ctx.fillStyle = palette.textMuted;
    ctx.fillText(def.label, legendX + 18, legendY + 2);
    legendX += ctx.measureText(def.label).width + 42;
  }

  const labelWidth = 42;
  const totalWidth = 38;
  const barX = x + padding + labelWidth;
  const barWidth = width - padding * 2 - labelWidth - totalWidth - 10;
  let rowY = y + padding + 30 + legendHeight;

  for (const group of levelGroups) {
    ctx.font = "700 16px 'Segoe UI', 'Meiryo', sans-serif";
    ctx.fillStyle = palette.graphText;
    const labelWidthActual = ctx.measureText(group.level).width;
    ctx.fillText(group.level, x + padding + labelWidth - labelWidthActual - 8, rowY + 3);

    drawRoundedRect(ctx, barX, rowY, barWidth, rowHeight, 0, palette.graphBarBg);
    let cursorX = barX;
    for (const def of segmentDefs) {
      const count = group.charts.reduce((sum, chart) => sum + (def.matches(chart) ? 1 : 0), 0);
      if (!count) {
        continue;
      }
      const ratio = count / group.charts.length;
      const segmentWidth = Math.max(1, barWidth * ratio);
      ctx.fillStyle = getSnapshotSegmentFill(ctx, def, cursorX, rowY, segmentWidth, rowHeight);
      ctx.fillRect(cursorX, rowY, segmentWidth, rowHeight);
      if (ratio >= 0.08 && segmentWidth >= 42) {
        const percentage = formatPercent(ratio * 100);
        ctx.font = "700 12px 'Segoe UI', 'Meiryo', sans-serif";
        ctx.fillStyle = palette.graphInsideText;
        const textWidth = ctx.measureText(percentage).width;
        if (textWidth + 8 < segmentWidth) {
          ctx.fillText(percentage, cursorX + segmentWidth / 2 - textWidth / 2, rowY + 6);
        }
      }
      cursorX += segmentWidth;
    }
    ctx.strokeStyle = palette.graphBorder;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, rowY, barWidth, rowHeight);

    ctx.font = "600 14px 'Segoe UI', 'Meiryo', sans-serif";
    ctx.fillStyle = palette.textMuted;
    ctx.fillText(String(group.charts.length), barX + barWidth + 10, rowY + 4);
    rowY += rowHeight + rowGap;
  }
}

function getSnapshotLevelChartDefs(mode) {
  if (normalizeLevelChartMode(mode) === "score") {
    return levelChartScoreOrder.map((tier) => ({
      label: levelChartScoreLabels[tier],
      color: scoreSnapshotColors[tier],
      matches: (chart) => classifyScoreTier(chart) === tier,
    }));
  }

  return levelChartLampOrder.map((lamp) => ({
    label: toChartLampLabel(lamp),
    color: lampSnapshotColors[lamp],
    lamp,
    matches: (chart) => chart.lampStatus === lamp,
  }));
}

function getSnapshotLampFill(ctx, lamp, x, y, width, height) {
  if (lamp !== "FULL COMBO") {
    return lampSnapshotColors[lamp] || "#ffffff";
  }

  return createFcSnapshotGradient(ctx, x, y, width, height);
}

function getSnapshotSegmentFill(ctx, def, x, y, width, height) {
  if (def?.lamp === "FULL COMBO") {
    return createFcSnapshotGradient(ctx, x, y, width, height);
  }

  return def?.color || "#ffffff";
}

function createFcSnapshotGradient(ctx, x, y, width, height) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + Math.max(1, height));
  gradient.addColorStop(0, "#8ff5ff");
  gradient.addColorStop(0.52, "#fff2a8");
  gradient.addColorStop(1, "#b7f8ff");
  return gradient;
}

function groupChartsForSnapshot(charts, levelOrder) {
  const grouped = new Map();
  for (const chart of charts) {
    if (!grouped.has(chart.level)) {
      grouped.set(chart.level, []);
    }
    grouped.get(chart.level).push(chart);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => compareLevels(left, right, levelOrder))
    .map(([level, levelCharts]) => ({
      level,
      charts: levelCharts,
    }));
}

function renderLampUpdatesSnapshotDataUrl({
  improvements,
  keyHitCountDelta,
  playTimeDeltaSeconds,
  themeMode,
  totalUpdateCount = null,
  snapshotPart = null,
}) {
  const normalizedTheme = normalizeThemeMode(themeMode);
  const updateDateText = formatDateYmd(new Date());
  const sortedImprovements = [...(Array.isArray(improvements) ? improvements : [])].sort(compareLampImprovements);
  const groupedByLamp = new Map();
  for (const item of sortedImprovements) {
    const lamp = getLampImprovementGroupKey(item);
    if (!groupedByLamp.has(lamp)) {
      groupedByLamp.set(lamp, []);
    }
    groupedByLamp.get(lamp).push(item);
  }

  const groups = getLampImprovementGroupDefs()
    .map((groupDef) => ({
      ...groupDef,
      lamp: groupDef.key,
      items: groupedByLamp.get(groupDef.key) ?? [],
    }))
    .filter((group) => group.items.length > 0);

  const metrics = {
    width: 2048,
    paddingX: 42,
    paddingTop: 30,
    paddingBottom: 36,
    headerHeight: 42,
    metaHeight: 32,
    groupTopGap: 16,
    groupPaddingX: 14,
    groupPaddingTop: 12,
    groupPaddingBottom: 12,
    groupTitleHeight: 38,
    groupInnerGap: 8,
    rowHeight: 48,
    rowGap: 8,
    rowLevelWidth: 300,
    rowDetailWidth: 760,
    rowDateWidth: 150,
    rowColumnGap: 16,
    rowInnerPaddingX: 14,
  };

  const groupsHeight = groups.reduce((sum, group) => {
    return (
      sum +
      metrics.groupTopGap +
      metrics.groupPaddingTop +
      metrics.groupTitleHeight +
      metrics.groupInnerGap +
      group.items.length * metrics.rowHeight +
      Math.max(0, group.items.length - 1) * metrics.rowGap +
      metrics.groupPaddingBottom
    );
  }, 0);
  const emptyHeight = groups.length ? 0 : metrics.groupTopGap + 72;
  const height =
    metrics.paddingTop +
    metrics.headerHeight +
    metrics.metaHeight +
    groupsHeight +
    emptyHeight +
    metrics.paddingBottom;

  const scale = 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(metrics.width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas初期化に失敗しました。");
  }
  ctx.scale(scale, scale);

  const palette = getLampUpdatesSnapshotPalette(normalizedTheme);
  ctx.fillStyle = palette.page;
  ctx.fillRect(0, 0, metrics.width, height);

  let y = metrics.paddingTop;
  ctx.font = "700 34px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textStrong;
  ctx.textBaseline = "top";
  const snapshotTitle =
    snapshotPart && snapshotPart.total > 1
      ? `L2TV Lamp Updates (${snapshotPart.index + 1}/${snapshotPart.total})`
      : "L2TV Lamp Updates";
  ctx.fillText(snapshotTitle, metrics.paddingX, y);

  const timestampText = new Date().toLocaleString(getCurrentLocale());
  ctx.font = "600 18px 'Segoe UI', 'Meiryo', sans-serif";
  const timestampWidth = ctx.measureText(timestampText).width;
  ctx.fillStyle = palette.textMuted;
  ctx.fillText(timestampText, metrics.width - metrics.paddingX - timestampWidth, y + 8);

  y += metrics.headerHeight;

  const keyHitText =
    keyHitCountDelta != null && keyHitCountDelta > 0
      ? selectedLanguage === "en"
        ? formatInteger(keyHitCountDelta)
        : `${formatInteger(keyHitCountDelta)}回`
      : "NO Data";
  const playTimeText =
    playTimeDeltaSeconds != null && playTimeDeltaSeconds > 0 ? formatDuration(playTimeDeltaSeconds) : "NO Data";
  ctx.font = "700 20px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.textStrong;
  ctx.fillText(`${localizeString("今回の打鍵数")}: ${keyHitText}`, metrics.paddingX, y);
  ctx.fillText(`${localizeString("プレイ時間")}: ${playTimeText}`, metrics.paddingX + 350, y);
  const updateCountText = totalUpdateCount == null ? sortedImprovements.length : totalUpdateCount;
  ctx.fillText(`${localizeString("更新譜面数")}: ${formatInteger(updateCountText)}`, metrics.paddingX + 720, y);

  y += metrics.metaHeight;

  if (!groups.length) {
    y += metrics.groupTopGap;
    drawRoundedRect(ctx, metrics.paddingX, y, metrics.width - metrics.paddingX * 2, 72, 10, palette.groupNeutralBg);
    ctx.font = "600 20px 'Segoe UI', 'Meiryo', sans-serif";
    ctx.fillStyle = palette.textMuted;
    ctx.fillText(localizeString("更新データはありません。"), metrics.paddingX + 16, y + 22);
    return canvas.toDataURL("image/png");
  }

  for (const group of groups) {
    y += metrics.groupTopGap;
    const groupBodyHeight =
      metrics.groupPaddingTop +
      metrics.groupTitleHeight +
      metrics.groupInnerGap +
      group.items.length * metrics.rowHeight +
      Math.max(0, group.items.length - 1) * metrics.rowGap +
      metrics.groupPaddingBottom;

    const groupColor = getLampUpdatesSnapshotGroupColor(group.lamp, palette);
    drawRoundedRect(
      ctx,
      metrics.paddingX,
      y,
      metrics.width - metrics.paddingX * 2,
      groupBodyHeight,
      12,
      getLampUpdatesSnapshotFill(ctx, group.lamp, groupColor.groupBg, metrics.paddingX, y, metrics.width - metrics.paddingX * 2, groupBodyHeight),
    );

    drawRoundedRect(
      ctx,
      metrics.paddingX + metrics.groupPaddingX,
      y + metrics.groupPaddingTop,
      metrics.width - metrics.paddingX * 2 - metrics.groupPaddingX * 2,
      metrics.groupTitleHeight,
      8,
      getLampUpdatesSnapshotFill(
        ctx,
        group.lamp,
        groupColor.titleBg,
        metrics.paddingX + metrics.groupPaddingX,
        y + metrics.groupPaddingTop,
        metrics.width - metrics.paddingX * 2 - metrics.groupPaddingX * 2,
        metrics.groupTitleHeight,
      ),
    );
    ctx.font = "700 22px 'Segoe UI', 'Meiryo', sans-serif";
    ctx.fillStyle = palette.groupTitleText;
    const groupTitle = localizeString(group.title);
    const groupTitleWidth = ctx.measureText(groupTitle).width;
    ctx.fillText(groupTitle, metrics.width / 2 - groupTitleWidth / 2, y + metrics.groupPaddingTop + 5);

    let rowY = y + metrics.groupPaddingTop + metrics.groupTitleHeight + metrics.groupInnerGap;
    for (const item of group.items) {
      const rowX = metrics.paddingX + metrics.groupPaddingX;
      const rowWidth = metrics.width - metrics.paddingX * 2 - metrics.groupPaddingX * 2;
      drawRoundedRect(ctx, rowX, rowY, rowWidth, metrics.rowHeight, 7, palette.rowBg);

      const rowContentLeft = rowX + metrics.rowInnerPaddingX;
      const rowContentRight = rowX + rowWidth - metrics.rowInnerPaddingX;
      const levelX = rowContentLeft;
      const titleX = levelX + metrics.rowLevelWidth + metrics.rowColumnGap;

      ctx.font = "600 15px 'Segoe UI', 'Meiryo', sans-serif";
      const dateWidth = Math.max(metrics.rowDateWidth, Math.ceil(ctx.measureText(updateDateText).width) + 6);
      const dateX = rowContentRight - dateWidth;

      const detailWidth = Math.min(metrics.rowDetailWidth, Math.max(560, Math.floor(rowWidth * 0.4)));
      const detailRight = dateX - metrics.rowColumnGap;
      const detailX = Math.max(titleX + 120, detailRight - detailWidth);
      const detailMaxWidth = Math.max(0, detailRight - detailX);
      const rowCenterY = rowY + metrics.rowHeight / 2;

      const levelText = truncateTextForWidth(
        ctx,
        String(item.levelText ?? "-"),
        metrics.rowLevelWidth,
        "700 18px 'Segoe UI', 'Meiryo', sans-serif",
      );
      drawSnapshotLeftText(
        ctx,
        levelText,
        levelX,
        metrics.rowLevelWidth,
        rowCenterY,
        "700 18px 'Segoe UI', 'Meiryo', sans-serif",
        palette.levelText,
      );

      const detailGap = 12;
      const bpWidth = 132;
      const tierWidth = 76;
      const exWidth = 112;
      const rateWidth = 108;
      const transitionX = detailX;
      const transitionWidth = 150;
      const bpX = transitionX + transitionWidth + detailGap;
      const tierX = bpX + bpWidth + detailGap;
      const exX = tierX + tierWidth + detailGap;
      const rateX = exX + exWidth + detailGap;

      drawSnapshotLampTransition(
        ctx,
        transitionX,
        rowCenterY,
        transitionWidth,
        item.updateKind === "lamp" ? item.previousLamp : null,
        item.currentLamp,
        palette,
      );

      const bpText =
        item.missCount == null
          ? "BP NO Data"
          : item.previousMissCount != null && item.missCount < item.previousMissCount
            ? `BP ${formatInteger(item.previousMissCount)}→${formatInteger(item.missCount)}`
            : `BP ${formatInteger(item.missCount)}`;
      drawSnapshotColumnText(
        ctx,
        bpText,
        bpX,
        bpWidth,
        rowCenterY,
        "700 16px 'Segoe UI', 'Meiryo', sans-serif",
        item.missCount == null ? palette.dateText : palette.detailText,
      );

      const hasScoreUpdate =
        item.updateKind === "score" || Boolean(item.scoreUpdated && (item.scoreRate != null || item.exScore != null));
      const tierText =
        hasScoreUpdate && item.scoreRate != null
          ? levelChartScoreLabels[classifyScoreTier({ ...item, lampStatus: item.currentLamp })] || ""
          : "";
      const exText =
        hasScoreUpdate && item.exScore != null
          ? item.updateKind === "score" && item.previousExScore != null && item.exScore > item.previousExScore
            ? `${formatInteger(item.previousExScore)}→${formatInteger(item.exScore)}`
            : formatInteger(item.exScore)
          : "";
      const rateText = hasScoreUpdate && item.scoreRate != null ? `${item.scoreRate.toFixed(2)}%` : "";

      drawSnapshotCenterText(
        ctx,
        tierText,
        tierX,
        tierWidth,
        rowCenterY,
        "700 16px 'Segoe UI', 'Meiryo', sans-serif",
        palette.tierText,
      );
      drawSnapshotColumnText(
        ctx,
        exText,
        exX,
        exWidth,
        rowCenterY,
        "600 16px 'Segoe UI', 'Meiryo', sans-serif",
        palette.detailText,
      );
      drawSnapshotColumnText(
        ctx,
        rateText,
        rateX,
        rateWidth,
        rowCenterY,
        "600 16px 'Segoe UI', 'Meiryo', sans-serif",
        palette.detailText,
      );

      drawSnapshotColumnText(
        ctx,
        updateDateText,
        dateX,
        dateWidth,
        rowCenterY,
        "600 15px 'Segoe UI', 'Meiryo', sans-serif",
        palette.dateText,
      );

      const titleMaxWidth = Math.max(120, detailX - metrics.rowColumnGap - titleX);
      const titleText = truncateTextForWidth(
        ctx,
        String(item.title ?? "タイトル不明"),
        titleMaxWidth,
        "600 19px 'Segoe UI', 'Meiryo', sans-serif",
      );
      drawSnapshotLeftText(
        ctx,
        titleText,
        titleX,
        titleMaxWidth,
        rowCenterY,
        "600 19px 'Segoe UI', 'Meiryo', sans-serif",
        palette.titleText,
      );

      rowY += metrics.rowHeight + metrics.rowGap;
    }

    y += groupBodyHeight;
  }

  return canvas.toDataURL("image/png");
}

function getLampUpdatesSnapshotPalette(themeMode) {
  if (themeMode === "lr2ir-dark") {
    return {
      page: "#0b1018",
      textStrong: "#eef2ff",
      textMuted: "#aeb8d0",
      groupTitleText: "#0f1826",
      groupNeutralBg: "#172234",
      rowBg: "#f2f4f8",
      levelText: "#111722",
      titleText: "#111722",
      detailText: "#33405a",
      dateText: "#4d5f7e",
      tierText: "#ab7b28",
      fcBg: "#fff7c6",
      fcTitle: "#9df2f5",
      hcBg: "#ffe1e4",
      hcTitle: "#ffb9c1",
      ncBg: "#e0f2ff",
      ncTitle: "#b7dbff",
      ecBg: "#dff8e6",
      ecTitle: "#b8edca",
      bpBg: "#ece5ff",
      bpTitle: "#d7c8ff",
      scoreUpdateBg: "#fff4d8",
      scoreUpdateTitle: "#ffe08a",
    };
  }

  return {
    page: "#f3fbff",
    textStrong: "#123453",
    textMuted: "#4f7190",
    groupTitleText: "#23374f",
    groupNeutralBg: "#e2f0f8",
    rowBg: "#ffffff",
    levelText: "#163450",
    titleText: "#163450",
    detailText: "#466280",
    dateText: "#617c9e",
    tierText: "#ab7b28",
    fcBg: "#fff9d7",
    fcTitle: "#b7f7f7",
    hcBg: "#ffe7ea",
    hcTitle: "#ffc4cc",
    ncBg: "#e8f4ff",
    ncTitle: "#c8e2ff",
    ecBg: "#e8fbee",
    ecTitle: "#c8f4d6",
    bpBg: "#f0eaff",
    bpTitle: "#d9ccff",
    scoreUpdateBg: "#fff7df",
    scoreUpdateTitle: "#ffe69a",
  };
}

function getLampUpdatesSnapshotGroupColor(lamp, palette) {
  switch (lamp) {
    case "FULL COMBO":
      return { groupBg: palette.fcBg, titleBg: palette.fcTitle };
    case "HARD CLEAR":
      return { groupBg: palette.hcBg, titleBg: palette.hcTitle };
    case "CLEAR":
      return { groupBg: palette.ncBg, titleBg: palette.ncTitle };
    case "EASY CLEAR":
      return { groupBg: palette.ecBg, titleBg: palette.ecTitle };
    case "BP_UPDATE":
      return { groupBg: palette.bpBg, titleBg: palette.bpTitle };
    case "SCORE_UPDATE":
      return { groupBg: palette.scoreUpdateBg, titleBg: palette.scoreUpdateTitle };
    default:
      return { groupBg: palette.groupNeutralBg, titleBg: palette.groupNeutralBg };
  }
}

function getLampUpdatesSnapshotFill(ctx, lamp, fallback, x, y, width, height) {
  if (lamp === "FULL COMBO") {
    return createFcSnapshotGradient(ctx, x, y, width, height);
  }

  return fallback;
}

function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  const resolvedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + resolvedRadius, y);
  ctx.lineTo(x + width - resolvedRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + resolvedRadius);
  ctx.lineTo(x + width, y + height - resolvedRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - resolvedRadius, y + height);
  ctx.lineTo(x + resolvedRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - resolvedRadius);
  ctx.lineTo(x, y + resolvedRadius);
  ctx.quadraticCurveTo(x, y, x + resolvedRadius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function drawSnapshotLampBadge(ctx, x, y, lamp) {
  const normalizedLamp = normalizeLampStatusForUi(lamp);
  const label = lampLabels[normalizedLamp] || normalizedLamp;
  const colors = getSnapshotLampBadgeColors(normalizedLamp);
  ctx.font = "700 13px 'Segoe UI', 'Meiryo', sans-serif";
  const textWidth = ctx.measureText(label).width;
  const width = Math.ceil(textWidth + 16);
  const height = 20;
  const fill = normalizedLamp === "FULL COMBO" ? createFcSnapshotGradient(ctx, x, y, width, height) : colors.bg;
  drawRoundedRect(ctx, x, y, width, height, 10, fill);
  const previousBaseline = ctx.textBaseline;
  ctx.fillStyle = colors.text;
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 8, y + height / 2 + 0.5);
  ctx.textBaseline = previousBaseline;
  return x + width;
}

function drawSnapshotLampTransition(ctx, x, centerY, maxWidth, previousLamp, currentLamp, palette) {
  if (maxWidth <= 0) {
    return;
  }

  const left = x;
  const right = x + maxWidth;
  const badgeHeight = 20;
  const badgeY = Math.round(centerY - badgeHeight / 2);
  let cursorX = left;

  if (!String(previousLamp ?? "").trim() || normalizeLampStatusForUi(previousLamp) === normalizeLampStatusForUi(currentLamp)) {
    drawSnapshotLampBadge(ctx, cursorX, badgeY, currentLamp);
    return;
  }

  cursorX = drawSnapshotLampBadge(ctx, cursorX, badgeY, previousLamp);
  if (cursorX + 18 >= right) {
    return;
  }

  const previousBaseline = ctx.textBaseline;
  ctx.font = "700 15px 'Segoe UI', 'Meiryo', sans-serif";
  ctx.fillStyle = palette.detailText;
  ctx.textBaseline = "middle";
  ctx.fillText("→", cursorX + 5, centerY + 0.5);
  ctx.textBaseline = previousBaseline;
  cursorX += 20;
  if (cursorX + 36 >= right) {
    return;
  }

  drawSnapshotLampBadge(ctx, cursorX, badgeY, currentLamp);
}

function drawSnapshotColumnText(ctx, text, x, width, centerY, font, color) {
  const value = String(text ?? "").trim();
  if (!value || width <= 0) {
    return;
  }

  const rendered = truncateTextForWidth(ctx, value, width, font);
  const previousBaseline = ctx.textBaseline;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  const measured = ctx.measureText(rendered).width;
  const drawX = x + Math.max(0, width - measured);
  ctx.fillText(rendered, drawX, centerY + 0.5);
  ctx.textBaseline = previousBaseline;
}

function drawSnapshotCenterText(ctx, text, x, width, centerY, font, color) {
  const value = String(text ?? "").trim();
  if (!value || width <= 0) {
    return;
  }

  const rendered = truncateTextForWidth(ctx, value, width, font);
  const previousBaseline = ctx.textBaseline;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  const measured = ctx.measureText(rendered).width;
  const drawX = x + Math.max(0, (width - measured) / 2);
  ctx.fillText(rendered, drawX, centerY + 0.5);
  ctx.textBaseline = previousBaseline;
}

function drawSnapshotLeftText(ctx, text, x, width, centerY, font, color) {
  const value = String(text ?? "").trim();
  if (!value || width <= 0) {
    return;
  }

  const rendered = truncateTextForWidth(ctx, value, width, font);
  const previousBaseline = ctx.textBaseline;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(rendered, x, centerY + 0.5);
  ctx.textBaseline = previousBaseline;
}

function getSnapshotLampBadgeColors(lamp) {
  switch (lamp) {
    case "FULL COMBO":
      return { bg: "#fff0a3", text: "#2f2a05" };
    case "HARD CLEAR":
      return { bg: "#ff9ca4", text: "#38141a" };
    case "CLEAR":
      return { bg: "#5aa1ff", text: "#081d36" };
    case "EASY CLEAR":
      return { bg: "#7ee7a1", text: "#092818" };
    case "FAILED":
      return { bg: "#9aa4b6", text: "#101824" };
    default:
      return { bg: "#e8e8ea", text: "#1a1b1d" };
  }
}

function truncateTextForWidth(ctx, text, maxWidth, font) {
  const value = String(text ?? "");
  if (!value || maxWidth <= 0) {
    return "";
  }
  const previousFont = ctx.font;
  if (font) {
    ctx.font = font;
  }

  if (ctx.measureText(value).width <= maxWidth) {
    if (font) {
      ctx.font = previousFont;
    }
    return value;
  }

  const suffix = "…";
  let end = value.length;
  while (end > 0) {
    const candidate = `${value.slice(0, end)}${suffix}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      if (font) {
        ctx.font = previousFont;
      }
      return candidate;
    }
    end -= 1;
  }

  if (font) {
    ctx.font = previousFont;
  }
  return suffix;
}

function renderTableSection(table, filteredCharts) {
  const fragment = tableSectionTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".table-section");

  const tableName = root.querySelector(".table-name");
  const tableNameToggle = root.querySelector(".table-name-toggle");
  const tableInfoPanel = root.querySelector(".table-info-panel");
  const tableStateKey = buildTableInfoStateKey(table);
  const isOpen = Boolean(tableInfoPanelOpenState.get(tableStateKey));
  setUntranslatedText(tableName, table.name);
  tableInfoPanel.classList.toggle("hidden", !isOpen);
  tableNameToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

  if (tableNameToggle && tableInfoPanel) {
    tableNameToggle.addEventListener("click", () => {
      const nextOpen = tableInfoPanel.classList.contains("hidden");
      tableInfoPanel.classList.toggle("hidden", !nextOpen);
      tableNameToggle.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      tableInfoPanelOpenState.set(tableStateKey, nextOpen);
    });
  }

  const tableLink = root.querySelector(".table-link");
  tableLink.href = table.sourceUrl;

  const metricStrip = root.querySelector(".metric-strip");
  const metricCards = [
    createMetricCard("総譜面数", String(table.stats.totalCharts), ""),
    createMetricCard("クリア率", formatPercent(table.stats.clearRate), ""),
    createMetricCard("プレイ率", formatPercent(table.stats.playedRate), ""),
  ];
  metricStrip.append(...metricCards);

  const lampSummary = root.querySelector(".lamp-summary");
  for (const lamp of lampOptions) {
    const count = filteredCharts.filter((chart) => chart.lampStatus === lamp).length;
    lampSummary.append(createLampPill(lamp, count));
  }

  const scoreSummary = root.querySelector(".score-summary");
  if (scoreSummary) {
    for (const tier of levelChartScoreOrder) {
      const count = filteredCharts.filter((chart) => classifyScoreTier(chart) === tier).length;
      scoreSummary.append(createScorePill(tier, count));
    }
  }

  const levelSummaryTitle = root.querySelector(".level-summary-title");
  if (levelSummaryTitle) {
    levelSummaryTitle.textContent = getLevelSummaryTitle(levelChartMode);
  }

  const levelSummary = root.querySelector(".level-summary");
  levelSummary.append(renderLevelChart(table, filteredCharts, levelChartMode));

  const summaryGrid = root.querySelector(".summary-grid");
  if (summaryGrid) {
    const summaryActions = document.createElement("div");
    summaryActions.className = "summary-export-actions";
    const exportSummaryButton = document.createElement("button");
    exportSummaryButton.type = "button";
    exportSummaryButton.className = "button-secondary summary-export-button";
    setLocalizedText(exportSummaryButton, "この画面を画像出力");
    exportSummaryButton.addEventListener("click", async () => {
      exportSummaryButton.disabled = true;
      setLocalizedText(exportSummaryButton, "出力中…");
      showExportMessage("出力中…", { closable: false });
      try {
        await exportTableSummarySnapshot({
          table,
          charts: filteredCharts,
          mode: levelChartMode,
          themeMode: selectedThemeMode,
        });
        showExportMessage("スクショ保存完了！");
      } catch (error) {
        showExportMessage(error instanceof Error ? error.message : "画像出力に失敗しました。");
      } finally {
        exportSummaryButton.disabled = false;
        setLocalizedText(exportSummaryButton, "この画面を画像出力");
      }
    });
    summaryActions.append(exportSummaryButton);
    summaryGrid.before(summaryActions);
  }

  const chartDetails = root.querySelector(".chart-details");
  const chartDetailsSummary = root.querySelector(".chart-details summary");
  chartDetails.open = Boolean(chartDetailsOpenState.get(tableStateKey));
  let chartPanelRendered = false;

  const mountChartListPanel = () => {
    if (chartPanelRendered) {
      return;
    }
    const chartTableWrap = root.querySelector(".chart-table-wrap");
    if (!chartTableWrap) {
      return;
    }
    chartTableWrap.replaceWith(createChartListPanel(table, filteredCharts, chartDetailsSummary));
    chartPanelRendered = true;
  };

  const unmountChartListPanel = () => {
    if (!chartPanelRendered) {
      return;
    }
    const existingPanel = root.querySelector(".chart-list-panel");
    if (!existingPanel) {
      chartPanelRendered = false;
      return;
    }
    const placeholder = document.createElement("div");
    placeholder.className = "chart-table-wrap";
    existingPanel.replaceWith(placeholder);
    chartPanelRendered = false;
  };

  if (chartDetails.open) {
    mountChartListPanel();
  }
  chartDetails.addEventListener("toggle", () => {
    chartDetailsOpenState.set(tableStateKey, Boolean(chartDetails.open));
    if (chartDetails.open) {
      mountChartListPanel();
      return;
    }
    unmountChartListPanel();
  });

  return fragment;
}

function renderLevelChart(table, filteredCharts, mode = "lamp") {
  const grouped = new Map();

  for (const chart of filteredCharts) {
    if (!grouped.has(chart.level)) {
      grouped.set(chart.level, []);
    }
    grouped.get(chart.level).push(chart);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "level-chart";
  wrapper.addEventListener("mouseleave", () => {
    hideFloatingTooltip();
  });

  if (!grouped.size) {
    const empty = document.createElement("div");
    empty.className = "dimmed";
    empty.textContent = "条件に一致する譜面はありません。";
    wrapper.append(empty);
    return wrapper;
  }

  const normalizedMode = normalizeLevelChartMode(mode);
  const segmentDefs = normalizedMode === "score" ? buildScoreChartDefs() : buildLampChartDefs(filteredCharts);

  const legend = document.createElement("div");
  legend.className = "chart-legend";
  for (const def of segmentDefs) {
    const item = document.createElement("div");
    item.className = "chart-legend-item";
    item.innerHTML =
      `<span class="chart-legend-swatch ${def.segmentClass}"></span>` +
      `<span>${escapeHtml(def.label)}</span>`;
    legend.append(item);
  }

  const rows = document.createElement("div");
  rows.className = "level-chart-rows";
  const sortedLevels = [...grouped.keys()].sort((left, right) => compareLevels(left, right, table.levelOrder));

  for (const level of sortedLevels) {
    const charts = grouped.get(level);
    const row = document.createElement("div");
    row.className = "level-chart-row";

    const label = document.createElement("div");
    label.className = "level-chart-label";
    label.textContent = level;

    const bar = document.createElement("div");
    bar.className = "level-chart-bar";

    for (const def of segmentDefs) {
      const count = charts.reduce((sum, chart) => sum + (def.matches(chart) ? 1 : 0), 0);
      if (!count) {
        continue;
      }

      const ratio = count / charts.length;
      const segment = document.createElement("div");
      segment.className = `level-chart-segment ${def.segmentClass}`;
      segment.style.width = `${ratio * 100}%`;
      const tooltipText = `${def.label}: ${count} (${formatPercent(ratio * 100)})`;
      if (ratio >= 0.08) {
        const percentage = document.createElement("span");
        percentage.className = "level-chart-segment-label";
        percentage.textContent = formatPercent(ratio * 100);
        segment.append(percentage);
      }
      segment.addEventListener("mouseenter", (event) => {
        showFloatingTooltip(tooltipText, event);
      });
      segment.addEventListener("mousemove", (event) => {
        showFloatingTooltip(tooltipText, event);
      });
      segment.addEventListener("mouseleave", () => {
        hideFloatingTooltip();
      });
      bar.append(segment);
    }

    const total = document.createElement("div");
    total.className = "level-chart-total";
    total.textContent = `${charts.length}`;

    row.append(label, bar, total);
    rows.append(row);
  }

  wrapper.append(legend, rows);
  return wrapper;
}

function buildLampChartDefs(filteredCharts) {
  return levelChartLampOrder.map((lamp) => ({
    label: toChartLampLabel(lamp),
    segmentClass: `segment-${toLampSlug(lamp)}`,
    matches: (chart) => chart.lampStatus === lamp,
  }));
}

function buildScoreChartDefs() {
  return levelChartScoreOrder.map((tier) => ({
    label: levelChartScoreLabels[tier],
    segmentClass: `segment-score-${toScoreTierSlug(tier)}`,
    matches: (chart) => classifyScoreTier(chart) === tier,
  }));
}

function createChartListPanel(table, charts, summaryElement) {
  const panel = document.createElement("div");
  panel.className = "chart-list-panel";
  const tableStateKey = buildTableInfoStateKey(table);
  const savedListState = chartListStateByTable.get(tableStateKey) ?? {};

  const toolbar = document.createElement("div");
  toolbar.className = "chart-list-toolbar";

  const filterGrid = document.createElement("div");
  filterGrid.className = "chart-list-filters";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.placeholder = "曲名 / アーティスト / EX / Rate / プレイ回数";
  searchInput.value = savedListState.query ?? "";

  const lampSelect = document.createElement("select");
  lampSelect.innerHTML = '<option value="">すべて</option>';
  for (const lamp of lampOptions) {
    const option = document.createElement("option");
    option.value = lamp;
    option.textContent = lampLabels[lamp];
    lampSelect.append(option);
  }
  lampSelect.value = savedListState.lamp ?? "";

  const levelSelect = document.createElement("select");
  levelSelect.innerHTML = '<option value="">すべて</option>';
  const levels = [...new Set(charts.map((chart) => chart.level))].sort((left, right) =>
    compareLevels(left, right, table.levelOrder),
  );
  for (const level of levels) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level;
    levelSelect.append(option);
  }
  levelSelect.value = levels.includes(savedListState.level) ? savedListState.level : "";

  filterGrid.append(
    createChartListField("検索", searchInput),
    createChartListField("Lamp", lampSelect),
    createChartListField("Level", levelSelect),
  );

  const content = document.createElement("div");
  content.className = "chart-list-content";
  const savedOpenLevels = chartListOpenLevelsState.get(tableStateKey);

  const state = {
    query: searchInput.value.trim().toLowerCase(),
    lamp: lampSelect.value,
    level: levelSelect.value,
    sortKey: normalizeChartSortKey(savedListState.sortKey),
    sortDirection: savedListState.sortDirection ?? "asc",
    openLevels: savedOpenLevels instanceof Set ? new Set(savedOpenLevels) : new Set(),
  };

  const saveState = () => {
    chartListStateByTable.set(tableStateKey, {
      query: state.query,
      lamp: state.lamp,
      level: state.level,
      sortKey: state.sortKey,
      sortDirection: state.sortDirection,
    });
  };

  const update = () => {
    saveState();
    const visibleCharts = charts.filter((chart) =>
      chartMatchesChartListFilters(chart, state.query, state.lamp, state.level),
    );

    updateChartListSummary(summaryElement);

    content.innerHTML = "";

    if (!visibleCharts.length) {
      const empty = document.createElement("div");
      empty.className = "chart-list-empty dimmed";
      empty.textContent = "条件に一致する譜面はありません。";
      content.append(empty);
      translateApp(content);
      return;
    }

    content.append(renderGroupedChartTables(table, visibleCharts, state, update));
    translateApp(content);
  };

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value.trim().toLowerCase();
    saveState();
    update();
  });

  lampSelect.addEventListener("change", () => {
    state.lamp = lampSelect.value;
    saveState();
    update();
  });

  levelSelect.addEventListener("change", () => {
    state.level = levelSelect.value;
    if (state.level) {
      state.openLevels.add(state.level);
    }
    saveState();
    chartListOpenLevelsState.set(tableStateKey, new Set(state.openLevels));
    update();
  });

  toolbar.append(filterGrid);
  panel.append(toolbar, content);

  update();
  translateApp(panel);
  return panel;
}

function createChartListField(label, control) {
  const field = document.createElement("label");
  field.className = "field chart-list-field";

  const labelText = document.createElement("span");
  labelText.textContent = label;

  field.append(labelText, control);
  return field;
}

function renderGroupedChartTables(table, charts, state, rerender) {
  const wrapper = document.createElement("div");
  wrapper.className = "level-group-list";

  const chartGroups = new Map();
  for (const chart of charts) {
    if (!chartGroups.has(chart.level)) {
      chartGroups.set(chart.level, []);
    }
    chartGroups.get(chart.level).push(chart);
  }

  const groupedLevels = [...chartGroups.keys()].sort((left, right) => {
    const compared = compareLevels(left, right, table.levelOrder);
    return state.sortKey === "level" && state.sortDirection === "desc" ? -compared : compared;
  });

  for (const level of groupedLevels) {
    const levelCharts = chartGroups.get(level);
    const group = document.createElement("details");
    group.className = "level-group";
    const groupLampTone = getLevelGroupLampTone(levelCharts);
    if (groupLampTone) {
      group.classList.add(`level-group-${groupLampTone}`);
    }
    group.open = state.level ? state.level === level : state.openLevels.has(level);

    const summary = document.createElement("summary");
    summary.className = "level-group-summary";

    const groupName = document.createElement("span");
    groupName.className = "level-group-name";
    groupName.textContent = formatLevelWithSymbol(level, table.symbol);

    const graph = createLevelGroupGraph(levelCharts, levelChartMode);

    const groupCount = document.createElement("span");
    groupCount.className = "level-group-count";
    groupCount.textContent = `${levelCharts.length}譜面`;

    summary.append(groupName, graph, groupCount);

    const sortedCharts = sortChartsForList(levelCharts, table, {
      ...state,
      sortKey: state.sortKey === "level" ? "title" : state.sortKey,
      sortDirection: state.sortKey === "level" ? "asc" : state.sortDirection,
    });

    const groupContent = document.createElement("div");
    groupContent.className = "level-group-content";

    const renderGroupContent = () => {
      if (groupContent.childElementCount > 0) {
        return;
      }
      groupContent.append(renderChartTable(sortedCharts, table, state, rerender));
      translateApp(groupContent);
    };

    if (group.open) {
      renderGroupContent();
      showLevelGroupFloatingCloseButton(group, level, table, state);
    }

    group.addEventListener("toggle", () => {
      if (group.open) {
        state.openLevels.add(level);
        renderGroupContent();
        showLevelGroupFloatingCloseButton(group, level, table, state);
      } else {
        state.openLevels.delete(level);
        groupContent.innerHTML = "";
        hideLevelGroupFloatingCloseButton(group);
      }
      chartListOpenLevelsState.set(buildTableInfoStateKey(table), new Set(state.openLevels));
    });

    group.addEventListener("mouseenter", () => {
      if (group.open) {
        showLevelGroupFloatingCloseButton(group, level, table, state);
      }
    });

    group.addEventListener("focusin", () => {
      if (group.open) {
        showLevelGroupFloatingCloseButton(group, level, table, state);
      }
    });

    group.append(summary, groupContent);
    wrapper.append(group);
  }

  return wrapper;
}

function getLevelGroupLampTone(charts) {
  const lamps = (Array.isArray(charts) ? charts : []).map((chart) => normalizeLampStatusForUi(chart?.lampStatus));
  if (lamps.length === 0) {
    return "";
  }
  if (lamps.every((lamp) => lamp === "FULL COMBO")) {
    return "full-combo";
  }
  if (lamps.every((lamp) => lamp === "FULL COMBO" || lamp === "HARD CLEAR")) {
    return "hard-clear";
  }
  return "";
}

function showLevelGroupFloatingCloseButton(group, level, table, state) {
  if (!activeLevelGroupCloseButton) {
    activeLevelGroupCloseButton = document.createElement("button");
    activeLevelGroupCloseButton.type = "button";
    activeLevelGroupCloseButton.className = "button-secondary level-group-floating-close-button";
    document.body.append(activeLevelGroupCloseButton);
  }

  activeLevelGroupCloseTarget = group;
  activeLevelGroupCloseButton.textContent = `${formatLevelWithSymbol(level, table.symbol)} Folder Close`;
  activeLevelGroupCloseButton.onclick = () => {
    state.openLevels.delete(level);
    chartListOpenLevelsState.set(buildTableInfoStateKey(table), new Set(state.openLevels));
    group.open = false;
    hideLevelGroupFloatingCloseButton(group);
  };

  showLevelGroupOptionButton(group);
}

function hideLevelGroupFloatingCloseButton(group = null) {
  if (group && activeLevelGroupCloseTarget !== group) {
    return;
  }
  activeLevelGroupCloseButton?.remove();
  activeLevelGroupCloseButton = null;
  activeLevelGroupCloseTarget = null;
  floatingChartHeaderRequested = false;
  hideLevelGroupOptionButton();
  hideFloatingChartHeader();
}

function initializeFloatingChartHeader() {
  window.addEventListener("scroll", updateLevelGroupFloatingControls, { passive: true });
  window.addEventListener("resize", updateLevelGroupFloatingControls);
}

function getFloatingChartHeaderTop() {
  return 112;
}

function updateLevelGroupFloatingControls() {
  const top = getFloatingChartHeaderTop();
  const groups = [...document.querySelectorAll(".level-group[open]")];
  const activeGroup = groups.find((group) => {
    const rect = group.getBoundingClientRect();
    return rect.top < top && rect.bottom > top + 100;
  });

  if (!activeGroup) {
    floatingChartHeaderRequested = false;
    hideLevelGroupOptionButton();
    hideFloatingChartHeader();
    return;
  }

  showLevelGroupOptionButton(activeGroup);
  if (floatingChartHeaderSource && !activeGroup.contains(floatingChartHeaderSource)) {
    hideFloatingChartHeader();
  }
  if (floatingChartHeaderRequested && !floatingChartHeader) {
    const table = activeGroup.querySelector(".chart-table");
    if (table) {
      showFloatingChartHeader(table);
    }
  }
}

function showLevelGroupOptionButton(group) {
  if (!activeLevelGroupOptionButton) {
    activeLevelGroupOptionButton = document.createElement("button");
    activeLevelGroupOptionButton.type = "button";
    activeLevelGroupOptionButton.className = "button-secondary level-group-option-button";
    document.body.append(activeLevelGroupOptionButton);
  }

  activeLevelGroupOptionButton.textContent = floatingChartHeaderRequested ? "Option Close" : "Folder Option";
  activeLevelGroupOptionButton.onclick = () => {
    const table = group.querySelector(".chart-table");
    if (!table) {
      return;
    }
    if (floatingChartHeaderRequested && floatingChartHeaderSource === table) {
      floatingChartHeaderRequested = false;
      hideFloatingChartHeader();
    } else {
      floatingChartHeaderRequested = true;
      showFloatingChartHeader(table);
    }
    activeLevelGroupOptionButton.textContent = floatingChartHeaderRequested ? "Option Close" : "Folder Option";
  };
}

function hideLevelGroupOptionButton() {
  activeLevelGroupOptionButton?.remove();
  activeLevelGroupOptionButton = null;
}

function showFloatingChartHeader(table) {
  const meta = table.__l2tvFloatingHeader;
  const group = table.closest(".level-group");
  const summary = group?.querySelector(".level-group-summary");
  if (!meta || !summary) {
    hideFloatingChartHeader();
    return;
  }

  if (!floatingChartHeader) {
    floatingChartHeader = document.createElement("div");
    floatingChartHeader.className = "floating-chart-header";
    document.body.append(floatingChartHeader);
  }

  if (floatingChartHeaderSource === table) {
    return;
  }

  floatingChartHeaderSource = table;
  floatingChartHeader.innerHTML = "";

  const summaryClone = summary.cloneNode(true);
  summaryClone.classList.add("floating-chart-header-summary");

  const columnRow = document.createElement("div");
  columnRow.className = "floating-chart-header-columns";
  for (const column of chartSortColumns.filter((column) => column.key !== "level")) {
    const cell = document.createElement("div");
    cell.className = "floating-chart-header-cell";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sort-button";
    button.classList.toggle("is-active", meta.state.sortKey === column.key);
    button.innerHTML =
      `<span>${escapeHtml(column.label)}</span>` +
      `<span class="sort-indicator">${getSortIndicator(column.key, meta.state)}</span>`;
    button.addEventListener("click", () => {
      if (meta.state.sortKey === column.key) {
        meta.state.sortDirection = meta.state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        meta.state.sortKey = column.key;
        meta.state.sortDirection = "asc";
      }
      chartListStateByTable.set(buildTableInfoStateKey(meta.tableInfo), {
        query: meta.state.query,
        lamp: meta.state.lamp,
        level: meta.state.level,
        sortKey: meta.state.sortKey,
        sortDirection: meta.state.sortDirection,
      });
      meta.rerender();
      window.requestAnimationFrame(() => {
        if (floatingChartHeaderRequested) {
          updateLevelGroupFloatingControls();
        }
      });
    });
    cell.append(button);
    columnRow.append(cell);
  }

  floatingChartHeader.append(summaryClone, columnRow);
  translateApp(floatingChartHeader);
}

function hideFloatingChartHeader() {
  floatingChartHeader?.remove();
  floatingChartHeader = null;
  floatingChartHeaderSource = null;
  if (activeLevelGroupOptionButton) {
    activeLevelGroupOptionButton.textContent = floatingChartHeaderRequested ? "Option Close" : "Folder Option";
  }
}

function renderChartTable(charts, tableInfo, state, rerender) {
  const table = document.createElement("table");
  table.className = "chart-table";
  table.__l2tvFloatingHeader = { tableInfo, state, rerender };

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const column of chartSortColumns) {
    const th = document.createElement("th");
    if (column.key === "level") {
      th.textContent = column.label;
      headRow.append(th);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sort-button";
    button.classList.toggle("is-active", state.sortKey === column.key);
    button.innerHTML =
      `<span>${escapeHtml(column.label)}</span>` +
      `<span class="sort-indicator">${getSortIndicator(column.key, state)}</span>`;
    button.addEventListener("click", () => {
      if (state.sortKey === column.key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = column.key;
        state.sortDirection = "asc";
      }
      chartListStateByTable.set(buildTableInfoStateKey(tableInfo), {
        query: state.query,
        lamp: state.lamp,
        level: state.level,
        sortKey: state.sortKey,
        sortDirection: state.sortDirection,
      });
      rerender();
    });
    th.append(button);
    headRow.append(th);
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");

  if (!charts.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="${chartSortColumns.length}" class="dimmed">条件に一致する譜面はありません。</td>`;
    tbody.append(row);
    table.append(tbody);
    return table;
  }

  for (const chart of charts) {
    const row = document.createElement("tr");
    const lampClass = `lamp-${chart.lampStatus.toLowerCase().replace(/\s+/g, "-")}`;
    row.className = lampClass;

    const levelCell = document.createElement("td");
    levelCell.className = "chart-level-cell";
    levelCell.textContent = formatLevelWithSymbol(chart.level, tableInfo.symbol);

    const titleCell = document.createElement("td");
    titleCell.className = `chart-title-cell ${lampClass}`;
    titleCell.innerHTML = `<div class="chart-title">${escapeHtml(chart.title)}</div>`;

    const artistCell = document.createElement("td");
    artistCell.className = "chart-artist-cell";
    artistCell.innerHTML = chart.artist ? escapeHtml(chart.artist) : '<span class="dimmed">-</span>';

    const lampCell = document.createElement("td");
    lampCell.className = "chart-lamp-cell";
    lampCell.textContent = lampLabels[chart.lampStatus] || chart.lampStatus;

    row.append(
      levelCell,
      titleCell,
      artistCell,
      lampCell,
      createScoreTierCell(chart),
      createScoreCell(chart),
      createMissCountCell(chart),
      createPlayCountCell(chart),
      createRivalCell(chart),
    );
    tbody.append(row);
  }

  table.append(tbody);
  return table;
}

function createLevelGroupGraph(charts, mode = "lamp") {
  const graph = document.createElement("span");
  graph.className = "level-group-graph";
  const segmentDefs = mode === "score" ? buildScoreChartDefs() : buildLampChartDefs(charts);
  const total = Math.max(1, charts.length);

  for (const def of segmentDefs) {
    const count = charts.reduce((sum, chart) => sum + (def.matches(chart) ? 1 : 0), 0);
    if (!count) {
      continue;
    }

    const ratio = count / total;
    const segment = document.createElement("span");
    segment.className = `level-group-graph-segment ${def.segmentClass}`;
    segment.style.width = `${ratio * 100}%`;
    const tooltipText = `${def.label}: ${count} (${formatPercent(ratio * 100)})`;
    if (ratio >= 0.12) {
      const percentage = document.createElement("span");
      percentage.className = "level-group-graph-label";
      percentage.textContent = formatPercent(ratio * 100);
      segment.append(percentage);
    }
    segment.addEventListener("mouseenter", (event) => {
      showFloatingTooltip(tooltipText, event);
    });
    segment.addEventListener("mousemove", (event) => {
      showFloatingTooltip(tooltipText, event);
    });
    segment.addEventListener("mouseleave", () => {
      hideFloatingTooltip();
    });
    graph.append(segment);
  }

  return graph;
}

function chartMatchesChartListFilters(chart, query, lamp, level) {
  if (lamp && chart.lampStatus !== lamp) {
    return false;
  }

  if (level && chart.level !== level) {
    return false;
  }

  if (!query) {
    return true;
  }

  return getChartSearchText(chart).includes(query);
}

function updateChartListSummary(summaryElement) {
  setLocalizedText(summaryElement, "譜面一覧を開く");
}

function sortChartsForList(charts, table, state) {
  return [...charts].sort((left, right) => {
    const primary = compareChartsForSort(left, right, table, state.sortKey, state.sortDirection);
    if (primary !== 0) {
      return primary;
    }

    const levelFallback = compareChartsForSort(left, right, table, "level", "asc");
    if (levelFallback !== 0) {
      return levelFallback;
    }

    return compareChartsForSort(left, right, table, "title", "asc");
  });
}

function normalizeChartSortKey(value) {
  const key = String(value ?? "").trim();
  return chartSortColumns.some((column) => column.key === key) ? key : "level";
}

function compareChartsForSort(left, right, table, sortKey, sortDirection) {
  switch (sortKey) {
    case "level":
      return applySortDirection(compareLevels(left.level, right.level, table.levelOrder), sortDirection);
    case "title":
      return applySortDirection(compareText(left.title, right.title), sortDirection);
    case "artist":
      return applySortDirection(compareText(left.artist, right.artist), sortDirection);
    case "lampStatus":
      return applySortDirection(compareLampStatus(left.lampStatus, right.lampStatus), sortDirection);
    case "playCount":
      return compareNumericNullable(left.playCount, right.playCount, sortDirection);
    case "missCount":
      return compareChartsByBp(left, right, sortDirection);
    case "rival":
      return compareRivalValues(left, right, sortDirection);
    case "scoreTier":
      return compareScoreTierValues(left, right, sortDirection);
    case "scoreRate":
      return compareNumericNullable(left.scoreRate, right.scoreRate, sortDirection);
    default:
      return 0;
  }
}

function applySortDirection(value, sortDirection) {
  return sortDirection === "desc" ? value * -1 : value;
}

function compareText(left, right) {
  return String(left || "").localeCompare(String(right || ""), "ja", { sensitivity: "base" });
}

function compareLampStatus(left, right) {
  const leftIndex = lampOptions.indexOf(left);
  const rightIndex = lampOptions.indexOf(right);
  return (leftIndex === -1 ? lampOptions.length : leftIndex) - (rightIndex === -1 ? lampOptions.length : rightIndex);
}

function compareNumericNullable(left, right, sortDirection) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  return sortDirection === "desc" ? right - left : left - right;
}

function getSortIndicator(columnKey, state) {
  if (state.sortKey !== columnKey) {
    return "↕";
  }
  return state.sortDirection === "asc" ? "↑" : "↓";
}

function createPlayCountCell(chart) {
  const cell = document.createElement("td");

  if (isNoPlayableDataLamp(chart.lampStatus) || chart.playCount == null) {
    cell.innerHTML = '<span class="dimmed">NO Data</span>';
    return cell;
  }

  const playCount = document.createElement("div");
  playCount.className = "chart-detail";
  playCount.textContent = `${formatInteger(chart.playCount)}回`;
  cell.append(playCount);
  return cell;
}

function createMissCountCell(chart) {
  const cell = document.createElement("td");
  const missCountValue = getChartMissCountValue(chart);

  if (missCountValue == null) {
    cell.innerHTML = '<span class="dimmed">NO Data</span>';
    return cell;
  }

  const missCountLine = document.createElement("div");
  missCountLine.className = "chart-detail";
  missCountLine.textContent = formatInteger(missCountValue);

  cell.append(missCountLine);
  return cell;
}

function getChartMissCountValue(chart) {
  if (isNoPlayableDataLamp(chart?.lampStatus)) {
    return null;
  }

  const missCountRaw = Number.isFinite(Number(chart?.missCount)) ? Number(chart.missCount) : null;
  if (missCountRaw != null) {
    return missCountRaw;
  }
  const badCount = Number.isFinite(Number(chart?.badCount)) ? Number(chart.badCount) : null;
  const poorCount = Number.isFinite(Number(chart?.poorCount)) ? Number(chart.poorCount) : null;
  return badCount != null && poorCount != null ? badCount + poorCount : null;
}

function compareChartsByBp(left, right, sortDirection) {
  const leftGroup = getBpSortGroup(left);
  const rightGroup = getBpSortGroup(right);
  if (leftGroup !== rightGroup) {
    return leftGroup - rightGroup;
  }

  const bpDiff = compareNumericNullable(getChartMissCountValue(left), getChartMissCountValue(right), sortDirection);
  if (bpDiff !== 0) {
    return bpDiff;
  }
  return 0;
}

function getBpSortGroup(chart) {
  const lamp = normalizeLampStatusForUi(chart?.lampStatus);
  if (lamp === "NO PLAY" || lamp === "NO SONG") {
    return 2;
  }
  if (lamp === "FAILED") {
    return 1;
  }
  return 0;
}

function createScoreCell(chart) {
  const cell = document.createElement("td");
  cell.className = "score-cell";

  if (chart.exScore == null || chart.maxExScore == null || chart.scoreRate == null) {
    cell.innerHTML = '<span class="dimmed">NO Data</span>';
    return cell;
  }

  const exLine = document.createElement("div");
  exLine.className = "chart-detail";
  exLine.textContent = `${formatInteger(chart.exScore)} / ${formatInteger(chart.maxExScore)}`;

  const rateLine = document.createElement("div");
  rateLine.className = "chart-detail detail-rate";
  rateLine.textContent = `${chart.scoreRate.toFixed(2)}%`;

  cell.append(exLine, rateLine);

  if (chart.scoreRate >= 94.5 && chart.maxOffset != null) {
    const maxoLine = document.createElement("div");
    maxoLine.className = "chart-detail detail-maxo";
    maxoLine.textContent = `MAX-${formatInteger(chart.maxOffset)}`;
    cell.append(maxoLine);
  }

  return cell;
}

function createScoreTierCell(chart) {
  const tier = classifyScoreTier(chart);
  const cell = document.createElement("td");
  cell.className = "score-tier-cell";
  const badge = document.createElement("span");
  badge.className = `score-tier-badge score-tier-${toScoreTierSlug(tier)}`;
  badge.textContent = levelChartScoreLabels[tier] || tier;
  cell.append(badge);
  return cell;
}

function createRivalCell(chart) {
  const cell = document.createElement("td");
  cell.className = "rival-cell";
  const comparison = getFilteredRivalComparison(chart);

  if (!comparison || !comparison.bestScore) {
    cell.innerHTML = '<span class="dimmed">NO Data</span>';
    return cell;
  }

  const rivalLampClass = `rival-lamp-${toLampSlug(comparison.bestScore.lampStatus || "NO PLAY")}`;
  cell.classList.add(rivalLampClass);

  const scoreLine = document.createElement("div");
  scoreLine.className = `rival-result rival-result-${comparison.scoreResult || "unknown"}`;
  scoreLine.textContent = formatRivalScoreResult(comparison);

  const rivalNameLine = document.createElement("div");
  rivalNameLine.className = "rival-detail rival-name";
  rivalNameLine.textContent = comparison.bestScore.name || comparison.bestScore.id || "Rival";

  const rivalScoreLine = document.createElement("div");
  rivalScoreLine.className = "rival-detail rival-score";
  rivalScoreLine.textContent =
    comparison.bestScore.exScore != null ? `EX ${formatInteger(comparison.bestScore.exScore)}` : "EX NO Data";

  const rivalRateLine = document.createElement("div");
  rivalRateLine.className = "rival-detail rival-rate";
  rivalRateLine.textContent =
    comparison.bestScore.scoreRate != null ? `${comparison.bestScore.scoreRate.toFixed(2)}%` : "Rate NO Data";

  const lampLine = document.createElement("div");
  lampLine.className = "rival-detail";
  lampLine.textContent = lampLabels[comparison.bestScore.lampStatus] || comparison.bestScore.lampStatus;

  cell.append(scoreLine, rivalNameLine, rivalScoreLine, rivalRateLine, lampLine);
  return cell;
}

function formatRivalScoreResult(comparison) {
  if (!comparison || !comparison.bestScore) {
    return "NO Data";
  }
  if (comparison.selfExScore == null || comparison.bestScore.exScore == null) {
    return `Rival ${formatInteger(comparison.bestScore.exScore ?? 0)}`;
  }

  const diff = comparison.selfExScore - comparison.bestScore.exScore;
  if (diff > 0) {
    return `WIN +${formatInteger(diff)}`;
  }
  if (diff < 0) {
    return `LOSE ${formatInteger(diff)}`;
  }
  return "DRAW ±0";
}

function formatRivalLampResult(comparison) {
  switch (comparison?.lampResult) {
    case "win":
      return "Lamp WIN";
    case "lose":
      return "Lamp LOSE";
    case "draw":
      return "Lamp DRAW";
    default:
      return "Lamp -";
  }
}

function compareRivalValues(left, right, sortDirection) {
  return compareNumericNullable(getRivalScoreDiff(left), getRivalScoreDiff(right), sortDirection);
}

function compareScoreTierValues(left, right, sortDirection) {
  const leftTier = classifyScoreTier(left);
  const rightTier = classifyScoreTier(right);
  const leftIndex = levelChartScoreOrder.indexOf(leftTier);
  const rightIndex = levelChartScoreOrder.indexOf(rightTier);
  const normalizedLeft = leftIndex === -1 ? levelChartScoreOrder.length : leftIndex;
  const normalizedRight = rightIndex === -1 ? levelChartScoreOrder.length : rightIndex;
  return sortDirection === "desc" ? normalizedRight - normalizedLeft : normalizedLeft - normalizedRight;
}

function getRivalScoreDiff(chart) {
  const comparison = getFilteredRivalComparison(chart);
  if (!comparison || comparison.selfExScore == null || comparison.bestScore?.exScore == null) {
    return null;
  }
  return comparison.selfExScore - comparison.bestScore.exScore;
}

function getFilteredRivalComparison(chart) {
  const comparison = chart?.rivalComparison;
  if (!comparison?.bestScore) {
    return null;
  }

  const scores = Array.isArray(comparison.scores) ? comparison.scores : [comparison.bestScore];
  const activeScores = scores.filter((score) => selectedRivalIds.has(String(score?.id ?? "").trim()));
  if (!activeScores.length) {
    return null;
  }

  const bestScore = [...activeScores].sort(compareRivalScoresForUi)[0];
  const selfExScore = comparison.selfExScore ?? null;
  const scoreDiff = selfExScore != null && bestScore.exScore != null ? selfExScore - bestScore.exScore : null;
  const lampDiff = compareLampStatus(comparison.selfLamp || "NO PLAY", bestScore.lampStatus);

  return {
    ...comparison,
    rivalCount: activeScores.length,
    bestScore,
    scoreDiff,
    scoreResult: scoreDiff == null ? "unknown" : scoreDiff > 0 ? "win" : scoreDiff < 0 ? "lose" : "draw",
    lampResult: lampDiff < 0 ? "win" : lampDiff > 0 ? "lose" : "draw",
  };
}

function compareRivalScoresForUi(left, right) {
  const leftEx = Number.isFinite(Number(left?.exScore)) ? Number(left.exScore) : -1;
  const rightEx = Number.isFinite(Number(right?.exScore)) ? Number(right.exScore) : -1;
  if (leftEx !== rightEx) {
    return rightEx - leftEx;
  }
  return compareLampStatus(left?.lampStatus, right?.lampStatus);
}

function createMetricCard(label, value, subvalue, cardClass = "") {
  const card = document.createElement("div");
  card.className = "metric";
  if (cardClass) {
    card.classList.add(...String(cardClass).split(/\s+/).filter(Boolean));
  }

  const labelElement = document.createElement("div");
  labelElement.className = "label";
  labelElement.textContent = label;

  const valueElement = document.createElement("div");
  valueElement.className = "value";
  valueElement.textContent = value;

  card.append(labelElement, valueElement);

  if (subvalue) {
    const subvalueElement = document.createElement("div");
    subvalueElement.className = "subvalue";
    subvalueElement.textContent = subvalue;
    card.append(subvalueElement);
  }

  return card;
}

function createForceRatingCard(forceRating) {
  if (!forceRating || forceRating.available === false) {
    return null;
  }

  const rating = Number(forceRating.rating);
  const displayedRating = Number.isFinite(rating) ? rating.toFixed(3) : "0.000";
  const title = String(forceRating.title || "SLATE").trim() || "SLATE";
  const tier = String(forceRating.tier || "slate").trim().toLowerCase();
  const top50Count = Math.max(0, Number.parseInt(forceRating.top50Count, 10) || 0);
  const broadCount = Math.max(0, Number.parseInt(forceRating.broadCount, 10) || top50Count);
  const playedCharts = Math.max(0, Number.parseInt(forceRating.playedCharts, 10) || 0);

  const card = document.createElement("div");
  card.className = `metric force-rating-card force-tier-${tier}`;

  const helpButton = document.createElement("button");
  helpButton.type = "button";
  helpButton.className = "force-rating-help-button";
  helpButton.textContent = "?";
  helpButton.dataset.i18nSkip = "true";
  helpButton.setAttribute("aria-label", selectedLanguage === "en" ? "About FORCE RATE" : "FORCE RATEについて");
  helpButton.title = selectedLanguage === "en" ? "About FORCE RATE" : "FORCE RATEについて";
  helpButton.addEventListener("click", () => showForceRatingHelp(helpButton));

  const label = document.createElement("div");
  label.className = "label force-rating-label";
  label.textContent = "FORCE RATE";

  const content = document.createElement("div");
  content.className = "force-rating-content";

  const badge = document.createElement("div");
  badge.className = "force-rating-badge";
  badge.setAttribute("role", "img");
  badge.setAttribute("aria-label", `${title} badge`);

  const copy = document.createElement("div");
  copy.className = "force-rating-copy";

  const value = document.createElement("div");
  value.className = "value force-rating-value";
  value.textContent = displayedRating;

  const titleElement = document.createElement("div");
  titleElement.className = "force-rating-title";
  titleElement.textContent = title;

  const detail = document.createElement("div");
  detail.className = "subvalue force-rating-detail";
  detail.dataset.i18nSkip = "true";
  detail.textContent =
    selectedLanguage === "en"
      ? `BEST20/${broadCount} · charts ${top50Count}/50 · ${playedCharts} rated charts`
      : `BEST20/${broadCount} · 譜面 ${top50Count}/50 · 対象 ${playedCharts}譜面`;

  copy.append(label, value, titleElement, detail);
  content.append(badge, copy);
  card.append(helpButton, content);
  return card;
}

function showForceRatingHelp(triggerButton) {
  if (document.querySelector(".force-rating-help-modal")) {
    return;
  }

  const isEnglish = selectedLanguage === "en";
  const overlay = document.createElement("div");
  overlay.className = "language-startup-modal force-rating-help-modal";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "force-rating-help-title");
  overlay.dataset.i18nSkip = "true";

  const dialog = document.createElement("div");
  dialog.className = "language-startup-card force-rating-help-dialog";

  const header = document.createElement("div");
  header.className = "force-rating-help-header";
  const title = document.createElement("h2");
  title.id = "force-rating-help-title";
  title.textContent = isEnglish ? "About FORCE RATE" : "FORCE RATEについて";
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "force-rating-help-close-button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", isEnglish ? "Close" : "閉じる");
  closeButton.title = isEnglish ? "Close" : "閉じる";
  header.append(title, closeButton);

  const introduction = document.createElement("p");
  introduction.textContent = isEnglish
    ? "FORCE RATE is an index from 0.000 to 30.000 calculated by matching score.db charts to Insane BMS and second-period Overjoy chart constants by MD5. Third-period-only Overjoy charts are excluded. Chart constants use LR2IR Archive statistics."
    : "FORCE RATEは、score.dbの譜面を発狂BMSと第二期Overjoyの譜面定数へMD5で照合し、0.000〜30.000で表す指標です。第三期Overjoyにのみ登録されている譜面は対象外です。譜面定数にはLR2IR Archiveの集計を使用します。";

  const formula = document.createElement("div");
  formula.className = "force-rating-help-formula";
  formula.textContent = isEnglish
    ? "FORCE RATE = Broad Average × 0.2 + BEST20 Average × 0.8"
    : "FORCE RATE = 全体平均 × 0.2 + BEST20平均 × 0.8";

  const details = document.createElement("ul");
  details.className = "force-rating-help-list";
  const items = isEnglish
      ? [
        "Chart constants compare all eligible charts on one global scale using LR2IR Archive FC, HC, NC, EC and failed totals. Difficulty-table levels are not used in the comparison.",
        "The score coefficient is the EX score rate rounded to three decimal places: AAA = 0.889, 90% = 0.900, and 93.53% = 0.935.",
        "Lamp coefficients: FC 1.00 / HC 0.98 / NC 0.93 / EC 0.86 / FL 0.50. NP and NS are excluded.",
        "Chart FORCE = Chart Constant × Score Coefficient × Lamp Coefficient.",
        "The target set is up to 51 entries: the best 50 chart FORCE values plus the highest passed GENOSIDE2018 SP dan course. If no dan course is found, the target set remains 50 charts.",
        "FORCE RATE blends the broad target average with the stronger BEST20 average, so the top-end density matters while the 50-chart requirement still remains.",
        "The displayed maximum is 30.000. Title thresholds are unchanged.",
        "The FORCE RATE BEST50 folder lists the rated charts and each Chart FORCE value.",
      ]
      : [
        "譜面定数は、LR2IR ArchiveのFC・HC・NC・EC・FAILED総数を使い、全対象譜面を共通尺度で比較します。難易度表のレベル内順位は使いません。",
        "スコア係数はEXスコア率を小数第3位へ四捨五入します。AAAは0.889、90%は0.900、93.53%は0.935です。",
        "ランプ係数は FC 1.00 / HC 0.98 / NC 0.93 / EC 0.86 / FL 0.50です。NPとNSは対象外です。",
        "単曲レート = 譜面定数 × スコア係数 × ランプ係数です。",
        "対象は最大51個です。単曲レート上位50譜面に、GENOSIDE2018 SP段位の最高合格段位を1個加えます。段位コースが見つからない場合は50譜面のままです。",
        "FORCE RATEは、広さを見る全体平均と上位密度を見るBEST20平均を混ぜて計算します。50譜面を埋める意味は残しつつ、高い単曲レートの厚みも評価します。",
        "表示上限は30.000です。称号付与条件は変更していません。",
        "対象譜面と各単曲レートは、FORCE RATE BEST50フォルダで確認できます。",
      ];
  for (const itemText of items) {
    const item = document.createElement("li");
    item.textContent = itemText;
    details.append(item);
  }

  const close = () => {
    document.removeEventListener("keydown", handleKeyDown);
    overlay.remove();
    triggerButton?.focus();
  };
  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  closeButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      close();
    }
  });
  document.addEventListener("keydown", handleKeyDown);

  dialog.append(header, introduction, formula, details);
  overlay.append(dialog);
  document.body.append(overlay);
  closeButton.focus();
}

function createLampPill(lamp, count) {
  const pill = document.createElement("div");
  pill.className = `lamp-pill lamp-pill-${toLampSlug(lamp)}`;

  const countElement = document.createElement("div");
  countElement.className = "count";
  countElement.textContent = String(count);

  const nameElement = document.createElement("div");
  nameElement.className = "name";
  nameElement.textContent = lampLabels[lamp];

  pill.append(countElement, nameElement);
  return pill;
}

function createScorePill(tier, count) {
  const pill = document.createElement("div");
  pill.className = `lamp-pill score-pill score-pill-${toScoreTierSlug(tier)}`;

  const countElement = document.createElement("div");
  countElement.className = "count";
  countElement.textContent = String(count);

  const nameElement = document.createElement("div");
  nameElement.className = "name";
  nameElement.textContent = levelChartScoreLabels[tier] || tier;

  pill.append(countElement, nameElement);
  return pill;
}

function getChartSearchText(chart) {
  return [
    chart.title,
    chart.artist,
    chart.level,
    chart.statusDetail,
    chart.md5,
    chart.sha256,
    chart.playCount,
    getChartMissCountValue(chart),
    chart.badCount,
    chart.poorCount,
    chart.exScore,
    chart.maxExScore,
    chart.scoreRate,
    chart.maxOffset,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildStatusMessage(analysis) {
  const sourceLine = `LR2 score.db: ${analysis.player.localDbPath || "-"}`;
  const localSongDbLine = `song.db: ${analysis.player.localSongDbPath || "見つかりません"}`;

  const lines = [
    analysis.tables.length
      ? `${analysis.tables.length}件の難易度表を読み込みました。`
      : "難易度表が未選択のため、プレイヤーデータのみ読み込みました。",
    `プレイヤー: ${analysis.player.name || "-"} / SP段位 ${formatPlayerGrade(analysis.player)}`,
    sourceLine,
    localSongDbLine,
    `重複除外後の譜面数: ${analysis.overall.uniqueChartCount}`,
  ].filter(Boolean);

  if (analysis.tableErrors.length) {
    lines.push(`読み込み失敗の難易度表: ${analysis.tableErrors.length}件`);
  }

  return lines.join("\n");
}

function buildProfileOnlyStatusMessage(player, fetchedAt) {
  const lines = [
    "score.db からプロフィールを取得しました。",
    `プレイヤー: ${player.name || "-"}`,
    `SP段位: ${formatPlayerGrade(player)}`,
  ];

  if (player.gradeDp?.trim()) {
    lines.push(`DP段位: ${player.gradeDp.trim()}`);
  }

  if (fetchedAt) {
    const parsedDate = new Date(fetchedAt);
    if (!Number.isNaN(parsedDate.getTime())) {
      lines.push(`取得時刻: ${parsedDate.toLocaleString(getCurrentLocale())}`);
    }
  }

  return lines.join("\n");
}

async function autoFetchProfileFromScoreDb() {
  const scoreDbPath = scoreDbPathInput.value.trim();
  if (!scoreDbPath) {
    return;
  }

  if (analyzeButton.disabled) {
    return;
  }

  const token = ++autoDbProfileFetchToken;
  setStatus("score.db からプレイヤー名と段位を取得しています。");

  try {
    const payload = await postJsonApi("/api/profile-from-db", {
      scoreDbPath,
      songDbPath: songDbPathInput.value.trim(),
      skillAnalyzerFetchMode,
      scoreDbMode,
    });

    if (token !== autoDbProfileFetchToken) {
      return;
    }

    const fetchedPlayer = {
      id: String(payload?.player?.id ?? "").trim() || "local",
      sourceType: "local-score-db",
      name: String(payload?.player?.name ?? "").trim(),
      grade: String(payload?.player?.grade ?? "").trim(),
      gradeSp: String(payload?.player?.gradeSp ?? "").trim(),
      gradeDp: String(payload?.player?.gradeDp ?? "").trim(),
      skillAnalyzer: payload?.player?.skillAnalyzer ?? null,
      stellaSkill4th: payload?.player?.stellaSkill4th ?? null,
      overjoyTripleCrown: Boolean(payload?.player?.overjoyTripleCrown),
    };

    const currentAnalysisId = latestAnalysis?.player ? normalizePlayerCacheId(latestAnalysis.player.id) : "";
    const fetchedPlayerId = normalizePlayerCacheId(fetchedPlayer.id);
    if (latestAnalysis && currentAnalysisId && fetchedPlayerId && currentAnalysisId === fetchedPlayerId) {
      latestAnalysis = {
        ...latestAnalysis,
        player: {
          ...mergePlayerProfileFields(latestAnalysis.player, fetchedPlayer),
          sourceType: latestAnalysis.player.sourceType,
        },
      };
      renderAnalysis();
      void persistLatestAnalysis(latestAnalysis).catch((error) => console.error("Failed to persist analysis", error));
    }

    void persistFormState().catch((error) => console.error("Failed to persist form state", error));
    setStatus(buildProfileOnlyStatusMessage(fetchedPlayer, payload?.fetchedAt));
  } catch (error) {
    if (token !== autoDbProfileFetchToken) {
      return;
    }
    setStatus(error instanceof Error ? error.message : "score.db からプロフィールを取得できませんでした。");
  }
}

function setStatus(message) {
  setLocalizedText(statusBox, message);
}

function clearMainFeedbackTimeout() {
  if (mainFeedbackTimeoutId != null) {
    window.clearTimeout(mainFeedbackTimeoutId);
    mainFeedbackTimeoutId = null;
  }
}

function showMainLoadingFeedback() {
  if (!mainFeedback) {
    return;
  }
  clearMainFeedbackTimeout();
  mainFeedback.textContent = "Now Loading...";
  mainFeedback.classList.remove("hidden", "done");
  mainFeedback.classList.add("loading");
}

function showMainDoneFeedback() {
  if (!mainFeedback) {
    return;
  }
  clearMainFeedbackTimeout();
  mainFeedback.textContent = "Done.";
  mainFeedback.classList.remove("hidden", "loading");
  mainFeedback.classList.add("done");
  mainFeedbackTimeoutId = window.setTimeout(() => {
    hideMainFeedback();
  }, 1000);
}

function hideMainFeedback() {
  if (!mainFeedback) {
    return;
  }
  clearMainFeedbackTimeout();
  mainFeedback.classList.add("hidden");
  mainFeedback.classList.remove("loading", "done");
}

function calculateRate(charts, acceptedLamps) {
  if (!charts.length) {
    return null;
  }
  const count = charts.filter((chart) => acceptedLamps.includes(chart.lampStatus)).length;
  return (count / charts.length) * 100;
}

function countCharts(charts, lamp) {
  return charts.filter((chart) => chart.lampStatus === lamp).length;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(value)) {
    return "-";
  }
  return `${value.toFixed(2)}%`;
}

function formatInteger(value) {
  return new Intl.NumberFormat(getCurrentLocale()).format(value);
}

function formatDuration(totalSeconds) {
  const secondsValue = Math.max(0, Math.trunc(Number(totalSeconds) || 0));
  const hours = Math.floor(secondsValue / 3600);
  const minutes = Math.floor((secondsValue % 3600) / 60);
  const seconds = secondsValue % 60;

  if (selectedLanguage === "en") {
    if (hours > 0) {
      return `${formatInteger(hours)}h ${String(minutes).padStart(2, "0")}m`;
    }
    if (minutes > 0) {
      return `${formatInteger(minutes)}m ${String(seconds).padStart(2, "0")}s`;
    }
    return `${formatInteger(seconds)}s`;
  }

  if (hours > 0) {
    return `${formatInteger(hours)}時間${String(minutes).padStart(2, "0")}分`;
  }
  if (minutes > 0) {
    return `${formatInteger(minutes)}分${String(seconds).padStart(2, "0")}秒`;
  }
  return `${formatInteger(seconds)}秒`;
}

function getCurrentLocale() {
  return selectedLanguage === "en" ? "en-US" : "ja-JP";
}

function formatDateYmd(dateValue) {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function toNonNegativeInteger(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return numeric;
}

function compareLevels(left, right, levelOrder = []) {
  const indexMap = new Map(levelOrder.map((level, index) => [String(level), index]));
  const leftIndex = indexMap.get(left);
  const rightIndex = indexMap.get(right);

  if (leftIndex != null && rightIndex != null) {
    return leftIndex - rightIndex;
  }
  if (leftIndex != null) {
    return -1;
  }
  if (rightIndex != null) {
    return 1;
  }

  const leftNumber = Number(left);
  const rightNumber = Number(right);
  const leftNumeric = Number.isFinite(leftNumber);
  const rightNumeric = Number.isFinite(rightNumber);

  if (leftNumeric && rightNumeric) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right), "ja");
}

function formatLevelWithSymbol(level, symbol) {
  const normalizedLevel = String(level ?? "").trim();
  const normalizedSymbol = String(symbol ?? "").trim();
  if (!normalizedLevel || !normalizedSymbol) {
    return normalizedLevel;
  }
  if (normalizedLevel.toLowerCase().startsWith(normalizedSymbol.toLowerCase())) {
    return normalizedLevel;
  }
  return `${normalizedSymbol}${normalizedLevel}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function formatPlayerGrade(player) {
  const sp = player.gradeSp?.trim();
  if (sp) {
    return sp;
  }

  const combined = player.grade?.trim();
  if (!combined) {
    return "-";
  }

  return combined.split("/")[0]?.trim() || combined;
}

function createSkillAnalyzerMetricCards(player) {
  const skill = getPlayerSkillAnalyzerInfo(player);
  if (!skill) {
    return [];
  }

  const bestSkillGrade = getBestSkillAnalyzerGrade(skill);
  if (!bestSkillGrade) {
    return [];
  }

  return [
    createMetricCard(
      bestSkillGrade.label,
      bestSkillGrade.grade,
      buildSkillAnalyzerFormalSupplement(bestSkillGrade.entry, bestSkillGrade.grade, bestSkillGrade.fallbackName),
      getSkillAnalyzerToneClass(bestSkillGrade.grade),
    ),
  ];
}

function getBestSkillAnalyzerGrade(skill) {
  const candidates = [
    {
      kind: "st",
      label: "st段位",
      fallbackName: "Stella Skill Simulator 4th",
      entry: skill?.st,
      grade: normalizeSkillGradeText(skill?.st?.grade, "st"),
    },
    {
      kind: "sl",
      label: "sl段位",
      fallbackName: "Satellite Skill Analyzer 2nd",
      entry: skill?.sl,
      grade: normalizeSkillGradeText(skill?.sl?.grade, "sl"),
    },
  ].filter((candidate) => candidate.entry && candidate.grade);

  if (!candidates.length) {
    return null;
  }

  return candidates.sort(compareSkillAnalyzerGradeCandidates)[0];
}

function compareSkillAnalyzerGradeCandidates(left, right) {
  const leftRank = getSkillAnalyzerGradeRank(left);
  const rightRank = getSkillAnalyzerGradeRank(right);
  if (leftRank !== rightRank) {
    return rightRank - leftRank;
  }
  if (left.kind === right.kind) {
    return 0;
  }
  return left.kind === "st" ? -1 : 1;
}

function getSkillAnalyzerGradeRank(candidate) {
  const match = String(candidate?.grade ?? "").match(/^(st|sl)(\d{1,2})$/);
  if (!match) {
    return -1;
  }

  const level = Number.parseInt(match[2], 10);
  if (!Number.isFinite(level)) {
    return -1;
  }

  return match[1] === "st" ? level + 100 : level;
}

function buildSkillAnalyzerFormalSupplement(entry, gradeText, fallbackName) {
  const baseName = String(entry?.formalName ?? "").trim() || String(fallbackName ?? "").trim();
  const normalizedGrade = normalizeSkillGradeText(gradeText || entry?.grade);

  if (baseName && normalizedGrade) {
    return `${baseName} ${normalizedGrade}`;
  }
  return baseName || normalizedGrade || "";
}

function getPlayerSkillAnalyzerInfo(player) {
  if (!player || typeof player !== "object") {
    return null;
  }

  const raw = player.skillAnalyzer && typeof player.skillAnalyzer === "object" ? player.skillAnalyzer : null;
  const stFallback = player.stellaSkill4th && typeof player.stellaSkill4th === "object" ? player.stellaSkill4th : null;

  const st = normalizeSkillAnalyzerEntry(raw?.st ?? stFallback);
  const sl = normalizeSkillAnalyzerEntry(raw?.sl ?? null);

  if (!st && !sl) {
    return null;
  }

  return { st, sl };
}

function normalizeSkillAnalyzerEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const grade = String(entry.grade ?? "").trim().toLowerCase();
  const formalName = String(entry.formalName ?? "").trim();
  const clearedCount = toNonNegativeInteger(entry.clearedCount);
  const playedCount = toNonNegativeInteger(entry.playedCount);
  const totalCount = toNonNegativeInteger(entry.totalCount);

  if (!grade && !formalName && totalCount == null && clearedCount == null && playedCount == null) {
    return null;
  }

  return {
    grade,
    formalName,
    clearedCount,
    playedCount,
    totalCount,
  };
}

function normalizeSkillGradeText(value, expectedPrefix = "") {
  const compact = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const match = compact.match(/^(st|sl)0*(\d{1,2})$/);
  if (!match) {
    return "";
  }
  const prefix = match[1];
  const level = Number.parseInt(match[2], 10);
  if (!Number.isFinite(level)) {
    return "";
  }
  if (expectedPrefix && prefix !== expectedPrefix) {
    return "";
  }
  return `${prefix}${level}`;
}

function getSkillAnalyzerToneClass(gradeText) {
  const grade = normalizeSkillGradeText(gradeText);
  if (!grade) {
    return "";
  }

  const match = grade.match(/^(st|sl)(\d{1,2})$/);
  if (!match) {
    return "";
  }

  const prefix = match[1];
  const level = Number.parseInt(match[2], 10);
  if (!Number.isFinite(level)) {
    return "";
  }

  if (prefix === "st" && level === 12) {
    return "skill-rainbow";
  }

  const stToneMap = {
    0: "skill-green",
    1: "skill-cyan",
    2: "skill-blue",
    3: "skill-magenta",
    4: "skill-red",
    5: "skill-orange",
    6: "skill-green",
    7: "skill-blue",
    8: "skill-magenta",
    9: "skill-red",
    10: "skill-yellow",
    11: "skill-gray",
  };

  const slToneMap = {
    0: "skill-green",
    1: "skill-cyan",
    2: "skill-blue",
    3: "skill-magenta",
    4: "skill-red",
    5: "skill-orange",
    6: "skill-green",
    7: "skill-cyan",
    8: "skill-blue",
    9: "skill-magenta",
    10: "skill-red",
    11: "skill-orange",
    12: "skill-yellow",
  };

  if (prefix === "st") {
    return stToneMap[level] || "";
  }
  return slToneMap[level] || "";
}

function getPlayerGradeFormalName(player) {
  const gradeText = formatPlayerGrade(player);
  if (!gradeText || gradeText === "-") {
    return "段位未取得";
  }

  if (isOverjoyGrade(gradeText)) {
    if (player?.overjoyTripleCrown) {
      return "あなたは歴代のOverjoyすべてに合格しました";
    }
    return "Overjoy";
  }

  const compact = normalizeDanToneText(gradeText);
  if (compact.includes("★★") || compact.includes("発狂皆伝")) {
    return "発狂皆伝";
  }

  const insaneMatch = compact.match(/★(\d{1,2})/);
  if (insaneMatch) {
    const level = Number.parseInt(insaneMatch[1], 10);
    const danStep = formatDanStep(level);
    return danStep ? `発狂${danStep}` : "発狂段位";
  }

  const normalMatch = compact.match(/☆(\d{1,2})/);
  if (normalMatch) {
    const level = Number.parseInt(normalMatch[1], 10);
    const danStep = formatDanStep(level);
    return danStep ? `SP${danStep}` : "SP段位";
  }

  return gradeText;
}

function formatDanStep(level) {
  switch (level) {
    case 1:
      return "初段";
    case 2:
      return "二段";
    case 3:
      return "三段";
    case 4:
      return "四段";
    case 5:
      return "五段";
    case 6:
      return "六段";
    case 7:
      return "七段";
    case 8:
      return "八段";
    case 9:
      return "九段";
    case 10:
      return "十段";
    default:
      return "";
  }
}

function getDanToneClass(gradeText, player = null) {
  const normalized = String(gradeText ?? "").trim();
  if (!normalized || normalized === "-") {
    return "";
  }

  if (isOverjoyGrade(normalized)) {
    return player?.overjoyTripleCrown ? "dan-overjoy dan-overjoy-triple" : "dan-overjoy";
  }

  const compact = normalizeDanToneText(normalized);

  if (compact.includes("★★") || compact.includes("発狂皆伝")) {
    return "dan-insane-kaiden";
  }

  const insaneMatch = compact.match(/★(\d{1,2})/);
  if (insaneMatch) {
    const level = Number.parseInt(insaneMatch[1], 10);
    if (Number.isFinite(level) && level >= 1 && level <= 8) {
      return "dan-insane";
    }
    if (level === 9 || level === 10) {
      return "dan-insane-high";
    }
  }

  const normalMatch = compact.match(/☆(\d{1,2})/);
  if (normalMatch) {
    const level = Number.parseInt(normalMatch[1], 10);
    if (Number.isFinite(level) && level >= 1 && level <= 10) {
      return "dan-normal";
    }
  }

  if (compact.includes("発狂九段") || compact.includes("発狂十段")) {
    return "dan-insane-high";
  }
  if (compact.includes("発狂")) {
    return "dan-insane";
  }
  return "dan-normal";
}

function isOverjoyGrade(gradeText) {
  const normalized = String(gradeText ?? "").trim();
  if (!normalized) {
    return false;
  }

  if (/over\s*joy/i.test(normalized)) {
    return true;
  }

  const asciiLike = normalized
    .replace(/[！-～]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "");
  return asciiLike.includes("(^^)");
}

function normalizeDanToneText(text) {
  return String(text ?? "")
    .replace(/[！-～]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "");
}

function toLampSlug(lamp) {
  return lamp.toLowerCase().replace(/\s+/g, "-");
}

function toScoreTierSlug(tier) {
  return tier.toLowerCase().replace(/_/g, "-");
}

function classifyScoreTier(chart) {
  const lamp = normalizeLampStatusForUi(chart?.lampStatus);
  if (lamp === "NO SONG") {
    return "NO_SONG";
  }
  if (lamp === "NO PLAY") {
    return "NO_PLAY";
  }

  const rate = Number(chart?.scoreRate);
  if (!Number.isFinite(rate)) {
    return "NO_PLAY";
  }
  if (rate >= 88.89) {
    return "AAA";
  }
  if (rate >= 77.78) {
    return "AA";
  }
  if (rate >= 66.67) {
    return "A";
  }
  if (rate >= 55.56) {
    return "B";
  }
  if (rate >= 44.44) {
    return "C";
  }
  if (rate >= 33.33) {
    return "D";
  }
  if (rate >= 22.22) {
    return "E";
  }
  return "F";
}

function normalizeLevelChartMode(mode) {
  return mode === "score" ? "score" : "lamp";
}

function buildTableInfoStateKey(table) {
  const source = String(table?.sourceUrl ?? "").trim();
  const name = String(table?.name ?? "").trim();
  return source || name || "unknown-table";
}

function buildChartIdentityKey(chart) {
  const key = String(chart?.key ?? "").trim();
  if (key) {
    return key;
  }

  const md5 = String(chart?.md5 ?? "").trim().toLowerCase();
  if (md5) {
    return `md5:${md5}`;
  }

  const sha256 = String(chart?.sha256 ?? "").trim().toLowerCase();
  if (sha256) {
    return `sha256:${sha256}`;
  }

  const title = String(chart?.title ?? "").trim();
  const artist = String(chart?.artist ?? "").trim();
  const level = String(chart?.level ?? "").trim();
  const index = String(chart?.index ?? "").trim();
  return `fallback:${title}|${artist}|${level}|${index}`;
}

function getLampStrengthRank(lamp) {
  const normalized = normalizeLampStatusForUi(lamp);
  const index = lampOptions.indexOf(normalized);
  return index === -1 ? lampOptions.length + 1 : index;
}

function compareLampImprovements(left, right) {
  const kindDiff = getLampImprovementKindRank(left) - getLampImprovementKindRank(right);
  if (kindDiff !== 0) {
    return kindDiff;
  }

  const lampDiff = getLampStrengthRank(left?.currentLamp) - getLampStrengthRank(right?.currentLamp);
  if (lampDiff !== 0) {
    return lampDiff;
  }

  const leftSymbol = String(left?.sortSymbol ?? "").trim().toLowerCase();
  const rightSymbol = String(right?.sortSymbol ?? "").trim().toLowerCase();
  const symbolDiff = leftSymbol.localeCompare(rightSymbol, "ja");
  if (symbolDiff !== 0) {
    return symbolDiff;
  }

  const levelDiff = compareLevels(String(left?.sortLevelRaw ?? ""), String(right?.sortLevelRaw ?? ""));
  if (levelDiff !== 0) {
    return levelDiff;
  }

  const levelTextDiff = String(left?.levelText ?? "").localeCompare(String(right?.levelText ?? ""), "ja");
  if (levelTextDiff !== 0) {
    return levelTextDiff;
  }

  return String(left?.title ?? "").localeCompare(String(right?.title ?? ""), "ja");
}

function getLampImprovementKindRank(item) {
  if (item?.updateKind === "bp") {
    return 1;
  }
  if (item?.updateKind === "score") {
    return 2;
  }
  return 0;
}

function isClearLampStatus(lamp) {
  const normalized = normalizeLampStatusForUi(lamp);
  return ["FULL COMBO", "HARD CLEAR", "CLEAR", "EASY CLEAR"].includes(normalized);
}

function buildLampImprovementAggregateKey(chart, previousLamp, currentLamp, updateKind = "lamp") {
  const md5 = String(chart?.md5 ?? "").trim().toLowerCase();
  if (md5) {
    return `md5:${md5}|${previousLamp}|${currentLamp}|${updateKind}`;
  }

  const sha256 = String(chart?.sha256 ?? "").trim().toLowerCase();
  if (sha256) {
    return `sha256:${sha256}|${previousLamp}|${currentLamp}|${updateKind}`;
  }

  const key = String(chart?.key ?? "").trim().toLowerCase();
  if (key) {
    return `key:${key}|${previousLamp}|${currentLamp}|${updateKind}`;
  }

  const title = String(chart?.title ?? "")
    .trim()
    .toLowerCase();
  const artist = String(chart?.artist ?? "")
    .trim()
    .toLowerCase();
  return `title:${title}|artist:${artist}|${previousLamp}|${currentLamp}|${updateKind}`;
}

function addLampImprovementLevelEntry(entry, symbolValue, levelValue) {
  if (!entry || typeof entry !== "object") {
    return;
  }

  const symbol = String(symbolValue ?? "").trim();
  const levelRaw = String(levelValue ?? "").trim();
  const levelText = formatLevelWithSymbol(levelRaw, symbol) || levelRaw || symbol;
  if (!levelText) {
    return;
  }

  const dedupeKey = `${symbol.toLowerCase()}|${levelRaw.toLowerCase()}|${levelText.toLowerCase()}`;
  if (entry.levelEntrySet.has(dedupeKey)) {
    return;
  }

  entry.levelEntrySet.add(dedupeKey);
  entry.levelEntries.push({
    symbol,
    levelRaw,
    levelText,
  });
}

function compareLampImprovementLevelEntries(left, right) {
  const leftSymbol = String(left?.symbol ?? "").trim().toLowerCase();
  const rightSymbol = String(right?.symbol ?? "").trim().toLowerCase();
  const symbolDiff = leftSymbol.localeCompare(rightSymbol, "ja");
  if (symbolDiff !== 0) {
    return symbolDiff;
  }
  return compareLevels(String(left?.levelRaw ?? ""), String(right?.levelRaw ?? ""));
}

function mergeLampImprovementMissCount(currentMissCount, nextMissCount) {
  if (currentMissCount == null) {
    return nextMissCount;
  }
  if (nextMissCount == null) {
    return currentMissCount;
  }
  return Math.min(currentMissCount, nextMissCount);
}

function mergeLampImprovementPreviousMissCount(currentMissCount, nextMissCount) {
  if (currentMissCount == null) {
    return nextMissCount;
  }
  if (nextMissCount == null) {
    return currentMissCount;
  }
  return Math.max(currentMissCount, nextMissCount);
}

function mergeLampImprovementPreviousExScore(currentExScore, nextExScore) {
  if (currentExScore == null) {
    return nextExScore;
  }
  if (nextExScore == null) {
    return currentExScore;
  }
  return Math.min(currentExScore, nextExScore);
}

function mergeLampImprovementExScore(currentExScore, nextExScore) {
  if (currentExScore == null) {
    return nextExScore;
  }
  if (nextExScore == null) {
    return currentExScore;
  }
  return Math.max(currentExScore, nextExScore);
}

function mergeLampImprovementScoreRate(currentScoreRate, nextScoreRate) {
  if (currentScoreRate == null) {
    return nextScoreRate;
  }
  if (nextScoreRate == null) {
    return currentScoreRate;
  }
  return Math.max(currentScoreRate, nextScoreRate);
}

function toFiniteChartNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function didLampImprovementScoreUpdate(previousExScore, currentExScore, previousScoreRate, currentScoreRate) {
  if (currentExScore != null && previousExScore != null && currentExScore !== previousExScore) {
    return true;
  }
  if (
    currentScoreRate != null &&
    previousScoreRate != null &&
    Math.abs(currentScoreRate - previousScoreRate) >= 0.0001
  ) {
    return true;
  }
  if (currentExScore != null && previousExScore == null) {
    return true;
  }
  if (currentScoreRate != null && previousScoreRate == null) {
    return true;
  }
  return false;
}

function collectLampImprovements(previousAnalysis, currentAnalysis, options = {}) {
  const includeBpUpdates = Boolean(options.includeBpUpdates);
  if (
    !previousAnalysis ||
    !currentAnalysis ||
    !Array.isArray(previousAnalysis.tables) ||
    !Array.isArray(currentAnalysis.tables)
  ) {
    return [];
  }

  const previousByTable = new Map();
  for (const table of getLampImprovementSources(previousAnalysis, { useLocalScoreStateForUnlisted: true })) {
    const tableKey = buildTableInfoStateKey(table);
    const chartMap = new Map();
    for (const chart of table?.charts ?? []) {
      chartMap.set(buildChartIdentityKey(chart), {
        lamp: normalizeLampStatusForUi(chart?.lampStatus),
        exScore: toFiniteChartNumber(chart?.exScore),
        scoreRate: toFiniteChartNumber(chart?.scoreRate),
        missCount: getChartMissCountValue(chart),
      });
    }
    previousByTable.set(tableKey, chartMap);
  }

  const improvementsByChart = new Map();

  for (const table of getLampImprovementSources(currentAnalysis)) {
    const tableKey = buildTableInfoStateKey(table);
    const previousCharts = previousByTable.get(tableKey);
    if (!previousCharts) {
      continue;
    }

    for (const chart of table?.charts ?? []) {
      const chartKey = buildChartIdentityKey(chart);
      const previousState = previousCharts.get(chartKey);
      if (!previousState) {
        continue;
      }
      const previousLamp = previousState.lamp;

      const currentLamp = normalizeLampStatusForUi(chart?.lampStatus);
      const badCount = Number.isFinite(Number(chart?.badCount)) ? Number(chart.badCount) : null;
      const poorCount = Number.isFinite(Number(chart?.poorCount)) ? Number(chart.poorCount) : null;
      const missCount = getChartMissCountValue(chart);
      const previousMissCount = previousState.missCount;
      const exScore = toFiniteChartNumber(chart?.exScore);
      const scoreRate = toFiniteChartNumber(chart?.scoreRate);
      const lampImproved =
        currentLamp !== previousLamp &&
        isClearLampStatus(currentLamp) &&
        getLampStrengthRank(currentLamp) < getLampStrengthRank(previousLamp);
      const bpImproved =
        includeBpUpdates &&
        missCount != null &&
        previousMissCount != null &&
        missCount < previousMissCount &&
        !isNoPlayableDataLamp(currentLamp);
      const scoreUpdated = didLampImprovementScoreUpdate(
        previousState.exScore,
        exScore,
        previousState.scoreRate,
        scoreRate,
      );
      const scoreUpdatedForGroup = scoreUpdated && !isNoPlayableDataLamp(currentLamp);
      const primaryUpdateKind = lampImproved ? "lamp" : bpImproved ? "bp" : scoreUpdatedForGroup ? "score" : null;

      if (!primaryUpdateKind && !scoreUpdatedForGroup) {
        continue;
      }

      const updateKinds = [primaryUpdateKind];
      if (scoreUpdatedForGroup && primaryUpdateKind !== "score") {
        updateKinds.push("score");
      }

      for (const updateKind of updateKinds) {
        if (!updateKind) {
          continue;
        }
        const aggregateKey = buildLampImprovementAggregateKey(chart, previousLamp, currentLamp, updateKind);

        let entry = improvementsByChart.get(aggregateKey);
        if (!entry) {
          entry = {
            title: String(chart?.title ?? "").trim() || "タイトル不明",
            previousLamp,
            currentLamp,
            updateKind,
            badCount,
            poorCount,
            previousMissCount,
            missCount,
            previousExScore: previousState.exScore,
            exScore,
            scoreRate,
            scoreUpdated,
            levelEntries: [],
            levelEntrySet: new Set(),
          };
          improvementsByChart.set(aggregateKey, entry);
        } else {
          entry.missCount = mergeLampImprovementMissCount(entry.missCount, missCount);
          entry.previousMissCount = mergeLampImprovementPreviousMissCount(entry.previousMissCount, previousMissCount);
          entry.previousExScore = mergeLampImprovementPreviousExScore(entry.previousExScore, previousState.exScore);
          entry.exScore = mergeLampImprovementExScore(entry.exScore, exScore);
          entry.scoreRate = mergeLampImprovementScoreRate(entry.scoreRate, scoreRate);
          entry.scoreUpdated = entry.scoreUpdated || scoreUpdated;
          if (entry.badCount == null && badCount != null) {
            entry.badCount = badCount;
          }
          if (entry.poorCount == null && poorCount != null) {
            entry.poorCount = poorCount;
          }
        }

        if (table?.isUnlistedUpdateSource) {
          addLampImprovementLevelEntry(entry, "", localizeString("表外"));
        } else {
          addLampImprovementLevelEntry(entry, table?.symbol, chart?.level);
        }
      }
    }
  }

  const improvements = [];
  for (const entry of improvementsByChart.values()) {
    const sortedLevelEntries = [...entry.levelEntries].sort(compareLampImprovementLevelEntries);
    const levelText = sortedLevelEntries.map((levelEntry) => levelEntry.levelText).join(" ");
    const primaryLevel = sortedLevelEntries[0] ?? null;

    improvements.push({
      title: entry.title,
      lampStatus: entry.currentLamp,
      previousLamp: entry.previousLamp,
      currentLamp: entry.currentLamp,
      updateKind: entry.updateKind,
      badCount: entry.badCount,
      poorCount: entry.poorCount,
      previousMissCount: entry.previousMissCount,
      missCount: entry.missCount,
      previousExScore: entry.previousExScore,
      exScore: entry.exScore,
      scoreRate: entry.scoreRate,
      scoreUpdated: Boolean(entry.scoreUpdated),
      levelText,
      sortSymbol: primaryLevel?.symbol ?? "",
      sortLevelRaw: primaryLevel?.levelRaw ?? "",
    });
  }

  return improvements;
}

function getLampImprovementSources(analysis, options = {}) {
  const useLocalScoreStateForUnlisted = Boolean(options.useLocalScoreStateForUnlisted);
  const sources = Array.isArray(analysis?.tables) ? [...analysis.tables] : [];
  const unlistedCharts = Array.isArray(analysis?.unlistedUpdateCharts) ? analysis.unlistedUpdateCharts : [];
  const localScoreStateCharts = Array.isArray(analysis?.localScoreState?.entries) ? analysis.localScoreState.entries : [];
  const unlistedSourceCharts =
    useLocalScoreStateForUnlisted ? mergeUnlistedSourceCharts(localScoreStateCharts, unlistedCharts) : unlistedCharts;
  if (unlistedSourceCharts.length > 0) {
    sources.push({
      sourceUrl: "__unlisted_updates__",
      name: "__unlisted_updates__",
      symbol: "",
      isUnlistedUpdateSource: true,
      charts: unlistedSourceCharts,
    });
  }
  return sources;
}

function mergeUnlistedSourceCharts(baseCharts, overrideCharts) {
  const merged = new Map();
  for (const chart of Array.isArray(baseCharts) ? baseCharts : []) {
    merged.set(buildChartIdentityKey(chart), chart);
  }
  for (const chart of Array.isArray(overrideCharts) ? overrideCharts : []) {
    merged.set(buildChartIdentityKey(chart), chart);
  }
  return [...merged.values()];
}

function collectKeyHitCountDelta(previousAnalysis, currentAnalysis) {
  const previousTotal = getAnalysisTotalHitCount(previousAnalysis);
  const currentTotal = getAnalysisTotalHitCount(currentAnalysis);
  if (previousTotal == null || currentTotal == null) {
    return null;
  }
  const delta = currentTotal - previousTotal;
  if (!Number.isFinite(delta) || delta <= 0) {
    return null;
  }
  return delta;
}

function collectPlayTimeDeltaSeconds(previousAnalysis, currentAnalysis) {
  const previousTotal = getAnalysisTotalPlayTimeSeconds(previousAnalysis);
  const currentTotal = getAnalysisTotalPlayTimeSeconds(currentAnalysis);
  if (previousTotal == null || currentTotal == null) {
    return null;
  }
  const delta = currentTotal - previousTotal;
  if (!Number.isFinite(delta) || delta <= 0) {
    return null;
  }
  return delta;
}

function getAnalysisTotalPlayTimeSeconds(analysis) {
  const total = Number(analysis?.player?.playTimeTotal?.totalSeconds);
  if (!Number.isFinite(total) || total < 0) {
    return null;
  }
  return Math.trunc(total);
}

function getAnalysisTotalHitCount(analysis) {
  const totals = analysis?.player?.hitTotals;
  if (!totals || typeof totals !== "object") {
    return null;
  }

  const explicit = Number.parseInt(totals.total, 10);
  if (Number.isFinite(explicit) && explicit >= 0) {
    return explicit;
  }

  const perfect = Number.parseInt(totals.perfect, 10);
  const great = Number.parseInt(totals.great, 10);
  const good = Number.parseInt(totals.good, 10);
  const bad = Number.parseInt(totals.bad, 10);
  const poor = Number.parseInt(totals.poor, 10);
  const values = [perfect, great, good, bad, poor];
  if (values.every((value) => Number.isFinite(value) && value >= 0)) {
    return values.reduce((sum, value) => sum + value, 0);
  }

  return null;
}

function getLevelSummaryTitle(mode) {
  return normalizeLevelChartMode(mode) === "score" ? "SCORE LAMP" : "CLEAR LAMP";
}

function toChartLampLabel(lamp) {
  return lampLabels[lamp] || lamp;
}

function createFloatingTooltip() {
  const tooltip = document.createElement("div");
  tooltip.className = "floating-tooltip hidden";
  document.body.append(tooltip);
  return tooltip;
}

function showFloatingTooltip(text, event) {
  if (!text || !event) {
    return;
  }
  levelChartTooltip.textContent = text;
  levelChartTooltip.classList.remove("hidden");
  levelChartTooltip.style.left = `${event.clientX + 12}px`;
  levelChartTooltip.style.top = `${event.clientY + 12}px`;
}

function hideFloatingTooltip() {
  levelChartTooltip.classList.add("hidden");
}

function normalizeLampStatusForUi(status) {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "UNMATCHED" || normalized === "UNSUPPORTED") {
    return "NO PLAY";
  }
  if (lampOptions.includes(normalized)) {
    return normalized;
  }
  return "NO PLAY";
}

function isNoPlayableDataLamp(status) {
  const normalized = normalizeLampStatusForUi(status);
  return normalized === "NO PLAY" || normalized === "NO SONG";
}

function buildLampSummaryFromCharts(charts) {
  const summary = createEmptyLampSummary();
  for (const chart of charts) {
    const lamp = normalizeLampStatusForUi(chart?.lampStatus);
    summary[lamp] = (summary[lamp] ?? 0) + 1;
  }
  return summary;
}

function countClearFromCharts(charts) {
  return charts.filter((chart) => ["FULL COMBO", "HARD CLEAR", "CLEAR", "EASY CLEAR"].includes(chart.lampStatus)).length;
}

function countPlayedFromCharts(charts) {
  return charts.filter((chart) =>
    ["FULL COMBO", "HARD CLEAR", "CLEAR", "EASY CLEAR", "FAILED"].includes(chart.lampStatus),
  ).length;
}

function buildLevelSummariesForUi(charts, levelOrder = []) {
  const grouped = new Map();
  for (const chart of charts) {
    if (!grouped.has(chart.level)) {
      grouped.set(chart.level, []);
    }
    grouped.get(chart.level).push(chart);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => compareLevels(left, right, levelOrder))
    .map(([level, levelCharts]) => {
      const totalCharts = levelCharts.length;
      const clearCount = countClearFromCharts(levelCharts);
      const playedCount = countPlayedFromCharts(levelCharts);
      return {
        level,
        totalCharts,
        summary: buildLampSummaryFromCharts(levelCharts),
        clearRate: totalCharts ? (clearCount / totalCharts) * 100 : null,
        playedRate: totalCharts ? (playedCount / totalCharts) * 100 : null,
      };
    });
}

function normalizeAnalysisLampStatuses(analysis) {
  if (!analysis || typeof analysis !== "object" || !Array.isArray(analysis.tables)) {
    return analysis;
  }

  const normalizedTables = analysis.tables.map((table) => {
    const normalizedCharts = Array.isArray(table?.charts)
      ? table.charts.map((chart) => ({
          ...chart,
          lampStatus: normalizeLampStatusForUi(chart?.lampStatus),
        }))
      : [];
    const totalCharts = normalizedCharts.length;
    const clearCount = countClearFromCharts(normalizedCharts);
    const playedCount = countPlayedFromCharts(normalizedCharts);
    return {
      ...table,
      charts: normalizedCharts,
      summary: buildLampSummaryFromCharts(normalizedCharts),
      levelSummaries: buildLevelSummariesForUi(normalizedCharts, table.levelOrder),
      stats: {
        ...table.stats,
        totalCharts,
        clearCount,
        playedCount,
        matchableCount: totalCharts,
        clearRate: totalCharts ? (clearCount / totalCharts) * 100 : null,
        playedRate: totalCharts ? (playedCount / totalCharts) * 100 : null,
      },
    };
  });

  const overallCharts = normalizedTables.flatMap((table) => table.charts ?? []);
  const overallTotal = overallCharts.length;
  const overallClearCount = countClearFromCharts(overallCharts);
  const overallPlayedCount = countPlayedFromCharts(overallCharts);

  return {
    ...analysis,
    tables: normalizedTables,
    overall: {
      ...analysis.overall,
      tableCount: normalizedTables.length,
      tableEntryCount: normalizedTables.reduce((sum, table) => sum + (table.charts?.length ?? 0), 0),
      summary: buildLampSummaryFromCharts(overallCharts),
      clearCount: overallClearCount,
      playedCount: overallPlayedCount,
      matchableCount: overallTotal,
      clearRate: overallTotal ? (overallClearCount / overallTotal) * 100 : null,
      playedRate: overallTotal ? (overallPlayedCount / overallTotal) * 100 : null,
    },
  };
}

function mergePlayerProfileFields(primary, fallback) {
  const left = primary && typeof primary === "object" ? primary : {};
  const right = fallback && typeof fallback === "object" ? fallback : {};
  const leftSkillAnalyzer = left.skillAnalyzer && typeof left.skillAnalyzer === "object" ? left.skillAnalyzer : null;
  const rightSkillAnalyzer = right.skillAnalyzer && typeof right.skillAnalyzer === "object" ? right.skillAnalyzer : null;
  const mergedSkillAnalyzer = leftSkillAnalyzer || rightSkillAnalyzer || null;
  const leftStella = left.stellaSkill4th && typeof left.stellaSkill4th === "object" ? left.stellaSkill4th : null;
  const rightStella = right.stellaSkill4th && typeof right.stellaSkill4th === "object" ? right.stellaSkill4th : null;
  return {
    ...right,
    ...left,
    id: String(left.id ?? "").trim() || String(right.id ?? "").trim(),
    name: String(left.name ?? "").trim() || String(right.name ?? "").trim(),
    lr2Id: String(left.lr2Id ?? "").trim() || String(right.lr2Id ?? "").trim(),
    grade: String(left.grade ?? "").trim() || String(right.grade ?? "").trim(),
    gradeSp: String(left.gradeSp ?? "").trim() || String(right.gradeSp ?? "").trim(),
    gradeDp: String(left.gradeDp ?? "").trim() || String(right.gradeDp ?? "").trim(),
    skillAnalyzer: mergedSkillAnalyzer,
    stellaSkill4th: leftStella || rightStella || mergedSkillAnalyzer?.st || null,
    overjoyTripleCrown: Boolean(left.overjoyTripleCrown) || Boolean(right.overjoyTripleCrown),
  };
}

function normalizePlayerCacheId(value) {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "manual") {
    return "";
  }
  return text;
}

function createEmptyLampSummary() {
  return Object.fromEntries(lampOptions.map((lamp) => [lamp, 0]));
}

initializePersistence().catch((error) => {
  console.error("Failed to initialize persistence", error);
});

async function initializePersistence() {
  await restoreCustomTableListEntries();
  await restoreTablePresetSelection();
  syncPresetCheckboxesFromState();
  void refreshTableList({ silent: true }).catch((error) => {
    console.error("Failed to load table list", error);
  });
  const restoredFormState = await restoreFormState();
  const restoredAnalysis = await restoreLatestAnalysis();
  let shouldShowLanguagePrompt = !hasStoredLanguagePreference;
  if (shouldShowLanguagePrompt && shouldSkipInitialLanguagePrompt()) {
    hasStoredLanguagePreference = true;
    applyLanguage(getStartupLanguagePreference());
    shouldShowLanguagePrompt = false;
  }

  if (restoredAnalysis) {
    const autoReloadResult = await maybeAutoReloadOnDbUpdate(restoredAnalysis);
    if (autoReloadResult === "reloading") {
      if (shouldShowLanguagePrompt) {
        showInitialLanguagePrompt();
      }
      return;
    }
    if (autoReloadResult === "declined") {
      if (shouldShowLanguagePrompt) {
        showInitialLanguagePrompt();
      }
      return;
    }
    setStatus("保存された前回の読み込み結果を復元しました。必要なら再読み込みで最新状態を取得してください。");
    if (shouldShowLanguagePrompt) {
      showInitialLanguagePrompt();
    }
    return;
  }

  if (restoredFormState) {
    setStatus("保存された入力内容を復元しました。");
  } else {
    setStatus("まずはメニューから読み込み設定を行ってください。");
  }
  renderAnalysis();
  if (shouldShowLanguagePrompt) {
    showInitialLanguagePrompt();
  }
}

async function maybeAutoReloadOnDbUpdate(restoredAnalysis) {
  const scoreDbPath = scoreDbPathInput.value.trim();
  if (!scoreDbPath || !restoredAnalysis) {
    return "unchanged";
  }

  const previousState = normalizeLocalDbStateForCompare(restoredAnalysis.localDbState);
  if (!previousState.scoreDb.path) {
    return "unchanged";
  }

  try {
    const currentState = normalizeLocalDbStateForCompare(
      await fetchLocalDbState(scoreDbPath, songDbPathInput.value.trim()),
    );
    if (!hasLocalDbStateChanged(previousState, currentState)) {
      return "unchanged";
    }

    const shouldReload = await showPlayUpdatePrompt();
    if (!shouldReload) {
      setStatus("プレイ更新を検知しました。反映する場合は読み込みボタンを押してください。");
      return "declined";
    }

    setStatus("プレイ更新を反映しています。");
    window.setTimeout(() => {
      if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      }
    }, 0);
    return "reloading";
  } catch (error) {
    console.error("Failed to check local DB update state", error);
    return "unchanged";
  }
}

async function fetchLocalDbState(scoreDbPath, songDbPath) {
  return postJsonApi("/api/local-db-state", {
    scoreDbPath: String(scoreDbPath ?? "").trim(),
    songDbPath: String(songDbPath ?? "").trim(),
  });
}

function normalizeLocalDbStateForCompare(state) {
  return {
    scoreDb: normalizeLocalDbFileState(state?.scoreDb),
    songDb: normalizeLocalDbFileState(state?.songDb),
  };
}

function normalizeLocalDbFileState(fileState) {
  const size = Number(fileState?.size);
  const mtimeMs = Number(fileState?.mtimeMs);
  return {
    path: normalizePathForCompare(fileState?.path),
    exists: Boolean(fileState?.exists),
    size: Number.isFinite(size) ? size : null,
    mtimeMs: Number.isFinite(mtimeMs) ? Math.trunc(mtimeMs) : null,
  };
}

function normalizePathForCompare(value) {
  return String(value ?? "")
    .trim()
    .replace(/[\\/]+/g, "/")
    .toLowerCase();
}

function hasLocalDbStateChanged(previousState, currentState) {
  if (hasLocalDbFileChanged(previousState?.scoreDb, currentState?.scoreDb)) {
    return true;
  }
  if (hasLocalDbFileChanged(previousState?.songDb, currentState?.songDb)) {
    return true;
  }
  return false;
}

function hasLocalDbFileChanged(previousFile, currentFile) {
  const previous = normalizeLocalDbFileState(previousFile);
  const current = normalizeLocalDbFileState(currentFile);

  if (!previous.path && !current.path) {
    return false;
  }
  if (previous.path !== current.path) {
    return true;
  }
  if (previous.exists !== current.exists) {
    return true;
  }
  if (!current.exists) {
    return false;
  }

  return previous.size !== current.size || previous.mtimeMs !== current.mtimeMs;
}

async function restoreTablePresetSelection() {
  const persisted = await readPersistedValue(TABLE_PRESET_SELECTION_KEY);
  if (!Array.isArray(persisted)) {
    selectedTableUrls = new Set();
    rebuildAvailableTableListEntries();
    return false;
  }

  const fallbackById = new Map(DEFAULT_TABLE_LIST_ENTRIES.map((preset) => [preset.id, preset.url]));
  selectedTableUrls = new Set(
    dedupeTableUrlsByNormalizedKey(
      persisted
        .map((value) => String(value))
        .map((value) => fallbackById.get(value) || value),
    ),
  );
  rebuildAvailableTableListEntries();
  return true;
}

async function persistTablePresetSelection() {
  await writePersistedValue(TABLE_PRESET_SELECTION_KEY, dedupeTableUrlsByNormalizedKey([...selectedTableUrls]));
}

async function restoreCustomTableListEntries() {
  const persisted = await readPersistedValue(CUSTOM_TABLE_LIST_KEY);
  if (!Array.isArray(persisted)) {
    customTableListEntries = [];
    rebuildAvailableTableListEntries();
    return false;
  }

  const seen = new Set();
  customTableListEntries = persisted
    .map((entry) => normalizeCustomTableListEntry(entry))
    .filter((entry) => {
      if (!entry) {
        return false;
      }
      const key = normalizeTableUrlForDisplayLookup(entry.url);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  rebuildAvailableTableListEntries();
  return true;
}

async function persistCustomTableListEntries() {
  await writePersistedValue(CUSTOM_TABLE_LIST_KEY, customTableListEntries);
}

async function restoreFormState() {
  const persisted = await readPersistedValue(FORM_STATE_KEY);
  if (!persisted) {
    return false;
  }

  scoreDbPathInput.value = persisted.scoreDbPath ?? "";
  songDbPathInput.value = persisted.songDbPath ?? "";
  if (screenshotDirPathInput) {
    screenshotDirPathInput.value = persisted.screenshotDirPath ?? "";
  }
  if (rivalFolderPathInput) {
    rivalFolderPathInput.value = persisted.rivalFolderPath ?? "";
  }
  tableUrlsInput.value = manualTableUrlTogglesContainer ? persisted.tableUrlsText ?? "" : "";
  disabledManualTableUrls = manualTableUrlTogglesContainer
    ? new Set(Array.isArray(persisted.disabledManualTableUrls) ? persisted.disabledManualTableUrls : [])
    : new Set();
  renderManualTableUrlToggles();
  levelChartMode = normalizeLevelChartMode(persisted.levelChartMode);
  updateLevelModeToggleButton();
  hasStoredLanguagePreference =
    Boolean(persisted.languagePromptSeen) || Object.prototype.hasOwnProperty.call(persisted, "language");
  applyLanguage(persisted.language, { persist: false });
  includeBpUpdatesInLampUpdates = Boolean(persisted.includeBpUpdatesInLampUpdates);
  if (includeBpUpdatesInput) {
    includeBpUpdatesInput.checked = includeBpUpdatesInLampUpdates;
  }
  includeUnlistedChartsInLampUpdates = Boolean(persisted.includeUnlistedChartsInLampUpdates);
  if (includeUnlistedUpdatesInput) {
    includeUnlistedUpdatesInput.checked = includeUnlistedChartsInLampUpdates;
  }
  scoreDbMode = normalizeScoreDbMode(persisted.scoreDbMode);
  if (scoreDbModeSelect) {
    scoreDbModeSelect.value = scoreDbMode;
  }
  skillAnalyzerFetchMode = normalizeSkillAnalyzerFetchMode(persisted.skillAnalyzerFetchMode);
  syncSkillAnalyzerFetchModeControls();
  applyTheme(persisted.themeMode, { persist: false });
  return true;
}

async function restoreLatestAnalysis() {
  const persisted = await readPersistedValue(LAST_ANALYSIS_KEY);
  if (!persisted) {
    return null;
  }

  latestAnalysis = normalizeAnalysisLampStatuses(persisted);
  renderAnalysis();
  resultsRoot.classList.remove("hidden");
  return latestAnalysis;
}

async function persistFormState() {
  await writePersistedValue(FORM_STATE_KEY, {
    scoreDbPath: scoreDbPathInput.value.trim(),
    songDbPath: songDbPathInput.value.trim(),
    screenshotDirPath: getScreenshotDirectoryPath(),
    rivalFolderPath: rivalFolderPathInput?.value.trim() ?? "",
    tableUrlsText: manualTableUrlTogglesContainer ? tableUrlsInput.value : "",
    disabledManualTableUrls: manualTableUrlTogglesContainer ? [...disabledManualTableUrls] : [],
    levelChartMode,
    language: selectedLanguage,
    languagePromptSeen: hasStoredLanguagePreference,
    themeMode: selectedThemeMode,
    includeBpUpdatesInLampUpdates,
    includeUnlistedChartsInLampUpdates,
    scoreDbMode,
    skillAnalyzerFetchMode,
  });
}

async function persistLatestAnalysis(analysis) {
  await writePersistedValue(LAST_ANALYSIS_KEY, analysis);
}

async function clearPersistedState() {
  await deletePersistedValue(FORM_STATE_KEY);
  await deletePersistedValue(LAST_ANALYSIS_KEY);
  await deletePersistedValue("player-profile-cache");
}

async function openPersistenceDb() {
  if (IS_PYWEBVIEW_DESKTOP) {
    return null;
  }

  if (!("indexedDB" in window)) {
    return null;
  }

  if (!persistenceDbPromise) {
    persistenceDbPromise = new Promise((resolve) => {
      let settled = false;
      const finish = (db) => {
        if (settled) {
          return;
        }
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(db);
      };
      const timeoutId = window.setTimeout(() => {
        console.warn("IndexedDB open timed out. Falling back to localStorage.");
        finish(null);
      }, PERSISTENCE_OPEN_TIMEOUT_MS);

      let request;
      try {
        request = indexedDB.open(PERSISTENCE_DB_NAME, 1);
      } catch (error) {
        console.warn("IndexedDB open failed. Falling back to localStorage.", error);
        finish(null);
        return;
      }

      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(PERSISTENCE_STORE_NAME)) {
          request.result.createObjectStore(PERSISTENCE_STORE_NAME);
        }
      };

      request.onsuccess = () => finish(request.result);
      request.onerror = () => {
        console.warn("IndexedDB open failed. Falling back to localStorage.", request.error);
        finish(null);
      };
      request.onblocked = () => {
        console.warn("IndexedDB open was blocked. Falling back to localStorage.");
        finish(null);
      };
    });
  }

  return persistenceDbPromise;
}

async function readPersistedValue(key) {
  const db = await openPersistenceDb();
  if (!db) {
    return readLocalStoragePersistedValue(key);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PERSISTENCE_STORE_NAME, "readonly");
    const request = transaction.objectStore(PERSISTENCE_STORE_NAME).get(key);

    request.onsuccess = () => {
      const record = request.result;
      if (!record || record.version !== PERSISTENCE_SCHEMA_VERSION) {
        resolve(null);
        return;
      }
      resolve(record.value);
    };
    request.onerror = () => reject(request.error);
  });
}

async function writePersistedValue(key, value) {
  const db = await openPersistenceDb();
  if (!db) {
    return writeLocalStoragePersistedValue(key, value);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PERSISTENCE_STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(PERSISTENCE_STORE_NAME).put(
      {
        version: PERSISTENCE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        value,
      },
      key,
    );
  });
}

async function deletePersistedValue(key) {
  const db = await openPersistenceDb();
  if (!db) {
    return deleteLocalStoragePersistedValue(key);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PERSISTENCE_STORE_NAME, "readwrite");
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.objectStore(PERSISTENCE_STORE_NAME).delete(key);
  });
}

function buildLocalStoragePersistenceKey(key) {
  return `${PERSISTENCE_LOCAL_STORAGE_PREFIX}${key}`;
}

function readLocalStoragePersistedValue(key) {
  try {
    const raw = window.localStorage?.getItem(buildLocalStoragePersistenceKey(key));
    if (!raw) {
      return null;
    }
    const record = JSON.parse(raw);
    if (!record || record.version !== PERSISTENCE_SCHEMA_VERSION) {
      return null;
    }
    return record.value ?? null;
  } catch (error) {
    console.warn("localStorage read failed", error);
    return null;
  }
}

function writeLocalStoragePersistedValue(key, value) {
  try {
    window.localStorage?.setItem(
      buildLocalStoragePersistenceKey(key),
      JSON.stringify({
        version: PERSISTENCE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        value,
      }),
    );
    return true;
  } catch (error) {
    console.warn("localStorage write failed", error);
    return false;
  }
}

function deleteLocalStoragePersistedValue(key) {
  try {
    window.localStorage?.removeItem(buildLocalStoragePersistenceKey(key));
    return true;
  } catch (error) {
    console.warn("localStorage delete failed", error);
    return false;
  }
}

function debounce(callback, delayMs) {
  let timeoutId = null;

  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delayMs);
  };
}
