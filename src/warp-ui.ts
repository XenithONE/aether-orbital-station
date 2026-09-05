import './warp.css';
import {destinations,type DestinationId,type DriveResult,type WarpDrive} from './warp';

type Handlers={onStart:(id:DestinationId)=>DriveResult|void;onCancel:()=>DriveResult|void;onScan:()=>DriveResult|void};

export function mountWarpUI(drive:WarpDrive,handlers:Handlers){
  const host=document.querySelector('#experience')??document.body;
  const root=document.createElement('div');root.id='warp-ui';
  root.innerHTML=`
    <button id="warp-location" hidden aria-label="星間航路を開く"><span class="warp-location-orbit">◎</span><span><small>CURRENT SECTOR</small><strong></strong></span><span class="warp-route-arrow">↗</span></button>
    <div id="warp-cinematic" hidden aria-hidden="true"><div class="warp-halo"></div><div class="warp-flight"><small id="warp-flight-code">JUMP DRIVE / CHARGING</small><h2 id="warp-flight-title"></h2><p id="warp-flight-subtitle"></p><div class="warp-flight-track"><i></i></div></div></div>
    <button id="warp-abort" hidden>充電を中止 <span>×</span></button>
    <div id="warp-observation" hidden role="status"><small>OBSERVATION RECORDED</small><strong></strong><p></p><span></span></div>
    <dialog id="warp-dialog" aria-labelledby="warp-title">
      <div class="dialog-head"><div><span class="eyebrow">AETHER / INTERGALACTIC NAVIGATION</span><h2 id="warp-title">次は、どの星の海へ。</h2></div><button class="close" data-warp-close aria-label="航路画面を閉じる">×</button></div>
      <p class="warp-intro">航路を選ぶと、窓の向こうに新しい宇宙が広がります。</p>
      <div class="warp-routes" role="group" aria-label="ワープ先を選択">${Object.entries(destinations).map(([id,d],i)=>`<button class="warp-card" data-destination="${id}" aria-pressed="false" style="--route-color:${d.color}"><span class="warp-card-number">0${i+1} / ${d.region}</span><span class="warp-thumbnail ${id}" aria-hidden="true"><i></i><b></b></span><small>${d.en}</small><strong>${d.name}</strong><span class="warp-description">${d.description}</span><span class="warp-card-meta"><span data-count="${id}">0 / 3 観測</span><span class="warp-current-label">SELECT ↗</span></span></button>`).join('')}</div>
      <div class="warp-departure"><div><small>SELECTED DESTINATION</small><strong id="warp-selected"></strong><p>充電 4 秒 → 跳躍 4 秒 → 到着</p></div><button id="warp-start" class="primary"><span>ワープドライブを起動</span><span>↗</span></button></div>
      <p id="warp-feedback" role="status" aria-live="polite"></p>
      <div class="warp-bottom"><span>主電源 ON・電力 72% 以上で起動できます</span><button id="warp-log-open">観測ログ <b>0 / 9</b> →</button></div>
      <label class="warp-motion"><input id="warp-reduced" type="checkbox"> ワープ中の光とカメラの動きを抑える</label>
      <p class="warp-fiction">この航路と遠方の天体は、探索のために創作した世界です。</p>
    </dialog>
    <dialog id="warp-log-dialog" aria-labelledby="warp-log-title"><div class="dialog-head"><div><span class="eyebrow">EXPLORER'S FIELD NOTES</span><h2 id="warp-log-title">宙域の観測記録</h2></div><button class="close" data-warp-close aria-label="観測ログを閉じる">×</button></div><p class="warp-intro">それぞれの宙域で研究室のスキャナーを操作し、9 件の記録を集めましょう。</p><div id="warp-scanner-panel" hidden><p id="warp-scanner-message"></p><button class="primary" id="warp-scan"><span>宙域をスキャン</span><span>◎</span></button></div><div id="warp-log-list"></div><p class="warp-fiction">記録はこのブラウザに保存されます。文章は架空の航海記です。</p></dialog>`;
  host.append(root);
  const $=<E extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<E>(id)!;
  const routeDialog=$<HTMLDialogElement>('#warp-dialog'),logDialog=$<HTMLDialogElement>('#warp-log-dialog');
  const location=$<HTMLButtonElement>('#warp-location'),start=$<HTMLButtonElement>('#warp-start'),scan=$<HTMLButtonElement>('#warp-scan');
  let selected:DestinationId='aurora',visible=false,lastPhase='',lastDestination='',lastCount=-1,lastNotification=-1,lastDiscoveryId='',observationUntil=0,lastTick=-1;
  const feedback=(result:DriveResult|void)=>{if(result){$('#warp-feedback').textContent=result.message;$('#warp-feedback').classList.toggle('error',!result.ok);}};
  function openDialog(dialog:HTMLDialogElement){
    if(document.pointerLockElement)document.exitPointerLock();
    for(const d of [routeDialog,logDialog])if(d!==dialog&&d.open)d.close();
    if(!dialog.open)dialog.showModal();
  }
  function open(){
    if(selected===drive.destination)selected=drive.destination==='sol'?'aurora':'sol';
    updateRoutes();$('#warp-feedback').textContent=drive.phase==='idle'?'充電中は中止できます。跳躍が始まると、自動で目的地へ到着します。':drive.statusMessage;
    openDialog(routeDialog);
  }
  function close(){routeDialog.close();logDialog.close();}
  function updateRoutes(){
    for(const card of root.querySelectorAll<HTMLButtonElement>('[data-destination]')){
      const id=card.dataset.destination as DestinationId,current=id===drive.destination;
      card.classList.toggle('selected',id===selected);card.classList.toggle('current',current);card.setAttribute('aria-pressed',String(id===selected));
      card.querySelector('.warp-current-label')!.textContent=current?'現在地':id===selected?'SELECTED ✓':'SELECT ↗';
      const d=destinations[id];card.querySelector('[data-count]')!.textContent=`${d.discoveries.filter(x=>drive.discovered.has(x.id)).length} / 3 観測`;
    }
    $('#warp-selected').textContent=destinations[selected].name;
    start.disabled=drive.phase!=='idle'||selected===drive.destination||drive.scanning;
    start.querySelector('span')!.textContent=drive.phase==='idle'?'ワープドライブを起動':'航行中';
  }
  function updateLog(){
    $('#warp-log-open b').textContent=`${drive.discovered.size} / 9`;
    $('#warp-log-list').innerHTML=Object.entries(destinations).map(([id,d])=>`<section class="warp-log-region"><div><small>${d.en}</small><h3>${d.name}</h3><span>${d.discoveries.filter(x=>drive.discovered.has(x.id)).length} / 3</span></div>${d.discoveries.map((x,i)=>`<article class="${drive.discovered.has(x.id)?'recorded':''}"><span>0${i+1}</span><div><h4>${drive.discovered.has(x.id)?x.title:'未観測の記録'}</h4><p>${drive.discovered.has(x.id)?x.text:destinations[id as DestinationId].name+' でスキャナーを操作すると記録されます。'}</p></div><b>${drive.discovered.has(x.id)?'✓':'·'}</b></article>`).join('')}</section>`).join('');
  }
  function openLog(scanner=false){$('#warp-scanner-panel').hidden=!scanner;updateLog();openDialog(logDialog);}
  location.addEventListener('click',open);
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-warp-close]'))button.onclick=()=>button.closest('dialog')!.close();
  for(const card of root.querySelectorAll<HTMLButtonElement>('[data-destination]'))card.onclick=()=>{selected=card.dataset.destination as DestinationId;updateRoutes();$('#warp-feedback').textContent=selected===drive.destination?'現在地です。別の航路を選んでください。':'';};
  start.onclick=()=>{const result=handlers.onStart(selected);feedback(result);if(result?.ok||(!result&&drive.phase==='charging'))routeDialog.close();};
  $('#warp-abort').onclick=()=>feedback(handlers.onCancel());
  $('#warp-log-open').onclick=()=>openLog();
  scan.onclick=()=>{const result=handlers.onScan();$('#warp-scanner-message').textContent=result?.message??drive.statusMessage;};
  const motion=$<HTMLInputElement>('#warp-reduced');motion.checked=drive.reducedMotion;motion.onchange=()=>{drive.reducedMotion=motion.checked;root.classList.toggle('reduced-motion',motion.checked);};
  root.classList.toggle('reduced-motion',drive.reducedMotion);
  for(const dialog of [routeDialog,logDialog])dialog.addEventListener('keydown',event=>event.stopPropagation());
  function update(){
    const flying=drive.phase!=='idle';
    const d=destinations[drive.destination];
    location.hidden=!visible;$('#warp-cinematic').hidden=!visible||!flying;$('#warp-abort').hidden=!visible||drive.phase!=='charging';
    const observationVisible=visible&&performance.now()<observationUntil&&!routeDialog.open&&!logDialog.open;
    $('#warp-observation').hidden=!observationVisible;
    root.style.setProperty('--warp-energy',String(drive.reducedMotion?drive.intensity*.18:drive.intensity));
    root.querySelector<HTMLElement>('.warp-flight-track i')!.style.width=`${Math.round(drive.journeyProgress*100)}%`;
    if(lastDestination!==drive.destination){lastDestination=drive.destination;location.querySelector('strong')!.textContent=d.name;location.style.setProperty('--route-color',d.color);updateRoutes();}
    if(lastPhase!==drive.phase){
      lastPhase=drive.phase;root.dataset.phase=drive.phase;updateRoutes();
      $('#warp-flight-code').textContent=drive.phase==='charging'?'JUMP DRIVE / CHARGING':drive.phase==='jumping'?'INTERGALACTIC TRANSIT':'NEW SECTOR / ARRIVAL';
      $('#warp-flight-title').textContent=drive.phase==='charging'?'星の海へ。':drive.phase==='jumping'?'Beyond the known.':d.name;
      $('#warp-flight-subtitle').textContent=drive.phase==='charging'?`${destinations[drive.target??drive.destination].name} への航路を準備しています`:drive.phase==='jumping'?'航路固定 · 星間空間を移動中':`${d.region} · 新しい景色を探索してください`;
    }
    if(lastCount!==drive.discovered.size){lastCount=drive.discovered.size;updateRoutes();updateLog();}
    if(lastNotification!==drive.notificationSerial){
      lastNotification=drive.notificationSerial;
      if(drive.lastDiscovery&&!drive.scanning&&lastDiscoveryId!==drive.lastDiscovery.id){
        lastDiscoveryId=drive.lastDiscovery.id;
        const observation=$('#warp-observation');observation.querySelector('strong')!.textContent=drive.lastDiscovery.title;observation.querySelector('p')!.textContent=drive.lastDiscovery.text;observation.querySelector('span')!.textContent=`${drive.discovered.size} / 9 RECORDS COLLECTED`;observationUntil=performance.now()+7000;
      }
      if(routeDialog.open)$('#warp-feedback').textContent=drive.statusMessage;
    }
    const tick=Math.ceil(drive.secondsRemaining*10);
    if(tick!==lastTick){lastTick=tick;location.querySelector('small')!.textContent=flying?`${drive.phase==='charging'?'CHARGING':drive.phase==='jumping'?'IN TRANSIT':'ARRIVING'} · ${(tick/10).toFixed(1)}s`:'CURRENT SECTOR';}
    scan.disabled=drive.scanning||flying||drive.observationCount===3;
    scan.querySelector('span')!.textContent=drive.scanning?`スキャン中 ${Math.round(drive.scanProgress*100)}%`:drive.observationCount===3?'この宙域の観測は完了':'宙域をスキャン';
    if(logDialog.open)$('#warp-scanner-message').textContent=drive.scanning?'受信した光のパターンを記録しています。':drive.missionHint;
  }
  update();
  return {open,close,openLog,openScanner:()=>openLog(true),update,setVisible(value:boolean){visible=value;update();},get isOpen(){return routeDialog.open||logDialog.open;}};
}
