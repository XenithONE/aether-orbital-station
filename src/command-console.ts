import * as T from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats as M,screenTexture } from './materials';

export type WarpPresentation={phase:'idle'|'charging'|'jumping'|'arriving';progress:number;intensity:number;destination:string;target:string|null;reducedMotion:boolean};
const ceramic=new T.MeshPhysicalMaterial({color:0xb4c4c7,metalness:.1,roughness:.39,clearcoat:.38,clearcoatRoughness:.34,envMapIntensity:.72});
const titanium=new T.MeshPhysicalMaterial({color:0x3b535f,metalness:.82,roughness:.46,envMapIntensity:.65});
const obsidian=new T.MeshPhysicalMaterial({color:0x08181f,metalness:.18,roughness:.4,clearcoat:.42,clearcoatRoughness:.38,envMapIntensity:.55});
const accent=new T.MeshPhysicalMaterial({color:0x82786a,metalness:.78,roughness:.45,envMapIntensity:.65});
const edgeMat=new T.MeshStandardMaterial({color:0x37768b,emissive:0x2893b8,emissiveIntensity:.42,roughness:.6,metalness:0});
const sapphire=new T.MeshPhysicalMaterial({color:0x092b39,metalness:.04,roughness:.37,clearcoat:.65,clearcoatRoughness:.4,envMapIntensity:.35});
const boxGeo=new RoundedBoxGeometry(1,1,1,2,.045);
function box(parent:T.Group,mat:T.Material,x:number,y:number,z:number,w:number,h:number,d:number){const m=new T.Mesh(boxGeo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);return m;}
function mesh(parent:T.Group,geo:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
function rail(parent:T.Group,points:T.Vector3[],radius:number,mat:T.Material){return mesh(parent,new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(16,points.length*2),radius,6,false),mat);}
function disc(parent:T.Group,r:number,h:number,mat:T.Material,x:number,y:number,z:number){return mesh(parent,new T.CylinderGeometry(r,r,h,64),mat,x,y,z);}
function arcGeometry(r:number,start:number,length:number,tube=.007){const g=new T.TorusGeometry(r,tube,6,80,length);g.rotateZ(start);g.rotateX(Math.PI/2);return g;}
function arc(parent:T.Group,r:number,y:number,start:number,length:number,mat:T.Material,tube=.007){return mesh(parent,arcGeometry(r,start,length,tube),mat,0,y,0);}
function planarShape(w=1,d=1){const s=new T.Shape();s.moveTo(-1.11*w,.96*d);s.bezierCurveTo(-1.38*w,.85*d,-1.48*w,.25*d,-1.37*w,-.14*d);s.bezierCurveTo(-1.23*w,-.77*d,-.67*w,-1.02*d,0,-1.03*d);s.bezierCurveTo(.67*w,-1.02*d,1.23*w,-.77*d,1.37*w,-.14*d);s.bezierCurveTo(1.48*w,.25*d,1.38*w,.85*d,1.11*w,.96*d);s.quadraticCurveTo(0,1.17*d,-1.11*w,.96*d);return s;}
function plate(parent:T.Group,w:number,d:number,y:number,h:number,mat:T.Material){const g=new T.ExtrudeGeometry(planarShape(w,d),{depth:h,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.017,bevelThickness:.012,curveSegments:24});g.rotateX(Math.PI/2);return mesh(parent,g,mat,0,y+h/2,0);}
function curvedDisplayGeometry(r:number,span:number,h:number){const positions:number[]=[],uv:number[]=[],indices:number[]=[];for(let y=0;y<2;y++)for(let i=0;i<=48;i++){const a=-span/2+span*i/48;positions.push(Math.sin(a)*r,y*h,-Math.cos(a)*r);uv.push(i/48,y);}for(let i=0;i<48;i++)indices.push(i,i+1,i+49,i+1,i+50,i+49);const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
export function instrumentMaterial(map:T.Texture){return new T.MeshPhysicalMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.68,color:0xffffff,metalness:0,roughness:.48,clearcoat:.28,clearcoatRoughness:.44,envMapIntensity:.3});}

