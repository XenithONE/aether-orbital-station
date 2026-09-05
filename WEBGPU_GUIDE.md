# Blender → WebGPU：実行できるビューアと出力チェックリスト

完成コードは **[public/viewer.html](public/viewer.html)** です。HTML 1 ファイルに画面・設定・読み込み処理をまとめています。Three.js と初期 HDRI はインターネットから読み込むため、完全オフライン版ではありません。ローカルの GLB / HDR は端末内で読み込み、アップロードしません。

Three.js は確認時点の npm 最新安定版 **0.185.1** に固定しています。標準の `WebGPURenderer` が WebGPU を試し、使えない場合は WebGL 2 バックエンドへ切り替えます。WebGPU 自体がモデルを高精細化したり、Cycles のレイトレーシングを自動再現したりするわけではありません。質感の情報を正しく渡し、光・影・色の処理を整える実装です。

## 1. Blender 出力設定の完全チェックリスト

Blender 5.2 の実際のエクスポーターの設定名を確認しています。日本語 UI では名称が翻訳されます。旧バージョンの `Clearcoat` は現在の `Coat`、`Transmission` は `Transmission Weight` に対応します。

### 材質を作る

- [ ] 基本は **Principled BSDF → Material Output / Surface** の接続にする。
- [ ] Base Color と Emission の画像は **sRGB** にする。
- [ ] Roughness / Metallic / Normal / AO / Transmission の画像は **Non-Color** にする。
- [ ] ノーマル画像は **Image Texture → Normal Map → Principled Normal** と接続する。Normal Map は **Tangent Space**、画像は **OpenGL / +Y** 形式。
- [ ] 各メッシュに UV があり、模様の大きさが不自然に伸びていないことを確認する。
- [ ] 曲面は滑らかな法線を使い、硬い金属の角には小さな面取りを入れる。ベベルは物体の実寸に合わせる。
- [ ] Noise / Voronoi / ColorRamp / 複雑な Mix Shader などの結果は、必要な色・粗さ・法線の画像にベイクして接続し直す。
- [ ] 形状として必要な変位や Geometry Nodes は、実メッシュ化・モディファイア適用を確認する。微細な凹凸はノーマル画像に置き換える。
- [ ] AO を持ち出す場合はエクスポーター対応の **glTF Material Output** ノードグループの **Occlusion** に接続する。適当な位置に置いた AO ノードだけでは書き出されない。
- [ ] 光を含む完成画像を Base Color に焼き込んで、さらに同じ光を Web 側で重ねない。PBR 用の色・粗さ・法線を分ける。

全部の項目を有効にする必要はありません。次の数値は調整の出発点で、素材を測定した値ではありません。

| 素材 | Metallic | Roughness | Transmission Weight | IOR | Coat Weight / Roughness | Sheen Weight |
|---|---:|---:|---:|---:|---:|---:|
| 塗装された外装 | 0 | 0.3–0.6 | 0 | 1.5 | 0.1–0.3 / 0.15–0.3 | 0 |
| 露出した金属 | 1 | 0.2–0.5 | 0 | 通常は既定値 | 0 | 0 |
| 透明なガラス | 0 | 0.02–0.12 | 1 | 約 1.45–1.52 | 0 | 0 |
| 樹脂・陶器 | 0 | 0.2–0.5 | 0 | 約 1.45–1.55 | 光沢仕上げなら 0.2–0.8 | 0 |
| 布・クッション | 0 | 0.65–0.95 | 0 | 1.5 | 0 | 0.2–0.7 |

- **Transmission**：ガラスに使用。基本的に Alpha は 1 のままにする。透過とアルファ透明は別の表現です。
- **IOR**：透明物や非金属の反射・屈折を調整。1.5 は glTF の既定値なので、設定しても専用拡張が省略される場合があります。
- **Coat / Clearcoat**：塗膜やニスの反射層。裸の金属に一律で足さない。
- **Sheen**：布の縁に生じる柔らかい反射。金属やガラスでは通常 0。
- **厚みと吸収**：ガラスの厚み・色付き吸収には `KHR_materials_volume` 対応の接続が必要。Transmission だけで内部の光学現象がすべて再現されるわけではありません。
- **Emissive Strength**：表示灯などに使う。Web 側の Bloom は明るい部分をにじませますが、その面から周辺へ落ちる照明は別途用意します。
- Blender の World、AgX 設定、Cycles の反射回数、Eevee の画面効果は、そのまま GLB に保存される項目ではありません。

