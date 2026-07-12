# L2TV Current Specification

本書は、2026-07-12時点のソースコードから確認できる現行仕様です。実装から断定できない事項は`要確認`と記載します。将来仕様ではなく、現在の挙動を固定するための文書です。

## アプリ概要

L2TVは、LR2/OpenLR2系のローカルプレイDBを読み取り、選択したBMS難易度表の譜面とハッシュ照合して、ランプ、EXスコア、スコア率、BP、プレイ回数、段位、更新履歴、Rival、FORCE RATEを表示するWindows向けElectronアプリです。

ユーザーの`score.db`、`song.db`、Rival DBへ更新処理は行いません。難易度表、Stellaverse IRプロフィール/Rival、表一覧などの外部通信は機能を使用したときに発生します。

## 対応OSと実行形態

- README上の対応OS: Windows 10 / 11 64bit
- 配布形態: Electron portable archive。現行scriptは7zとzipを作成可能
- Electron: `^41.3.0`
- electron-builder: `^26.8.0`、lockfile上は`26.8.1`
- Node.js: `node:sqlite`を使用するため、ブラウザ版`npm start`に必要なNode.jsの最低版は要確認
- Electron版ではElectron内のNodeランタイムで同じローカルserverを起動

## アーキテクチャ

```text
Electron main process
  ├─ 127.0.0.1:4173 のserver.jsを起動
  ├─ BrowserWindowを起動
  ├─ preload経由でファイル選択、画像保存、Stellaverse取得を提供
  └─ アプリ終了時にembedded serverをclose

Renderer
  ├─ public/index.html
  ├─ public/app.js
  └─ public/styles.css

Local HTTP server
  ├─ /api/analyze
  ├─ /api/table-list
  ├─ /api/table-meta
  ├─ /api/profile-from-db
  ├─ /api/local-db-state
  └─ public static files
```

根拠: `electron-main.js:629-807`、`server.js:217-316`、`electron-preload.js:1-12`。

## ローカルHTTPサーバー

- 既定hostは`127.0.0.1`
- 既定portは`4173`
- `GET /api/health`は`{ ok: true }`
- `GET /api/client-config`はプロセス起動時生成のAPI tokenを返す
- POST APIはJSON、API token、許可されたOrigin/Hostを要求
- static fileは`public`配下に正規化して限定
- `X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、CSPなどを付与

## SQLite DB読込仕様

### score.db

`server.js:1488-1623`で次を読み取ります。

- `player`テーブル: 名前、ID、段位フィールド、総打鍵、プレイ時間候補
- `score`テーブル: `hash`、`scorehash`、`clear`、`playcount`、`perfect`、`great`、`totalnotes`、`bad`、`poor`、`minbp`
- DB列が不足する場合は、列を減らしたSELECTへフォールバック
- `hash`をMD5キーとする`byHash`を構築
- `scorehash`は主に段位コースhashの照合候補として使用

接続は`readonly: true`で開き、finallyでcloseします。DB破損、権限、ロック時の詳細なエラー分類は要確認です。

### song.db

`server.js:2490-2545`で`song`テーブルの`hash`、`title`、`subtitle`、`artist`を読み取り、ローカルに存在するMD5と表示名を作ります。`grade`テーブルは段位・Skill Analyzerのコースhashの補助情報として読み取ります。

song.dbがない、またはsongテーブルを読めない場合、譜面の存在判定は不確定になり、`NO SONG`ではなく通常の照合可能状態になる場合があります。これは実装上の意図的な縮退であり、利用者への診断表示は要確認です。

### Rival DB

指定フォルダ直下の`.db`を列挙し、各DBの`rival`テーブルから次を読み取ります。

```text
hash, r_clear, r_totalnotes, r_perfect, r_great, r_bad, r_poor, r_minbp
```

同名の`{id}.lr2folder`があればShift-JISで`#TITLE`を探し、Rival名にします。DBは読み取り専用です。

