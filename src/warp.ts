export type DestinationId = 'sol' | 'aurora' | 'gargantua';
export type WarpPhase = 'idle' | 'charging' | 'jumping' | 'arriving';
export type Discovery = { id:string; title:string; text:string };
export type DriveResult = { ok:boolean; message:string; discovery?:Discovery };

export const destinations:Record<DestinationId,{
  name:string; en:string; region:string; description:string; color:string; discoveries:Discovery[];
}> = {
  sol:{name:'地球軌道',en:'SOL / HOME',region:'太陽系',color:'#93d8e5',
    description:'青い大気の縁、夜明けの雲海。いつでも帰ってこられる、私たちの故郷。',
    discoveries:[
      {id:'sol-1',title:'夜明けの境界',text:'展望窓の先で、夜の街明かりが朝の雲へ溶けていく。航海記録にこの一瞬を残した。'},
      {id:'sol-2',title:'帰還ビーコン',text:'架空の航路網〈ホーム・ライン〉から応答。どれほど遠くへ進んでも、この信号が帰路になる。'},
      {id:'sol-3',title:'ブルー・マーブル',text:'小さな窓に収まる、かけがえのない故郷。地球観測シリーズをコンプリート。'},
    ]},
  aurora:{name:'オーロラ星雲',en:'LYRA / AURORA',region:'リラ銀河',color:'#b5a2ff',
    description:'幾重にも重なる紫と翡翠の星雲。静かな星の海に、未知の光のリズムを探す。',
    discoveries:[
      {id:'aurora-1',title:'翡翠のカーテン',text:'架空のリラ銀河に広がる発光雲。窓を横切る光のカーテンを、乗組員は〈翡翠の夜〉と呼んでいる。'},
      {id:'aurora-2',title:'七つの残響',text:'星雲の光から七拍のパターンを抽出。航海士がつけた仮の名前は〈遠い子守歌〉。'},
      {id:'aurora-3',title:'星の庭',text:'色の異なる雲が重なる場所に、最も美しい観測地点を登録。リラ観測シリーズをコンプリート。'},
    ]},
  gargantua:{name:'ガルガンチュア',en:'NOX / GARGANTUA',region:'ノクス銀河',color:'#f0bc79',
    description:'漆黒の中心を包む、白金色の降着環。光が円弧を描く、宇宙の果ての観測航路。',
    discoveries:[
      {id:'gargantua-1',title:'光の輪郭',text:'架空の天体〈ガルガンチュア〉の周囲に浮かぶ光の環。その静かな存在感を記録した。'},
      {id:'gargantua-2',title:'白金の航路',text:'観測船が残した仮想航路を発見。白い光の帯が、窓いっぱいに広がる位置へ案内してくれる。'},
      {id:'gargantua-3',title:'静寂の向こう',text:'暗闇の縁を巡る観測を完了。ノクス観測シリーズをコンプリート。次の航海へ、あるいは地球へ。'},
    ]},
};

export const WARP_DURATIONS:Readonly<Record<WarpPhase,number>> = Object.freeze({idle:0,charging:5,jumping:7,arriving:4});
export const WARP_TOTAL_DURATION = WARP_DURATIONS.charging+WARP_DURATIONS.jumping+WARP_DURATIONS.arriving;
const phaseOffset:Record<WarpPhase,number> = {idle:0,charging:0,jumping:WARP_DURATIONS.charging,arriving:WARP_DURATIONS.charging+WARP_DURATIONS.jumping};
const smooth=(x:number)=>x*x*(3-2*x);
type StorageAdapter = Pick<Storage,'getItem'|'setItem'>;