### 書き出し前

1. 保存用 `.blend` を残す。
2. 原点・単位・サイズを確認する。静的なモデルは Object Mode の **Ctrl+A → Rotation & Scale** で適用。リグ付きモデルでは適用がアニメーションを壊さないことを先に確認する。
3. 書き出すメッシュと必要なリグを選択する。
4. **File → Export → glTF 2.0 (.glb/.gltf)** を開く。

| エクスポート画面の項目 | 設定 | 意味・例外 |
|---|---|---|
| Format | **glTF Binary (.glb)** | 形状・材質・画像を 1 ファイルにまとめる |
| Include / Selected Objects | **ON** | 選択したものだけ出す。シーン全体が目的なら OFF |
| Include / Active Scene | **ON** | 別シーンの物体の混入を防ぐ |
| Transform / +Y Up | **ON** | glTF 標準の上方向に変換 |
| Data / Mesh / UVs | **ON** | テクスチャ座標 |
| Normals | **ON** | 曲面や角の陰影 |
| Tangents | **ON** | 特にノーマルマップを使うモデルで有効 |
| Materials | **Export** | 材質と対応する拡張を出力 |
| Images | **Automatic** または **PNG** | 最初は画質を優先。JPEG の再圧縮に注意 |
| Keep Original | **OFF** | エクスポーターによるチャンネル再配置を妨げない |
| Apply Modifiers | **静的モデルは ON** | Shape Keys が必要なモデルでは OFF。事前に適用できるものだけ適用 |
| Animations | **動かすモデルだけ ON** | 静的なステーション外装なら OFF |
| Cameras | **OFF** | このビューアのカメラを使用 |
| Punctual Lights | **OFF** | このビューアのスタジオ照明を使用 |
| Draco Mesh Compression | **最初は OFF** | 正しい見た目を確認してから圧縮。ビューアは Draco と Meshopt の双方に対応 |

Transmission / Coat / Sheen を出力するための独立したチェックボックスを全部探して ON にする作業は不要です。対応する Principled の入力と値から glTF の材質拡張が生成されます。

書き出した GLB を空の Blender シーンへ読み直し、色・透過・法線・アニメーション・画像の欠落を確認します。外部画像の参照が残る GLB は、単独ドロップ用のファイルとして完成していません。

