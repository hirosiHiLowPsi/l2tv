# L2TV FORCE RATE 譜面定数仕様

この文書は、L2TV の FORCE RATE で使用する譜面定数の算出方法を定義します。

## 対象譜面

- 発狂BMS難易度表
- 第二期Overjoy難易度表

Overjoy は `https://lr2.sakura.ne.jp/overjoy.php` に掲載されている第二期譜面のみを使用します。
第三期Overjoyのみに存在する譜面は対象外です。

第二期Overjoyのレベルは次のように換算します。

```text
★★n = ★(20 + n)
```

## 参照データ

定数計算にはローカルの LR2IR Archive データベースを使用します。

既定の参照先:

```text
../lr2ir-archive.db
```

除外する記録:

- CHEATED と判定されたスコア
- CHEATER と判定されたアカウント
- L2TVで指定している除外プレイヤーの記録
- MAX EX SCORE が0以下の記録
- EX SCORE が存在しない記録

FAILEDでも、有効なEX SCOREが存在する場合はスコア分布の母数に含めます。

## 対象帯とサンプリング

譜面を以下の帯に分けます。

| 帯 | レベル |
|---|---|
| 低難度 | ★1～★8 |
| 中難度 | ★9～★16 |
| 高難度 | ★17～★27 |
| 到達不能 | ★28以上 |

各帯について、その帯の50%以上の譜面に有効スコアを持つプレイヤーを候補にします。
候補者が2000人を超える場合は、決定的なサンプリングで最大2000人を使用します。

## スコア重視版定数

譜面定数は、表記レベルを基準にし、スコア分布を主軸として補正します。
ランプIRT定数は補助値としてのみ使用します。

```text
最終譜面定数 = roundTo2(clamp(表記レベル + スコア乖離 + ランプIRT乖離, 1.00, 27.00))
```

★28以上は `27.00` に固定します。

## スコア乖離

スコア閾値ごとに、到達者割合が基準より低いほど譜面定数を上げ、高いほど下げます。

| 閾値 | 基準到達率 | 係数 | 最小補正 | 最大補正 |
|---|---:|---:|---:|---:|
| AAA / 88.89% | 0.45 | 0.18 | -0.30 | +0.45 |
| 94.44% | 0.20 | 0.35 | -0.50 | +1.20 |
| 97.00% | 0.08 | 0.45 | -0.40 | +1.40 |
| 99.00% | 0.02 | 0.55 | -0.30 | +1.60 |

到達者が10人未満の閾値は補正0です。

```text
到達率 = (到達者数 + 1) / (有効スコア人数 + 2)
生補正 = clamp(log2(基準到達率 / 到達率) × 係数, 最小補正, 最大補正)
信頼度 = clamp(有効スコア人数 / 100, 0, 1)
閾値補正 = 生補正 × 信頼度
```

各閾値補正を合計し、次の範囲に収めます。

```text
スコア乖離 = clamp(閾値補正合計, -1.00, +3.00)
```

## ランプIRT補助

ランプIRT定数は、クリア状況から見た難度を軽く残すために使用します。

```text
ランプIRT乖離 = clamp((ランプIRT定数 - 表記レベル) × 0.35, -1.00, +1.00)
```

## 出力JSON

アプリが読み込む実行用JSON:

```text
public/data/force-chart-constants.json
```

実行用JSONは軽量化のため、各譜面には FORCE RATE 計算に必要な最小項目だけを持たせます。

| 項目 | 内容 |
|---|---|
| `constantVersion` | 定数仕様バージョン。現行は `score-oriented-v2` |
| `chartConstant` | FORCE RATEで使う最終譜面定数 |
| `md5` | 譜面MD5 |
| `source` | 対象表の種別 |

詳細な監査データは、生成時に `outputs/force-score-oriented-constants-YYYYMMDD/force-chart-constants-score-oriented-audit.json` へ保存します。
監査JSONには以下の項目も含めます。

| 項目 | 内容 |
|---|---|
| `title` | 曲名 |
| `sourceTable` | 所属難易度表 |
| `difficulty` | 難易度 |
| `nominalLevel` | 換算後の表記レベル |
| `scoreDeviation` | スコア分布による補正合計 |
| `lampDeviation` | ランプIRT補助による補正 |
| `scoreThresholds` | 各スコア閾値の母数、到達者数、補正値 |
| `lampIrtConstant` | ランプIRT由来の補助定数 |

生成コマンド:

```text
npm run force:constants:score-oriented
```

別のDBを参照する場合:

```text
node scripts/apply-score-oriented-force-constants.js C:\path\to\lr2ir-archive.db
```
