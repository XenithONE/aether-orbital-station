import './style.css';
import * as T from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createRendering } from './rendering';
import { createCosmos } from './cosmos';
import { createInterior,rooms,type Interaction } from './interior';
import { asset,texture } from './materials';
import { Simulation,StationAudio } from './simulation';
import { mountUI,toast } from './ui';
import { WarpDrive,destinations,type DestinationId } from './warp';
import { mountWarpUI } from './warp-ui';
import { createSurveyDrone } from './drone';

mountUI();
const $=<E extends HTMLElement=HTMLElement>(q:string)=>document.querySelector<E>(q)!;
const canvas=$<HTMLCanvasElement>('#viewport');
let mode:'landing'|'walk'|'orbit'='landing';
let sensitivity=1,ready=false,warming=false,warmupMs=0,quality='high',yaw=0,pitch=0,dragging=false,frameCount=0,fps=60;
let lastPointer={x:0,y:0};let walkHintTime=0;let toastRoom='observatory';
const sim=new Simulation();sim.load();const audio=new StationAudio();
const keys=new Set<string>();const coarse=matchMedia('(pointer: coarse)').matches;
if(coarse){quality='medium';$<HTMLSelectElement>('#quality').value='medium';}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const drive=new WarpDrive({reducedMotion:reduced});
const warpUI=mountWarpUI(drive,{onStart:startWarp,onCancel:()=>{const r=drive.cancel();if(r.ok)audio.warp('cancel');return r;},onScan:()=>{audio.beep(920,.16);return drive.scan();}});
const currentRoom=()=>rooms.find(r=>{const p=camera.position;return p.x>=r.area[0]&&p.x<=r.area[1]&&p.z>=r.area[2]&&p.z<=r.area[3];})||rooms[1];
const scene=new T.Scene();scene.background=new T.Color(0x01050a);
const camera=new T.PerspectiveCamera(44,innerWidth/innerHeight,.08,11000);camera.position.set(136,94,178);
const graphics=await createRendering(canvas,scene,camera).catch(e=>{fatal(e);throw e;});
const renderer=graphics.renderer;graphics.setQuality(quality);scene.environmentIntensity=.55;
const ambient=new T.HemisphereLight(0xbadbf4,0x122a3c,.85);scene.add(ambient);
const sun=new T.DirectionalLight(0xfff3da,3.6);sun.position.set(-90,130,90);sun.castShadow=true;sun.shadow.mapSize.set(coarse?2048:4096,coarse?2048:4096);sun.shadow.camera.left=-110;sun.shadow.camera.right=110;sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;sun.shadow.camera.near=1;sun.shadow.camera.far=400;sun.shadow.bias=-.00012;sun.shadow.normalBias=.025;sun.shadow.radius=2.6;scene.add(sun);scene.add(sun.target);
const fill=new T.DirectionalLight(0x6eace4,.95);fill.position.set(50,-10,-100);scene.add(fill);
const rim=new T.DirectionalLight(0xb0d6ff,1.4);rim.position.set(30,35,-70);scene.add(rim);
const orbitControls=new OrbitControls(camera,canvas);orbitControls.enableDamping=true;orbitControls.dampingFactor=.06;orbitControls.minDistance=95;orbitControls.maxDistance=410;orbitControls.maxPolarAngle=Math.PI*.79;orbitControls.target.set(0,8,0);orbitControls.autoRotate=!reduced;orbitControls.autoRotateSpeed=.12;orbitControls.enablePan=false;
const cosmos=createCosmos(scene);const interior=createInterior();interior.group.visible=false;scene.add(interior.group);
const survey=createSurveyDrone();interior.group.add(survey.group);interior.interactions.push(survey.interaction);interior.colliders.push(survey.collider);
const exterior=new T.Group();scene.add(exterior);
let world:RAPIER.World,body:RAPIER.RigidBody,playerCollider:RAPIER.Collider,controller:RAPIER.KinematicCharacterController;
let physicsColliders:RAPIER.Collider[]=[];let nearest:Interaction|undefined;let velocityY=0;let walkingDistance=0;let lastStep=0;let clock=0;let accumulator=0;let lost=false;let lastTime=performance.now();let fpsAt=lastTime;
let savedPosition=new T.Vector3(0,1.68,2),savedYaw=0,savedPitch=-.055;
let flightAim:{yaw:number;pitch:number}|null=null;
const cabinWash=new T.PointLight(0x62bff3,0,19,2);cabinWash.position.set(0,3.4,-4);scene.add(cabinWash);
const sunDestination=new T.Color(sun.color);
const forward=new T.Vector3(),right=new T.Vector3(),move=new T.Vector3();const worldUp=new T.Vector3(0,1,0);const look=new T.Euler(0,0,0,'YXZ');

