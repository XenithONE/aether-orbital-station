import './warp.css';
import {destinations,WARP_DURATIONS,WARP_TOTAL_DURATION,type DestinationId,type DriveResult,type WarpDrive} from './warp';

const sectorCoordinates:Record<DestinationId,{code:string;coordinate:string;point:[number,number]}>={
  sol:{code:'S-01 / HOME ANCHOR',coordinate:'00.000 / +00.000 / 01',point:[110,123]},
  aurora:{code:'L-07 / AURORA REACH',coordinate:'+42.718 / −18.206 / 07',point:[402,48]},
  gargantua:{code:'N-09 / EVENT HORIZON',coordinate:'−61.409 / +32.815 / 09',point:[569,120]},
};

type Handlers={onStart:(id:DestinationId)=>DriveResult|void;onCancel:()=>DriveResult|void;onScan:()=>DriveResult|void};

export function mountWarpUI(drive:WarpDrive,handlers:Handlers){
  const host=document.querySelector('#experience')??document.body;
  const root=document.createElement('div');root.id='warp-ui';
  root.innerHTML=`
    <button id="warp-location" hidden aria-label="星間航路を開く"><span class="warp-location-orbit">◎</span><span><small>CURRENT SECTOR</small><strong></strong></span><span class="warp-route-arrow">↗</span></button>
    <div id="warp-cinematic" hidden aria-hidden="true"><div class="warp-halo"></div><div class="warp-flight-top"><span> AETHER / FLIGHT SEQUENCE</span><span id="warp-flight-route"></span></div><div class="warp-flight"><div class="warp-flight-heading"><div><small id="warp-flight-code"></small><h2 id="warp-flight-title"></h2><p id="warp-flight-subtitle"></p></div><div class="warp-flight-metric"><small id="warp-metric-label"></small><strong id="warp-metric-value"></strong></div></div><div class="warp-sequence"><span data-warp-stage="charging"><b>01</b> CHARGE</span><span data-warp-stage="jumping"><b>02</b> TRANSIT</span><span data-warp-stage="arriving"><b>03</b> ARRIVAL</span><strong id="warp-countdown"></strong></div><div class="warp-flight-track"><i></i></div><div id="warp-locks"><span data-lock="0">航路解同期</span><span data-lock="1">コイル安定</span><span data-lock="2">主機ロック</span></div></div></div>
    <button id="warp-abort" hidden>充電を中止 <span>×</span></button>
    <div id="warp-observation" hidden role="status"><small>OBSERVATION RECORDED</small><strong></strong><p></p><span></span></div>
    <dialog id="warp-dialog" aria-labelledby="warp-title">
      <div class="dialog-head"><div><span class="eyebrow">AETHER / HELIOS FLIGHT COMPUTER</span><h2 id="warp-title">星間航路を設定</h2></div><div class="warp-command-id"><span>NAVIGATION ARRAY</span><strong>H—07</strong></div><button class="close" data-warp-close aria-label="航路画面を閉じる">×</button></div>
      <div class="warp-map" aria-label="創作した宙域間の航路図"><div class="warp-map-head"><span>SECTOR CARTOGRAPHY / ROUTE SOLUTION</span><span id="warp-map-state">PATH RESOLVED</span></div><svg id="warp-route-map" viewBox="0 0 680 180" role="img" aria-label="現在地から選択した宙域への航路"><defs><pattern id="warp-map-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#92c4d2" stroke-opacity=".07" stroke-width=".6"/></pattern><linearGradient id="warp-route-gradient"><stop offset="0" stop-color="#9fdccb"/><stop offset="1" stop-color="#99bcf2"/></linearGradient><radialGradient id="warp-map-glow"><stop stop-color="#7fc3db" stop-opacity=".13"/><stop offset="1" stop-color="#7fc3db" stop-opacity="0"/></radialGradient></defs><rect width="680" height="180" fill="url(#warp-map-grid)"/><ellipse cx="343" cy="89" rx="254" ry="99" fill="url(#warp-map-glow)"/><g class="warp-orbital-grid"><ellipse cx="333" cy="88" rx="264" ry="59"/><ellipse cx="333" cy="88" rx="178" ry="39"/><ellipse cx="333" cy="88" rx="83" ry="20"/><path d="M333 7V170M51 88H637"/></g><path id="warp-route-shadow"/><path id="warp-route-line"/><g id="warp-origin-marker"><circle r="11"/><circle r="3"/></g><g id="warp-target-marker"><circle r="17"/><circle r="25"/><path d="M-7 0H7M0-7V7"/></g>${Object.entries(sectorCoordinates).map(([id,s])=>`<g class="warp-sector-node" data-sector-node="${id}" transform="translate(${s.point[0]} ${s.point[1]})"><circle r="3"/><path d="M-9 0H-5M5 0H9M0-9V-5M0 5V9"/><text y="-16">${destinations[id as DestinationId].en.split(' / ')[0]}</text><text class="warp-map-node-index" y="19">${s.code.split(' / ')[0]}</text></g>`).join('')}<text x="12" y="168" class="warp-map-caption">AETHER ROUTE GRID · FICTIONAL COORDINATES</text></svg><div class="warp-map-meta"><div><small>DEPARTURE ANCHOR</small><strong id="warp-origin-name"></strong></div><span class="warp-map-arrow">⟶</span><div><small id="warp-sector-code"></small><strong id="warp-sector-coordinate"></strong></div><div class="warp-duration"><small>SEQUENCE TIME</small><strong>${WARP_TOTAL_DURATION}<span> SEC</span></strong></div></div></div>
      <div class="warp-routes" role="group" aria-label="ワープ先を選択">${Object.entries(destinations).map(([id,d],i)=>`<button class="warp-card" data-destination="${id}" aria-pressed="false" style="--route-color:${d.color}"><span class="warp-card-number">0${i+1} / ${d.region}</span><span class="warp-thumbnail ${id}" aria-hidden="true"><i></i><b></b></span><small>${d.en}</small><strong>${d.name}</strong><span class="warp-description">${d.description}</span><span class="warp-card-meta"><span data-count="${id}">0 / 3 観測</span><span class="warp-current-label">SELECT ↗</span></span></button>`).join('')}</div>
      <div class="warp-departure"><div><small>SELECTED DESTINATION</small><strong id="warp-selected"></strong><p>充電 ${WARP_DURATIONS.charging} 秒 → 跳躍 ${WARP_DURATIONS.jumping} 秒 → 到着 ${WARP_DURATIONS.arriving} 秒</p></div><button id="warp-start" class="primary"><span>ワープドライブを起動</span><span>↗</span></button></div>
      <div class="warp-readiness"><span id="warp-ready-dot"></span><strong id="warp-ready-label"></strong><span id="warp-ready-power"></span></div>
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
  let selected:DestinationId='aurora',visible=false,lastPhase='',lastDestination='',lastCount=-1,lastNotification=-1,lastDiscoveryId='',observationUntil=0,lastTick=-1,lastPower='',lastReadout='';
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
    $('#warp-origin-name').textContent=destinations[drive.destination].name;
    $('#warp-sector-code').textContent=sectorCoordinates[selected].code;
    $('#warp-sector-coordinate').textContent=sectorCoordinates[selected].coordinate;
    const [x1,y1]=sectorCoordinates[drive.destination].point,[x2,y2]=sectorCoordinates[selected].point;
    const path=`M${x1} ${y1} C${x1+(x2-x1)*.27} ${Math.min(y1,y2)-63} ${x1+(x2-x1)*.7} ${Math.min(y1,y2)-52} ${x2} ${y2}`;
    $('#warp-route-line').setAttribute('d',path);$('#warp-route-shadow').setAttribute('d',path);$('#warp-origin-marker').setAttribute('transform',`translate(${x1} ${y1})`);$('#warp-target-marker').setAttribute('transform',`translate(${x2} ${y2})`);
    for(const node of root.querySelectorAll('[data-sector-node]'))node.classList.toggle('selected',node.getAttribute('data-sector-node')===selected);
    $('#warp-map-state').textContent=selected===drive.destination?'CURRENT ANCHOR':drive.phase==='idle'?'PATH RESOLVED':'FLIGHT IN PROGRESS';
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
    const readout=drive.flightReadout;
    const readoutKey=`${readout.title}/${readout.metricValue}`;
    if(readoutKey!==lastReadout){lastReadout=readoutKey;
      $('#warp-flight-code').textContent=readout.code;$('#warp-flight-title').textContent=readout.title;$('#warp-flight-subtitle').textContent=readout.detail;$('#warp-metric-label').textContent=readout.metricLabel;$('#warp-metric-value').textContent=readout.metricValue;
    }
    const powerKey=`${drive.chargeReady}/${Math.round(drive.availablePower)}/${drive.readinessMessage}`;
    if(powerKey!==lastPower){lastPower=powerKey;$('#warp-ready-dot').classList.toggle('ready',drive.chargeReady);$('#warp-ready-label').textContent=drive.readinessMessage;$('#warp-ready-power').textContent=`BUS POWER ${Math.round(drive.availablePower)}%`;$<HTMLButtonElement>('#warp-start').classList.toggle('not-ready',!drive.chargeReady);}
    for(const lock of root.querySelectorAll<HTMLElement>('[data-lock]'))lock.classList.toggle('locked',drive.phase!=='charging'||drive.progress>[.2,.62,.9][Number(lock.dataset.lock)]);
    if(lastDestination!==drive.destination){lastDestination=drive.destination;location.querySelector('strong')!.textContent=d.name;location.style.setProperty('--route-color',d.color);updateRoutes();}
    if(lastPhase!==drive.phase){
      lastPhase=drive.phase;root.dataset.phase=drive.phase;updateRoutes();
      $('#warp-flight-route').textContent=`DESTINATION / ${destinations[drive.target??drive.destination].en}`;
      const stages=['charging','jumping','arriving'];for(const stage of root.querySelectorAll<HTMLElement>('[data-warp-stage]')){const order=stages.indexOf(stage.dataset.warpStage!);stage.classList.toggle('active',stage.dataset.warpStage===drive.phase);stage.classList.toggle('complete',order<stages.indexOf(drive.phase));}
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
    const tick=Math.ceil(drive.travelSecondsRemaining*10);
    if(tick!==lastTick){lastTick=tick;location.querySelector('small')!.textContent=flying?`${drive.phase==='charging'?'CHARGING':drive.phase==='jumping'?'IN TRANSIT':'ARRIVING'} · ${(tick/10).toFixed(1)}s`:'CURRENT SECTOR';$('#warp-countdown').textContent=`T − ${(tick/10).toFixed(1).padStart(4,'0')}`;}
    scan.disabled=drive.scanning||flying||drive.observationCount===3;
    scan.querySelector('span')!.textContent=drive.scanning?`スキャン中 ${Math.round(drive.scanProgress*100)}%`:drive.observationCount===3?'この宙域の観測は完了':'宙域をスキャン';
    if(logDialog.open)$('#warp-scanner-message').textContent=drive.scanning?'受信した光のパターンを記録しています。':drive.missionHint;
  }
  update();
  return {open,close,openLog,openScanner:()=>openLog(true),update,setVisible(value:boolean){visible=value;update();},get isOpen(){return routeDialog.open||logDialog.open;}};
}
