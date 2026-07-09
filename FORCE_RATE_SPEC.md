# L2TV FORCE RATE 仕様説明書

この文書は、L2TV v2系における FORCE RATE の現行計算仕様をまとめたものです。

FORCE RATE はL2TV独自のプレイヤー指標です。公式IRや難易度表運営による公式レーティングではありません。

## 1. 基本方針

FORCE RATEは、クリアランプの強さよりもスコア力を重視します。

同じ譜面であれば、FC / HC / NC / EC / FL の違いではなく、EX SCORE RATE の高さによって単曲FORCEが決まります。NO PLAY と NO SONG は対象外です。

```text
単曲FORCE = 譜面定数 × スコア係数
FORCE RATE = FORCE対象全体の平均
```

BEST20補正は使用しません。

## 2. 対象譜面

FORCE RATEの対象は、以下の難易度表に登録されている譜面です。

- 発狂BMS難易度表
- 初代Overjoy
- 第二期Overjoy

同じMD5が複数の対象表に存在する場合は、同一譜面として扱います。

対象表の表示は次のように整理します。

| 状態 | 表示 |
|---|---|
| 初代Overjoyのみに存在 | 初代Overjoy |
| 第二期Overjoyのみに存在 | 第二期Overjoy |
| 初代Overjoyと第二期Overjoyの両方に存在 | 初代/第二期Overjoy |
| 発狂BMS難易度表に存在 | 発狂BMS難易度表 |

## 3. 対象外

次のデータはFORCE RATE対象外です。

- NO PLAY
- NO SONG
- MD5で照合できない譜面
- FORCE譜面定数表に存在しない譜面
- CHEATED扱いのスコア
- L2TV側で除外指定した不正者のスコア

## 4. 譜面定数

譜面定数は、LR2IR Archive の統計をもとにした固定値です。

アプリは次のJSONを読み込みます。

```text
public/data/force-chart-constants.json
```

主な項目は以下です。

| 項目 | 内容 |
|---|---|
| `md5` | 譜面MD5 |
| `chartConstant` | FORCE RATEで使用する譜面定数 |
| `sourceTable` | 対象表名 |
| `difficulty` | 対象表でのレベル表記 |

### 4.1 定数の主基準

現行の譜面定数は、スコア力を重視するため、次の考え方を主軸にしています。

```text
クリア人数に対するAAA到達人数の割合が低い譜面ほど高い定数になる
```

AAA到達率は平滑化して扱います。

```text
AAA到達率 = (AAA到達人数 + 1) / (クリア人数 + 2)
```

AAA到達者が極端に少ない譜面は、同レベル帯の上限寄りの定数になりやすくなります。

### 4.2 特殊扱い

次の譜面は定数を `27.00` に寄せます。

- クリア者が存在しない譜面
- AAA到達者が存在しない、または極端に少ない超高難度譜面
- 到達不能扱いの譜面

## 5. スコア係数

スコア係数は、EX SCORE RATE から求めます。

AAA未満ではEX SCORE RATEをそのまま小数第3位へ丸めます。

```text
AAA未満:
  スコア係数 = round(EX SCORE / MAX EX SCORE, 3)
```

AAA以上では、AAAを `0.900`、94.44%を `0.980`、MAXを `1.000` として線形補間します。

```text
AAA ～ 94.44%:
  0.900 → 0.980

94.44% ～ MAX:
  0.980 → 1.000
```

代表例:

| EX SCORE RATE | スコア係数 |
|---:|---:|
| 100.00% | 1.000 |
| 99.00% | 0.996 |
| 94.44% | 0.980 |
| 93.53% | 0.967 |
| 90.00% | 0.916 |
| AAA境界 88.89% | 0.900 |
| 88.00% | 0.880 |

## 6. クリアランプ係数

現行仕様では、クリアランプ係数を使用しません。

