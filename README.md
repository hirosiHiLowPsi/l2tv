# L2TV

## 重要なお知らせ: アンインストールとzip版の使い方

- zip版を使う場合は、`L2TV-<version>-win-x64.zip` を必ず空のフォルダに解凍してから `L2TV.exe` を起動してください。
- zip版はインストール不要です。削除するときは、Windowsのアンインストーラーを使わず、解凍したL2TV専用フォルダをゴミ箱へ移動してください。
- 削除してよいのは、解凍して作ったL2TV専用フォルダだけです。デスクトップやダウンロードフォルダなど、親フォルダそのものを削除しないでください。
- 1.0.1以前のインストーラー版で、デスクトップなどの個人フォルダをインストール先に選んだ場合は、アンインストーラーを実行しないでください。

L2TV（LR2 Table Viewer）は、LR2 のローカル `score.db` / `song.db` と BMS 難易度表を突き合わせて、難易度表に登録されている譜面だけを表ごとに確認するローカルサイトです。

## できること

- 複数の難易度表 URL をまとめて読み込み
- `score.db` からプレイヤーネーム、クリアランプ、スコア、BP、プレイ回数を取得
- `song.db` の曲カタログを使った NO SONG 判定
- `score.db` の `grade_7/grade_14` から段位文字列を復元し、オフラインでも段位表示
- デスクトップ版では `score.db` / `song.db` を「参照」ボタンから選択可能
- 入力内容と直近の読み込み結果をブラウザに保存し、再読み込み後に復元
- 難易度表の `md5` と `score.db` の譜面ハッシュを突き合わせ
- 表ごとのランプ集計、レベル別の横グラフ、譜面一覧表示

## 使い方

```bash
node server.js
```

ブラウザで `http://127.0.0.1:4173` を開いてください。

`score.db` は必須です。難易度表URLを未入力のまま実行すると、プレイヤーデータ（名前/段位）のみ表示します。

## デスクトップアプリとして起動 (Electron)

```bash
npm install
npm run desktop
```

## Windows 用 zip を作る

```bash
npm install
npm run dist:win
```

ビルド完了後、`dist` フォルダに `L2TV-<version>-win-x64.zip` が出力されます。
zipを空のフォルダに解凍して、中の `L2TV.exe` を起動すれば使えます。インストールは不要です。

インストーラーを作りたい場合だけ、次を実行します。

```bash
npm run dist:win:installer
```

または PowerShell スクリプトでもビルドできます:

```powershell
.\build-win.ps1
```

インストーラーを作りたい場合:

```powershell
.\build-win.ps1 -Installer
```

依存インストールを省略したい場合:

```powershell
.\build-win.ps1 -SkipInstall
```

`Cannot create symbolic link` エラーが出る場合は、以下のどちらかで再実行してください。

- 管理者権限の PowerShell で実行
- Windows の開発者モードを ON にして実行

## データ保存先

zip版は既定で `exe` と同じフォルダ配下の
`lr2ir-table-lamp-viewer-data` に保存します。

例:

- `...\L2TV\lr2ir-table-lamp-viewer-data\user-data`

ただし、インストール先が書き込み不可の場合のみ、自動で通常の AppData 保存へフォールバックします。

入力例:

```text
score.db:
D:\LR2\LR2files\Database\Score\player.db

song.db:
D:\LR2\LR2files\Database\song.db

難易度表URL:
https://stellabms.xyz/sl/table.html
https://stellabms.xyz/st/table.html
```

## メモ

- `table.html` または `header.json` を入力できます。
- `score.json` 単体 URL は、ヘッダー情報が無いため未対応です。
- ローカルDB照合は `md5` ベースです。`sha256` のみの譜面は `UNSUPPORTED` になります。
- 初回読み込みは、難易度表の譜面数に応じて時間がかかります。