function fatal(error:unknown){$('#fatal').hidden=false;$('#fatal p').textContent=`${error instanceof Error?error.message:String(error)}。WebGPU または WebGL 2 対応ブラウザーで、ハードウェア アクセラレーションを有効にしてお試しください。`;}
function setLandingView(){if(innerWidth>=700)camera.setViewOffset(innerWidth,innerHeight,-innerWidth*.18,0,innerWidth,innerHeight);else camera.setViewOffset(innerWidth,innerHeight,-innerWidth*.31,-innerHeight*.06,innerWidth,innerHeight);}
setLandingView();
const assetsReady=new Promise<void>(resolve=>{T.DefaultLoadingManager.onLoad=()=>resolve();});
const assetErrors:string[]=[];T.DefaultLoadingManager.onError=url=>assetErrors.push(url.split('/').pop()||url);
T.DefaultLoadingManager.onProgress=(_u,loaded,total)=>{$('#load-bar').style.width=`${Math.round(loaded/total*100)}%`;$('#load-label').textContent=`ステーションを準備しています ${Math.round(loaded/total*100)}%`;};
async function boot(){
 try{
  const [gltf]=await Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(asset('station.glb')),RAPIER.init(),survey.load(),assetsReady]);
  if(assetErrors.length)throw new Error(`素材を読み込めませんでした: ${assetErrors.join(', ')}`);
  gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;const m=o.material as T.MeshStandardMaterial;m.envMapIntensity=.65;if(m.name.includes('Hull')||m.name.includes('Ivory')){m.map=texture('metal_plate_02_diffuse.jpg',1,true);m.normalMap=texture('metal_plate_02_nor_gl.jpg',1);m.normalScale=new T.Vector2(.16,.16);m.roughnessMap=texture('metal_plate_02_rough.jpg',1);m.roughness=.68;m.metalness=.65;m.color.setHex(m.name.includes('Hull')?0x9aa9b5:0xc7c9c3);}if(m.emissiveIntensity>2)m.emissiveIntensity=1.8;}});exterior.add(gltf.scene);
  world=new RAPIER.World({x:0,y:-9.81,z:0});world.timestep=1/60;
  physicsColliders=interior.colliders.map(c=>world.createCollider(RAPIER.ColliderDesc.cuboid(c.s[0]/2,c.s[1]/2,c.s[2]/2).setTranslation(...c.p)));
  body=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,.92,2));playerCollider=world.createCollider(RAPIER.ColliderDesc.capsule(.47,.3),body);
  controller=world.createCharacterController(.025);controller.enableAutostep(.16,.25,false);controller.enableSnapToGround(.2);controller.setSlideEnabled(true);world.step();
  await warmScenes();
  ready=true;$<HTMLButtonElement>('#enter').disabled=false;$('#loading').style.opacity='0';setTimeout(()=>$('#loading').hidden=true,700);
  $('#render-backend').textContent=graphics.backend==='webgpu'?'WebGPU':'WebGL 2';
 }catch(e){fatal(e);console.error(e);}
}
void boot();