### DB仕様選択

UIは`auto`、`legacy`、`stellaverse`、`bms-ir`を選べます。`auto`ではscore.dbファイル名が数字だけならStellaverse、それ以外はlegacyへ寄せます。BMS-IRのネットワーク取得ではなく、score.db解釈モードとしての選択です。各DB製品の全スキーマ対応範囲は要確認です。

## 難易度表取得・解析

- 表一覧の既定取得先はGoogle Apps Scriptのtablelist URL
- 表URLまたはheader JSONを取得
- HTMLの場合は`bmstable`メタタグからheader URLを取得
- headerの`data_url`からJSONを取得
- score.jsonは配列形式を要求
- `header.name`、`header.symbol`、`header.level_order`を表情報にする
- 各譜面の`md5`、`sha256`、title、artist、level、urlを正規化
- table list parserはJSON、区切りテキスト、HTML、script objectの複数形式を試す
- analyze時の表取得は最大3件の並列

外部レスポンスは25MB、HTTP requestは20秒、redirectは5回までです。DNSで解決したIPがloopback、private、link-local、multicast等の場合は拒否します。

## ハッシュ照合仕様

1. 通常の譜面は表JSONのMD5とscore.dbの`score.hash`を照合
2. 表項目のserialized text内に`bmsmd5=`があれば補助MD5として扱う
3. `bmsid=`は補助IDとして保持するが、通常のscore.db照合にはMD5が優先
4. SHA-256だけでMD5がない譜面は`UNSUPPORTED`
5. 表譜面にMD5があり、song.dbに存在しない場合は`NO SONG`
6. score.dbに記録がない場合は`NO PLAY`
7. 表項目の一意キーはMD5、補助ID、SHA-256、最後に表・index・曲情報のSHA-1 fallback

## ランプ判定

内部の代表ランプは次です。

```text
FULL COMBO > HARD CLEAR > CLEAR > EASY CLEAR > FAILED > NO PLAY
```

追加の表示状態として`NO SONG`、`UNMATCHED`、`UNSUPPORTED`があります。LR2のclear値とplaycountを組み合わせ、段位コースでは通常曲のEASY判定と混同しないよう`clear >= 2`を合格相当として扱います。beatoraja拡張ランプの全値と変換表は要確認です。

## スコア表示

- EX SCOREは`perfect * 2 + great`
- MAX EX SCOREは`totalnotes * 2`
- スコア率は`EX SCORE / MAX EX SCORE * 100`を小数第2位へ丸める
- MAXとの差分を表示できる場合がある
- playcountが0以下、または主要スコア値がない場合、スコアは未取得扱い
- スコア評価はAAA、AA、A、B、C、D、E、F、NP、NSのUI区分を使用

## Player Dataと段位

- playerテーブルの名前・IDを基本表示
- Stellaverseモードではscore.dbのIDで`https://ir.stellabms.xyz/players/{id}`から名前を補完する場合がある
- SP/DP段位の直接フィールドと、song.dbの`grade`および同梱`.lr2crs` hashを併用
- GENOSIDE2018段位はコースhashに対する合格で判定
- st/slは同梱コースまたはsong.db gradeを解析し、最高合格レベルを表示
- Overjoyの歴代合格演出は指定タイトルキーの合格集合で判定
- 段位の表記差、同名段位、DBによるgrade列欠損は要確認項目

## 更新検出と本日更新

- 前回分析の`localDbState`にscore.db/song.dbのpath、exists、size、mtimeMsを保存
- 起動時に現在のファイル状態と比較
- 差分があれば「プレイ更新がありました、反映しますか？」を表示
- 承認時はform submitで再読み込み
- 本日更新は前回分析との差分からランプ、BP、スコア、表外譜面を集計
- playtime候補列の差分をプレイ時間として表示
- 表外表示、BP更新表示は設定で切替可能

## Rival比較

