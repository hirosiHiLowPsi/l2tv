# L2TV Refactoring Plan

## 方針

この計画は全面書き換えではありません。外部APIと画面挙動を先にテストで固定し、純粋な計算・DB adapter・外部取得 adapterから小さく分離します。仕様変更とリファクタリングは別コミットにします。

## 目標構成

### Backend

```text
src/
  server/
    app-server.js       # server生成、route登録、エラー境界
    routes/              # analyze, table, profile, db-state
    middleware/          # Host, Origin, token, body limit
    security/            # public URL validation, redirect policy
    cache/               # bounded cache, TTL, file fingerprint
  domain/
    score/               # EX/BP/lamp/score conversion
    grade/               # GENOSIDE/st/sl course state
    table/               # table model, dedupe, hash matching
    rival/               # comparison and normalized rival model
    force-rating/        # constants, coefficients, candidate selection
  infrastructure/
    sqlite/              # read-only connection and schema capabilities
    filesystem/          # local paths, fingerprints
    remote-fetch/        # HTTP, DNS, redirect, decoding
    stellaverse/         # profile/clear-status adapter
```

`server.js`は当面compatibility entrypointとして`createAppServer`、`startServer`、テスト対象のpure functionをexportし、各routeからdomainへ依存する形にします。

### Frontend

```text
public/js/
  main.js                # bootstrap and event wiring
  api-client.js          # token and POST JSON API
  state.js               # typed-ish application state and actions
  persistence.js         # IndexedDB/localStorage and migrations
  i18n.js                # Japanese/English catalog
  settings.js            # form state and display settings
  table-manager.js       # table list, tags, selection, order
  player-profile.js      # Player Data and grades
  chart-list.js          # table rows, sort, folder summary
  update-detector.js     # file state and lamp/score delta
  rival.js               # local/Stellaverse Rival UI
  force-rating-view.js   # FORCE cards, targets, change history
  image-export.js        # Canvas renderers and save requests
  render-utils.js        # common DOM/canvas helpers
```

当面は既存`public/app.js`から薄いfacadeを呼び出し、DOM IDと保存キーを変えません。分割完了後にscript読み込みをmodule化します。

## Phase 0: 事前固定

### 目的

変更前の現行挙動を失わず、レビュー単位を作る。

### 対象

- `server.js`
- `public/app.js`
- `scripts/force-rating.test.js`
- 新規fixtureと`TEST_PLAN.md`

### 変更内容

- `npm test`を追加し、既存`test:force`を含める
- schema、lamp、hash、FORCE、表parserのpure function exportまたはtest seamを作る
- SQLite fixtureは一時ディレクトリへ作り、終了後に削除
- current analysis JSONのgolden fixtureを少数作る

### 依存関係

なし。以後の全Phaseの前提。

### リスク

テストの期待値を仕様変更として書いてしまうこと。現行出力を先に保存し、変更案は別テストにする。

### テスト方法

`npm test`、`node --check`、fixtureのDB内容ハッシュ比較。

### 完了条件

現行FORCEと代表DB/表の出力がCIで再現し、DBが変更されないことを自動確認できる。

## Phase 1: SQLite repositoryの分離

### 目的

読み取り専用、schema差異、close保証を一箇所に集める。

### 対象

- `server.js:loadPlayerMyListFromScoreDb`
- `server.js:loadSongDbCatalogData`
- `server.js:loadRivalDb`
- `server.js:inferLocalGradeInfoFromSongDbGrades`
- `server.js:loadLocalSkillAnalyzerProgress`

### 変更内容

`infrastructure/sqlite/`に以下のinterfaceを作ります。

```text
ScoreRepository.readProfile()
ScoreRepository.readScores(capabilities)
SongRepository.readSongs()
SongRepository.readGrades()
RivalRepository.readScores()
```

返り値に`capabilities`、`missingColumns`、`warnings`を含め、列不足とDB破損を区別します。値はすべてnormalized domain modelへ変換します。

### 依存関係

Phase 0のfixture。仕様変更なし。

### リスク

列フォールバックの順序、段位hashの優先順位、NULL処理を変える危険があります。

### テスト方法

T-001～T-019、DB前後ハッシュ比較、例外時のclose確認。

### 完了条件

route/domainから`DatabaseSync`の直接呼出しがなく、readonlyとcloseがrepository内だけに存在する。

## Phase 2: remote fetchとtable parserの分離

### 目的

SSRF対策、サイズ、timeout、redirect、文字コードと表形式parserを独立して検証する。

### 対象

- `server.js:fetchRemoteText`
- `server.js:resolvePublicRemoteTarget`
- `server.js:fetchRemoteWithValidatedRedirects`
- `server.js:loadTableHeaderFromUrl`
- `server.js:parseTableList*`
- `server.js:normalizeChartItem`

### 変更内容

```text
RemoteFetcher.fetchText(url, policy)
PublicUrlPolicy.validate(url)
TableHeaderParser.parse(source)
TableDataParser.parse(scoreJson)
TableNormalizer.normalize(item)
```

fetcherはDNS解決済みアドレスをrequestに使う現行防御を維持し、parserはネットワークを知らない純粋関数にします。

### 依存関係

Phase 0。実際の公開サイトへアクセスするテストは行わずfixtureを使う。

