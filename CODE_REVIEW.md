# L2TV Code Review

レビュー日: 2026-07-12  
対象: `agent/release-2.1.0-ui-ir-rival` の作業ツリー  
判定: 現行機能は実用可能。ただし、次の機能追加を安全に続けるには、テスト基盤と責務分割を先に整えるべきです。

## 総合評価

L2TVは、ローカルDBを読み取り、難易度表とハッシュ照合し、ランプ・スコア・BP・段位・Rival・FORCE RATEを表示するElectronアプリとして一通り成立しています。特に、ユーザーDBを読み取り専用で開くこと、ローカルHTTP APIをループバックに限定すること、Electronの分離設定、外部URL取得のサイズ・タイムアウト・リダイレクト制限は良い設計です。

最大の課題は、責務が`server.js`、`public/app.js`、`public/styles.css`に集中していることです。`server.js`は3,792行・約119KB、`public/app.js`は9,166行・約325KBで、DBアダプター、外部取得、ドメイン計算、API、UI状態、画像描画が相互に結び付いています。変更のたびに広い回帰テストが必要ですが、現在リポジトリ内で自動化されているのは主にFORCE RATEの21テストです。

## 調査したファイル

- `electron-main.js`: Electron起動、BrowserWindow、IPC、画像保存、Stellaverse取得、終了処理
- `electron-preload.js`: rendererへ公開する最小IPC API
- `server.js`: ローカルHTTPサーバー、SQLite読込、難易度表取得、Rival、段位、FORCE RATE
- `public/app.js`: UI状態、設定永続化、表管理、表示、画像Canvas描画、Rival UI
- `public/index.html`: メニュー、結果領域、モーダル、初期UI
- `public/styles.css`: UI・テーマ・表・Rival・画像出力補助のスタイル
- `package.json` / `package-lock.json`: Electron、electron-builder、scripts、配布設定
- `scripts/force-rating.test.js`: FORCE RATEの単体寄りテスト21件
- `scripts/`: FORCE定数生成、レポート、コースhash抽出、配布用アーカイブ作成
- `.github/dependabot.yml`: npmとGitHub ActionsのDependabot設定。CI workflowは確認できない
- `README.md`、`FORCE_RATE_SPEC.md`、`FORCE_CHART_CONSTANT_SPEC.md`、`THIRD_PARTY_NOTICES.md`、`public/l2tv-architecture-manual.html`

## 良い点

1. `server.js:489,1517,2500,2603`などで、ユーザーの`score.db`、`song.db`、Rival DBを`new DatabaseSync(path, { readonly: true })`で開いています。各処理に`finally`の`database?.close()`があります。
2. `server.js:581-706`で、API POSTにContent-Type、API token、Origin、Host、接続元ループバックを確認しています。
3. `server.js:2095-2309`で、外部取得にHTTPS検証、DNS解決、プライベートIP拒否、20秒タイムアウト、25MB上限、リダイレクト5回上限があります。
4. `electron-main.js:360-381`で、`contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`、外部遷移制御、権限拒否を設定しています。
5. `server.js:2065-2077`のキャッシュは最大300件に制限され、ファイルDBキャッシュにはファイルサイズと更新時刻が含まれます。
6. `scripts/force-rating.test.js`は、AAA未満、AAA、94.44%、MAX、NO PLAY、上位50件、段位枠、Overjoyを含む現在のFORCE仕様を数値で固定しています。
7. FORCE RATEの定数JSON、仕様書、生成スクリプト、配布スクリプトが分かれており、計算結果の再現に必要なデータがリポジトリ内にあります。

## 問題点と技術的負債

### P1: CIと統合テストがない

`.github/dependabot.yml`はありますが、Pull Requestで`node --check`、`npm test`、外部入力テスト、配布スモークテストを実行するGitHub Actions workflowは確認できません。`package.json`のテストscriptも`test:force`のみです。

影響: UI、IPC、SQLite、表取得、画像出力の破壊をマージ前に検出できません。  
改善: Phase 1でNode構文、FORCE、SQLite fixture、HTTP security、HTML parserをCI化します。

### P1: 配布物のライセンス通知が配布設定に含まれているか要確認

`package.json`の`build.extraFiles`には`readme.txt`、`readme_en.txt`、`README.md`、`FORCE_RATE_SPEC.md`、`更新履歴.txt`が登録されていますが、リポジトリの`LICENSE`、`THIRD_PARTY_NOTICES.md`は明示されていません。READMEは配布物にライセンス通知を同梱すると説明しています。

