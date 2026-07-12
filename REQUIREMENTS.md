# L2TV Requirements

## 文書の位置付け

本書は、現行機能を壊さず、今後の改修をレビュー可能にするための要件定義です。`CURRENT_SPEC.md`が現在の実装事実、`REQUIREMENTS.md`が満たすべき要件です。実装済みか、部分実装か、計画中かを各行に示します。

## システム目的

L2TVは、LR2およびOpenLR2のローカルプレイデータを安全に読み取り、BMS難易度表と照合し、クリア状況、スコア、BP、段位、更新履歴、ライバル比較、FORCE RATEを可視化するWindows向けデスクトップアプリです。

## 対象ユーザー

- LR2利用者
- OpenLR2利用者
- Stellaverse IR利用者
- BMS-IR互換DB利用者
- 発狂BMS、Overjoy、Stella、Satellite等の難易度表利用者

## 機能要件

| ID | 要件 | 優先度 | 状態 |
|---|---|---:|---|
| FR-001 | ユーザーはscore.dbのパスを入力またはElectronのファイル選択で指定できる | P0 | 実装済み |
| FR-002 | ユーザーはsong.dbのパスを指定でき、未指定時はscore.db周辺から解決を試みる | P0 | 実装済み |
| FR-003 | score.db仕様を自動判別、legacy、Stellaverse、BMS-IRから選択できる | P0 | 部分実装。各DBの完全な差分は要確認 |
| FR-004 | score.db、song.db、Rival DBを読み取り専用で開き、更新・削除・テーブル作成を行わない | P0 | 実装済み。回帰テスト追加が必要 |
| FR-005 | 難易度表一覧を取得し、表を検索・タグ絞り込み・追加・削除・並べ替えできる | P1 | 実装済み |
| FR-006 | 一覧にない表をURL指定で追加できる | P1 | 実装済み。異常形式の受入範囲は要確認 |
| FR-007 | 難易度表のheader/dataを取得し、JSON/HTML/複数の表一覧形式を解析できる | P0 | 実装済み。fixtureテストが必要 |
| FR-008 | 表譜面とscore.dbをMD5で照合し、補助的にbmsmd5/bmsid/SHA-256を扱う | P0 | 実装済み |
| FR-009 | `NO PLAY`、`NO SONG`、`UNMATCHED`、`UNSUPPORTED`を区別して表示する | P0 | 実装済み。schema差異の検証が必要 |
| FR-010 | ランプをFC、HC、NC、EC、FL、NP、NS等の表示へ変換する | P0 | 実装済み。全入力値のfixtureが必要 |
| FR-011 | EX SCORE、MAX EX SCORE、スコア率、MAX差分、BP、プレイ回数を表示する | P0 | 実装済み |
| FR-012 | Player Dataに名前、ID、SP/DP段位、st/sl段位、総打鍵、プレイ時間を表示する | P1 | 部分実装。DB製品ごとの列差異は要確認 |
| FR-013 | GENOSIDE段位、Skill Simulator、Skill Analyzerのコースhashを照合して合格段位を推定する | P1 | 実装済み。段位表記の回帰テストが必要 |
| FR-014 | 前回読み込みとの差分からランプ、BP、スコア、本日更新曲を検出する | P1 | 実装済み |
| FR-015 | score.db/song.dbのpath、size、mtimeの変化を起動時に検知し、再読み込みを確認する | P1 | 実装済み |
| FR-016 | LR2 RivalフォルダとRival DBを読み取り、譜面ごとの比較結果を表示する | P1 | 実装済み。Rival DB schemaのfixtureが必要 |
| FR-017 | Stellaverse Rival IDを入力し、公開スコア・名前・段位・FORCE RATEを比較表示する | P1 | 実装済み。Stellaverse HTML fixtureが必要 |
| FR-018 | IR順位とIR状況を個別にON/OFFでき、OFF時は対応する通信と表示を抑制する | P1 | 実装済み |
| FR-019 | IR順位、IR状況、Stellaverse RivalはStellaverse IRを参照し、BMS-IRはscore.db仕様として扱う | P1 | 実装済み |
| FR-020 | FORCE RATEを固定定数JSONとscore.dbのスコアから計算する | P0 | 実装済み |
| FR-021 | FORCE RATEは単曲上位50譜面と最高合格段位1件を最大51対象として平均する | P0 | 実装済み。現行の21テストあり |
| FR-022 | FORCE RATEの定数JSON、計算仕様、対象MD5、生成履歴をバージョン管理する | P1 | 部分実装。schema/CI検証が必要 |
| FR-023 | 本日更新、難易度表サマリー、FORCE RATE対象をPNGで保存する | P1 | 実装済み |
| FR-024 | 本日更新画像にIR順位10位以内、難易度表画像に設定ON時のIR状況を表示する | P1 | 実装済み。画像fixtureが必要 |
| FR-025 | 画像保存先、既存ファイル名、10MB上限を安全に処理する | P1 | 実装済み。配布版テストが必要 |
| FR-026 | 言語を日本語/英語から選択し、初回起動時の言語選択を表示する | P1 | 実装済み。未翻訳文字の検査が必要 |
| FR-027 | テーマ、表選択、DBパス、IR表示、更新表示、Rival ID等を保存・復元する | P1 | 実装済み |
| FR-028 | DB読込、表取得、Rival、IR、画像出力の失敗をユーザーが理解できるメッセージで表示する | P1 | 部分実装。エラー分類は要改善 |

