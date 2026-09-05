# AETHER — Orbital Station

地球を見下ろす架空の研究ステーションを歩く、ブラウザー用の 3D シミュレーター。

Blender MCP で制作した二重リングの外装、PBR 材質を使った内部、Rapier による歩行と衝突判定を備えています。

## 体験できること

- 展望室から地表・雲・大気・星空を眺める。
- 連絡通路を歩き、寝台・食堂のある居住区、水耕栽培の研究室、機関室へ移動。
- ハッチ、窓シャッター、照明、太陽電池、リアクター、人工重力、航行ビーコンの操作。
- 人工重力を切り、上下に浮遊。研究室の試料も浮き上がる。
- 外観カメラ、マップからの区画移動、環境音、PNG 撮影。
- 描画品質、軌道の時間倍率、視点感度の変更。

## 起動

Node.js 22.12 以降で、次のコマンドを実行してください。

```powershell
npm install
npm run dev
```

画面の「ステーションに入る」から探索を始めます。

| 操作 | キー |
|---|---|
| 歩く | WASD |
| 速く移動 | Shift |
| 見回す | 左ドラッグ / 矢印キー |
| マウス固定 | F、解除は Esc |
| 近くの設備・ハッチ | E |
| マップ | M |
| 内部・外観 | V |
| 写真 | P |
| 無重力時の上下移動 | Space / Q |

タッチ端末では画面の移動ボタンとドラッグ操作を使います。

## WebGPU 単一 HTML ビューア

`public/viewer.html` はビルド不要の独立したビューアです。

Three.js 0.185.1 の WebGPURenderer、自動 WebGL 2 フォールバック、HDRI、3 灯照明、PCF ソフトシャドウ、GTAO、Bloom、ACES、GLB ドロップに対応します。Blender の材質設定・書き出し手順と完全コードは **[WEBGPU_GUIDE.md](WEBGPU_GUIDE.md)** にあります。

シミュレーター本体の描画は Three.js WebGLRenderer、独立ビューアは WebGPURenderer です。GLB は共通で利用できます。リアルタイムのラスタライズ描画で、軌道情報は演出用です。

## アセット

- `blender/aether-station.blend`：Blender 元データ。
- `blender/build_station.py`：MCP または Blender の Python で実行する制作スクリプト。Blender の Text Editor でこのファイルを開いて実行すると再制作できます。MCP から exec する場合は `__file__` にこの Python ファイルの絶対パスを渡します。
- `public/assets/station.glb`：PBR 画像を内蔵した Meshopt 圧縮モデル。
- `src/interior.ts`：内部・コリジョン・設備の定義。
- `src/simulation.ts`：設備の状態と環境音。
- `src/main.ts`：操作・物理・画面管理。

外装と内部は、参考画像から着想した体験用の別々の表示モデルです。外部カメラと内部探索は表示モードで切り替えます。

出典とライセンスは **[ASSET_CREDITS.md](ASSET_CREDITS.md)** を参照してください。

## ビルドと公開

```powershell
npm run build
npm run preview
```

`dist` に GitHub Pages 用の静的ファイルを出力します。リポジトリの Settings → Pages → Source を **GitHub Actions** に設定し、`main` に push すると `.github/workflows/deploy.yml` がビルド・公開します。リポジトリ配下のパスでも動く相対 URL 構成です。

## 検証

Playwright CLI によるスクリーンショット確認、実際の移動・設備操作、壁・家具・ハッチとの衝突、4 区画への移動、PC / モバイル表示を検証しています。詳しい結果は **[VALIDATION.md](VALIDATION.md)** を参照してください。

探索済み区画と操作履歴だけを localStorage に保存します。再読み込みすると設備は初期状態に戻ります。
