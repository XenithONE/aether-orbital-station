import * as T from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats as M, screenTexture,labelTexture } from './materials';
import { createCraftedDetails } from './interior-details';
import { createCommandConsole,createPeripheralConsole,instrumentMaterial,type WarpPresentation } from './command-console';
import type { SystemKey,Simulation } from './simulation';
export type ColliderBox={p:[number,number,number];s:[number,number,number]};
export type Interaction={id:string;name:string;detail:string;position:T.Vector3;mesh:T.Object3D;key?:SystemKey;door?:Door;action?:'warp'|'scan'};
export type Door={id:string;group:T.Group;panels:T.Mesh[];position:T.Vector3;open:boolean;amount:number;axis:'x'|'z';colliderIndex:number};
export const rooms=[
 {id:'observatory',name:'展望室',en:'CUPOLA OBSERVATORY',p:[0,1.68,2],yaw:0,area:[-8,8,-7,7]},
 {id:'corridor',name:'連絡通路',en:'TRANSIT SPINE',p:[0,1.68,12],yaw:Math.PI,area:[-2.2,2.2,7,31]},
 {id:'habitat',name:'居住区',en:'CREW HABITAT',p:[10,1.68,18.6],yaw:-Math.PI/2,area:[2.2,16,16,26]},
 {id:'lab',name:'研究室',en:'BIOSPHERE LAB',p:[-8,1.68,22.6],yaw:Math.PI/2,area:[-16,-2.2,16,26]},
 {id:'engineering',name:'機関室',en:'REACTOR CONTROL',p:[0,1.68,35],yaw:Math.PI,area:[-7,7,31,46]},
];
export function createInterior(){
 const group=new T.Group();group.name='StationInterior';const statics=new T.Group();group.add(statics);
 const colliders:ColliderBox[]=[];const interactions:Interaction[]=[];const doors:Door[]=[];const lights:T.PointLight[]=[];const floating:T.Group[]=[];
 const unitBox=new RoundedBoxGeometry(1,1,1,1,.025),thinBox=new T.BoxGeometry(1,1,1);
 function box(mat:T.Material,x:number,y:number,z:number,w:number,h:number,d:number,solid=false,parent:T.Group=statics){
  const m=new T.Mesh(Math.min(w,h,d)<.035?thinBox:unitBox,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(solid)colliders.push({p:[x,y,z],s:[w,h,d]});return m;
 }
 function cyl(mat:T.Material,x:number,y:number,z:number,r:number,h:number,parent:T.Group=statics){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,24),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function beam(mat:T.Material,a:number[],b:number[],r=.06,parent:T.Group=statics){const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av);const m=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),8),mat);m.position.copy(av.add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(m);return m;}
 function screen(x:number,y:number,z:number,w:number,title:string,sub:string,v=0,ry=0,rx=0,parent:T.Group=statics){
  const g=new T.Group();g.position.set(x,y,z);g.rotation.set(rx,ry,0);parent.add(g);
  box(M.trim,0,0,-.022,w+.045,w*.586+.045,.04,false,g);
  const m=new T.Mesh(new T.PlaneGeometry(w,w*.586),instrumentMaterial(screenTexture(title,sub,v)));m.position.z=.003;g.add(m);
  for(const s of [-1,1]){
   box(M.white,s*(w/2+.018),0,-.008,.014,w*.586,.03,false,g);
  }
  box(M.cyan,w*.34,-w*.3,.005,w*.06,.004,.006,false,g);return g;
 }
 function label(x:number,y:number,z:number,w:number,title:string,sub='',ry=0){const m=new T.Mesh(new T.PlaneGeometry(w,w/4),new T.MeshBasicMaterial({map:labelTexture(title,sub),toneMapped:false}));m.position.set(x,y,z);m.rotation.y=ry;statics.add(m);return m;}
 function lamp(x:number,y:number,z:number,color=0xb6deec,intensity=10,distance=13){const p=new T.PointLight(color,intensity,distance,2);p.position.set(x,y,z);group.add(p);lights.push(p);return p;}
 function floor(x:number,z:number,w:number,d:number,premium=false){
  box(M.dark,x,-.2,z,w,.4,d,true);
  if(premium){
   for(let xx=x-w/2;xx<x+w/2;xx+=4)for(let zz=z-d/2;zz<z+d/2;zz+=4){const tw=Math.min(4,x+w/2-xx),td=Math.min(4,z+d/2-zz);box(M.deck,xx+tw/2,.012,zz+td/2,tw-.012,.023,td-.012);}
   for(const side of [-1,1]){box(M.gasket,side*2.86,.027,0,.045,.008,12);box(M.trim,side*2.86,.032,5.62,.023,.006,.42);box(M.trim,side*2.86,.032,-5.62,.023,.006,.42);}
   return;
  }
  for(let xx=x-w/2+1;xx<x+w/2;xx+=2)for(let zz=z-d/2+1;zz<z+d/2;zz+=2){box(M.floor,xx,.012,zz,1.97,.024,1.97);for(const s of [-1,1])box(M.trim,xx+s*.82,.029,zz+.82,.035,.012,.035);}
 }
 function wall(x:number,z:number,w:number,d:number,h=4.1){
  box(M.hull,x,h/2,z,w,h,d,true);
  if(w>d){
   for(const side of [-1,1]){const face=z+side*(d/2+.012);box(M.dark,x,.37,face,w,.65,.025);box(M.trim,x,h-.22,face,w,.1,.03);
    for(let xx=x-w/2+.76;xx<x+w/2-.1;xx+=1.45){
     const pw=Math.min(1.36,(x+w/2-xx)*2-.04);if(pw<.15)continue;
     box(M.gasket,xx,h*.52,face,pw,h-1.21,.028);box(M.hull,xx,h*.52,face+side*.022,pw-.055,h-1.28,.052);
     for(const dx of [-pw*.42,pw*.42])for(const y of [.91,h-.61]){cyl(M.trim,xx+dx,y,face+side*.06,.015,.015).rotation.x=Math.PI/2;}
    }
    box(M.trim,x,1.02,face,w,.035,.028);
   }
  }else{
   for(const side of [-1,1]){const face=x+side*(w/2+.012);box(M.dark,face,.37,z,.025,.65,d);box(M.trim,face,h-.22,z,.03,.1,d);
    for(let zz=z-d/2+.76;zz<z+d/2-.1;zz+=1.45){
     const pd=Math.min(1.36,(z+d/2-zz)*2-.04);if(pd<.15)continue;
     box(M.gasket,face,h*.52,zz,.028,h-1.21,pd);box(M.hull,face+side*.022,h*.52,zz,.052,h-1.28,pd-.055);
     for(const dz of [-pd*.42,pd*.42])for(const y of [.91,h-.61]){cyl(M.trim,face+side*.06,y,zz+dz,.015,.015).rotation.z=Math.PI/2;}
    }
   }
  }
 }
 function ceiling(x:number,z:number,w:number,d:number,h=4.1){box(M.dark,x,h+.15,z,w,.3,d,true);for(let zz=z-d/2+1;zz<z+d/2;zz+=2){
  box(M.hull,x,h,zz,w-.1,.08,1.88);box(M.gasket,x,h-.061,zz,w*.53,.055,.19);box(M.warm,x,h-.089,zz,w*.48,.022,.065);
  for(const side of [-1,1]){box(M.dark,x+side*w*.34,h-.049,zz,w*.12,.018,.75);for(let k=0;k<7;k++)box(M.trim,x+side*w*.34,h-.063,zz-.3+k*.1,w*.11,.014,.028);}
 }}
 function consoleDesk(x:number,z:number,title:string,key:SystemKey,ry=0){
  const g=new T.Group();g.position.set(x,0,z);g.rotation.y=ry;statics.add(g);
  const control=createPeripheralConsole(g,title,key==='beacon'?0:1);g.updateMatrixWorld(true);
  interactions.push({id:key,name:title,detail:'設備を切り替える',position:new T.Vector3(0,1.2,.15).applyMatrix4(g.matrixWorld),mesh:control.indicator,key});
  colliders.push({p:[x,.5,z],s:[1.55,1,.9]});return g;
 }
 function hatch(id:string,x:number,z:number,axis:'x'|'z',title:string){
  const g=new T.Group();g.position.set(x,0,z);if(axis==='x')g.rotation.y=Math.PI/2;group.add(g);
  box(M.dark,-1.78,1.9,0,.44,3.8,.8,false,g);box(M.dark,1.78,1.9,0,.44,3.8,.8,false,g);box(M.dark,0,3.64,0,3.6,.48,.8,false,g);
  box(M.cyan,-1.53,1.8,-.43,.035,3.5,.035,false,g);box(M.cyan,1.53,1.8,-.43,.035,3.5,.035,false,g);
  const panels:T.Mesh[]=[];
  for(const s of [-1,1]){
   const p=box(M.blue,s*.75,1.7,0,1.48,3.35,.22,false,g);panels.push(p);
   // Markings and recessed grip move with the pressure door itself.
   for(const side of [-1,1]){
    const seam=new T.Mesh(new T.BoxGeometry(.032,.83,.035),M.gasket);seam.position.set(-s*.32,0,side*.54);p.add(seam);
    const mark=new T.Mesh(new T.BoxGeometry(.82,.035,.02),M.orange);mark.position.set(0,-.29,side*.525);p.add(mark);
   }
  }
  for(const s of [-1,1])colliders.push({p:axis==='z'?[x+s*1.78,1.9,z]:[x,1.9,z+s*1.78],s:axis==='z'?[.44,3.8,.8]:[.8,3.8,.44]});
  colliders.push({p:[x,3.64,z],s:axis==='z'?[3.6,.48,.8]:[.8,.48,3.6]});
  const idx=colliders.length;colliders.push({p:[x,1.7,z],s:axis==='z'?[3.2,3.4,.3]:[.3,3.4,3.2]});
  const door:Door={id,group:g,panels,position:new T.Vector3(x,1.6,z),open:false,amount:0,axis,colliderIndex:idx};doors.push(door);
  for(const side of [-1,1]){
   const pad=box(M.green,1.82,1.4,side*.46,.19,.34,.08,false,g);g.updateMatrixWorld(true);
   const pos=new T.Vector3(1.82,1.4,side*.65).applyMatrix4(g.matrixWorld);
   interactions.push({id:`${id}-${side}`,name:`${title}ハッチ`,detail:'開閉する',position:pos,mesh:pad,door});
  }
  return door;
 }
 // CUPOLA: structural ribs frame an uninterrupted view of the planet.
 floor(0,0,16,14,true);ceiling(0,0,16,14,5.4);
 wall(-7.9,3,.2,8,5.4);wall(7.9,3,.2,8,5.4);
 wall(-5,7,6,.3,5.4);wall(5,7,6,.3,5.4);box(M.hull,0,4.55,7,4,1.8,.3,true);
 for(let x=-7.5;x<=7.5;x+=3){
  box(M.dark,x,2.6,-6.88,.16,5.2,.28);box(M.trim,x+.1,2.5,-6.67,.065,5,.07);
  beam(M.hull,[x,4.4,-6.8],[x,5.4,-4.7],.13);
  box(M.glass,x+1.5,2.9,-6.97,2.88,4.55,.035);
 }
 box(M.dark,0,.44,-6.8,16,.88,.4,true);box(M.dark,0,4.8,-6.8,16,.24,.35);
 box(M.cyan,0,.91,-6.56,15,.045,.06);
 colliders.push({p:[0,2.8,-7],s:[16,5.6,.2]});
 for(const side of [-1,1]){
  box(M.glass,side*7.83,2.9,-3.6,.035,4.45,6.3);colliders.push({p:[side*8,2.8,-3.5],s:[.2,5.6,7]});
  for(let z=-6;z<1;z+=2.6)box(M.dark,side*7.74,2.7,z,.26,5.4,.14);
  box(M.dark,side*7.75,.46,-3.2,.4,.9,7.5,true);beam(M.trim,[side*7.2,1,-6],[side*7.2,1,.7],.055);
  for(let z=-5;z<6;z+=3){box(M.warm,side*6.65,5.3,z,.12,.05,2.3);box(M.cyan,side*7.3,.05,z,.07,.025,2.6);}
  // Seat units with upholstery, seams and metal legs.
  box(M.fabric,side*5.7,.55,2.7,2.6,.28,1.05,true);box(M.fabric,side*5.7,1.03,3.13,2.6,.82,.18);
  for(const dx of [-1,1])box(M.trim,side*5.7+dx,.23,2.7,.08,.45,.72);
  box(M.trim,side*5.7,1,2.7,2.8,.07,.06);
 }
 lamp(-4,4,-2,0xcbe7f4,38,17);lamp(4,4,2,0xffe0bc,44,16);
 label(0,4.26,6.79,4.1,'01 / CUPOLA','AETHER ORBITAL STATION',Math.PI);
 label(-7.76,3,3,2.7,'AETHER','ORBITAL RESEARCH / 408 KM',Math.PI/2);
 consoleDesk(-4.9,-4.6,'ORBITAL NAVIGATION','beacon');
 consoleDesk(4.9,-4.6,'WINDOW SHUTTERS','shutters');
 const commandConsole=createCommandConsole(statics,group),globe=commandConsole.globe;
 colliders.push({p:[0,.54,-2.02],s:[2.96,1.08,2.3]});
 interactions.push({id:'fold-drive',name:'ワープ装置',detail:'銀河への航路を設定する',position:new T.Vector3(0,1.16,-.68),mesh:commandConsole.warpControl,action:'warp'});
 interactions.push({id:'orrery',name:'星系ホログラム',detail:'立体プラネタリウムを展開する',position:new T.Vector3(1.42,1.2,-2.1),mesh:commandConsole.orreryControl,key:'orrery'});
 const shutters=new T.Group();group.add(shutters);
 for(let i=0;i<5;i++){const p=box(M.hull,-6+i*3,7.4,-6.7,2.85,5.1,.1,false,shutters);box(M.dark,0,0,.07,.035,4.9,.02,false,new T.Group());p.userData.restY=7.4;}
 hatch('cupola',0,7,'z','展望室');
 // TRANSIT SPINE: pressure bulkheads, ducts, service access and conduit bundles.
 floor(0,19,4.4,24);ceiling(0,19,4.4,24);
 for(const side of [-1,1]){wall(side*2.2,12.5,.25,11);wall(side*2.2,26.5,.25,9);box(M.hull,side*2.2,3.83,20,.3,.56,4,true);}
 for(let z=8;z<31;z+=2.6){
  for(const side of [-1,1]){
   box(M.trim,side*2.03,2,z,.09,4,.13);box(M.cyan,side*1.87,.17,z,.04,.08,2.2);
   box(M.hull,side*1.98,3.65,z,.23,.34,2.3);beam(M.orange,[side*1.66,3.81,z-1.3],[side*1.66,3.81,z+1.3],.036);
   if(z<16||z>24){box(M.dark,side*2.03,1.65,z,.03,1.3,1.4);for(let k=0;k<7;k++)box(M.trim,side*1.99,1.25+k*.12,z,.028,.03,1.18);}
  }
  box(M.trim,0,3.96,z,4.2,.12,.12);
 }
 lamp(0,3.4,12,0xe4e3d6,27,12);lamp(0,3.4,23,0xc1dcea,27,12);lamp(0,3.4,29,0xabcbe8,20,10);
 label(0,3.22,7.47,2.1,'TRANSIT SPINE','02 / HABITAT  -  03 / LAB  -  04 / ENGINEERING');
 label(0,3.1,30.55,2.4,'04 / ENGINEERING','REACTOR ACCESS',Math.PI);
 hatch('habitat',2.2,20,'x','居住区');hatch('lab',-2.2,20,'x','研究室');hatch('reactor',0,31,'z','機関室');
 // CREW HABITAT: built-in sleeping pods, galley, table, personal storage.
 floor(9.1,21,13.8,10);ceiling(9.1,21,13.8,10);
 wall(9.1,16,13.8,.25);wall(9.1,26,13.8,.25);wall(16,21,.25,10);
 wall(2.2,17,.25,2);wall(2.2,24,.25,4);
 lamp(8,3.45,19,0xffdcad,55,16);lamp(13,3.4,24,0xe9dfc4,40,12);
 label(10,3.25,16.15,4,'02 / CREW HABITAT','REST. RECHARGE. RECONNECT.');
 for(let z=18;z<=24;z+=3){
  colliders.push({p:[14.7,1.4,z],s:[2.4,2.8,2.7]});
  box(M.dark,15.8,1.4,z,.12,2.8,2.7);
  for(const dz of [-1.32,1.32]){box(M.hull,14.7,1.4,z+dz,2.4,2.8,.09);box(M.white,13.43,1.4,z+dz,.16,2.8,.13);}
  for(const yy of [.05,1.36,2.8])box(M.hull,14.7,yy,z,2.4,.12,2.7);
  for(const y of [.55,1.85]){
   box(M.fabric,14.6,y,z,2.18,.14,2.18);box(M.trim,13.43,y-.12,z,.12,.15,2.45);
   box(M.warm,14.3,y+.71,z-1.2,1.65,.04,.05);
   // A short rounded grab rail replaces the unrelated vertical bars.
   beam(M.dark,[13.34,y+.06,z+.81],[13.34,y+.25,z+.81],.023);
   beam(M.dark,[13.34,y+.25,z+.81],[13.34,y+.25,z+1.17],.023);
   beam(M.dark,[13.34,y+.25,z+1.17],[13.34,y+.06,z+1.17],.023);
  }
  for(const zz of [z+1.02,z+1.25])beam(M.dark,[13.27,.16,zz],[13.27,1.79,zz],.018);
  for(let y=.35;y<1.8;y+=.32)beam(M.trim,[13.27,y,z+1.02],[13.27,y,z+1.25],.022);
 }
 box(M.white,7,1.03,21,2.7,.13,1.7,true);box(M.trim,7,.5,21,.15,1,.15);
 for(const z of [19.7,22.3]){box(M.fabric,7,.59,z,2.6,.22,.7,true);box(M.fabric,7,1.06,z+(z>21?.37:-.37),2.6,.85,.13);}
 for(const x of [6.4,7.6]){cyl(M.white,x,1.23,21,.09,.24);cyl(M.dark,x,1.355,21,.073,.01);}
 for(let x=4.5;x<12;x+=1.4){
  box(M.hull,x,1,25.4,1.33,2,.9,true);box(M.dark,x,1.3,24.91,1.12,.78,.03);box(M.orange,x+.4,.9,24.86,.07,.26,.06);
  box(M.trim,x,2.08,25.3,1.4,.1,1.2);
 }
 screen(7,2.68,25.1,2.4,'CREW SCHEDULE','UTC 06:00 / MISSION DAY 128',2,Math.PI);
 consoleDesk(4.5,17,'CABIN LIGHTING','lights');
 // BIOSPHERE: hydroponics bays, sample storage, microscope and live telemetry.
 floor(-9.1,21,13.8,10);ceiling(-9.1,21,13.8,10);
 wall(-9.1,16,13.8,.25);wall(-9.1,26,13.8,.25);wall(-16,21,.25,10);wall(-2.2,17,.25,2);wall(-2.2,24,.25,4);
 lamp(-7,3.4,19,0xc9e2ef,45,15);lamp(-13,3.3,23,0xb2cbe8,35,12);
 label(-10,3.24,16.16,4.4,'03 / BIOSPHERE','CLOSED LOOP LIFE SUPPORT');
 for(let z=18;z<=24;z+=3){
  box(M.dark,-14.7,.5,z,1.6,1,2.7,true);box(M.trim,-14.7,1.04,z,1.7,.14,2.75);
  for(const dz of [-1.15,1.15]){box(M.trim,-14.7,2.05,z+dz,.055,2.1,.06);box(M.warm,-14.7,2.8,z+dz,.8,.05,.07);}
 }
 for(let x=-11;x<-5;x+=2){box(M.hull,x,.54,25,1.9,1.08,1.1,true);box(M.white,x,1.13,25,2,.1,1.2);for(let i=0;i<5;i++){cyl(M.trim,x-.6+i*.25,1.3,25,.045,.25);cyl(M.cyan,x-.6+i*.25,1.31,25,.025,.16);}}
 screen(-9,2.15,25.32,2.6,'ATMOSPHERIC RECOVERY','O2 21.0%  /  CO2 410 PPM',2,Math.PI);
 consoleDesk(-5,17,'SOLAR ARRAY TRACKING','solar');
 box(M.white,-8,.98,20.2,3.1,.15,1.5,true);box(M.dark,-8,.48,20.2,2.7,.96,1.3);
 for(let j=0;j<3;j++){const prop=new T.Group();prop.position.set(-8.8+j*.8,1.25,19.74);group.add(prop);cyl(M.trim,0,0,0,.12,.08,prop);cyl(M.instrumentGlass,0,.17,0,.105,.3,prop);cyl(M.green,0,.13,0,.07,.19,prop);floating.push(prop);}
 interactions.push({id:'biosphere',name:'バイオスフィア育成装置',detail:'光合成サイクルを開始する',position:new T.Vector3(-12.65,1.4,18.2),mesh:globe,key:'biosphere'});
 interactions.push({id:'spectral-scan',name:'未知生命体スキャナー',detail:'サンプルを分光分析する',position:new T.Vector3(-8,1.3,21.03),mesh:globe,action:'scan'});
 // ENGINEERING: caged reactor column, turbine collars and redundant service racks.
 floor(0,38.5,14,15);ceiling(0,38.5,14,15,6.3);
 wall(-7,38.5,.3,15,6.3);wall(7,38.5,.3,15,6.3);wall(0,46,14,.3,6.3);wall(-4.5,31,5,.3,6.3);wall(4.5,31,5,.3,6.3);box(M.hull,0,5,31,4,2.6,.3,true);
 cyl(M.dark,0,.24,40,2.2,.48);cyl(M.trim,0,.52,40,1.95,.16);cyl(M.glass,0,3.1,40,1.3,5.2);
 const coreMat=M.cyan.clone();coreMat.color.setHex(0x155867);coreMat.emissive.setHex(0x2cb6d3);coreMat.emissiveIntensity=1.15;
 const core=cyl(coreMat,0,2.9,40,.26,4.5,group);
 const rotor=new T.Group();rotor.position.set(0,2.9,40);group.add(rotor);
 const sleeveParts:T.BufferGeometry[]=[];
 for(let a=0;a<8;a++)sleeveParts.push(new T.CylinderGeometry(.88,.88,4.36,24,1,true,a*Math.PI/4+.085,.46));
 const sleeveGeo=mergeGeometries(sleeveParts)!;sleeveParts.forEach(g=>g.dispose());
 const sleeve=new T.Mesh(sleeveGeo,M.dark);sleeve.castShadow=true;sleeve.receiveShadow=true;rotor.add(sleeve);
 const inductionParts:T.BufferGeometry[]=[];
 for(let y=-1.95;y<=2;y+=.43){const g=new T.TorusGeometry(.65,.038,8,40);g.rotateX(Math.PI/2);g.translate(0,y,0);inductionParts.push(g);}
 const induction=new T.Mesh(mergeGeometries(inductionParts)!,coreMat);inductionParts.forEach(g=>g.dispose());rotor.add(induction);
 for(let y=.8;y<5.8;y+=.65){const t=new T.Mesh(new T.TorusGeometry(1.55,.1,8,48),M.trim);t.rotation.x=Math.PI/2;t.position.set(0,y,40);statics.add(t);}
 for(let a=0;a<8;a++){const ang=a*Math.PI/4,x=Math.cos(ang)*1.53,z=40+Math.sin(ang)*1.53;box(M.hull,x,3,z,.13,5.4,.13);}
 colliders.push({p:[0,2.8,40],s:[4.3,5.6,4.3]});
 const coreLight=lamp(0,3.1,37.9,0x4abede,8,12);lamp(-4.2,4.7,38,0xd3e8ff,60,17);lamp(4.4,4.7,42,0xffd6a4,65,17);
 for(const side of [-1,1])for(let z=34;z<46;z+=2.7){
  box(M.dark,side*6.25,1.65,z,1.2,3.3,2.4,true);
  for(let y=.3;y<3.1;y+=.38){box(M.hull,side*5.62,y,z,.07,.3,2.15);box(M.green,side*5.57,y,z-.7,.03,.04,.11);for(let k=0;k<9;k++)box(M.black,side*5.57,y,z-.45+k*.15,.03,.11,.035);}
  beam(M.orange,[side*6.5,3.65,z-1.4],[side*6.5,3.65,z+1.4],.13);
 }
 consoleDesk(-3.5,36,'REACTOR POWER','reactor',Math.PI);consoleDesk(3.5,36,'MAGNETIC GRAVITY','gravity',Math.PI);
 label(0,4.8,45.8,5,'04 / REACTOR CORE','CAUTION / HIGH ENERGY SYSTEMS');
 for(const side of [-1,1]){beam(M.orange,[side*2.7,1.06,38],[side*2.7,1.06,43],.047);for(let z=38;z<44;z+=2.5)beam(M.trim,[side*2.7,0,z],[side*2.7,1.08,z],.035);}
 const details=createCraftedDetails(statics,group);
 for(let x=8.8;x<12.8;x+=1.3)colliders.push({p:[x,1.12,16.65],s:[1.16,2.24,.91]});
 colliders.push({p:[-13.03,.63,18.2],s:[.35,1.26,.66]});
 // Consolidate static draw calls while preserving unique controls and doors.
 const batches=new Map<T.Material,T.BufferGeometry[]>();statics.updateMatrixWorld(true);
 statics.traverse(o=>{if(o instanceof T.Mesh){let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();const list=batches.get(o.material)||[];list.push(g);batches.set(o.material,list);}});
 group.remove(statics);
 for(const [mat,geos] of batches){const merged=mergeGeometries(geos);if(!merged)continue;const mesh=new T.Mesh(merged,mat);mesh.castShadow=mat!==M.glass&&mat!==M.instrumentGlass&&!(mat instanceof T.MeshBasicMaterial);mesh.receiveShadow=true;group.add(mesh);geos.forEach(g=>g.dispose());}
 // Interaction materials are updated on the original controls; use visible beacons as feedback.
 const markerPositions:Record<string,number[]>={'fold-drive':[0,1.008,-1.176],orrery:[1.29,1.13,-2.1],biosphere:[-12.797,1.17,18.2],'spectral-scan':[-7.1,1.35,20.505]};
 interactions.forEach(i=>{const b=new T.Mesh(new T.SphereGeometry(.012,8,6),M.green.clone());const p=markerPositions[i.id];if(p)b.position.set(p[0],p[1],p[2]);else i.mesh.getWorldPosition(b.position);group.add(b);i.mesh=b;});
 let shutterAmount=0,warpLightIntensity=0;
 return {group,colliders,interactions,doors,lights,globe,setWarpPresentation(snapshot:WarpPresentation){commandConsole.setWarpPresentation(snapshot);warpLightIntensity=T.MathUtils.clamp(snapshot.intensity,0,1);},getConsoleState:commandConsole.getState,update(dt:number,sim:Simulation,time:number){
  commandConsole.update(dt,time,sim.orrery);
  details.update(dt,time,sim.biosphere,sim.orrery);
  shutterAmount=T.MathUtils.damp(shutterAmount,sim.shutters?1:0,2.6,dt);shutters.children.forEach(o=>o.position.y=7.4-shutterAmount*4.6);
  const practicalFactor=(sim.lights?1:.12)*(1-.5*warpLightIntensity);
  lights.forEach((l)=>{if(l.userData.base===undefined)l.userData.base=l.intensity;l.intensity=T.MathUtils.damp(l.intensity,l.userData.base*practicalFactor,3,dt);});
  coreMat.emissiveIntensity=T.MathUtils.damp(coreMat.emissiveIntensity,sim.reactor?1.15+Math.sin(time*2.2)*.1:0.015,2,dt);coreLight.intensity=sim.reactor?(6+Math.sin(time*3)*.65)*practicalFactor:0;
  core.rotation.y=time*.1;if(sim.reactor)rotor.rotation.y+=dt*.22;
  floating.forEach((g,i)=>{g.position.y=T.MathUtils.damp(g.position.y,sim.gravity?1.25:2+Math.sin(time*.5+i)*.2,2,dt);if(!sim.gravity)g.rotation.z=Math.sin(time*.3+i)*.25;else g.rotation.z=T.MathUtils.damp(g.rotation.z,0,2,dt);});
  for(const i of interactions){const active=i.key?sim[i.key]:i.door?.open;const m=(i.mesh as T.Mesh).material as T.MeshStandardMaterial;m.color.setHex(i.action?0x7ecbe7:active?0x81daba:0xe6a567);m.emissive.copy(m.color).multiplyScalar(.5);}
 }};
}