export function createCommandConsole(statics:T.Group,dynamics:T.Group){
 const fixed=new T.Group();fixed.name='FOLD / Navigation instrument';fixed.position.set(0,0,-2.1);statics.add(fixed);
 const live=new T.Group();live.name='Fold drive presentation';live.position.copy(fixed.position);dynamics.add(live);
 // The split ceramic chassis carries a thin deck across a deliberate negative space.
 plate(fixed,.8,.65,.082,.055,titanium);plate(fixed,.77,.61,.122,.024,obsidian);
 for(const side of [-1,1]){
  const s=new T.Shape();s.moveTo(side*.94,.15);s.bezierCurveTo(side*.76,.31,side*.68,.66,side*.39,.85);s.lineTo(side*.48,.94);s.lineTo(side*1.04,.94);s.bezierCurveTo(side*1.1,.72,side*.98,.4,side*1.12,.19);s.quadraticCurveTo(side*1.09,.12,side*.94,.15);
  const g=new T.ExtrudeGeometry(s,{depth:.4,bevelEnabled:true,bevelThickness:.04,bevelSize:.038,bevelSegments:4,curveSegments:20});mesh(fixed,g,ceramic,0,0,-.22);
  rail(fixed,[new T.Vector3(side*1.01,.22,.222),new T.Vector3(side*.94,.49,.222),new T.Vector3(side*.81,.72,.222),new T.Vector3(side*.63,.85,.222)],.009,titanium);
  rail(fixed,[new T.Vector3(side*.88,.24,.224),new T.Vector3(side*.77,.56,.224),new T.Vector3(side*.5,.82,.224)],.004,edgeMat);
 }
 box(fixed,obsidian,0,.58,-.18,.19,.57,.28);box(fixed,titanium,0,.18,-.2,.41,.1,.41);
 for(let i=0;i<7;i++)box(fixed,titanium,0,.32+i*.05,-.017,.15,.012,.03);
 plate(fixed,.96,.96,.941,.05,obsidian);plate(fixed,1,1,.998,.065,ceramic);plate(fixed,.966,.96,1.044,.018,titanium);plate(fixed,.95,.94,1.064,.012,obsidian);
 // Ceramic deck islands frame the touch surfaces, separated by dark precision reveals.
 for(const side of [-1,1]){
  box(fixed,ceramic,side*1.16,1.079,.16,.25,.026,.78).rotation.y=side*-.12;
  box(fixed,titanium,side*1.286,1.074,.17,.017,.018,.61).rotation.y=side*-.12;
  for(let i=0;i<5;i++)box(fixed,obsidian,side*1.17,1.095,-.08+i*.09,.15,.007,.013);
  box(fixed,edgeMat,side*1.16,1.099,.53,.145,.008,.026);
 }
 // Projector lens is physically recessed into the deck; no suspended metal hoops.
 disc(fixed,.49,.022,titanium,0,1.084,-.11);disc(fixed,.453,.017,obsidian,0,1.097,-.11);
 disc(fixed,.343,.013,sapphire,0,1.105,-.11);
 for(let i=0;i<48;i++){const a=i*Math.PI/24;const m=box(fixed,i%4===0?accent:titanium,Math.cos(a)*.418,1.113,-.11+Math.sin(a)*.418,.017,.009,i%4===0?.051:.025);m.rotation.y=-a+Math.PI/2;}
 for(const r of [.355,.369]){const m=arc(fixed,r,1.113,0,Math.PI*2,edgeMat,.003);m.position.z=-.11;}
 // A single, flush inclined command glass, sized for a human hand.
 const consoleGlass=new T.Group();consoleGlass.position.set(0,1.114,.77);consoleGlass.rotation.x=-1.05;fixed.add(consoleGlass);
 box(consoleGlass,titanium,0,0,0,1.86,.451,.034);box(consoleGlass,obsidian,0,0,.019,1.828,.419,.012);
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=384;const context=canvas.getContext('2d')!;const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;
 const command=mesh(consoleGlass,new T.PlaneGeometry(1.798,.389),instrumentMaterial(texture),0,0,.027);
 for(const side of [-1,1])box(consoleGlass,edgeMat,side*.912,0,.029,.006,.28,.008);
 const orbTouch=disc(fixed,.082,.008,obsidian,1.29,1.116,0);arc(fixed,.066,1.122,0,Math.PI*1.64,edgeMat,.0035).position.set(1.29,1.122,0);
 // The curved, transparent-backed navigation strip follows the projector instead of a TV frame.
 const stripCanvas=document.createElement('canvas');stripCanvas.width=1024;stripCanvas.height=144;const sc=stripCanvas.getContext('2d')!;
 sc.fillStyle='#041117';sc.fillRect(0,0,1024,144);sc.strokeStyle='#315662';sc.lineWidth=1;sc.beginPath();sc.moveTo(22,99);sc.lineTo(1002,99);sc.stroke();
 sc.fillStyle='#8dbece';sc.font='18px "Segoe UI",sans-serif';sc.fillText('A S T R O M E T R I C   A R R A Y',27,39);sc.fillStyle='#d0e4e9';sc.font='26px "Segoe UI",sans-serif';sc.fillText('VECTOR SOLUTION',27,80);
 sc.fillStyle='#628f9c';sc.font='17px monospace';sc.fillText('STELLAR FIX',571,42);sc.fillStyle='#a5d4db';sc.font='28px monospace';sc.fillText('99.998 %',568,81);
 sc.fillStyle='#699a8d';sc.font='18px monospace';sc.fillText('● LOCKED',831,81);sc.font='12px monospace';sc.fillStyle='#507c8a';sc.fillText('LOCAL FRAME   /   INERTIAL GUIDANCE',29,124);sc.fillText('CHANNELS  16 / 16',825,124);
 const backTexture=new T.CanvasTexture(stripCanvas);backTexture.colorSpace=T.SRGBColorSpace;backTexture.anisotropy=8;
 const display=mesh(fixed,curvedDisplayGeometry(.83,1.65,.19),instrumentMaterial(backTexture),0,1.226,-.04);
 display.material.side=T.DoubleSide;
 for(const y of [1.217,1.422]){const p:T.Vector3[]=[];for(let i=0;i<=24;i++){const a=-.835+i/24*1.67;p.push(new T.Vector3(Math.sin(a)*.842,y,-Math.cos(a)*.842-.04));}rail(fixed,p,.008,titanium);}
 for(const side of [-1,1])rail(fixed,[new T.Vector3(side*.615,1.093,-.61),new T.Vector3(side*.62,1.23,-.61),new T.Vector3(side*.62,1.414,-.61)],.011,titanium);
 // Inlaid perimeter conductors remain thin even at full charge.
 const chargeMat=new T.MeshStandardMaterial({color:0x3f90ab,emissive:0x218eb6,emissiveIntensity:.2,roughness:.62,metalness:0});
 const chargeArcs:T.Mesh[]=[];
 for(let i=0;i<3;i++){
  const r=.64+i*.066,m=arc(live,r,1.115,i*.62,Math.PI*1.13,chargeMat,.0045);m.position.z=-.11;chargeArcs.push(m);
 }
 const channelParts:T.BufferGeometry[]=[];
 for(const side of [-1,1]){const curve=new T.CatmullRomCurve3([new T.Vector3(side*.32,1.024,.99),new T.Vector3(side*1.05,1.024,.94),new T.Vector3(side*1.31,1.024,.48),new T.Vector3(side*1.28,1.024,-.18)]);channelParts.push(new T.TubeGeometry(curve,36,.005,6,false));}
 mesh(live,mergeGeometries(channelParts)!,chargeMat);channelParts.forEach(g=>g.dispose());
 // Latitude/longitude linework gives a restrained volume, avoiding triangulated wire spheres.
 const hologram=new T.Group();hologram.position.set(0,1.44,-.11);live.add(hologram);
 const hologramMat=new T.MeshBasicMaterial({color:0x64d2ee,transparent:true,opacity:.26,depthWrite:false,blending:T.AdditiveBlending});
 const globeGeoParts:T.BufferGeometry[]=[];
 for(let k=-2;k<=2;k++){const latitude=k*Math.PI/6,r=Math.cos(latitude)*.23;const g=arcGeometry(r,0,Math.PI*2,.0014);g.translate(0,Math.sin(latitude)*.23,0);globeGeoParts.push(g);}
 for(let i=0;i<5;i++){const g=new T.TorusGeometry(.23,.0014,4,64);g.rotateY(i*Math.PI/5);globeGeoParts.push(g);}
 const globe=mesh(hologram,mergeGeometries(globeGeoParts)!,hologramMat);globeGeoParts.forEach(g=>g.dispose());
 const route=new T.Group();hologram.add(route);
 const routeLine=rail(route,[new T.Vector3(-.18,-.07,.12),new T.Vector3(-.07,.18,.23),new T.Vector3(.13,.31,.13),new T.Vector3(.32,.18,-.03)],.0025,hologramMat);
 for(const p of [new T.Vector3(-.18,-.07,.12),new T.Vector3(.32,.18,-.03)])mesh(route,new T.SphereGeometry(.014,12,8),hologramMat,p.x,p.y,p.z);
 const beamMat=new T.MeshBasicMaterial({color:0x46c5e8,transparent:true,opacity:.017,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
 const projection=mesh(live,new T.CylinderGeometry(.29,.16,.46,48,1,true),beamMat,0,1.347,-.11);
 let state:WarpPresentation={phase:'idle',progress:0,intensity:0,destination:'SOL / EARTH',target:null,reducedMotion:false},charge=0,lastRedraw=-10,lastStatus='';
 function draw(time:number){
  const w=canvas.width,h=canvas.height,c=context;c.fillStyle='#041016';c.fillRect(0,0,w,h);
  c.strokeStyle='#22444e';c.lineWidth=1;c.beginPath();c.moveTo(35,83);c.lineTo(w-35,83);c.moveTo(900,109);c.lineTo(900,331);c.stroke();
  c.fillStyle='#87acb6';c.font='22px "Segoe UI",sans-serif';c.fillText('A E T H E R     /     F O L D   D R I V E',37,51);
  c.textAlign='right';c.fillStyle=state.phase==='idle'?'#7aac9d':'#7dd5ec';c.font='19px monospace';c.fillText(state.phase==='idle'?'●  FIELD STABLE':`●  ${state.phase.toUpperCase()}  ${Math.round(state.progress*100)}%`,w-39,51);c.textAlign='left';
  c.fillStyle='#d4e9ed';c.font='500 52px "Segoe UI",sans-serif';c.fillText((state.target||state.destination).toUpperCase(),40,161,802);
  c.fillStyle='#7096a3';c.font='20px monospace';c.fillText(state.phase==='idle'?'ASTROMETRIC LOCK   /   SELECT A DESTINATION':'SPACETIME ENVELOPE   /   TRANSIT SEQUENCE',42,202);
  const labels=['CHAMBER','COHERENCE','VECTOR'],values=state.phase==='idle'?['READY','99.98%','ALIGNED']:['ACTIVE',`${(96+charge*3.98).toFixed(2)}%`,'LOCKED'];
  for(let i=0;i<3;i++){const x=42+i*265;c.fillStyle='#416571';c.font='16px monospace';c.fillText(labels[i],x,260);c.fillStyle='#b7d9de';c.font='26px monospace';c.fillText(values[i],x,299);}
  const cx=1090,cy=214,r=83;c.strokeStyle='#244751';c.lineWidth=2;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
  c.strokeStyle='#66cde8';c.lineWidth=4;c.beginPath();c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+(state.phase==='idle'?.78:Math.max(.04,state.progress))*Math.PI*2);c.stroke();
  for(let i=0;i<48;i++){const a=i*Math.PI/24;c.strokeStyle=i%4===0?'#789ca6':'#24454e';c.lineWidth=1;c.beginPath();c.moveTo(cx+Math.cos(a)*(r+10),cy+Math.sin(a)*(r+10));c.lineTo(cx+Math.cos(a)*(r+15+(i%4===0?5:0)),cy+Math.sin(a)*(r+15+(i%4===0?5:0)));c.stroke();}
  c.fillStyle='#a7d4df';c.font='25px monospace';c.textAlign='center';c.fillText(state.phase==='idle'?'ENGAGE':`${Math.round(state.progress*100)}%`,cx,223);c.textAlign='left';
  c.fillStyle='#607f8c';c.font='17px monospace';c.fillText('E',1288,171);c.fillText('TO SET',1270,209);c.fillText('COURSE',1270,239);
  c.strokeStyle='#1d3a44';c.lineWidth=1;c.beginPath();c.moveTo(40,342);c.lineTo(1497,342);c.stroke();c.strokeStyle='#4f8998';c.beginPath();for(let i=0;i<220;i++){const yy=354+Math.sin(i*.12+time*(state.reducedMotion?0:.4))*3*(.3+charge);if(i===0)c.moveTo(42+i*6,yy);else c.lineTo(42+i*6,yy);}c.stroke();
  texture.needsUpdate=true;
 }
 draw(0);
 return {globe,warpControl:command,orreryControl:orbTouch,metrics:{dynamicMeshes:9,texturePixels:1536*384},getState(){return {...state,charge,design:'split-ceramic-fold-console',dynamicMeshes:9,texturePixels:1536*384};},setWarpPresentation(snapshot:WarpPresentation){state={...snapshot};},update(dt:number,time:number,orrery:boolean){
  const target=state.phase==='idle'?0:Math.max(state.intensity,state.phase==='charging'?state.progress*.8:.35);charge=T.MathUtils.damp(charge,target,3,dt);
  chargeMat.emissiveIntensity=.16+charge*1.15;hologramMat.opacity=(orrery?.34:.2)+charge*.23;beamMat.opacity=.004+charge*.017;
  hologram.position.y=1.44+charge*.2;hologram.scale.setScalar((orrery?1.18:1)+charge*.5);projection.scale.y=1+charge*.62;
  if(!state.reducedMotion){globe.rotation.y=time*.075;route.rotation.y=Math.sin(time*.16)*.13;chargeArcs.forEach((m,i)=>{m.rotation.y=time*(.035+i*.015)*(1+charge*6)*(i%2===0?1:-1);});}
  routeLine.visible=state.phase!=='idle';route.visible=state.phase!=='idle';
  const status=state.phase+state.destination+state.target;if(time-lastRedraw>(state.phase==='idle'?2:.16)||status!==lastStatus){draw(time);lastRedraw=time;lastStatus=status;}
 }};
}

export function createPeripheralConsole(parent:T.Group,title:string,variant:number){
 const g=new T.Group();parent.add(g);
 box(g,titanium,0,.06,0,1.23,.1,.62);box(g,obsidian,0,.112,0,1.08,.025,.53);
 // Two swept side fins hold a slim desk; the open centre exposes a small service spine.
 for(const side of [-1,1]){
  const s=new T.Shape();s.moveTo(-.22,.14);s.bezierCurveTo(-.2,.47,.17,.63,.13,.91);s.lineTo(.35,1.04);s.lineTo(.42,.91);s.bezierCurveTo(.36,.59,-.015,.42,.01,.14);s.closePath();
  const geo=new T.ExtrudeGeometry(s,{depth:.095,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.016,curveSegments:18});geo.rotateY(Math.PI/2);mesh(g,geo,ceramic,side*.55-.047,0,0);
 }
 box(g,obsidian,0,.53,-.06,.24,.8,.22);box(g,titanium,0,.63,.059,.17,.33,.015);
 for(let i=0;i<6;i++)box(g,obsidian,0,.49+i*.047,.071,.13,.011,.011);
 box(g,titanium,0,.994,0,1.59,.048,.81);box(g,ceramic,0,1.028,0,1.57,.04,.79);box(g,obsidian,0,1.057,0,1.47,.018,.72);
 const face=new T.Group();face.position.set(0,1.394,-.14);face.rotation.x=-.68;g.add(face);
 box(face,titanium,0,0,0,1.445,.846,.043);box(face,obsidian,0,0,.025,1.42,.821,.022);
 const map=screenTexture(title,'LOCAL INSTRUMENT / TOUCH TO CONFIGURE',variant);mesh(face,new T.PlaneGeometry(1.394,.795),instrumentMaterial(map),0,0,.04);
 for(const side of [-1,1])box(face,ceramic,side*.729,0,0,.043,.81,.072);
 box(g,edgeMat,0,1.033,.407,1.05,.009,.009);
 for(const x of [-.49,-.19,.11]){
  disc(g,.043,.009,obsidian,x,1.071,.284);const t=mesh(g,new T.TorusGeometry(.035,.0025,4,24),edgeMat,x,1.078,.284);t.rotation.x=Math.PI/2;
 }
 const indicator=box(g,edgeMat,.53,1.075,.29,.116,.009,.041);
 return {group:g,indicator};
}