参考：[Blender glTF 2.0 マニュアル](https://docs.blender.org/manual/en/dev/addons/scene_gltf2.html)、本プロジェクトの Blender 5.2 エクスポーター確認結果。

## 2. 単一 HTML 完結ビューア

**[viewer.html を保存](public/viewer.html)** してください。ファイルをブラウザーで開き、`.glb` をドラッグ＆ドロップするか、**GLB ファイルを選ぶ**を押します。ファイル選択したモデルの変換・アップロードはサーバーで行いません。

実装済みの内容：

- Three.js **WebGPURenderer**。WebGPU 非対応時の **WebGL 2 自動フォールバック**。
- Poly Haven **Studio Small 09 / CC0** の HDRI を、反射に適した環境マップへ変換。
- キー・フィル・リムの **3 灯照明**。
- **4096² の PCF ソフトシャドウ**。
- **GTAO** による接触部の陰影。透明物体を除外した深度・法線を使い、間接光に適用。
- **Bloom**、鮮やかさ、露出、環境光の調整。
- **ACESFilmicToneMapping** と sRGB 出力。色変換を二重にしない。
- 滑らかな **OrbitControls**、自動回転、視点リセット、サイズの自動調整。
- GLB 内の PBR 材質・スキニング・モーフ形状を維持。アニメーションがあれば最初のクリップを再生。
- **Draco / Meshopt / KTX2** の読み込み。
- モデル交換時の GPU リソース解放。連続ドロップ時は最後に指定したモデルを採用。
- 不正ファイルの案内。読み込み失敗時は表示中のモデルを維持。
- ローカル HDR ファイルの選択、UI なし PNG 保存、画面サイズ変更への対応。

初期の HDRI 取得に失敗しても、内蔵のスタジオ環境を使って表示を続けます。端末が WebGPU / WebGL 2 の両方に非対応の場合はエラー案内を表示します。

ソフトな影や AO はリアルタイムの近似です。透過面が何重にも重なる場面や実際の間接光の回り込みまで、Cycles と同一の結果を約束する実装ではありません。

参考：[WebGPURenderer の自動フォールバック](https://threejs.org/docs/pages/WebGPURenderer.html)、[公式 r185 Bloom](https://github.com/mrdoob/three.js/blob/r185/examples/webgpu_postprocessing_bloom.html)、[公式 r185 AO](https://github.com/mrdoob/three.js/blob/r185/examples/webgpu_postprocessing_ao.html)、[Poly Haven の CC0 ライセンス](https://polyhaven.com/license)。

## 3. 初心者向けの実行・反復・GitHub 公開手順

### HTML を開く

1. `viewer.html` を保存して Chrome / Edge などのブラウザーで開く。
2. ネット接続を有効にして初回読み込みを待つ。
3. Blender で書き出した `.glb` を画面へドロップする。
4. 左ドラッグで回転、右ドラッグで平行移動、ホイールで拡大縮小する。タッチ端末では 1 本指で回転、2 本指で移動・ズームする。
5. 右上に **WEBGPU · ACTIVE** または **WEBGL 2 · FALLBACK** が表示される。

`file://` からのモジュール取得や GPU 使用がブラウザー設定で制限される場合は、次の localhost 起動に切り替えてください。ブラウザーの安全設定を無効化する必要はありません。

Python がインストールされている場合、HTML のあるフォルダーでターミナルを開きます。

```powershell
python -m http.server 8080
```

表示する URL：`http://localhost:8080/viewer.html`

プロジェクト全体を動かす場合は、プロジェクトフォルダーで実行します。

```powershell
npm install
npm run dev
```

ターミナルに表示された URL で宇宙ステーション、同じ URL の末尾に `viewer.html` を付けるとビューアを開けます。

### 見た目を詰める順序

1. **形状**：面取り・厚み・シルエットを確認する。
2. **材質**：HDRI のまま回転し、粗さ・ノーマル・UV の伸びを確認する。
3. **照明**：輪郭がつぶれないよう、環境光と露出を調整する。
4. **仕上げ**：最後に Bloom と AO を少量ずつ調整する。強い効果でモデルの問題を隠さない。
5. **軽量化**：正しい状態を保存し、圧縮前後を同じ角度で比較する。

このプロジェクトの外装を圧縮するコマンド：

```powershell
npx gltf-transform optimize blender/station.raw.glb public/assets/station.glb --compress meshopt --texture-compress false
```

### GitHub Pages

単一ビューアだけなら、`viewer.html` を `index.html` として公開リポジトリのルートに置きます。GitHub の **Settings → Pages → Deploy from a branch → main / root → Save** で公開できます。

宇宙ステーション全体は同梱の `.github/workflows/deploy.yml` を使います。**Settings → Pages → Source: GitHub Actions** を選び、`main` に push するとビルド・公開されます。

URL の末尾に `?backend=webgl` を付けると WebGL 2 を明示的に選べるため、対応端末でもフォールバック側を比較できます。

---

以下に、保存ファイルと同じ完全な HTML コードを掲載します。

```html
<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#11161c"><title>ATELIER — WebGPU Material Studio</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23111922'/%3E%3Cpath d='M15 49 32 12 49 49M23 34h18' fill='none' stroke='%23c2d7c4' stroke-width='4'/%3E%3C/svg%3E">
<style>
:root{color-scheme:dark;font:13px/1.6 'Segoe UI','Yu Gothic',sans-serif;color:#dbe5e7;background:#11161c}*{box-sizing:border-box}body{margin:0;overflow:hidden}canvas{position:fixed;inset:0;display:block;touch-action:none}button,input,select{font:inherit}button{cursor:pointer;color:#d8e6e6;background:#22343e;border:1px solid #67818a55;border-radius:5px;padding:9px 13px}button:hover{background:#304c58}button:disabled{opacity:.4;cursor:wait}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #c7dac3;outline-offset:3px}[hidden]{display:none!important}header{position:fixed;left:35px;right:35px;top:27px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}h1{font-size:17px;font-weight:500;letter-spacing:5px;margin:0}header small{font:9px monospace;letter-spacing:2px;color:#8ea2ab}#backend{font:10px monospace;color:#c4d8c4;border:1px solid #91b4a43b;padding:8px 12px;border-radius:20px;background:#0a121b77}.intro{position:fixed;left:36px;bottom:100px;pointer-events:none}.intro span{font:10px monospace;color:#9bb0b5;letter-spacing:2px}.intro h2{font-size:clamp(24px,3vw,45px);font-weight:400;line-height:1.18;letter-spacing:-1px;margin:12px 0}.intro p{font-size:11px;color:#a0b5bd;max-width:340px}aside{position:fixed;right:28px;top:95px;bottom:85px;width:262px;max-height:610px;overflow:auto;padding:22px;background:#0b1620db;border:1px solid #849caa30;backdrop-filter:blur(20px);border-radius:9px;box-shadow:0 15px 70px #0003}aside h2{font:10px monospace;letter-spacing:2px;color:#97b3bb;margin:0 0 17px}.primary{background:#c2d7c4;color:#19302e;border:0;width:100%;font-weight:600}.primary:hover{background:#e0ebd6}.file-name{font-size:10px;color:#8ca9b3;overflow-wrap:anywhere;margin:12px 0 18px;min-height:30px}label{display:flex;justify-content:space-between;align-items:center;font-size:11px;margin:17px 0 8px}label output{color:#9cb8be;font:10px monospace}input[type=range]{width:100%;accent-color:#b5d0c3;height:4px}input[type=checkbox]{accent-color:#b5d0c3}select{max-width:130px;background:#1d303b;color:#c6d7da;border:1px solid #72909a45;padding:5px}.row{display:flex;gap:7px;margin-top:18px}.row button{flex:1;font-size:10px;padding:8px 5px}.credits{font-size:9px;color:#72909c;line-height:1.8;margin:19px 0 0}.credits a{color:#a4babc}footer{position:fixed;bottom:22px;left:35px;right:35px;display:flex;justify-content:space-between;gap:25px;align-items:end;font:10px monospace;color:#95adb5}#status{max-width:600px;color:#b9cfd1;white-space:pre-line}#drop{position:fixed;inset:15px;border:2px dashed #bdd5bf;background:#112b37ed;z-index:5;display:grid;place-content:center;text-align:center;border-radius:12px;pointer-events:none;font-size:22px}#drop small{font-size:12px;color:#9bb7bd}#error{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-width:540px;width:90%;z-index:10;background:#11222ef5;padding:28px;border:1px solid #bd8a6555;border-radius:8px}#error p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;color:#c2cfd4}#error h2{font-size:17px}#panel-toggle{display:none}#help{pointer-events:auto;font-size:10px;background:transparent}.compact .intro{display:none}@media(max-width:740px){header{left:20px;right:20px;top:20px}h1{font-size:14px}header small{font-size:7px}#backend{font-size:8px}.intro{left:22px;bottom:110px}.intro h2{font-size:29px}.intro p{font-size:10px;max-width:260px}aside{top:75px;right:15px;width:236px;bottom:85px;display:none}aside.open{display:block}.intro:has(~aside.open){display:none}#panel-toggle{display:block;position:fixed;right:20px;bottom:76px;font-size:11px}footer{left:20px;right:20px;font-size:8px;bottom:20px}footer>span{display:none}#status{max-width:90%}}
</style>
<!-- All imports are pinned to the same tested release. No build tools required. -->
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.webgpu.js","three/webgpu":"https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.webgpu.js","three/tsl":"https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.tsl.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/"}}</script>
</head>
<body>
<header><div><h1>ATELIER</h1><small>REALTIME MATERIAL STUDIO / 01</small></div><span id="backend">INITIALIZING</span></header>
<div class="intro"><span>FROM BLENDER TO THE BROWSER</span><h2>Made of light.<br>Defined by detail.</h2><p>あなたのモデルに、光と質感を。<br>.glb をここにドロップすると、スタジオが始まります。</p></div>
<aside id="panel"><h2>STUDIO CONTROLS</h2><button id="open" class="primary" disabled>GLB ファイルを選ぶ ↗</button><input id="file" type="file" accept=".glb" hidden><input id="hdr-file" type="file" accept=".hdr" hidden><p id="model-name" class="file-name">読み込み準備中…</p>
<label>明るさ <output id="exposure-value">1.00</output></label><input id="exposure" type="range" min="0.25" max="2.5" step="0.01" value="1">
<label>環境光 <output id="environment-value">0.65</output></label><input id="environment" type="range" min="0" max="2.5" step="0.01" value="0.65">
<label>光のにじみ <output id="bloom-value">0.16</output></label><input id="bloom" type="range" min="0" max="0.8" step="0.01" value="0.16">
<label>接触部の陰影 <output id="ao-value">0.75</output></label><input id="ao" type="range" min="0" max="1" step="0.01" value="0.75">
<label>色の鮮やかさ <output id="saturation-value">1.00</output></label><input id="saturation" type="range" min="0" max="1.5" step="0.01" value="1">
<label>描画品質<select id="quality"><option value="high">高品質</option><option value="standard">標準</option></select></label>
<label>ゆっくり回転<input id="rotate" type="checkbox"></label><label>モデルのアニメーション<input id="animation" type="checkbox" checked></label>
<div class="row"><button id="reset">視点リセット</button><button id="photo">写真を保存</button></div><div class="row"><button id="hdr-open">HDRI を変更</button><button id="demo">デモに戻る</button></div>
<p class="credits">Three.js r185.1 · ACES · GTAO · Bloom<br>HDRI: <a href="https://polyhaven.com/a/studio_small_09" target="_blank" rel="noreferrer">Poly Haven / Studio Small 09 (CC0)</a><br>選択した GLB / HDR ファイルは端末内で処理します。<br>ライブラリと初期 HDRI の取得にはネット接続が必要です。</p></aside>
<button id="panel-toggle">設定 / ファイルを選ぶ</button>
<footer><div id="status" role="status" aria-live="polite">描画エンジンを読み込んでいます…</div><span>ドラッグ：回転 &nbsp; 右ドラッグ：移動 &nbsp; ホイール：ズーム</span></footer>
<div id="drop" hidden>GLB をドロップ<small>テクスチャを内蔵した .glb ファイル</small></div>
<div id="error" hidden><h2>読み込みを確認してください</h2><p></p><button id="dismiss">閉じる</button> <button id="fallback">WebGL 2 で再起動</button></div>
<script type="module">
const $=id=>document.getElementById(id);
const status=text=>$('status').textContent=text;
function error(err){console.error(err);$('error').hidden=false;$('error').querySelector('p').textContent=err.message||String(err);status('読み込みに失敗しました。前のモデルはそのまま操作できます。');}
$('dismiss').onclick=()=>$('error').hidden=true;
$('fallback').onclick=()=>{const u=new URL(location.href);u.searchParams.set('backend','webgl');location.href=u.href;};
$('panel-toggle').onclick=()=>$('panel').classList.toggle('open');
try {
 const [THREE,TSL,{OrbitControls},{GLTFLoader},{DRACOLoader},{KTX2Loader},{MeshoptDecoder},{HDRLoader},{RoomEnvironment},{bloom},{ao},{RoundedBoxGeometry}]=await Promise.all([
  import('three/webgpu'),import('three/tsl'),import('three/addons/controls/OrbitControls.js'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/loaders/DRACOLoader.js'),import('three/addons/loaders/KTX2Loader.js'),import('three/addons/libs/meshopt_decoder.module.js'),import('three/addons/loaders/HDRLoader.js'),import('three/addons/environments/RoomEnvironment.js'),import('three/addons/tsl/display/BloomNode.js'),import('three/addons/tsl/display/GTAONode.js'),import('three/addons/geometries/RoundedBoxGeometry.js')]);
 const {pass,mrt,normalView,packNormalToRGB,unpackRGBToNormal,sample,screenUV,builtinAOContext,uniform,mix,vec3,vec4,dot,max}=TSL;
 // WebGPURenderer automatically uses its WebGL 2 backend when WebGPU is unavailable.
 const renderer=new THREE.WebGPURenderer({antialias:true,samples:4,alpha:false,forceWebGL:new URLSearchParams(location.search).get('backend')==='webgl'});
 await renderer.init();
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 document.body.prepend(renderer.domElement);
 const gpu=renderer.backend.isWebGPUBackend===true;$('backend').textContent=gpu?'WEBGPU · ACTIVE':'WEBGL 2 · FALLBACK';
 const scene=new THREE.Scene();scene.background=new THREE.Color('#111922');scene.fog=new THREE.Fog('#111922',12,38);
 const camera=new THREE.PerspectiveCamera(38,innerWidth/innerHeight,.05,100);camera.position.set(5,3.4,6);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.target.set(0,1.25,0);controls.minDistance=.25;controls.maxDistance=35;controls.autoRotateSpeed=.45;controls.maxPolarAngle=Math.PI*.495;
 const modelRoot=new THREE.Group();scene.add(modelRoot);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#202b35',metalness:.22,roughness:.4}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
 // Three deliberately different directions reveal shape, material and silhouette.
 function lamp(color,intensity,x,y,z){const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);l.target.position.set(0,1,0);scene.add(l,l.target);return l;}
 const key=lamp(0xffe4c6,2.3,5,7,4),fill=lamp(0xb3d4ff,.7,-5,3,2),rim=lamp(0xc3e4ff,3,-2,5,-5);
 key.castShadow=true;key.shadow.mapSize.set(4096,4096);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=6;key.shadow.camera.bottom=-4;key.shadow.camera.near=.1;key.shadow.camera.far=25;key.shadow.bias=-.00015;key.shadow.normalBias=.025;key.shadow.radius=3;
 // Start with a generated studio, then replace it with the actual HDRI.
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();let envTarget=pmrem.fromScene(room,.04);room.dispose();scene.environment=envTarget.texture;scene.environmentIntensity=.65;
 let hdrSerial=0;
 async function setHDR(input){const serial=++hdrSerial;let hdr;
  try {hdr=input instanceof ArrayBuffer?new HDRLoader().parse(input):await new HDRLoader().loadAsync(input);
   // HDRLoader.parse returns image data; create a texture for local ArrayBuffers.
   if(!(hdr instanceof THREE.Texture)){const d=hdr;hdr=new THREE.DataTexture(d.data,d.width,d.height,THREE.RGBAFormat,d.type);hdr.colorSpace=THREE.LinearSRGBColorSpace;hdr.needsUpdate=true;}
   if(serial!==hdrSerial){hdr.dispose();return;}hdr.mapping=THREE.EquirectangularReflectionMapping;
   const next=pmrem.fromEquirectangular(hdr);hdr.dispose();scene.environment=next.texture;envTarget.dispose();envTarget=next;status('スタジオ HDRI を適用しました。GLB を選ぶかドロップしてください。');
  } catch(e){status('HDRI を取得できなかったため、内蔵スタジオ照明を使用中です。');console.warn(e);}
 }
 void setHDR('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr');
 // WebGPU-native effects. Ambient occlusion affects indirect light only.
 // Transparent objects are excluded from the normal/depth prepass.
 const prePass=pass(scene,camera);prePass.transparent=false;prePass.setMRT(mrt({output:packNormalToRGB(normalView)}));
 prePass.getTexture('output').type=THREE.UnsignedByteType;
 const preNormal=sample(uv=>unpackRGBToNormal(prePass.getTextureNode().sample(uv)));
 const occlusion=ao(prePass.getTextureNode('depth'),preNormal,camera);occlusion.resolutionScale=.5;occlusion.radius.value=.3;occlusion.thickness.value=.8;occlusion.samples.value=16;
 const aoAmount=uniform(.75),saturation=uniform(1);
 const scenePass=pass(scene,camera);scenePass.contextNode=builtinAOContext(mix(1,occlusion.getTextureNode().sample(screenUV).r,aoAmount));
 const base=scenePass.getTextureNode('output');const glow=bloom(base,.16,.35,1.15);
 const combined=base.add(glow);const gray=vec3(dot(combined.rgb,vec3(.2126,.7152,.0722)));
 const graded=mix(gray,combined.rgb,saturation);
 const pipeline=new THREE.RenderPipeline(renderer);pipeline.outputNode=vec4(max(graded,vec3(0)),1);
 // RenderPipeline applies ACES and the display color conversion exactly once.
 const draco=new DRACOLoader().setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/libs/draco/gltf/');
 const ktx=new KTX2Loader().setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.185.1/examples/jsm/libs/basis/');ktx.detectSupport(renderer);
 const gltfLoader=new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx);
 let mixer=null,animations=[],loadSerial=0,current=null,objectName='Material study',last=performance.now(),frames=0,perfAt=last,fps=0;
 function disposeModel(root){if(!root)return;const geometry=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));});materials.forEach(m=>{Object.values(m).forEach(v=>{if(v?.isTexture)textures.add(v);});m.dispose();});textures.forEach(t=>{t.dispose();if(t.source?.data instanceof ImageBitmap)t.source.data.close();});geometry.forEach(g=>g.dispose());}
 function fit(){camera.position.set(5,3.4,6);controls.target.set(0,1.35,0);controls.update();}
 function install(root,clips=[],name='Model'){
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());const largest=Math.max(size.x,size.y,size.z);
  if(bounds.isEmpty()||!Number.isFinite(largest)||largest<1e-8){disposeModel(root);throw Error('表示できる形状がありません。Blender でメッシュを選択して書き出してください。');}
  // Use wrappers so normalization never overwrites the model's animated transforms.
  const scaled=new THREE.Group(),offset=new THREE.Group();scaled.add(offset);offset.add(root);scaled.scale.setScalar(3.6/largest);const center=bounds.getCenter(new THREE.Vector3());offset.position.set(-center.x,-bounds.min.y,-center.z);
  root.traverse(o=>{if(o.isLight)o.visible=false;if(o.isMesh){const materials=Array.isArray(o.material)?o.material:[o.material];o.castShadow=!materials.some(m=>m.transmission>0||m.opacity<.6);o.receiveShadow=true;materials.forEach(m=>Object.values(m).forEach(v=>{if(v?.isTexture)v.anisotropy=renderer.getMaxAnisotropy();}));}});
  if(mixer){mixer.stopAllAction();if(current)mixer.uncacheRoot(current.userData.animatedRoot);mixer=null;}
  if(current){modelRoot.remove(current);disposeModel(current);}current=scaled;current.userData.animatedRoot=root;modelRoot.add(current);animations=clips;
  if(clips.length){mixer=new THREE.AnimationMixer(root);mixer.clipAction(clips[0]).play();}
  objectName=name;$('model-name').textContent=name+(clips.length?` / アニメーション ${clips.length} 件`:'');$('animation').disabled=!clips.length;fit();document.body.classList.toggle('compact',name!=='Material study');status('読み込み完了。材質を保持したまま表示しています。');
 }
 function demo(){loadSerial++;const root=new THREE.Group();
  const pedestal=new THREE.Mesh(new RoundedBoxGeometry(3,.24,2.4,4,.06),new THREE.MeshStandardMaterial({color:'#323c43',metalness:.65,roughness:.33}));pedestal.position.y=.12;root.add(pedestal);
  const bronze=new THREE.Mesh(new THREE.TorusKnotGeometry(.62,.22,192,32),new THREE.MeshPhysicalMaterial({color:'#bc8150',metalness:1,roughness:.22,clearcoat:.25,clearcoatRoughness:.15}));bronze.position.set(-.45,1.1,0);root.add(bronze);
  const glass=new THREE.Mesh(new THREE.SphereGeometry(.43,64,48),new THREE.MeshPhysicalMaterial({color:'#d6eae6',metalness:0,roughness:.035,transmission:1,ior:1.46,thickness:.7,attenuationColor:new THREE.Color('#a7c9be'),attenuationDistance:2}));glass.position.set(.88,.68,.44);root.add(glass);
  const ceramic=new THREE.Mesh(new THREE.SphereGeometry(.29,48,32),new THREE.MeshPhysicalMaterial({color:'#ddd6c0',roughness:.3,clearcoat:.8,clearcoatRoughness:.2}));ceramic.position.set(.55,.53,-.6);root.add(ceramic);install(root,[],'Material study');
 }
 function validateGLB(data){if(data.byteLength<20)throw Error('GLB ファイルが短すぎます。');const v=new DataView(data);if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2)throw Error('glTF 2.0 の .glb ファイルを選んでください。');const n=v.getUint32(12,true);if(n+20>data.byteLength)throw Error('GLB が破損しています。');const json=JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,n)));if([...(json.images||[]),...(json.buffers||[])].some(o=>o.uri&&!o.uri.startsWith('data:')))throw Error('外部テクスチャが参照されています。画像を内蔵した GLB として書き出してください。');}
 async function loadFile(file){if(!file||!file.name.toLowerCase().endsWith('.glb')){error(Error('.glb ファイルを選んでください。'));return;}const serial=++loadSerial;status(`${file.name} を読み込んでいます…`);try{const data=await file.arrayBuffer();validateGLB(data);const result=await gltfLoader.parseAsync(data,'');if(serial!==loadSerial){disposeModel(result.scene);return;}install(result.scene,result.animations,file.name);}catch(e){if(serial===loadSerial)error(e);}}
 $('open').disabled=false;$('open').onclick=()=>$('file').click();$('file').onchange=e=>{void loadFile(e.target.files[0]);e.target.value='';};
 let dragDepth=0;window.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;$('drop').hidden=false;});window.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='copy';});window.addEventListener('dragleave',e=>{e.preventDefault();dragDepth--;if(dragDepth<=0)$('drop').hidden=true;});window.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;$('drop').hidden=true;void loadFile(e.dataTransfer.files[0]);});
 function slider(id,fn){$(id).oninput=e=>{const n=Number(e.target.value);$(id+'-value').textContent=n.toFixed(2);fn(n);};}
 slider('exposure',v=>renderer.toneMappingExposure=v);slider('environment',v=>scene.environmentIntensity=v);slider('bloom',v=>glow.strength.value=v);slider('ao',v=>aoAmount.value=v);slider('saturation',v=>saturation.value=v);
 $('rotate').onchange=e=>controls.autoRotate=e.target.checked;$('reset').onclick=fit;$('demo').onclick=demo;
 $('quality').onchange=e=>{renderer.setPixelRatio(Math.min(devicePixelRatio,e.target.value==='high'?2:1));occlusion.samples.value=e.target.value==='high'?16:8;resize();};
 $('hdr-open').onclick=()=>$('hdr-file').click();$('hdr-file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(f)await setHDR(await f.arrayBuffer());};
 $('photo').onclick=()=>{pipeline.render();renderer.domElement.toBlob(blob=>{if(!blob){error(Error('写真を取得できませんでした。'));return;}const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='atelier-render.png';a.click();setTimeout(()=>URL.revokeObjectURL(u),10000);status('UI なしの写真を保存しました。');},'image/png');};
 function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}window.addEventListener('resize',resize);
 renderer.setAnimationLoop(()=>{if(document.hidden){last=performance.now();return;}const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;controls.update(dt);if(mixer&&$('animation').checked)mixer.update(dt);try{pipeline.render();}catch(e){renderer.setAnimationLoop(null);error(e);}frames++;if(now-perfAt>1500){fps=Math.round(frames*1000/(now-perfAt));frames=0;perfAt=now;}});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();renderer.setAnimationLoop(null);error(Error('GPU の描画接続が失われました。ページを再読み込みしてください。'));});
 window.__studio={getState:()=>({ready:true,backend:gpu?'webgpu':'webgl2',model:objectName,animations:animations.length,fps,environment:scene.environmentIntensity,exposure:renderer.toneMappingExposure,ao:aoAmount.value,bloom:glow.strength.value,error:!$('error').hidden})};
 demo();status('GLB をドロップするか、「GLB ファイルを選ぶ」を押してください。');
 if(new URLSearchParams(location.search).get('station')==='1'){const serial=++loadSerial;gltfLoader.load('./assets/station.glb',g=>{if(serial===loadSerial)install(g.scene,g.animations,'AETHER orbital station');else disposeModel(g.scene);},undefined,error);}
} catch(e){error(Error('ビューアを開始できませんでした。ネット接続と WebGPU / WebGL 2 対応を確認してください。\n'+(e.message||e)));}
</script>
</body>
</html>

```
