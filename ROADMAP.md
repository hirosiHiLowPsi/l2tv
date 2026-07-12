# L2TV Maintenance Roadmap

本ロードマップは、現行機能を維持したまま安全に保守性を上げる順序を示します。各Phaseは前Phaseの完了条件を満たしてから開始します。

## 全体方針

```text
Phase 1 仕様・テスト固定
   ↓
Phase 2 backend分割
   ↓
Phase 3 frontend分割
   ↓
Phase 4 外部連携安定化
   ↓
Phase 5 正式リリース工程
```

## Phase 1: 現行仕様の固定

### 目的

現在のDB読込、表照合、段位、Rival、FORCE RATE、画像出力をテストで固定し、リファクタリングによる意図しない変更を検知します。

### 実施項目

- `TEST_PLAN.md`のT-001～T-024を優先して自動化
- LR2/OpenLR2/Stellaverse/BMS-IRの最小SQLite fixtureを準備
- score/song/grade/Rivalのschema差異fixtureを準備
- header JSON、score JSON、table HTML、Stellaverse HTML fixtureを準備
- `npm test`を追加し、既存`test:force`を含める
- `node --check server.js electron-main.js public/app.js`をCIで実行
- `public/l2tv-architecture-manual.html`と本ドキュメントの差異を確認
- 配布物のファイル一覧テストを追加

### 完了条件

- DB原本を変更しないテストがある
- FORCE RATEの現行21テストが継続成功
- API token/Host/Origin/SSRFの拒否ケースが自動化される
- 主要fixtureの出力JSONがレビュー可能

### リスク

fixtureが現行の誤動作を正しい仕様として固定する可能性があります。期待値には「実装事実」「正式要件」「要確認」を分けて記録します。

## Phase 2: Backend分割

### 目的

SQLite処理、API routing、難易度表取得、FORCE、Rivalを独立させ、外部変更の影響を局所化します。

### 実施項目

- SQLite処理をread-only repositoryへ分離
- API routingとmiddlewareを分離
- 難易度表取得・JSON/HTML parserを分離
- FORCE calculatorと定数schema validatorを分離
- Rival比較とStellaverse adapterを分離
- 既存JSON response shapeを維持するcompatibility facadeを残す

### 完了条件

- routeから直接SQLiteを開かない
- FORCE計算がDB・HTTPなしでテストできる
- 外部URL検証と表parserがネットワークなしでテストできる
- `server.js`が起動compatibility層として説明できる

### リスク

関数移動時のrequire循環、エラーstatus、丸め値、保存データ形状の変化です。1つのadapterごとにコミットし、各コミットで回帰テストを実行します。

## Phase 3: Frontend分割

### 目的

巨大な`public/app.js`から状態管理、表管理、Rival、FORCE、画像出力を分離します。

### 実施項目

- API client
- state/actions
- IndexedDB/localStorage persistence
- i18n catalog
- table manager
- player profile/chart list
- Rival/IR view
- FORCE target/change view
- image export

### 完了条件

- 既存DOM ID、保存キー、API URLを維持
- 表の並べ替え・フォルダ・IR ON/OFF・Rival選択が回帰しない
- 日英、Light/Dark、画像出力が同じ結果を返す
- Canvas描画の入力がstateから明示的に渡される

### リスク

イベント登録の二重化、初回言語prompt、保存復元順序、スクロール固定UIの破壊です。E2E smokeをPhase完了条件にします。

## Phase 4: 外部連携安定化

### 目的

難易度表とStellaverseの仕様変更、停止、遅延に強くし、IRなしでもローカル表示を継続します。

### 実施項目

- Stellaverse profile/clear-status/rivalのHTML adapterとfixture
- 表形式ごとのparser version/diagnostic
- TTL・サイズ・timeout・redirectの設定を一元化
- offline時に保存済み分析を表示
- IR順位、IR状況、Rivalの取得失敗を個別エラーにする
- cache hit/missと外部アクセス回数を診断表示またはdebug logへ記録
- 外部URLのSSRF/Host/Origin/DNS rebindingテストをCI化

### 完了条件

- Stellaverse HTMLの列順変更、private、空表、timeoutをfixtureで処理
- 外部停止でもアプリの起動・ローカルDB表示・FORCE RATEが可能
- 外部アクセスが必要な機能と不要な機能が設定で分かれる

### リスク

外部サービスへのアクセス回数や利用規約を無視したリトライを追加しないこと。リトライは指数バックオフと上限を設け、既存の5分cacheを壊さないようにします。

## Phase 5: 正式リリース工程

### 目的

Windows配布物を再現可能にし、利用者が安全に検証できるリリースを作ります。

### 実施項目

- Windows x64自動ビルド
- GitHub Release artifact upload
- SHA-256生成とrelease bodyへの掲載
- コード署名の採否・証明書管理方針を決定
- 7z内のLICENSE、THIRD_PARTY_NOTICES、README、仕様書を検査
- リリースノート生成
- 新規Windows環境での解凍・起動・DB読込・画像出力・終了smoke
- 既存設定と前回分析のmigration確認

### 完了条件

- tagから同一artifactを再生成できる
- SHA-256とartifactが一致する
- SmartScreen・未署名の場合の説明がある
- DB原本を変更しないことをrelease smokeで確認する

## リリースゲート

各リリース前に次を満たします。

1. `npm test`成功
2. `node --check`成功
3. `git diff --check`成功
4. SQLite fixtureの読み取り専用検証成功
5. 表HTML/JSON fixture成功
6. SSRF・Host・Origin・IPC拒否テスト成功
7. FORCE RATEの現行結果差分が意図的であることを確認
8. PNG画像出力とIR ON/OFFを確認
9. 7z展開smoke成功
10. README、更新履歴、ライセンス通知、SHA-256を更新

## 今後の判断ポイント

- beatoraja固有DBを正式対応と宣言するか
- BMS-IRをネットワーク連携するか、DB互換モードだけに留めるか
- Stellaverseのログイン/セッションをサポートするか
- CIでElectron E2Eを実行するWindows runnerのコストを許容するか
- FORCE定数の更新をアプリリリースと独立させるか

これらは実装から自動的に決めず、利用者要件と外部サービスの規約を確認してから正式化します。