## 非機能要件

| ID | 要件 | 優先度 | 状態 |
|---|---|---:|---|
| NFR-001 | ユーザー指定DBを外部サービスへ送信しない | P0 | 設計上実装済み。通信監査テストが必要 |
| NFR-002 | SQLiteをreadonlyで開き、DBへ書き込まない | P0 | 実装済み。fixtureで監視する |
| NFR-003 | serverは既定で127.0.0.1だけでlistenする | P0 | 実装済み |
| NFR-004 | API POSTはJSON、token、Host、Origin、loopback接続元を検証する | P0 | 実装済み。拒否ケースの自動テストが必要 |
| NFR-005 | 外部URL取得はhttp/https、公開IP、25MB以下、20秒以内、redirect5回以内に制限する | P0 | 実装済み。SSRF fixtureが必要 |
| NFR-006 | 外部HTML/JSONの不正形式・文字コード・欠損項目でアプリ全体を停止させず、表単位で失敗を報告する | P1 | 部分実装 |
| NFR-007 | 通常の代表DBで、初回読み込み・再読み込み時間を測定し、許容値をリリースごとに記録する | P1 | 未実装。基準値要決定 |
| NFR-008 | 大規模DBでもUIが無期限に停止せず、進行状況またはタイムアウトを表示する | P1 | 部分実装 |
| NFR-009 | アプリが終了するとembedded serverが停止する | P1 | 実装済み |
| NFR-010 | キャッシュは上限またはTTLを持ち、アプリ終了時にユーザーDB情報を永続化しない | P1 | 概ね実装。セッション保存範囲は要確認 |
| NFR-011 | IndexedDB/localStorageの既存設定を、仕様変更時も可能な限り破棄しない | P1 | schema version 1。migration方針が必要 |
| NFR-012 | 日本語・英語で主要UI、エラー、画像出力の意味を一致させる | P1 | 部分実装。自動翻訳検査が必要 |
| NFR-013 | FORCE RATE計算は同じ入力JSONとDB状態で同じ結果を返す | P0 | 計算テスト済み。定数JSON検証が必要 |
| NFR-014 | FORCE RATEに使用する小数丸め、同率ソート、対象除外を仕様書と一致させる | P0 | 実装済み。fixture拡張が必要 |
| NFR-015 | 画像出力は大きさ制限、ファイル名サニタイズ、上書き回避を行う | P1 | 実装済み |
| NFR-016 | Electron rendererはNode統合なし、contextIsolation/sandbox有効で動作する | P0 | 実装済み |
| NFR-017 | preloadは必要最小限のIPCだけ公開し、送信元を検証する | P0 | 実装済み。IPC拒否テストが必要 |
| NFR-018 | Stellaverse側のHTML変更、タイムアウト、非公開、空データを分類して表示する | P1 | 部分実装 |
| NFR-019 | 外部サービス停止時も、保存済み分析結果とローカルDBの表示を可能な範囲で継続する | P1 | 部分実装。オフライン仕様要確認 |
| NFR-020 | PRで構文、単体、fixture、セキュリティ、配布smoke testを実行する | P1 | 未実装。CI追加が必要 |
| NFR-021 | 配布7zにアプリ、README、ライセンス、第三者通知、仕様書、更新履歴を含める | P1 | 配布設定は要確認 |
| NFR-022 | Windows 10/11 x64でportable版を解凍して起動できる | P0 | 実機smoke testが必要 |
| NFR-023 | Windows Defender/SmartScreenによる未署名警告をREADMEで説明し、SHA256を公開する | P1 | 部分実装 |
| NFR-024 | ログにDB内容、パス、ID、tokenを不用意に出さない | P1 | ログポリシー要策定 |

## 外部サービス停止時の要件

1. 難易度表一覧が停止している場合、保存済みの選択表・前回分析を表示できること。
2. 個別表の取得に失敗した場合、他表の結果を失わず、失敗表名と理由を表示すること。
3. Stellaverseが停止・変更された場合、ローカルDB、ローカルRival、FORCE RATEを可能な範囲で表示すること。
4. IR順位・IR状況・Stellaverse Rivalは、取得失敗をNO DATAとして扱い、アプリ起動不能にしないこと。

## 変更制約

- ユーザーDBを書き換えない
- 現行FORCE RATEの結果を仕様変更なしに変えない
- 現行UIと日英表示を大幅に変更しない
- IndexedDB/localStorageを無断で消去しない
- 仕様変更とリファクタリングを同一コミットに混在させない
- 変更前に回帰テストを追加する
- 不明なDB仕様・外部サービス仕様を推測で確定しない
