# L2TV

**L2TV (LR2 Table Viewer)** は、Lunatic Rave 2 / OpenLR2 のローカルDBとBMS難易度表を照合し、クリアランプ、スコア、BP、段位、ライバル比較、FORCE RATEなどを確認できるWindows向けElectronアプリです。

開発・制作: **HiLowPsi**  
最新バージョン: **2.1.0**

> [!IMPORTANT]
> L2TVはインストール不要のポータブル版として配布します。解凍すると `L2TV` フォルダ内に構成ファイルがまとまります。削除するときはWindowsのアンインストーラーを使わず、解凍して作成された **L2TV専用フォルダだけ** をゴミ箱へ移動してください。

## 概要

L2TVは、LR2系プレイヤーの `score.db` / `song.db` / Rival DBをローカルPC上で読み取り、選択した難易度表と譜面ハッシュを照合して表示します。

- LR2 / OpenLR2 のDBは読み取り専用で扱います。
- `score.db` / `song.db` / Rival DBを書き換えたり削除したりしません。
- ローカルDBを外部へアップロードする機能はありません。
- 難易度表一覧、難易度表データ、Stellaverse IRのプレイヤー名取得など、必要な場面でのみインターネット通信を行います。
- 配布版はElectron版のみです。

## 主な機能

### 難易度表

- 難易度表一覧から読み込みたい表を選択できます。
- 一覧では `tag1` が `SP` の難易度表だけを取得します。
- `General` / `Personal` / `Self-made Chart Only` で絞り込めます。
- URLを直接指定して、一覧にない難易度表も追加できます。
- URL追加時に `header.json` からシンボルと表名を自動取得します。
- 追加済みの表は縦リストで表示され、マウスドラッグまたは上下ボタンで並べ替えられます。
- 並べ替えた順番は保存され、アプリ内の難易度表表示順にも反映されます。

### Player Data

- プレイヤー名、ID、SP段位、st/sl段位を表示します。
- `score.db` の仕様を「自動判別」「従来LR2IR互換」「StellaverseIR」「BMS-IR」から選択できます。
- StellaverseIR選択時は、`score.db` 内のIDを使ってStellaverse IRのプレイヤー名取得を試みます。
- 段位認定コース自体のクリア記録を参照し、構成する単曲のクリアランプは合格判定に使用しません。
- GENOSIDE2018段位認定は `NORMAL CLEAR` 以上を合格として扱います。LR2の段位コースで `score.db` の `clear=2` として保存されるノーマル合格も、段位の `NORMAL CLEAR` 相当として扱います。
- GENOSIDE2018 SP段位、Stella Skill Simulator 4th、Satellite Skill Analyzer 2nd は、同梱した `.lr2crs` 由来のコースhashも照合に使用します。
- 2018 / 2012 / 2009のOverjoyをすべて合格している場合は専用表示になります。

### FORCE RATE

- ローカルの `score.db` からFORCE RATEと称号バッジを自動計算します。
- FORCE RATEは、発狂BMS難易度表、初代Overjoy、第二期Overjoyの譜面定数をMD5で照合して算出します。
- 譜面定数はLR2IR Archive上の「クリア人数に対するAAA到達人数の割合」を主軸にした、スコア力重視の定数です。
- 単曲FORCEは `譜面定数 × スコア係数` です。クリアランプ係数は使用しません。
- スコア係数はAAAを `0.900`、94.44%を `0.980`、MAXを `1.000` として段階的に伸びます。
- FORCE RATEは、単曲FORCE上位50譜面と最高合格GENOSIDE2018 SP段位1件を合わせた、最大51対象の単純平均です。
- 発狂段位定数は、LR2IR Archive上の「プレイ人数に対する合格+AAA達成人数の割合」を基準にします。
- 発狂段位コースはEXスコアが取得できる場合、段位定数にもスコア係数を掛けます。GENOSIDE2018 Overjoyはスコア係数を掛けず、合格時点で段位定数満額として扱います。
- BEST20補正は使用しません。
- 対象譜面はFORCE RATE対象フォルダで確認できます。
- FORCE RATE対象51件は、一覧と同じ並び替え状態のままPNG画像として出力できます。
- FORCE RATE対象画像には、現在レートと称号バッジ、前回比、対象曲のIN / OUTも表示します。
- 前回読み込み時からのレート増減と、対象曲へ新しく入った曲（IN）・外れた曲（OUT）を確認できます。
- 詳細仕様は [FORCE_RATE_SPEC.md](FORCE_RATE_SPEC.md) を参照してください。

### ランプ・スコア集計

- 表全体とレベル別のCLEAR LAMP / SCORE LAMPを表示します。
- ランプ内訳と、AAA / AA / A / B / C / D / E / F / NP / NSのスコア内訳を表示します。
- NO PLAYの譜面はFに含めず、NPとして扱います。
- レベルフォルダ自体を横グラフとして表示します。
- ライトモードとダークモードに対応しています。

### 譜面一覧

- `Lv / Title / Artist / Lamp / Rank / EX/Rate / BP / Play Count / IR順位 / Rival` を表示します。
- RankはAAA / AA / Aなどを色付きバッジで表示します。
- Stellaverse IR仕様では、★・★★・st・sl譜面のIR順位と上位率を表単位で取得します。
- 各難易度表に、1位・2位・3位・1～3位合計・4～10位合計のIR状況を表示します。
- IR順位・IR状況・Stellaverse Rivalは、現在Stellaverse IRのみ対応しています。BMS-IRはscore.dbの読み込み仕様としてのみ扱います。
- IR順位とIR状況は個別にON / OFFでき、両方をOFFにすると自分用IR順位の通信取得も行いません。
- 各列を昇順・降順で並べ替えられます。
- フォルダを開いている間は、画面下部の `Folder Close` から閉じられます。
- `Folder Option` から、開いているフォルダ専用の並べ替えヘッダーを表示できます。