/** Navigation state only: the renderer consumes intensity and destination. */
export class WarpDrive {
  destination:DestinationId='sol';
  target:DestinationId|null=null;
  phase:WarpPhase='idle';
  progress=0;
  intensity=0;
  reducedMotion=false;
  reactorOnline=true;
  availablePower=96;
  discovered=new Set<string>();
  scanProgress=0;
  scanning=false;
  statusMessage='展望室中央の航路テーブルで、新しい星の海へ。';
  lastDiscovery:Discovery|null=null;
  notificationSerial=0;
  private elapsed=0;
  private scanElapsed=0;
  private storage?:StorageAdapter;
  constructor(options:{storage?:StorageAdapter;reducedMotion?:boolean}={}){
    this.reducedMotion=options.reducedMotion??false;
    try{this.storage=options.storage??(typeof localStorage!=='undefined'?localStorage:undefined);
      const saved=JSON.parse(this.storage?.getItem('aether-discoveries-v1')??'[]');
      const valid=new Set(Object.values(destinations).flatMap(d=>d.discoveries.map(x=>x.id)));
      if(Array.isArray(saved))for(const id of saved)if(valid.has(id))this.discovered.add(id);
    }catch{/* Storage is optional; navigation still works in a private window. */}
  }
  get secondsRemaining(){return this.phase==='idle'?0:Math.max(0,WARP_DURATIONS[this.phase]-this.elapsed);}
  get journeyProgress(){return this.phase==='idle'?0:(phaseOffset[this.phase]+this.elapsed)/WARP_TOTAL_DURATION;}
  get travelSecondsRemaining(){return this.phase==='idle'?0:Math.max(0,WARP_TOTAL_DURATION-phaseOffset[this.phase]-this.elapsed);}
  get chargeReady(){return this.phase==='idle'&&this.reactorOnline&&this.availablePower>=72&&!this.scanning;}
  get readinessMessage(){return this.phase!=='idle'?'航行シーケンス実行中':!this.reactorOnline?'機関室の主電源を起動してください':this.availablePower<72?'電力 72% まで充電を待っています':this.scanning?'観測装置の終了を待っています':'主電源・航路系統ともに準備完了';}
  get flightReadout(){
    if(this.phase==='charging')return {code:'01 / DRIVE CHARGE',title:this.progress<.3?'航路を同期':this.progress<.76?'場の形成':'跳躍準備完了',detail:this.progress<.3?'目的宙域の座標を照合しています':this.progress<.76?'主機出力をワープコイルへ転送':'経路固定 · ワープコリドーを開きます',metricLabel:'COIL CHARGE',metricValue:`${Math.round(this.progress*100).toString().padStart(3,'0')}%`};
    if(this.phase==='jumping')return {code:'02 / INTERGALACTIC TRANSIT',title:this.progress<.22?'星間空間へ':this.progress<.77?'コリドーを航行':'出口を捕捉',detail:this.progress<.22?'ワープ境界を通過 · 航路ロック':this.progress<.77?'航行場は安定 · 星の海を横断しています':'目的宙域の光を捕捉 · 減速を開始',metricLabel:'ROUTE TRAVERSED',metricValue:`${Math.round(this.progress*100).toString().padStart(3,'0')}%`};
    if(this.phase==='arriving')return {code:'03 / SECTOR APPROACH',title:this.progress<.35?'新しい星の海':this.progress<.75?'航行場を解除':'航路安定',detail:this.progress<.35?'目的宙域へ進入 · 観測窓をクリアにします':this.progress<.75?'減速完了 · ステーションの運転を復帰':'到着シーケンス完了 · 探索を再開できます',metricLabel:'FIELD RELEASE',metricValue:`${Math.round(this.progress*100).toString().padStart(3,'0')}%`};
    return {code:'NAVIGATION / STANDBY',title:'航路待機',detail:'次の目的地を選択してください',metricLabel:'COIL CHARGE',metricValue:'000%'};
  }
  get observationCount(){return destinations[this.destination].discoveries.filter(d=>this.discovered.has(d.id)).length;}
  get missionHint(){
    if(this.phase!=='idle')return this.phase==='charging'?'展望窓へ視線を向けて、跳躍を見届ける。':'窓の外に、新しい星の海が広がる。';
    if(this.observationCount<3)return `研究室のスキャナーで、この宙域の観測を進める。${this.observationCount} / 3`;
    if(this.discovered.size===9)return '全 9 件の観測を完了。お気に入りの景色を写真に残そう。';
    return 'この宙域の観測は完了。航路テーブルから次の銀河へ。';
  }
  private announce(message:string):DriveResult{this.statusMessage=message;this.notificationSerial++;return {ok:true,message};}
  private reject(message:string):DriveResult{this.statusMessage=message;this.notificationSerial++;return {ok:false,message};}
  start(id:DestinationId,reactor:boolean,power:number):DriveResult{
    this.reactorOnline=reactor;this.availablePower=power;
    if(!(id in destinations))return this.reject('航路を選択してください。');
    if(this.phase!=='idle')return this.reject('航行中です。到着してから次の航路を選んでください。');
    if(id===this.destination)return this.reject('この宙域には到着済みです。別の航路を選んでください。');
    if(!reactor)return this.reject('主電源が停止しています。機関室でリアクターを起動してください。');
    if(power<72)return this.reject('充電に必要な電力は 72% です。太陽電池と主電源をオンにして回復を待ってください。');
    if(this.scanning)return this.reject('観測中です。スキャンの完了後に航路を起動できます。');
    this.target=id;this.phase='charging';this.elapsed=0;this.progress=0;this.intensity=0;
    return this.announce(`${destinations[id].name} への航路を確定。ワープドライブ充電開始。`);
  }
  cancel():DriveResult{
    if(this.phase==='idle')return this.reject('現在、ワープドライブは待機中です。');
    if(this.phase!=='charging')return this.reject('跳躍は確定済みです。まもなく到着します。');
    this.target=null;this.phase='idle';this.elapsed=0;this.progress=0;this.intensity=0;
    return this.announce('充電を中止しました。現在の宙域に留まります。');
  }
  scan():DriveResult{
    if(this.phase!=='idle')return this.reject('ワープ中は観測できません。到着後にスキャンしてください。');
    if(this.scanning)return this.reject('スキャン中です。窓の外を眺めてお待ちください。');
    if(this.observationCount===3)return this.reject('この宙域の 3 件の観測は完了しています。別の銀河へ向かいましょう。');
    this.scanning=true;this.scanProgress=0;this.scanElapsed=0;this.lastDiscovery=null;
    return this.announce(`${destinations[this.destination].name} をスキャンしています。`);
  }
  update(dt:number,reactor:boolean,power:number){
    this.reactorOnline=reactor;this.availablePower=power;
    dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.25)):0;
    if(this.scanning){
      this.scanElapsed+=dt;this.scanProgress=Math.min(1,this.scanElapsed/2.6);
      if(this.scanProgress>=1){
        this.scanning=false;
        this.lastDiscovery=destinations[this.destination].discoveries.find(x=>!this.discovered.has(x.id))??null;
        if(this.lastDiscovery){this.discovered.add(this.lastDiscovery.id);try{this.storage?.setItem('aether-discoveries-v1',JSON.stringify([...this.discovered]));}catch{/* Nonpersistent mode is supported. */}
          this.announce(`観測を記録：${this.lastDiscovery.title} — ${this.discovered.size} / 9`);}
      }
    }
    if(this.phase==='idle')return;
    if(this.phase==='charging'&&(!reactor||power<60)){
      this.cancel();this.announce('給電が中断されたため、充電を安全に停止しました。機関室の主電源を確認してください。');return;
    }
    // Carry a frame's remainder into the next phase, so duration is independent of frame cadence.
    while(dt>0&&this.phase!=='idle'){
      const step=Math.min(dt,WARP_DURATIONS[this.phase]-this.elapsed);this.elapsed+=step;dt-=step;
      this.progress=Math.min(1,this.elapsed/WARP_DURATIONS[this.phase]);
      this.intensity=this.phase==='charging'?smooth(this.progress)*.42:this.phase==='jumping'?.42+smooth(Math.min(1,this.progress/.3))*.58:1-smooth(this.progress);
      if(this.progress<1-1e-9)break;
      this.elapsed=0;this.progress=0;
      if(this.phase==='charging'){this.phase='jumping';this.announce('航路固定。星間跳躍を開始します。');}
      else if(this.phase==='jumping'){
        this.phase='arriving';this.destination=this.target!;
        this.announce(`${destinations[this.destination].region}・${destinations[this.destination].name} に到着。`);
      }else{this.phase='idle';this.target=null;this.intensity=0;this.announce(`${destinations[this.destination].name}。航路安定、探索を再開できます。`);}
    }
  }
}