影響: ソースリポジトリでは通知が見えても、実際の配布アーカイブで通知が欠落する可能性があります。  
改善: 配布アーカイブを検査するテストを追加し、必要な通知ファイルを`extraFiles`へ明示します。

### P1: Stellaverse HTMLスクレイピングがDOM構造に強く依存する

`electron-main.js:283-360`は非表示BrowserWindowで`executeJavaScript`を実行し、見出し、表の`th`、本文文字列からデータを抽出します。HTML fixtureとページ構造変更の検知テストはありません。

影響: Stellaverse側の軽微な文言・DOM変更で、名前、段位、スコア、順位、Rival全体が空になる可能性があります。  
改善: `StellaverseAdapter`を独立させ、固定HTML fixture、タイムアウト、非公開プロフィール、空表、列順変更をテストします。

### P2: `server.js`に責務が集中している

`server.js`はHTTPルーティング、セキュリティ、外部取得、表解析、SQLite複数形式、段位、Rival、FORCE RATEを同じモジュールで扱います。トップレベル関数は約162個です。

影響: 変更の影響範囲が読みにくく、純粋関数としてテストできる部分もHTTP・ファイル・DBの副作用に近付きます。  
改善: API、remote-fetch、SQLite repository、table parser、domain calculator、rival adapterを段階的に分離します。

### P2: `public/app.js`のグローバル状態と副作用が多い

`public/app.js`は約9,166行で、状態変数、イベント登録、DOM生成、IndexedDB/localStorage、API通信、画像Canvas描画を同居させています。トップレベル関数は約355個です。

影響: 表示設定、再読み込み、Rival、画像出力の間で暗黙の依存が生じやすく、画面単位のテストが困難です。  
改善: state、persistence、api-client、table、chart-list、rival、force、image-export、i18nへ分離し、DOMを受け取る描画関数を純粋化します。

### P2: SQLiteの大量`.all()`と同期API

`server.js:1534-1550,2506,2605,2706,2804,2934,3067-3084`では、score、song、grade、rivalを`DatabaseSync`の同期prepareと`.all()`で一括取得します。

影響: 大規模DBやRival数が多い場合、ローカルHTTPサーバーのイベントループを長時間占有し、起動やUI応答が遅くなる可能性があります。  
改善: repository層で読み取り範囲を限定し、必要ならworker thread、ページング、遅延ロードを検討します。まずfixtureと実DBの計測値を追加します。

### P2: スキーマ差異のエラーが静かに縮退する

score列の取得は複数のSELECTを順に試し、失敗時に列を減らします。song/grade/Rivalも一部の`catch {}`で空データへ縮退します。

影響: 破損・未対応DBと、正常だが任意列がないDBの区別がUIから分かりにくく、BPや段位が欠落しても気付きにくいです。  
改善: `SchemaCapability`を返し、読み取れた列と欠落列を診断情報として表示・ログ化します。

### P2: 外部URL取得の安全性は実装されているが、回帰テストがない

`resolvePublicRemoteTarget`はDNS結果のプライベートIPを拒否し、実際のHTTP requestは解決済みアドレスに送っています。これは良い対策ですが、DNS、リダイレクト、IPv4-mapped IPv6、サイズ超過の自動テストがありません。

影響: 将来の変更でSSRF防御を壊しても検知できません。脆弱性が確認されたという意味ではなく、重要な境界のテスト不足です。  
改善: fake DNS/requestまたはローカルfixtureを使い、許可・拒否を固定します。

### P2: ローカルAPIのtokenはループバック上の任意クライアントから取得可能

`GET /api/client-config`はAPI tokenを返します。POST側はtokenを要求し、Host/Origin/loopbackも検証しますが、同じユーザーの別プロセスがループバックにアクセスできる脅威モデルではtoken取得が可能です。

影響: ローカル同一ユーザー内の分離は限定的です。外部ネットワークからの到達はHostと接続元制限で抑えられています。  
改善: tokenをRendererとの初期ハンドシェイクに限定する、ランダムなnonceやElectron専用IPCを併用するなどをP2として検討します。

### P3: 仕様データと生成履歴の結び付きを機械検証していない