### リスク

表URLの相対解決、redirect後のbase URL、Shift-JIS/UTF-8の挙動を壊す可能性があります。

### テスト方法

T-028～T-032、実在表の保存fixtureによる再現テスト。

### 完了条件

危険URLの拒否と正常表の解析が、ネットワークなしでテストできる。

## Phase 3: domain計算の分離

### 目的

ランプ、スコア、段位、FORCE RATEの計算を入力データだけで再現可能にする。

### 対象

- `server.js:normalizeLocalScoreLamp`
- `server.js:buildLocalScoreInfo`
- `server.js:inferLocalGradeInfoFromSongDbGrades`
- `server.js:buildForceRating`
- `server.js:calculateForceScoreCoefficient`
- `server.js:getForceRatingTier`
- `public/data/force-chart-constants.json`

### 変更内容

```text
domain/score/score-model.js
domain/grade/course-evaluator.js
domain/force-rating/calculator.js
domain/force-rating/constant-schema.js
```

FORCE calculatorの入力は`{ constants, scores, danCandidate }`、出力はimmutableな結果にします。`chartConstant`の定数生成はruntime calculatorから分離し、生成scriptとruntime JSONを別契約にします。

### 依存関係

Phase 1のrepositoryモデル、Phase 0のFORCEテスト。

### リスク

丸め、上位50、段位1件、Overjoy満額、同率sortを変える危険があります。

### テスト方法

T-015～T-024、現行21件を移植後も同じ期待値で実行する。

### 完了条件

FORCE計算がHTTP、SQLite、DOMなしで実行でき、入力JSONから同一結果が得られる。

## Phase 4: routeとserverの分離

### 目的

HTTP境界とアプリケーションサービスの依存方向を固定する。

### 対象

- `server.js:217-304`
- `analyzeRequest`
- `loadTableListRequest`
- `loadTableMetaRequest`
- `loadProfileFromScoreDbRequest`
- `loadLocalDbStateRequest`

### 変更内容

```text
server/routes/analyze-route.js
server/routes/table-route.js
server/routes/profile-route.js
server/middleware/request-security.js
server/app-server.js
```

routeは入力検証とservice呼出し、serviceはdomain/infrastructure呼出し、domainは外部副作用なしとします。既存のURLとJSON shapeは維持します。

### 依存関係

Phase 1～3。

### リスク

API response shape、エラーstatus、クライアントの期待を壊す危険があります。

### テスト方法

server integration test、既存rendererのAPI fixture、invalid request matrix。

### 完了条件

routeごとに単独テストでき、`server.js`は起動entrypointとcompatibility exportに縮小される。

## Phase 5: Stellaverse adapterの分離

### 目的

DOM依存を一箇所に閉じ込め、IR停止・変更時の影響を限定する。

### 対象

- `electron-main.js:162-279`
- `electron-main.js:283-360`
- `electron-main.js:431-540`
- `public/app.js`のRival/IR state

### 変更内容

```text
infrastructure/stellaverse/profile-adapter.js
infrastructure/stellaverse/clear-status-adapter.js
infrastructure/stellaverse/rival-adapter.js
infrastructure/stellaverse/html-parser.js
```

BrowserWindow生成、origin allowlist、timeout、session partition、DOM parser、normalized resultを分けます。Rendererには`fetchRival`と`fetchRankings`だけを残します。

### 依存関係

Phase 0のHTML fixture、Phase 4のservice境界。

### リスク

ログイン/セッション、privateプロフィール、表コード許可リストを変える危険があります。

### テスト方法

T-026、T-039、T-040、T-041と外部通信なしのHTML parser test。

### 完了条件

HTML DOM変更がUI全体へ波及せず、fixtureでprofile/score/rankが再現できる。

## Phase 6: frontend分割

### 目的

`public/app.js`の状態、描画、永続化、画像出力を小さくする。

### 対象

- `public/app.js`
- `public/index.html`
- `public/styles.css`

### 変更内容

1. `state.js`へグローバル状態とactionを集約
2. `persistence.js`へIndexedDB/localStorageとschema migrationを集約
3. `api-client.js`へtoken/API errorを集約
4. `table-manager.js`へ表一覧、選択、tag、drag orderを集約
5. `chart-list.js`へsort、folder、Rival、IR表示を集約
6. `force-rating-view.js`へFORCE target/change viewを集約
7. `image-export.js`へCanvas rendererを集約
8. `i18n.js`へ文字列カタログを集約

### 依存関係

backend API shapeを先に固定するPhase 4が必要です。

### リスク

既存保存キー、初回言語prompt、細かいUI状態、画像の見た目を壊す可能性があります。

### テスト方法

T-035～T-038、画像pixel/size smoke、日英とテーマの手動確認。

### 完了条件

各moduleが1つの責務を持ち、画面イベントからAPI/DOM/永続化の経路が追跡できる。

## 共通ルール

- 1Phaseを複数のレビュー可能なコミットに分ける
- `refactor:`コミットでは仕様値を変更しない
- 変更前後で`npm test`、`node --check`、対象fixtureを実行する
- DB原本を直接開かず、コピーまたは生成fixtureを使う
- public API、保存キー、FORCE定数version、画像出力の互換性をチェックする
