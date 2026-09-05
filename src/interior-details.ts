import * as T from 'three/webgpu';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mats as M, labelTexture, screenTexture } from './materials';

// All small fixed components are added to the existing material batches.
// Only the three crop beds and the planetarium remain separately animated.
export function createCraftedDetails(statics:T.Group,dynamics:T.Group){
 const cube=new RoundedBoxGeometry(1,1,1,1,.04),softCube=new RoundedBoxGeometry(1,1,1,2,.095),thinCube=new T.BoxGeometry(1,1,1);
 const boltGeo=new T.CylinderGeometry(.018,.018,.016,6);
 function box(mat:T.Material,p:number[],s:number[],parent:T.Group=statics){const soft=mat===M.fabric||mat===M.bedding||mat===M.blanket;const geo=soft?softCube:Math.min(...s)<.035?thinCube:cube;const m=new T.Mesh(geo,mat);m.position.set(...p as [number,number,number]);m.scale.set(...s as [number,number,number]);parent.add(m);return m;}
 function cylinder(mat:T.Material,p:number[],r:number,h:number,parent:T.Group=statics,sides=16){const m=new T.Mesh(new T.CylinderGeometry(r,r,h,sides),mat);m.position.set(...p as [number,number,number]);parent.add(m);return m;}
 function rod(mat:T.Material,a:number[],b:number[],r=.015,parent:T.Group=statics){const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const m=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),7),mat);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());parent.add(m);return m;}
 function tube(mat:T.Material,points:number[][],r:number,parent:T.Group=statics){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const m=new T.Mesh(new T.TubeGeometry(curve,18,r,6,false),mat);parent.add(m);return m;}
 function ring(mat:T.Material,p:number[],r:number,t:number,parent:T.Group=statics){const m=new T.Mesh(new T.TorusGeometry(r,t,6,40),mat);m.position.set(...p as [number,number,number]);parent.add(m);return m;}
 function bolt(x:number,y:number,z:number,ry=0,parent:T.Group=statics){const m=new T.Mesh(boltGeo,M.trim);m.position.set(x,y,z);m.rotation.set(Math.PI/2,0,ry);parent.add(m);}
 function placard(x:number,y:number,z:number,w:number,title:string,sub:string,ry=0,parent:T.Group=statics){const mat=new T.MeshBasicMaterial({map:labelTexture(title,sub),toneMapped:false});const m=new T.Mesh(new T.PlaneGeometry(w,w/4),mat);m.position.set(x,y,z);m.rotation.y=ry;parent.add(m);return m;}
 function display(p:number[],w:number,title:string,sub:string,ry=0,parent:T.Group=statics){const g=new T.Group();g.position.set(...p as [number,number,number]);g.rotation.y=ry;parent.add(g);box(M.gasket,[0,0,-.022],[w+.09,w*.625+.09,.075],g);const m=new T.Mesh(new T.PlaneGeometry(w,w*.625),new T.MeshBasicMaterial({map:screenTexture(title,sub,2),toneMapped:false}));m.position.z=.025;g.add(m);return g;}
 function handle(x:number,y:number,z:number,w:number,parent:T.Group=statics){rod(M.trim,[x-w/2,y,z],[x+w/2,y,z],.017,parent);rod(M.trim,[x-w/2,y,z],[x-w/2,y,z-.055],.017,parent);rod(M.trim,[x+w/2,y,z],[x+w/2,y,z-.055],.017,parent);}
 function lampHead(p:number[],ry=0){const g=new T.Group();g.position.set(...p as [number,number,number]);g.rotation.y=ry;statics.add(g);box(M.dark,[0,0,0],[.38,.15,.3],g);box(M.warm,[0,-.076,0],[.3,.018,.21],g);return g;}
 function tumbler(x:number,y:number,z:number){cylinder(M.white,[x,y+.11,z],.085,.22);cylinder(M.black,[x,y+.223,z],.068,.008);ring(M.white,[x+.077,y+.105,z],.064,.017);}
 function book(p:number[],s:number[],color=0){const m=box([M.fabric,M.blanket,M.blue][color],p,s);box(M.paper,[p[0],p[1]+.012,p[2]+s[2]*.48],[s[0]*.89,s[1]*.68,.014]);return m;}
 const quiltMat=M.blanket.clone();quiltMat.side=T.DoubleSide;
 const pillowGeo=new T.SphereGeometry(1,36,20);
 // A quilt is a thin draped surface, including a rounded turn over the bunk edge.
 function clothPoint(u:number,v:number,y:number,z:number,seed:number){
  const front=u<.22,top=T.MathUtils.clamp((u-.22)/.78,0,1),angle=u/.22*Math.PI/2;
  let xx=front?13.425+.09*(1-Math.cos(angle)):13.515+top*1.07;
  let yy=front?y-.245+.47*Math.sin(angle):y+.225;
  const edge=Math.sin(Math.PI*v),wave=Math.sin(v*Math.PI*7+u*4.1+seed);
  if(front){xx+=wave*.021*(1-u/.22);yy-=edge*.025;}
  else{yy+=wave*.022*Math.sin(Math.PI*top)+Math.sin(top*14+v*3+seed)*.014*edge;
   yy+=.022*Math.exp(-Math.pow((top-.89)/.055,2));}
  return new T.Vector3(xx,yy,z+(v-.5)*1.91+.009*Math.sin(u*10+seed)*edge);
 }
 function quilt(y:number,z:number,seed:number){
  const pos:number[]=[],uv:number[]=[],indices:number[]=[],cols=32,rows=36;
  for(let v=0;v<=rows;v++)for(let u=0;u<=cols;u++){const p=clothPoint(u/cols,v/rows,y,z,seed);pos.push(p.x,p.y,p.z);uv.push(u/cols,v/rows);}
  for(let v=0;v<rows;v++)for(let u=0;u<cols;u++){const a=v*(cols+1)+u;indices.push(a,a+cols+1,a+1,a+1,a+cols+1,a+cols+2);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();statics.add(new T.Mesh(geo,quiltMat));
  // Fine tonal stitching follows the folds instead of floating in straight lines.
  for(let j=1;j<9;j++){const vv=j/9,points:number[][]=[];for(let k=0;k<=24;k++){const p=clothPoint(k/24,vv,y,z,seed);p.y+=.003;points.push(p.toArray());}tube(M.fabric,points,.0016);}
  for(const vv of [.018,.982]){const points:number[][]=[];for(let k=0;k<=24;k++){const p=clothPoint(k/24,vv,y,z,seed);p.y+=.003;points.push(p.toArray());}tube(M.blanket,points,.003);}
 }
 function pillow(y:number,z:number,seed:number){
  const geo=pillowGeo.clone(),p=geo.getAttribute('position');
  for(let i=0;i<p.count;i++){
   const sx=p.getX(i),sy=p.getY(i),sz=p.getZ(i);
   // Superellipsoid proportions give a plump rectangle and curved corner seams.
   const nx=Math.sign(sx)*Math.pow(Math.abs(sx),.54),nz=Math.sign(sz)*Math.pow(Math.abs(sz),.54);
   p.setXYZ(i,nx*.33,sy*.11-.018*Math.sin(nz*8+seed)*Math.pow(Math.abs(nx),4),nz*.57);
  }
  geo.computeVertexNormals();const m=new T.Mesh(geo,M.bedding);m.position.set(15.1,y+.265,z);m.rotation.set(.035,-.055,-.06);statics.add(m);
 }

 // Window seals, insulated lower panels and slender hand rails avoid covering the sky.
 for(let x=-7.5;x<=7.5;x+=3){
  for(const dx of [-.05,.06])box(M.gasket,[x+dx,2.62,-6.73],[.018,4.42,.028]);
  for(let y=1.16;y<4.7;y+=.72){bolt(x, y,-6.685);}
 }
 for(let x=-6.6;x<7;x+=2.2){
  box(M.hull,[x,.44,-6.51],[2.02,.55,.045]);
  for(const dx of [-.88,.88])for(const y of [.23,.64])bolt(x+dx,y,-6.476);
 }
 for(const side of [-1,1]){
  for(let z=-5.5;z<.5;z+=1.5){box(M.gasket,[side*7.7,2.5,z],[.022,3.7,.024]);}
  // Soft, individual seat cushions with piping, separate back pads and harness clips.
  for(let i=0;i<3;i++){
   const x=side*5.7-.83+i*.83;
   box(M.fabric,[x,.72,2.67],[.76,.14,.91]);box(M.fabric,[x,1.09,3.015],[.76,.69,.14]);
   for(const xx of [x-.35,x+.35])rod(M.bedding,[xx,.793,2.29],[xx,.793,3.07],.006);
   box(M.gasket,[x+.23,1.04,2.93],[.038,.6,.025]);box(M.trim,[x+.23,.8,2.91],[.067,.075,.03]);
  }
  box(M.dark,[side*7.57,1.5,4.7],[.16,1.15,.7]);
  for(let zz=4.47;zz<5;zz+=.12)box(M.trim,[side*7.47,1.5,zz],[.035,.89,.036]);
 }
 placard(0,1.04,-6.49,1.45,'EARTHSIDE','PANORAMA / RADIATION SHIELD OPEN');
 // The navigation instrument is authored separately in command-console.ts.
 // Pressure manifold, access panels and bundled wiring down the transit spine.
 for(const side of [-1,1])for(let z=9.3;z<30;z+=5.2){
  if(z>17&&z<23)continue;
  const g=new T.Group();g.position.set(side*1.96,0,z);g.rotation.y=-side*Math.PI/2;statics.add(g);
  box(M.hull,[0,2.72,0],[1.28,.68,.055],g);
  for(const x of [-.53,.53])for(const y of [2.45,2.98])bolt(x,y,.04,0,g);
  for(let j=0;j<3;j++){
   const x=-.4+j*.39;ring(M.trim,[x,2.77,.085],.115,.024,g);cylinder(M.black,[x,2.77,.05],.104,.018,g).rotation.x=Math.PI/2;
   rod(M.orange,[x,2.77,.075],[x+.05,2.81,.075],.005,g);
  }
  box(M.gold,[0,2.43,.072],[.99,.055,.055],g);placard(0,2.2,.05,.92,'101.3 kPa','PRESSURE NOMINAL',0,g);
  for(let j=0;j<3;j++)rod(j===2?M.orange:M.gasket,[-.6,3.28+j*.07,.02],[.6,3.28+j*.07,.02],.023,g);
  for(const x of [-.43,.42])box(M.trim,[x,3.37,.02],[.05,.3,.072],g);
 }
 for(let z=8;z<31;z+=3.25){
  // Alternating, legible floor direction marks and recessed floor drain frames.
  for(const x of [-.8,.8])box(M.orange,[x,.045,z],[.28,.007,.045]);
  box(M.gasket,[0,.042,z+1.45],[1.5,.008,.22]);
  for(let i=0;i<12;i++)box(M.trim,[-.66+i*.12,.05,z+1.45],[.055,.009,.19]);
 }
 // Habitat: each bunk has folded cloth, piping, reading light and personal cubby.
 for(let z=18;z<=24;z+=3)for(const y of [.55,1.85]){
  box(M.bedding,[14.57,y+.107,z],[2.08,.16,2.05]);
  quilt(y,z+.08,z*.31+y);pillow(y,z,z*.27);
  box(M.gasket,[15.72,y+.55,z],[.04,.6,1.1]);
  box(M.trim,[15.68,y+.36,z+.67],[.07,.27,.48]);
  book([15.51,y+.4,z+.64],[.28,.055,.33],Math.round(z+y)%3);
  lampHead([15.48,y+.8,z-.77],Math.PI/2);
  rod(M.trim,[15.7,y+.62,z-.77],[15.47,y+.78,z-.77],.026);
  box(M.black,[13.36,y+.15,z-.99],[.075,.15,.22]);box(M.cyan,[13.317,y+.19,z-1],[.013,.033,.08]);
 }
 // Crew keeps a few imperfectly placed possessions; no collision changes in the aisle.
 book([6.35,1.17,20.63],[.47,.055,.63],0).rotation.y=-.12;
 box(M.paper,[6.48,1.157,21.1],[.43,.012,.28]).rotation.y=.12;
 box(M.dark,[7.79,1.2,20.71],[.42,.09,.29]).rotation.y=-.28;
 for(let k=0;k<3;k++)box(M.orange,[7.22+k*.11,1.18,21.37],[.052,.022,.29]).rotation.y=.2;
 tumbler(7.45,1.105,20.68);
 for(const z of [19.7,22.3])for(let x=6;x<=8;x+=.5){
  rod(M.bedding,[x,.708,z-.29],[x,.708,z+.29],.005);
 }
 // Galley countertop, drawers, water dispenser, espresso machine and sink.
 for(let x=4.5;x<12;x+=1.4){
  for(const yy of [.42,.82]){box(M.hull,[x,yy,24.884],[1.09,.31,.04]);handle(x,yy+.035,24.831,.35);}
  for(const xx of [x-.5,x+.5])bolt(xx,1.61,24.884);
  box(M.gasket,[x,2.142,25.25],[1.26,.016,1.02]);
 }
 const galley=new T.Group();galley.position.set(9.8,2.18,25.1);galley.rotation.y=Math.PI;statics.add(galley);
 box(M.trim,[0,.34,0],[.7,.67,.44],galley);box(M.black,[0,.23,.238],[.58,.37,.021],galley);
 box(M.trim,[0,.08,.31],[.57,.06,.25],galley);box(M.orange,[.21,.56,.23],[.07,.07,.022],galley);
 cylinder(M.black,[-.16,.51,.23],.06,.22,galley).rotation.x=Math.PI/2;
 cylinder(M.white,[-.08,.19,.31],.072,.18,galley);box(M.cyan,[0,.55,.23],[.25,.09,.013],galley);
 box(M.trim,[6.3,2.18,25.24],[.74,.047,.64]);box(M.black,[6.3,2.206,25.24],[.63,.018,.53]);
 tube(M.trim,[[6.3,2.2,25.63],[6.3,2.56,25.63],[6.3,2.66,25.3],[6.3,2.52,25.22]],.025);
 for(const x of [6.09,6.51])cylinder(M.trim,[x,2.225,25.59],.044,.07);
 for(let i=0;i<4;i++){cylinder(M.white,[11.2,2.18+i*.023,25.2],.23,.018);}
 box(M.hull,[4.47,2.49,25.2],[.56,.64,.5]);box(M.black,[4.47,2.5,24.939],[.34,.32,.022]);
 box(M.cyan,[4.47,2.69,24.922],[.22,.028,.012]);tube(M.trim,[[4.47,2.47,24.92],[4.47,2.45,24.77],[4.47,2.39,24.77]],.018);
 placard(11.1,2.95,25.83,1.6,'CREW / 06','MESS 02  /  WATER RECOVERY 98.6%',Math.PI);
 // Small suit lockers and luggage at the back wall, kept out of spawn and door routes.
 for(let x=8.8;x<12.8;x+=1.3){
  box(M.hull,[x,1.15,16.5],[1.15,2.2,.56]);box(M.gasket,[x,1.21,16.795],[.96,1.97,.025]);
  box(M.hull,[x,1.22,16.817],[.92,1.92,.044]);handle(x+.32,1.18,16.876,.14);
  for(let j=0;j<5;j++)box(M.dark,[x,1.92+j*.055,16.847],[.6,.018,.013]);
  box(M.blue,[x,.21,17.02],[.84,.4,.41]);box(M.gasket,[x,.24,17.236],[.07,.37,.023]);
 }
 // Laboratory instruments: microscope, centrifuge, storage and pipette holder.
 box(M.white,[-8.72,1.14,20.15],[.56,.09,.52]);rod(M.trim,[-8.92,1.2,20.26],[-8.92,1.72,20.26],.062);
 tube(M.white,[[-8.92,1.72,20.26],[-8.9,1.92,20.1],[-8.63,1.92,19.92]],.071);
 rod(M.black,[-8.64,1.89,19.97],[-8.55,2.02,19.91],.05);
 box(M.black,[-8.73,1.52,20.06],[.46,.04,.4]);cylinder(M.trim,[-8.73,1.71,20.06],.08,.19);
 cylinder(M.instrumentGlass,[-8.73,1.55,20.04],.07,.018);
 cylinder(M.white,[-7.1,1.35,20.16],.32,.44);cylinder(M.black,[-7.1,1.575,20.16],.28,.018);
 cylinder(M.instrumentGlass,[-7.1,1.59,20.16],.265,.025);box(M.cyan,[-7.1,1.35,20.485],[.18,.07,.02]);
 box(M.trim,[-7.7,1.22,25],[.42,.1,.22]);
 for(let i=0;i<4;i++){rod(M.white,[-7.83+i*.09,1.27,25],[-7.83+i*.09,1.75,25],.019);cylinder(M.orange,[-7.83+i*.09,1.67,25],.027,.06);}
 for(let x=-11;x<-5;x+=2){
  for(const xx of [x-.63,x+.63])handle(xx,.58,24.397,.2);
  for(let j=0;j<5;j++){box(M.white,[x-.6+j*.25,1.33,25.065],[.035,.07,.012]);}
 }
 display([-12.93,1.59,18.2],.76,'BIOSPHERE','GROWTH CYCLE / PHOTON FLUX',Math.PI/2);
 box(M.dark,[-13.03,.64,18.2],[.13,1.25,.2]);box(M.trim,[-13.03,.08,18.2],[.35,.16,.58]);
 rod(M.trim,[-13.03,1.17,18.2],[-12.93,1.48,18.2],.045);
 box(M.dark,[-12.89,1.15,18.2],[.12,.16,.66]);box(M.green,[-12.802,1.17,18.2],[.03,.09,.21]);
 // Reservoir hoses and complete tray plumbing on the station-side edge of each bed.
 for(let z=18;z<=24;z+=3){
  for(let j=0;j<4;j++){
   tube(j===3?M.orange:M.gasket,[[-15.28+j*.35,1.19,z-1.03],[-15.28+j*.35,1.08,z-1.27],[-13.83,.94,z-1.27],[-13.83,.43,z-1.05]],.018);
  }
  box(M.hull,[-13.99,.55,z],[.1,.69,2.4]);
  for(let j=0;j<6;j++){box(M.black,[-13.928,.57,z-.98+j*.39],[.02,.42,.032]);}
  for(const dz of [-1.17,1.17]){box(M.dark,[-14.7,2.82,z+dz],[1.6,.09,.21]);box(M.warm,[-14.7,2.769,z+dz],[1.42,.018,.13]);}
 }
 // Engineering: flanged coolant lines, rotary valve wheels and braided service loops.
 for(const side of [-1,1]){
  for(let j=0;j<3;j++){
   const x=side*(3.2+j*.33);
   tube(j===1?M.gold:M.trim,[[x,.18,45.3],[x,5.57,45.3],[x,5.8,43.8],[x,5.8,38.4]],.075);
   for(const yy of [.55,2.3,4.3]){cylinder(M.trim,[x,yy,45.3],.14,.08);cylinder(M.dark,[x,yy+.055,45.3],.11,.045);}
  }
  for(let z=34;z<46;z+=2.7){
   const x=side*5.55;
   for(const y of [.66,1.8,2.93])for(const zz of [z-1,z+1]){const b=new T.Mesh(boltGeo,M.trim);b.rotation.z=Math.PI/2;b.position.set(x,y,zz);statics.add(b);}
   tube(M.gasket,[[side*5.63,3.15,z-.85],[side*5.3,3.5,z-.7],[side*5.18,3.28,z+.72],[side*5.63,3.12,z+.8]],.045);
   for(let j=0;j<4;j++)box(M.orange,[side*5.565,.4+j*.65,z+.8],[.025,.1,.07]);
  }
  const wheel=ring(M.orange,[side*3.2,2.24,45.03],.24,.028);
  for(let a=0;a<4;a++){const angle=a*Math.PI/2;rod(M.orange,[side*3.2,2.24,45.03],[side*3.2+Math.cos(angle)*.21,2.24+Math.sin(angle)*.21,45.03],.016);}
  wheel.rotation.z=.17;
  for(let z=38;z<=42;z+=.8)box(M.orange,[side*2.18,.028,z],[.15,.013,.4]).rotation.y=side*.55;
 }
 for(let a=0;a<8;a++){
  const angle=a*Math.PI/4,x=Math.cos(angle)*1.64,z=40+Math.sin(angle)*1.64;
  for(const y of [.85,2.15,3.45,4.75]){const g=new T.Group();g.position.set(x,y,z);g.rotation.y=Math.PI/2-angle;statics.add(g);box(M.dark,[0,0,0],[.34,.34,.15],g);box(M.gold,[0,0,.085],[.24,.23,.05],g);for(const xx of [-.13,.13])bolt(xx,0,.09,0,g);}
 }

 // Broad, subtly cupped leaves with true tapered silhouettes and central veins.
 const leafmat=new T.MeshPhysicalMaterial({color:0x436f31,roughness:.73,side:T.DoubleSide,sheen:.3,sheenColor:new T.Color(0x829e45),sheenRoughness:.8});
 const stemmat=new T.MeshStandardMaterial({color:0x42683b,roughness:.9});
 function leafGeometry(){
  const p:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let y=0;y<=9;y++)for(let x=0;x<=4;x++){const v=y/9,u=x/4,w=Math.sin(Math.PI*v)*.105;p.push((u-.5)*w*2,v*.42,Math.sin(v*Math.PI)*.045+(Math.abs(u-.5)*.033));uv.push(u,v);}
  for(let y=0;y<9;y++)for(let x=0;x<4;x++){const a=y*5+x;indices.push(a,a+1,a+5,a+1,a+6,a+5);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
 }
 const leafGeo=leafGeometry(),crops:T.Group[]=[];
 for(let z=18;z<=24;z+=3){
  const bed=new T.Group();bed.position.set(-14.7,1.2,z);dynamics.add(bed);crops.push(bed);
  const branch=new T.Group();
  for(let a=0;a<3;a++)for(let b=0;b<4;b++){
   const x=-.5+a*.49,zz=-1+b*.63;
   cylinder(M.black,[-14.7+x,1.155,z+zz],.145,.18);
   rod(stemmat,[x,0,zz],[x,.57,zz],.012,branch);
   for(let i=0;i<8;i++){
    const angle=i*2.399+a*.47+b*.8;const y=.075+i*.047;
    const m=new T.Mesh(leafGeo,leafmat);m.position.set(x,y,zz);m.rotation.set(.8+Math.sin(i)*.13,angle,.22);m.scale.setScalar(.75+(i%3)*.1);branch.add(m);
    rod(stemmat,[x,y,zz],[x+Math.sin(angle)*.2,y+.2,zz+Math.cos(angle)*.2],.003,branch);
   }
  }
  branch.updateMatrixWorld(true);const batches=new Map<T.Material,T.BufferGeometry[]>();branch.traverse(o=>{if(o instanceof T.Mesh){let g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(g.index)g=g.toNonIndexed();const list=batches.get(o.material)||[];list.push(g);batches.set(o.material,list);}});
  for(const [mat,geos]of batches){const merged=mergeGeometries(geos)!;const mesh=new T.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;bed.add(mesh);geos.forEach(g=>g.dispose());}
 }
 const growLights=new T.Group();dynamics.add(growLights);
 const growMat=new T.MeshStandardMaterial({color:0xbad687,emissive:0x759d44,emissiveIntensity:.2});
 for(let z=18;z<=24;z+=3)for(const dz of [-1.17,1.17])box(growMat,[-14.7,2.756,z+dz],[1.3,.015,.07],growLights);
 // Fully spatial planetarium: orbit trails, six planets and a Saturn-like ring.
 const planetarium=new T.Group();planetarium.position.set(0,1.67,-2.1);dynamics.add(planetarium);
 const trail=new T.MeshBasicMaterial({color:0x55aabd,transparent:true,opacity:.25,depthWrite:false});
 const planetColors=[0xdfad7b,0xecd0a0,0x5fbac8,0xc87951,0xd3b499,0xb5d1d7];
 const planets:T.Group[]=[];
 for(let i=0;i<6;i++){
  const radius=.5+i*.29;const orbit=ring(trail,[0,0,0],radius,.004,planetarium);orbit.rotation.x=Math.PI/2;orbit.rotation.y=.08*i;
  const orbital=new T.Group();planetarium.add(orbital);planets.push(orbital);
  const m=new T.Mesh(new T.SphereGeometry(.035+i*.012,16,10),new T.MeshStandardMaterial({color:planetColors[i],emissive:planetColors[i],emissiveIntensity:.55,roughness:.5}));m.position.x=radius;orbital.add(m);
  if(i===4){const t=ring(trail,[radius,0,0],.13,.014,orbital);t.rotation.x=1.2;}
 }
 let growth=0,expansion=0;
 return {update(dt:number,time:number,biosphere:boolean,orrery:boolean){
  growth=T.MathUtils.damp(growth,biosphere?1:0,.65,dt);crops.forEach((crop,i)=>{crop.scale.y=.74+growth*.65;crop.rotation.y=Math.sin(time*.8+i)*.011;});
  growMat.emissiveIntensity=.12+growth*2.1;
  expansion=T.MathUtils.damp(expansion,orrery?1:0,2.5,dt);planetarium.visible=expansion>.008;planetarium.scale.setScalar(Math.max(.01,expansion));planetarium.rotation.z=Math.sin(time*.12)*.075;
  planets.forEach((p,i)=>{p.rotation.y=time*(.2-i*.023)+i*1.3;});
 }};
}