`public/data/force-chart-constants.json`には定数versionがある一方、起動時に仕様versionとアプリversionの整合性を検証する処理や、対象MD5の重複検査をCIで行う処理は限定的です。

改善: JSON schema、重複MD5、sourceTable、difficulty、定数範囲、生成メタデータの検証を追加します。

### P3: 運用ログと個人情報の境界が未定義

`console.warn`や`console.error`はありますが、ログレベル、保存期間、DBパス・ID・外部URLをログに残すかが明文化されていません。`buildStatusMessage`はローカルパスを画面表示します。

改善: 診断ログ仕様を定義し、既定ではユーザー名・ID・絶対パスをマスクできるようにします。

## セキュリティ評価

### 確認できた防御

- Electron rendererのNode統合を無効化し、preload APIだけを公開
- `contextIsolation`とsandboxを有効化
- 外部ポップアップを拒否し、HTTP(S)は外部ブラウザへ送る
- Electronのpermission requestを拒否
- serverは127.0.0.1固定で起動
- API POSTのContent-Type、token、Origin、Host、socket remote addressを検証
- 外部URLのprotocol、DNS、プライベートIP、サイズ、timeout、redirectを検証
- SQL identifierは`quoteSqlIdentifier`で引用し、値の検索はprepareを使用
- SQLiteは読み取り専用
- CSP、X-Content-Type-Options、X-Frame-Options、Referrer-Policyを設定

### 未確認・要改善

- SSRF、DNS rebinding、redirect chainを自動テストしていない
- StellaverseのBrowserWindowが保存したセッション情報のライフサイクルと削除手段が仕様化されていない
- 外部HTMLのparserが悪意ある巨大・複雑入力を受けた場合のCPU上限がない
- API tokenを同一ユーザー内の他プロセスから取得できる設計
- 配布物にライセンス通知が確実に入るか未検証

現時点で、ユーザーDBをアプリがUPDATE/INSERT/DELETEする実装は確認できませんでした。生成スクリプトはリポジトリ内のJSONやレポートを更新しますが、ユーザー指定DBの書き換えとは別です。

## パフォーマンス評価

- 難易度表の初回取得は最大3表の並列です。
- 外部レスポンス、表、表一覧、player list、song catalogは有界キャッシュを持ちます。
- score/song/Rivalは同期SQLiteと全件取得のため、DBサイズに比例して処理時間とメモリが増えます。
- StellaverseのRival取得は表コードごとにHTMLを順番に取得し、各ページの最大待機は30秒です。5分TTLキャッシュはあります。
- Canvas画像は最大10MBまでElectron IPCで保存します。更新画像は250件単位で分割します。

## 保守性・テスト容易性

現状のドメイン計算の一部は純粋関数として切り出され、FORCEテストで再現性があります。しかし、SQLiteや外部通信を直接扱う関数とUI状態が大きく、fixture注入の境界が不足しています。まずadapter interfaceを作り、実DB・fake repository・HTML fixtureを差し替えられるようにするのが安全です。

## 優先度別改善項目

| 優先度 | 改善項目 | 完了条件 |
|---|---|---|
| P0 | 現時点で確認したP0はなし | DB書換え・起動不能・重大な外部送信がないことを維持 |
| P1 | CIと回帰fixture | PRで構文、FORCE、SQLite、外部URL、IPCの最低テストが通る |
| P1 | 配布ライセンス検査 | 7z内にLICENSE、第三者通知、README、仕様書が存在 |
| P1 | Stellaverse adapterとHTML fixture | DOM変更、private、timeout、空表を自動検出 |
| P2 | `server.js`分割 | APIとdomain/infrastructureの依存方向が固定 |
| P2 | `public/app.js`分割 | UI状態、永続化、API、画像出力を個別テスト可能 |
| P2 | SQLite性能計測とschema capability | 代表DBで起動・再読み込み時間を記録し、欠落列を表示 |
| P2 | SSRF/Host/Originテスト | 許可・拒否ケースがCIで固定 |
| P3 | ログと診断情報の整理 | 個人情報の既定マスクとログレベルが文書化 |
| P3 | 定数JSON schema検証 | 重複・範囲・version不整合をビルドで失敗させる |

## 結論

全面書き換えは不要です。現行の読み取り専用、ループバック、Electron分離、外部取得制限を維持しながら、Phase 1のテスト固定、Phase 2のbackend adapter化、Phase 3のfrontend分割の順に進めるのが妥当です。