async function warmScenes(){
 const started=performance.now(),position=camera.position.clone(),rotation=camera.quaternion.clone();
 warming=true;canvas.style.visibility='hidden';
 try{
  exterior.visible=false;interior.group.visible=true;camera.clearViewOffset();camera.fov=68;camera.near=.055;camera.updateProjectionMatrix();graphics.setView(true);cosmos.setView(true);
  let stage=0;
  for(const room of rooms.filter(r=>r.id!=='corridor')){
   $('#load-label').textContent=`光と質感を準備しています ${++stage} / 10`;
   camera.position.set(...room.p as [number,number,number]);camera.rotation.set(-.04,room.yaw,0,'YXZ');graphics.render();
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
  camera.position.set(0,1.68,2);camera.rotation.set(0,0,0);
  for(const destination of ['sol','aurora','gargantua'] as DestinationId[]){
   $('#load-label').textContent=`光と質感を準備しています ${++stage} / 10`;
   cosmos.setDestination(destination);graphics.render();
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
  for(const phase of ['charging','jumping','arriving'] as const){
   $('#load-label').textContent=`光と質感を準備しています ${++stage} / 10`;
   const state={phase,progress:.5,intensity:.8,reducedMotion:drive.reducedMotion,destination:'sol',target:'aurora'};
   cosmos.setWarpState(state);cosmos.update(.016,1);interior.setWarpPresentation(state);interior.update(.016,sim,0);graphics.setWarp(.6);graphics.render();
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
 }finally{
  const state={phase:'idle' as const,progress:0,intensity:0,reducedMotion:drive.reducedMotion,destination:'sol',target:null};
  cosmos.setWarpState(state);interior.setWarpPresentation(state);interior.update(.016,sim,0);graphics.setWarp(0);cosmos.setDestination('sol');cosmos.setView(false);graphics.setView(false);
  exterior.visible=true;interior.group.visible=false;camera.position.copy(position);camera.quaternion.copy(rotation);camera.fov=44;camera.near=.08;setLandingView();camera.updateProjectionMatrix();canvas.style.visibility='';warming=false;warmupMs=Math.round(performance.now()-started);
 }
}

function switchMode(next:'walk'|'orbit'|'landing'){
 if(!ready)return;
 keys.clear();dragging=false;document.exitPointerLock?.();
 if(mode==='walk'){savedPosition.copy(camera.position);savedYaw=yaw;savedPitch=pitch;}
 mode=next;document.body.classList.toggle('walking',next==='walk');
 warpUI.setVisible(next!=='landing');
 $('#landing').hidden=next!=='landing';$('#landing-footer').hidden=next!=='landing';$('#station-label').hidden=next!=='landing';$('#hud').hidden=next!=='walk';$('#crosshair').hidden=next!=='walk';$('#orbit-help').hidden=next!=='orbit';$('#touch-controls').hidden=next!=='walk'||!coarse;$('#interact').hidden=true;
 exterior.visible=next!=='walk';interior.group.visible=next==='walk';orbitControls.enabled=next!=='walk';orbitControls.autoRotate=next==='landing'&&!reduced;
 cosmos.setView(next==='walk');graphics.setView(next==='walk');
 if(next==='walk'){
  camera.clearViewOffset();camera.fov=68;camera.near=.055;camera.position.copy(savedPosition);yaw=savedYaw;pitch=savedPitch;camera.rotation.set(pitch,yaw,0,'YXZ');body.setTranslation({x:camera.position.x,y:camera.position.y-.89,z:camera.position.z},true);body.setNextKinematicTranslation(body.translation());world.step();
  scene.environmentIntensity=.38;ambient.intensity=.15;sun.intensity=2.8;fill.intensity=.16;rim.intensity=.2;
  sun.shadow.camera.left=-22;sun.shadow.camera.right=22;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-25;sun.shadow.camera.updateProjectionMatrix();sun.target.position.set(0,0,18);sun.position.set(-25,45,-32);
  walkHintTime=clock;$('#walk-hint').style.opacity='1';audio.init();
 }else{
  camera.fov=44;camera.near=.1;camera.position.set(136,94,178);orbitControls.target.set(0,8,0);camera.clearViewOffset();if(next==='landing')setLandingView();
  scene.environmentIntensity=.55;ambient.intensity=.35;sun.intensity=3.6;fill.intensity=.6;rim.intensity=1.4;
  sun.shadow.camera.left=-110;sun.shadow.camera.right=110;sun.shadow.camera.top=110;sun.shadow.camera.bottom=-110;sun.shadow.camera.updateProjectionMatrix();sun.target.position.set(0,0,0);sun.position.set(-90,130,90);orbitControls.update();
 }
 camera.updateProjectionMatrix();
}
function visit(id:string){const room=rooms.find(r=>r.id===id);if(!room)return;if(mode!=='walk')switchMode('walk');camera.position.set(room.p[0],room.p[1],room.p[2]);yaw=room.yaw;pitch=-.04;camera.rotation.set(pitch,yaw,0,'YXZ');body.setTranslation({x:room.p[0],y:room.p[1]-.89,z:room.p[2]},true);body.setNextKinematicTranslation(body.translation());velocityY=0;world.step();savedPosition.copy(camera.position);}
function showDialog(id:string){keys.clear();dragging=false;document.exitPointerLock?.();$<HTMLDialogElement>(id).showModal();}
function toggleMap(){if($<HTMLDialogElement>('#map-dialog').open)$<HTMLDialogElement>('#map-dialog').close();else{for(const r of rooms)document.querySelector(`[data-room="${r.id}"]`)?.classList.toggle('visited',sim.visits.has(r.id));showDialog('#map-dialog');}}
const isPaused=()=>!!document.querySelector('dialog[open]')||document.hidden||lost;
function act(){
 if(!nearest||mode!=='walk'||isPaused())return;
 audio.beep();const i=nearest;
 if(i.action){keys.clear();dragging=false;if(i.action==='warp')warpUI.open();else warpUI.openScanner();return;}
 if(i.door){const d=i.door;if(d.open){const p=body.translation();const across=d.axis==='z'?Math.abs(p.z-d.position.z):Math.abs(p.x-d.position.x);const along=d.axis==='z'?Math.abs(p.x-d.position.x):Math.abs(p.z-d.position.z);if(across<.8&&along<1.9){toast('ハッチの内側にいます。少し離れてから閉じてください。');return;}}
  d.open=!d.open;sim.actions.add('hatch');sim.save();toast(d.open?'ハッチを開きます':'ハッチを閉じます');audio.beep(130,.45);
 }else if(i.key){const on=sim.toggle(i.key);const messages={shutters:on?'展望窓のシャッターを閉じます':'展望窓のシャッターを開きます',lights:on?'キャビン照明：通常モード':'キャビン照明：ナイトモード',solar:on?'太陽電池：太陽追尾を開始':'太陽電池：待機モード',reactor:on?'リアクター：主電源を復帰':'リアクター：停止、蓄電池に切り替え',gravity:on?'人工重力：1.0 G に復帰':'人工重力：OFF。Space で上昇、Q で下降',beacon:on?'航行ビーコン：送信開始':'航行ビーコン：送信停止',biosphere:on?'バイオスフィア：育成照明 ON。植物の成長を観察できます':'バイオスフィア：休眠モード',orrery:on?'ホログラフィック天体儀を展開':'天体儀を航路テーブルへ収納',drone:on?'MILO：観測飛行を開始します':'MILO：充電ドックへ帰還します'};toast(messages[i.key]);}
}
function startWarp(id:DestinationId){
 const result=drive.start(id,sim.reactor,sim.power);
 if(result.ok){keys.clear();dragging=false;sim.shutters=false;audio.warp('charging');if(mode==='walk'){if(currentRoom().id!=='observatory'){visit('observatory');toast('ワープを見渡せる展望室へ移動しました');}flightAim={yaw,pitch};if(drive.reducedMotion){yaw=0;pitch=.015;flightAim=null;}}sim.actions.add('warp');sim.save();}
 return result;
}
$('#enter').onclick=()=>{switchMode('walk');toast('ようこそ AETHER へ。ドラッグで見回し、WASD で移動できます。');};
$('#exterior').onclick=()=>switchMode('orbit');$('#return-inside').onclick=()=>switchMode('walk');$('#outside-button').onclick=()=>switchMode('orbit');$('.brand').onclick=e=>{e.preventDefault();switchMode('landing');};
$('#help').onclick=()=>showDialog('#help-dialog');$('#settings-button').onclick=()=>showDialog('#settings-dialog');$('#map-button').onclick=toggleMap;
document.querySelectorAll<HTMLButtonElement>('.close').forEach(b=>b.onclick=()=>b.closest('dialog')!.close());$('.close-help').onclick=()=>{$<HTMLDialogElement>('#help-dialog').close();if(mode==='landing')switchMode('walk');};
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});d.addEventListener('close',()=>keys.clear());});
document.querySelectorAll<HTMLButtonElement>('[data-room]').forEach(b=>b.onclick=()=>{visit(b.dataset.room!);$<HTMLDialogElement>('#map-dialog').close();});
$('#interact').onclick=act;$('#touch-action').onclick=act;
function setMuted(muted:boolean){sim.muted=muted;audio.mute(muted);$('#sound-label').textContent=muted?'OFF':'ON';$('#sound').setAttribute('aria-label',muted?'環境音をオンにする':'環境音をオフにする');$<HTMLInputElement>('#audio-toggle').checked=!muted;}
$('#sound').onclick=()=>setMuted(!sim.muted);$<HTMLInputElement>('#audio-toggle').onchange=e=>setMuted(!(e.target as HTMLInputElement).checked);
$<HTMLInputElement>('#sensitivity').oninput=e=>sensitivity=+(e.target as HTMLInputElement).value;
$<HTMLSelectElement>('#orbit-speed').onchange=e=>sim.speed=+(e.target as HTMLSelectElement).value;
function resize(){graphics.resize();camera.aspect=innerWidth/innerHeight;if(mode==='landing')setLandingView();camera.updateProjectionMatrix();}
$<HTMLSelectElement>('#quality').onchange=e=>{quality=(e.target as HTMLSelectElement).value;graphics.setQuality(quality);resize();toast(`描画品質を${quality==='high'?'高品質':quality==='medium'?'標準':'軽量'}に変更しました`);};
window.addEventListener('resize',resize);
function photo(){if(!ready)return;graphics.render();canvas.toBlob(b=>{if(!b){toast('写真を保存できませんでした');return;}const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=`AETHER-${mode==='walk'?currentRoom().id:'orbit'}-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('写真を保存しました');},'image/png');canvas.classList.remove('photo-flash');requestAnimationFrame(()=>canvas.classList.add('photo-flash'));audio.beep(1400,.05);}
$('#photo-button').onclick=photo;
document.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
 if(e.code==='Escape'){keys.clear();return;}
 if(isPaused())return;
 if(['KeyW','KeyA','KeyS','KeyD','Space','KeyQ','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code)){keys.add(e.code);e.preventDefault();}
 if(e.repeat)return;
 if(e.code==='KeyE')act();if(e.code==='KeyM'&&mode==='walk')toggleMap();if(e.code==='KeyV')switchMode(mode==='walk'?'orbit':'walk');if(e.code==='KeyP')photo();
 if(e.code==='KeyF'&&mode==='walk'){if(document.pointerLockElement)document.exitPointerLock();else void canvas.requestPointerLock()?.catch(()=>toast('マウス固定を使用できません。ドラッグで視点を操作できます。'));}
});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden&&audio.ctx)void audio.ctx.suspend();else if(audio.ctx)void audio.ctx.resume();});
canvas.addEventListener('pointerdown',e=>{if(mode!=='walk'||isPaused())return;if(e.button!==0)return;dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
document.addEventListener('pointerlockchange',()=>{dragging=false;keys.clear();});
document.addEventListener('pointermove',e=>{
 if(mode!=='walk'||isPaused())return;let dx=0,dy=0;
 if(document.pointerLockElement===canvas){dx=e.movementX;dy=e.movementY;}
 else if(dragging){dx=e.clientX-lastPointer.x;dy=e.clientY-lastPointer.y;lastPointer={x:e.clientX,y:e.clientY};}else return;
 yaw-=dx*.0022*sensitivity;pitch=T.MathUtils.clamp(pitch-dy*.0022*sensitivity,-1.36,1.36);
});
document.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(b=>{b.onpointerdown=e=>{keys.add(b.dataset.move!);b.setPointerCapture(e.pointerId);e.preventDefault();};b.onpointerup=b.onpointercancel=()=>keys.delete(b.dataset.move!);});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;keys.clear();toast('描画接続が失われました。復旧を待っています。');});canvas.addEventListener('webglcontextrestored',()=>{location.reload();});
renderer.onDeviceLost=info=>{lost=true;keys.clear();fatal(new Error(`描画デバイスとの接続が失われました：${info.message}。再読み込みしてください`));};

function movePlayer(dt:number){
 forward.set(-Math.sin(yaw),0,-Math.cos(yaw));right.crossVectors(forward,worldUp);move.set(0,0,0);
 if(keys.has('KeyW'))move.add(forward);if(keys.has('KeyS'))move.sub(forward);if(keys.has('KeyD'))move.add(right);if(keys.has('KeyA'))move.sub(right);
 if(move.lengthSq()>0)move.normalize();const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?4.6:2.5;move.multiplyScalar(speed*dt);
 if(keys.has('ArrowLeft'))yaw+=dt*1.25;if(keys.has('ArrowRight'))yaw-=dt*1.25;if(keys.has('ArrowUp'))pitch=Math.min(1.36,pitch+dt*.85);if(keys.has('ArrowDown'))pitch=Math.max(-1.36,pitch-dt*.85);
 if(sim.gravity){velocityY=Math.max(velocityY-9.81*dt,-10);move.y=velocityY*dt;controller.enableSnapToGround(.2);}else{velocityY=0;controller.disableSnapToGround();move.y=(keys.has('Space')?1:0)*dt*2-(keys.has('KeyQ')?1:0)*dt*2;}
 controller.computeColliderMovement(playerCollider,move);const delta=controller.computedMovement(),pos=body.translation();body.setNextKinematicTranslation({x:pos.x+delta.x,y:pos.y+delta.y,z:pos.z+delta.z});if(controller.computedGrounded())velocityY=0;
 walkingDistance+=Math.hypot(delta.x,delta.z);if(sim.gravity&&walkingDistance-lastStep>1.3){audio.step();lastStep=walkingDistance;}
 world.step();const p=body.translation();if(p.y< -8){visit('observatory');toast('安全地点に戻りました');return;}
 camera.position.set(p.x,p.y+.89,p.z);camera.position.y+=sim.gravity&&move.lengthSq()>.00001?Math.sin(walkingDistance*5.6)*.014:0;camera.rotation.set(pitch,yaw,0,'YXZ');
}
function animateDoors(dt:number){
 for(const door of interior.doors){
  if(door.open===false&&door.amount>.05){const p=body.translation();const across=door.axis==='z'?Math.abs(p.z-door.position.z):Math.abs(p.x-door.position.x);const along=door.axis==='z'?Math.abs(p.x-door.position.x):Math.abs(p.z-door.position.z);if(mode==='walk'&&across<.65&&along<1.8)door.open=true;}
  door.amount=T.MathUtils.damp(door.amount,door.open?1:0,3.8,dt);door.panels.forEach((p,i)=>p.position.x=(i===0?-1:1)*(.75+door.amount*1.52));physicsColliders[door.colliderIndex].setEnabled(door.amount<.88);
 }
}
function updateInteraction(){
 nearest=undefined;let best=4;camera.getWorldDirection(forward);
 if(drive.phase!=='idle'){$('#interact').hidden=true;$('#crosshair').classList.remove('active');return;}
 for(const i of interior.interactions){const d=i.position.clone().sub(camera.position),dist=d.length();if(dist>3.4)continue;const alignment=d.normalize().dot(forward);if(alignment<.7)continue;
  // Physics rays keep buttons behind solid partitions from being usable.
  const ray=new RAPIER.Ray(camera.position,d);const hit=world.castRay(ray,Math.max(0,dist-.15),true,undefined,undefined,playerCollider,body);
  if(hit&&hit.timeOfImpact<dist-.25)continue;
  const score=dist*.35+(1-alignment)*2.4;if(score<best){best=score;nearest=i;}
 }
 $('#interact').hidden=!nearest;$('#crosshair').classList.toggle('active',!!nearest);
 if(nearest){$('#interact strong').textContent=nearest.name;$('#interact small').textContent=nearest.door?(nearest.door.open?'ハッチを閉じる':'ハッチを開く'):nearest.key==='shutters'?(sim.shutters?'シャッターを開く':'シャッターを閉じる'):nearest.key?(sim[nearest.key]?'稼働中 → OFF に切り替え':'停止中 → ON に切り替え'):nearest.detail;}
}
function hud(){
 const room=currentRoom();if(room.id!==toastRoom){toastRoom=room.id;if(room.id!=='corridor')toast(`${room.name} / ${room.en}`);}
 if(!sim.visits.has(room.id)){sim.visits.add(room.id);sim.save();}
 $('#location-name').textContent=room.name;$('#location-en').textContent=room.en;$('#location-no').textContent=room.id==='observatory'?'01 / DECK A':room.id==='habitat'?'02 / DECK B':room.id==='lab'?'03 / DECK B':room.id==='engineering'?'04 / DECK C':'TRANSIT / DECK B';
 let visited=0;for(const r of rooms)if(r.id!=='corridor'&&sim.visits.has(r.id))visited++;document.querySelectorAll('.progress-dots i').forEach((e,i)=>e.classList.toggle('done',i<visited));
 $('#objective-text').textContent=drive.phase!=='idle'?drive.missionHint:visited===4?`観測記録 ${drive.discovered.size} / 9  ·  航路テーブルから次の銀河へ`:`区画 ${visited} / 4  ·  中央テーブルでワープを起動`;
 $('#power-value').textContent=sim.power.toFixed(0);$('#gravity-value').textContent=sim.gravity?'1.0':'0.0';
 $('.live').innerHTML=`<i></i> ${drive.phase==='idle'?(sim.reactor?'ALL SYSTEMS NOMINAL':'AUXILIARY POWER ONLINE'):'JUMP DRIVE ACTIVE'}`;
 if(clock-walkHintTime>24)$('#walk-hint').style.opacity='0';
}

const easeFlight=(p:number)=>{const x=T.MathUtils.clamp(p,0,1);return x*x*(3-2*x);};
function updateFlightCamera(dt:number){
 const p=drive.progress,phase=drive.phase,motion=drive.reducedMotion?0:1;
 orbitControls.maxDistance=phase==='idle'?410:300;
 if(mode!=='walk'&&phase!=='idle'){
  const offset=camera.position.clone().sub(orbitControls.target),distance=offset.length();
  if(distance>298)camera.position.copy(orbitControls.target).addScaledVector(offset.normalize(),T.MathUtils.damp(distance,290,4,dt));
 }
 if(flightAim&&phase==='charging'){
  const t=easeFlight(p/.25),angle=T.MathUtils.euclideanModulo(flightAim.yaw+Math.PI,Math.PI*2)-Math.PI;
  yaw=angle*(1-t);pitch=T.MathUtils.lerp(flightAim.pitch,.015,t);if(t===1)flightAim=null;
 }else if(phase==='idle')flightAim=null;
 const stretch=phase==='charging'?-4*easeFlight(p):phase==='jumping'?-4+24*easeFlight(p/.38):phase==='arriving'?20*(1-easeFlight(p)):0;
 const desired=(mode==='walk'?68:44)+stretch*motion;
 if(Math.abs(camera.fov-desired)>.015){camera.fov=T.MathUtils.damp(camera.fov,desired,7,dt);camera.updateProjectionMatrix();}
 if(mode==='walk'){
  const strain=(phase==='charging'?p*p*.55:phase==='jumping'?.75:phase==='arriving'?(1-p)*.55:0)*motion;
  const roll=(Math.sin(clock*4.7)*.0026+Math.sin(clock*11.8)*.0008)*strain;
  const nod=(Math.sin(clock*7.2)*.0013+Math.cos(clock*3.1)*.0009)*strain;
  camera.rotation.set(pitch+nod,yaw,roll,'YXZ');
 }
 sun.color.lerp(sunDestination,1-Math.exp(-dt*2));
 const transitDim=drive.intensity*(drive.reducedMotion?.45:1),inside=mode==='walk';
 sun.intensity=T.MathUtils.damp(sun.intensity,(inside?2.8:3.6)*(1-transitDim*.82),3,dt);
 fill.intensity=T.MathUtils.damp(fill.intensity,(inside?.16:.6)*(1-transitDim*.6),3,dt);
 scene.environmentIntensity=T.MathUtils.damp(scene.environmentIntensity,(inside?.38:.55)*(1-transitDim*.42),3,dt);
 const wash=phase==='charging'?easeFlight(p)*12:phase==='jumping'?18+Math.sin(p*Math.PI)*7:phase==='arriving'?18*(1-easeFlight(p)):0;
 cabinWash.intensity=T.MathUtils.damp(cabinWash.intensity,mode==='walk'?wash*(drive.reducedMotion?.3:1):0,5,dt);
}

function frame(now:number){
 requestAnimationFrame(frame);if(lost||document.hidden||warming){lastTime=now;return;}
 const dt=Math.min((now-lastTime)/1000,.05);lastTime=now;clock+=dt;frameCount++;
 if(now-fpsAt>1000){fps=Math.round(frameCount*1000/(now-fpsAt));frameCount=0;fpsAt=now;}
 if(ready){const previousPhase=drive.phase,previousDestination=drive.destination;drive.update(dt,sim.reactor,sim.power);
  if(previousDestination!==drive.destination){cosmos.setDestination(drive.destination);sunDestination.setHex(drive.destination==='gargantua'?0xffd0a0:drive.destination==='aurora'?0xc9c7ff:0xfff3da);}
  if(previousPhase!==drive.phase&&drive.phase!=='idle'&&drive.phase!=='charging')audio.warp(drive.phase);
  if(previousPhase==='charging'&&drive.phase==='idle'){audio.warp('cancel');toast(drive.statusMessage);}
  const presentation={phase:drive.phase,progress:drive.progress,intensity:drive.intensity,reducedMotion:drive.reducedMotion,destination:drive.destination,target:drive.target};
  cosmos.setWarpState(presentation);interior.setWarpPresentation(presentation);graphics.setWarp(drive.reducedMotion?0:drive.intensity);
  document.body.classList.toggle('in-flight',drive.phase!=='idle');
  warpUI.update();
 }
 if(!isPaused()||drive.phase!=='idle')cosmos.update(dt,sim.speed);
 if(!isPaused()){
  sim.update(dt);
  if(ready){animateDoors(dt);interior.update(dt,sim,clock);survey.update(dt,sim,clock);if(mode==='walk'){accumulator+=dt;while(accumulator>=1/60){movePlayer(1/60);accumulator-=1/60;}updateInteraction();hud();}else{accumulator=0;orbitControls.update(dt);}}
 }
 if(ready)updateFlightCamera(dt);
 try{graphics.render();}catch(e){lost=true;fatal(e);console.error(e);}
}
requestAnimationFrame(frame);
// Read-only diagnostics used by browser QA, also useful when reporting performance issues.
Object.assign(window,{__aether:{getState:()=>({ready,warming,warmupMs,mode,room:mode==='walk'?currentRoom().id:null,position:camera.position.toArray(),yaw,pitch,nearest:nearest?.id??null,doors:interior.doors.map(d=>({id:d.id,open:d.open,amount:d.amount,blocked:physicsColliders[d.colliderIndex]?.isEnabled()})),systems:{shutters:sim.shutters,lights:sim.lights,solar:sim.solar,reactor:sim.reactor,gravity:sim.gravity,beacon:sim.beacon,power:sim.power,biosphere:sim.biosphere,orrery:sim.orrery,drone:sim.drone},warp:{destination:drive.destination,target:drive.target,phase:drive.phase,progress:drive.progress,intensity:drive.intensity,discoveries:[...drive.discovered],scanning:drive.scanning,reducedMotion:drive.reducedMotion},cosmos:cosmos.getState(),console:interior.getConsoleState(),optics:{fov:camera.fov,roll:camera.rotation.z,sun:sun.intensity,cabinWash:cabinWash.intensity},drone:survey.getState(),visited:[...sim.visits],actions:[...sim.actions],fps,drawCalls:renderer.info.render.drawCalls,triangles:renderer.info.render.triangles,quality,backend:graphics.backend,environment:graphics.environmentSource,webgl:graphics.backend==='webgl2'})}});
