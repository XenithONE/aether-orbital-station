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

const duration:Record<WarpPhase,number> = {idle:0,charging:4,jumping:4,arriving:2.5};
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
  get secondsRemaining(){return this.phase==='idle'?0:Math.max(0,duration[this.phase]-this.elapsed);}
  get journeyProgress(){return this.phase==='idle'?0:((this.phase==='charging'?0:this.phase==='jumping'?4:8)+this.elapsed)/10.5;}
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
    dt=Math.max(0,Math.min(dt,.25));
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
    this.elapsed+=dt;
    this.progress=Math.min(1,this.elapsed/duration[this.phase]);
    this.intensity=this.phase==='charging'?smooth(this.progress)*.42:this.phase==='jumping'?.42+Math.sin(this.progress*Math.PI/2)*.58:1-smooth(this.progress);
    if(this.progress<1)return;
    this.elapsed=0;this.progress=0;
    if(this.phase==='charging'){this.phase='jumping';this.announce('航路固定。星間跳躍を開始します。');}
    else if(this.phase==='jumping'){
      this.phase='arriving';this.destination=this.target!;
      this.announce(`${destinations[this.destination].region}・${destinations[this.destination].name} に到着。`);
    }else{this.phase='idle';this.target=null;this.intensity=0;this.announce(`${destinations[this.destination].name}。航路安定、探索を再開できます。`);}
  }
}
