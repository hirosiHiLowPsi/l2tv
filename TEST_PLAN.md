# L2TV Test Plan

## 目的

現行機能を固定してから小さく改修するためのテスト計画です。DB fixtureは読み取り専用で開き、テスト後も元ファイルを変更しないことを前提にします。

## テスト層

- **Unit**: 純粋な変換・計算・parserをNode testで実行
- **Integration**: temporary SQLite fixture、server API、IPC mockを使用
- **Fixture**: 難易度表JSON/HTML、Stellaverse HTML、エラー応答を固定
- **E2E**: Electron portable版またはBrowserWindowで主要操作を確認
- **Release smoke**: 7z展開、起動、DB読み込み、画像出力、終了を確認

## 前提fixture

- LR2形式の最小`player`/`score` DB
- OpenLR2/Stellaverse/BMS-IR互換形式の代表DB。実スキーマは提供データで確定する
- 最小`song`/`grade` DB
- 最小Rival DBとShift-JISの`.lr2folder`
- MD5、SHA-256のみ、MD5欠損、重複譜面を含む表JSON
- `bmstable` HTML、header JSON、score JSON、壊れたJSON、文字コード差異の表fixture
- Stellaverse profile、clear-status、Rival相当のHTML fixture
- `lr2crs`から抽出したGENOSIDE/st/slコースhash fixture

## ケース一覧