- ローカルRival DBとStellaverse Rival IDを併用可能
- 譜面ごとにRivalの最高EX SCOREを比較
- Rival未プレイは`NO PLAY`として表示する方針
- Stellaverse取得はElectron版のhidden BrowserWindowを使用
- 対象table codeは`INSANE1`、`OVERJOY`、`ST`、`SL`等に制限
- Rivalとclear-statusのキャッシュTTLは5分
- ページロードのタイムアウトは30秒
- IR順位、IR状況、Stellaverse Rivalは現在Stellaverse IRのみ対応。BMS-IRはscore.db形式モードとしてのみ扱う

## FORCE RATE

現行の詳細は`FORCE_RATE_SPEC.md`に定義されています。要約は次です。

1. `public/data/force-chart-constants.json`のMD5と定数を使用
2. `NO PLAY`、`NO SONG`、未照合は除外
3. 単曲FORCEは譜面定数×スコア係数
4. ランプ係数は全て1.00で、スコア力を重視
5. AAA未満はスコア率の小数第3位、AAAは0.900、94.44%は0.980、MAXは1.000へ補間
6. 単曲FORCE上位50件を選択
7. 最高合格GENOSIDE2018 SP段位を最大1件追加
8. 最大51件の単純平均。BEST20補正は使用しない
9. 表示上限は30.000

定数の生成元はLR2IR Archiveを使った固定データで、生成スクリプトとJSONのversion管理が必要です。

## 画像出力

- 本日更新、難易度表サマリー、FORCE RATE対象をCanvasでPNG化
- Electron版はpreload IPCの`saveImage`で保存
- PNG上限は10MB
- ファイル名はサニタイズし、既存ファイルを上書きせず連番保存
- 本日更新は250件単位で分割
- IR順位表示ON時は10位以内の順位バッジを本日更新画像に表示
- IR状況表示ON時は難易度表画像に1位、2位、3位、1～3位、4～10位を表示

## 設定保存と多言語

`public/app.js`のIndexedDB database nameは`lr2ir-table-lamp-viewer`、storeは`app-state`、schema versionは1です。IndexedDBが利用できない場合はlocalStorageへ縮退します。

主な保存キー:

- `form-state`
- `last-analysis`
- `table-preset-selection`
- `custom-table-list-entries`
- `stellaverse-rival-ids`

日本語/英語、Light Aqua/Geek Dark、IR順位/IR状況、BP更新、表外更新、DB仕様、st/sl取得モードを保存します。既存保存データの削除はユーザー操作によるもの以外は行いません。

## エラー処理

- server APIはJSON形式の`{ error }`を返す
- rendererはstatus box、モーダル、consoleへエラーを伝える
- 表単位の失敗は`tableErrors`に集約し、他の表を続行する場合がある
- DBの一部スキーマ失敗や外部スクレイピング失敗は空値へ縮退する箇所がある
- 詳細なログの永続化、機密値のマスク、エラーコード体系は要確認

## 外部通信とキャッシュ

通信先は難易度表一覧、指定された難易度表URL、Stellaverse IRです。BMS-IRのスコア取得APIは実装対象ではありません。

- 表一覧キャッシュ: 1時間
- 通常のremote text/table cache: 有界300件
- player list/song catalog cache: ファイル状態を含むキー
- Stellaverse Rival/clear status: 5分
- cacheはプロセス内メモリで、アプリ終了時に破棄

## 要確認事項

- beatoraja固有の全schema・全ランプ値の正式な対応範囲
- 既存配布物に`LICENSE`と`THIRD_PARTY_NOTICES.md`が入るか
- `node:sqlite`を使うブラウザ起動時の最低Node.jsバージョン
- Stellaverseの利用規約、ログイン・セッション保存、HTML変更時の互換性
- 表データにおけるMD5欠損、同一MD5重複、SHA-256のみの扱いの利用者向け説明
- 画像出力の10MB制限が高解像度・大量更新時に十分か