| ランプ | 係数 |
|---|---:|
| MAX | 1.00 |
| PERFECT | 1.00 |
| FULL COMBO | 1.00 |
| EX HARD CLEAR | 1.00 |
| HARD CLEAR | 1.00 |
| NORMAL CLEAR | 1.00 |
| EASY CLEAR | 1.00 |
| FAILED | 1.00 |

FAILEDでも有効なEX SCOREが存在する場合は、スコアによって評価されます。NO PLAY と NO SONG は対象外です。

## 7. 段位加算

GENOSIDE2018 SP段位認定の最高合格段位を、単曲50譜面とは別に1件だけ追加対象にします。

段位は「コース自体に合格していること」を条件とし、段位構成曲の単曲クリア状況では判定しません。

段位にはスコア係数を使用しません。

段位ランプ係数はNC / HCともに `1.00` です。

| 段位ランプ | 係数 |
|---|---:|
| HARD CLEAR | 1.00 |
| NORMAL CLEAR | 1.00 |

段位定数:

| 段位 | 定数 |
|---|---:|
| 発狂初段 | 1.00 |
| 発狂二段 | 1.00 |
| 発狂三段 | 1.00 |
| 発狂四段 | 1.00 |
| 発狂五段 | 1.00 |
| 発狂六段 | 1.39 |
| 発狂七段 | 1.76 |
| 発狂八段 | 2.94 |
| 発狂九段 | 7.09 |
| 発狂十段 | 12.20 |
| 発狂皆伝 | 18.15 |
| Overjoy | 26.81 |

```text
段位FORCE = 段位定数
```

## 8. FORCE RATE計算

まず、単曲FORCE上位50譜面を選びます。

```text
単曲対象 = 単曲FORCE上位50譜面
```

最高合格段位が存在する場合は、段位FORCEを1件追加します。

```text
FORCE対象 = 単曲FORCE上位50譜面 + 最高合格段位1件
```

段位が存在する場合、対象数は最大51件です。

FORCE RATEは、対象全体の単純平均です。

```text
FORCE RATE = FORCE対象合計 / FORCE対象数
```

BEST20補正は使用しません。

表示上限は `30.000` です。

```text
表示FORCE RATE = clamp(FORCE RATE, 0, 30)
```

## 9. 称号

| FORCE RATE | 称号 |
|---:|---|
| 25.000～ | EVENT HORIZONE |
| 24.000～ | SINGULARITY |
| 23.000～ | ASTRAL IV |
| 22.000～ | ASTRAL III |
| 21.000～ | ASTRAL II |
| 20.000～ | ASTRAL I |
| 19.000～ | OBSIDIAN |
| 18.000～ | AURUM |
| 17.000～ | ARGENT |
| 16.000～ | CRIMSON |
| 15.000～ | AMETHYST |
| 14.000～ | JADE |
| 12.000～ | AMBER |
| 10.000～ | AZURE |
| 0.000～ | SLATE |

## 10. 表示項目

Player Data には以下を表示します。

- FORCE RATE
- 称号
- 対象数
- 単曲対象譜面数
- FORCE対象譜面数

FORCE RATE TARGETS フォルダには、対象譜面・段位を一覧表示します。

主な列:

- #
- Title
- 譜面定数
- Lamp
- EX/Rate
- 単曲レート
- 対象表

## 11. 実装メモ

本体計算は `server.js` の `buildForceRating()` で行います。

主な処理:

1. `public/data/force-chart-constants.json` を読み込む。
2. ローカル `score.db` のMD5と照合する。
3. NO PLAY / NO SONG / 無効スコアを除外する。
4. `譜面定数 × スコア係数` で単曲FORCEを計算する。
5. 単曲FORCE上位50譜面を選ぶ。
6. 最高合格GENOSIDE2018 SP段位があれば1件追加する。
7. 対象全体の平均をFORCE RATEにする。

定数再生成は次のコマンドを使います。

```text
npm run force:constants:score-oriented
```

別の場所にLR2IR Archive DBを置く場合は、スクリプトへDBパスを渡します。

```text
node scripts/apply-score-oriented-force-constants.js C:\path\to\lr2ir-archive.db
```