| ID | 対象機能 | 前提・入力 | 期待結果 | 自動化 | 優先度 |
|---|---|---|---|---|---:|
| T-001 | LR2 score.db | player/scoreの最小fixture | 名前、ID、EX、BP、ランプ、playcountを正しく返す | 可能 | P0 |
| T-002 | OpenLR2 score.db | OpenLR2の代表schema fixture | 対応列を読み、未対応列は明示的なNO DATAになる | 可能 | P0 |
| T-003 | Stellaverse score.db | 数字名または指定modeのfixture | ID・名前の補完を行い、外部失敗でもローカル情報を返す | 可能 | P1 |
| T-004 | BMS-IR score.db | BMS-IR互換fixture | BMS-IRモードで読み込み、未対応ネットワーク処理を行わない | 可能 | P1 |
| T-005 | DB readonly | fixtureをreadonlyで開き、前後のhashを取得 | DBのmtime、size、内容が変わらない | 可能 | P0 |
| T-006 | song.db | song/gradeあり、欠損、壊れたDB | title・artist・曲存在・コースhashを正しく扱う | 可能 | P0 |
| T-007 | Rival DB | `rival`テーブル、`.lr2folder`、壊れたDB | Rival名、EX、BP、ランプを取得し、壊れた相手だけ除外する | 可能 | P1 |
| T-008 | MD5照合 | 一致MD5、大小文字、重複MD5 | 一致した譜面だけscoreを結び付ける | 可能 | P0 |
| T-009 | SHA-256補助照合 | SHA-256のみの表項目 | `UNSUPPORTED`として表示し、誤ったscoreを結び付けない | 可能 | P1 |
| T-010 | ランプ変換 | FC/HC/NC/EC/FL/NP/NS/不明clear値 | 指定順で正規化し、未知値を破壊しない | 可能 | P0 |
| T-011 | NO PLAY | score行なし、playcount=0 | `NO PLAY`、スコアなし、FORCE対象外になる | 可能 | P0 |
| T-012 | NO SONG | song.dbにhashなし | `NO SONG`として表示し、通常の未プレイと区別する | 可能 | P0 |
| T-013 | UNMATCHED | 表にhash不足またはDBに未照合hash | `UNMATCHED`表示と集計除外を確認する | 可能 | P1 |
| T-014 | UNSUPPORTED | SHA-256のみ、未対応形式 | `UNSUPPORTED`表示とFORCE除外を確認する | 可能 | P1 |
| T-015 | EXスコア | perfect/great/totalnotesのNULL、負値、0 | `perfect*2+great`、MAX EX、無効値のNO DATAを確認する | 可能 | P0 |
| T-016 | EXスコア率 | 88.89、94.44、99、100、丸め境界 | 小数第2位表示とAAA/AA分類が仕様通りになる | 可能 | P0 |
| T-017 | BP | minbpあり、bad+poor補完、NULL | minbp優先、未取得NO DATA、BP更新検出を確認する | 可能 | P1 |
| T-018 | 段位 | 初段～十段、発狂初段～皆伝、Overjoy、st/sl | コースhash合格のみで最高段位を判定し、名称を混同しない | 可能 | P0 |
| T-019 | 段位ランプ | NC/HC、EASY相当clear=1 | 段位はNC/HCを合格として扱い、単曲EASYと混同しない | 可能 | P0 |
| T-020 | FORCE定数 | JSON version、重複MD5、範囲外、欠損 | invalid定数を拒否または明示し、同一入力で再現する | 可能 | P0 |
| T-021 | FORCE係数 | AAA未満、AAA、94.44、MAX、93.53 | 0.900/0.980/1.000、補間、丸めが仕様通り | 可能 | P0 |
| T-022 | FORCE対象 | 60譜面、NO PLAY、NO SONG、未照合 | 単曲上位50だけを選び、除外対象を含めない | 可能 | P0 |
| T-023 | FORCE段位枠 | 最高段位あり/なし、Overjoy | 最大51対象、段位1件、BEST20補正なしを確認する | 可能 | P0 |
| T-024 | FORCE同率 | 同じforce/constantの複数MD5 | tie-breakが安定し、実行ごとに順番が変わらない | 可能 | P1 |
| T-025 | Rival比較 | Rival未プレイ、同点、勝敗、複数Rival | `NO PLAY`、WIN/LOSE/DRAW、最高スコアを確認する | 可能 | P1 |
| T-026 | Rival private | 非公開プロフィールでも名前/段位取得可能なHTML | private表示文言を不要に表示せず、取得できる名前を表示する | fixture | P1 |
| T-027 | 更新検出 | score.db/song.dbのsize/mtime変更、未変更 | 起動時prompt、承認再読込、拒否時保持を確認する | 可能 | P1 |
| T-028 | 難易度表JSON | header/data、data_url相対、重複、MD5欠損 | 正規化・dedupe・level order・表エラーを確認する | 可能 | P0 |
| T-029 | 難易度表HTML | bmstable meta、HTML table、壊れたHTML | header URL解決、形式エラー、文字コードを確認する | 可能 | P1 |
| T-030 | 外部URL検証 | file/javascript、localhost、127/10/172/192.168、公開HTTPS | 危険URLを拒否し、公開URLのみ取得する | 可能 | P0 |
| T-031 | リダイレクト | 301/302/307/308、6回以上、private先 | 5回以内を許可し、超過/危険先を拒否する | 可能 | P0 |
| T-032 | レスポンス制限 | Content-Length超過、chunk合計超過、timeout | 25MB/20秒で停止し、serverが継続する | 可能 | P0 |
| T-033 | API token | 欠落、短い、誤値、正値 | 403/成功、timingSafeEqual経路、Content-Type検証を確認する | 可能 | P0 |
| T-034 | Host/Origin | 外部Host、非loopbackremote、異なるOrigin | 403になり、同一ローカルOriginだけ成功する | 可能 | P0 |
| T-035 | IndexedDB | 保存、復元、schema version、IndexedDB失敗 | 設定と前回分析を復元し、localStorageへ縮退する | E2E | P1 |
| T-036 | 日英 | 言語切替、初回prompt、主要エラー、画像 | 主要文字列が未翻訳にならず、設定が保持される | E2E | P1 |
| T-037 | 画像出力 | 本日更新、表サマリー、FORCE、IR ON/OFF | PNGが生成され、IR順位/IR状況の設定が反映される | E2E/fixture | P1 |
| T-038 | 画像上限 | 大量更新、10MB超、既存同名 | 分割または明示エラー、上書きせず連番保存する | E2E | P1 |
| T-039 | Stellaverse HTML | profile、clear-status、列順変更、private、空表 | parserが正常化し、timeout/errorを分類する | fixture | P0 |
| T-040 | Stellaverse BrowserWindow | 外部popup、外部redirect、permission要求 | popup/外部遷移/permissionを拒否し、origin内だけを許可する | E2E | P0 |
| T-041 | IPC | untrusted senderから各handlerを呼ぶ | `assertTrustedIpcSender`で拒否する | 可能 | P0 |
| T-042 | 配布smoke | 7zを新しいWindows環境へ展開 | 起動、DB読込、設定保存、画像保存、終了が成功する | 手動/CI | P0 |

## 自動化方針

1. まずT-001～T-024のUnit/IntegrationをNode testへ追加する。
2. T-028～T-034はserver関数またはローカルHTTP fixtureで外部ネットワークなしに検証する。
3. T-039はHTML文字列fixtureを`electron-main.js`から切り離したadapterへ渡して検証する。
4. T-035～T-042はElectron smoke testとして、CIでは軽量版、リリース前はWindows実機で実行する。
5. 実ユーザーDBはテスト入力として複製して使い、原本を直接開かない。

## 現在のテスト状況

- 実装済み: `npm run test:force`、FORCE RATE 21件
- 実装済み: `node --check public/app.js`等の手動構文確認
- 未実装: SQLite fixture、外部URL/SSRF、IPC、Stellaverse HTML、IndexedDB、画像、配布smoke、CI