### 本日更新

- 前回読み込みから更新されたクリアランプ、BP、EXスコアを表示します。
- 表外譜面を更新楽曲として含めるか選択できます。
- 前回読み込みから増えた打鍵回数とプレイ時間を表示します。
- `score.db` / `song.db` の更新を起動時に検知し、確認後に読み込めます。
- 本日更新をPNG画像として出力できます。
- 更新譜面が多い場合は、250件ごとに複数のPNGへ自動分割します。

### ライバル

- LR2のRivalフォルダを読み込み、譜面ごとのWIN / LOSE / DRAWを表示します。
- Rival DBを作成できない場合でも、Stellaverse Rival IDを入力して公開スコアを取得できます。
- Stellaverse IRから取得した相手とローカルRival DBの相手は同時に比較できます。
- StellaverseライバルはSP段位とFORCE RATE、称号バッジもライバル一覧に表示します。
- ライバルのEXスコア、スコアレート、クリアランプを比較できます。
- WIN率順 / LOSE率順 / 名前順で並べ替えられます。
- 比較対象を個別選択、全選択、全解除できます。
- IR機能をあまり使わない場合は、メニューから譜面一覧のIR順位と難易度表のIR状況を個別に非表示にできます。

### 表示・画像出力

- 日本語 / Englishを切り替えられます。
- Light Aqua / Geek Darkテーマを選択できます。
- 本日更新、難易度表サマリー、FORCE RATE対象一覧をPNGで保存できます。
- スクリーンショットの保存先を指定できます。

## 動作要件

- Windows 10 / 11 64bit
- Lunatic Rave 2 または OpenLR2
- LR2系の `score.db`
- LR2系の `song.db`
- インターネット接続

ローカルRival DBを使う場合のみ、LR2のRivalフォルダが必要です。Stellaverse Rival IDによる比較では不要です。

一般的な配置例:

```text
score.db: LR2files\Database\Score\プレイヤー名.db
song.db:  LR2files\Database\song.db
Rival:    LR2files\Rival
```

## 導入手順

1. Releasesから最新版の `L2TV-2.1.0-win-x64.7z` をダウンロードします。
2. 任意の場所へ解凍します。
3. 解凍して作成された `L2TV` フォルダを開きます。
4. `L2TV.exe` を起動します。

インストール操作や管理者権限は通常必要ありません。

個人配布の未署名アプリのため、Windows SmartScreenが警告を表示する場合があります。配布元とファイルのSHA256を確認してから実行してください。

## 更新方法

1. 起動中のL2TVを終了します。
2. 新しい配布アーカイブを解凍します。
3. 新しく作成された `L2TV` フォルダを使用します。

LR2の `score.db` / `song.db` は更新作業の対象ではありません。

## 削除方法

解凍して作成された `L2TV` 専用フォルダをゴミ箱へ移動してください。デスクトップやダウンロードなど、親フォルダそのものは削除しないでください。

## 使い方

1. L2TVを起動し、初回表示で日本語またはEnglishを選択します。
2. 画面右上の「メニュー」を開きます。
3. 「LR2 score.db パス」の参照ボタンから `score.db` を選択します。
4. 「song.db パス」の参照ボタンから `song.db` を選択します。
5. `score.db` の仕様を選択します。迷う場合は「自動判別」のままで構いません。
6. ライバル比較を使う場合は、Rivalフォルダを指定します。
7. 「一覧を開く」から難易度表一覧を開き、読み込む表にチェックを入れます。
8. 必要に応じて「追加済み」を開き、ドラッグで表示順を変更します。
9. 「表とランプを読み込む」を押します。

難易度表を選択しなくても、Player Dataだけを読み込んで表示できます。

## ソースコードから起動する

開発者向けの手順です。

```powershell
npm install
npm run desktop
```

ローカルサーバーのみ起動する場合:

```powershell
npm start
```

Windows向け配布アーカイブを作成する場合:

```powershell
npm run dist:win
```

zip形式で作成する場合:

```powershell
npm run dist:win:zip
```

## リポジトリ構成

```text
electron-main.js      Electronメインプロセス
electron-preload.js   Electron preload
server.js             ローカルAPIサーバーとDB読み取り処理
public/               画面UI、CSS、画像、FORCE RATE定数データ
scripts/              ビルド・検証・定数生成用スクリプト
build/                アイコン、インストーラー関連ファイル
```

## データと免責

- L2TVはLunatic Rave 2、OpenLR2、BMS-IR、Stellaverse IR、および各難易度表運営者の公式ソフトウェアではありません。
- BMS本体、譜面、音源、難易度表、IRサービスに関する権利は、それぞれの制作者・運営者に帰属します。
- 難易度表やIRサービスの仕様変更により、一部の情報が取得できなくなる場合があります。
- FORCE RATEはL2TV独自の指標であり、公式の実力指標ではありません。

## ライセンス

L2TV本体のソースコードは [MIT License](LICENSE) で公開しています。

Electron版の配布物には、Electron / Chromium / Node.js および関連コンポーネントのライセンス通知として、以下のファイルを同梱しています。

- `LICENSE.electron.txt`
- `LICENSES.chromium.html`

開発時に使用しているツールや第三者コンポーネントについては [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。
