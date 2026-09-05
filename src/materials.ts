import * as T from 'three/webgpu';
export const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`;
const loader = new T.TextureLoader();
const cache = new Map<string,T.Texture>();
export function texture(name:string, repeat=1, color=false) {
  const key=`${name}-${repeat}-${color}`;
  if(cache.has(key)) return cache.get(key)!;
  const t=loader.load(asset(name)); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(repeat,repeat);t.anisotropy=8;
  if(color)t.colorSpace=T.SRGBColorSpace; cache.set(key,t);return t;
}
export function pbr(name:string, color:number, metalness:number, repeat=1) {
  return new T.MeshPhysicalMaterial({color,metalness,roughness:.65,map:texture(`${name}_diffuse.jpg`,repeat,true),normalMap:texture(`${name}_nor_gl.jpg`,repeat),normalScale:new T.Vector2(.22,.22),roughnessMap:texture(`${name}_rough.jpg`,repeat),clearcoat:.14,clearcoatRoughness:.38});
}
// A fine woven normal field: upholstery must read as cloth, not scratched sheet metal.
function weave(){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;const image=x.createImageData(128,128);
 for(let y=0;y<128;y++)for(let xx=0;xx<128;xx++){const i=(y*128+xx)*4;image.data[i]=128+Math.sin(xx*Math.PI/2)*19;image.data[i+1]=128+Math.sin(y*Math.PI/2)*19;image.data[i+2]=252;image.data[i+3]=255;}
 x.putImageData(image,0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(12,12);t.anisotropy=8;return t;
}
const woven=weave();
export const mats={
  hull:new T.MeshPhysicalMaterial({color:0x889795,metalness:.18,roughness:.53,normalMap:texture('metal_plate_02_nor_gl.jpg',5),normalScale:new T.Vector2(.035,.035),clearcoat:.24,clearcoatRoughness:.35}),
  dark:new T.MeshPhysicalMaterial({color:0x17242a,metalness:.55,roughness:.4,clearcoat:.16,clearcoatRoughness:.4}),
  trim:new T.MeshPhysicalMaterial({color:0x87999e,metalness:.96,roughness:.3,normalMap:texture('metal_plate_02_nor_gl.jpg',3),normalScale:new T.Vector2(.025,.025)}),
  floor:pbr('metal_plate',0x667d80,.7,2),
  deck:new T.MeshPhysicalMaterial({color:0x354950,metalness:.28,roughness:.42,clearcoat:.38,clearcoatRoughness:.3,normalMap:texture('metal_plate_02_nor_gl.jpg',6),normalScale:new T.Vector2(.018,.018)}),
  blue:pbr('blue_metal_plate',0x819395,.6,1),
  fabric:new T.MeshPhysicalMaterial({color:0x445d61,roughness:.91,normalMap:woven,normalScale:new T.Vector2(.25,.25),sheen:.75,sheenColor:new T.Color(0x90b1ad),sheenRoughness:.9}),
  bedding:new T.MeshPhysicalMaterial({color:0x81938e,roughness:.97,normalMap:woven,normalScale:new T.Vector2(.23,.23),sheen:1,sheenColor:new T.Color(0xb9c5b9),sheenRoughness:.8}),
  blanket:new T.MeshPhysicalMaterial({color:0x8c674e,roughness:.95,normalMap:woven,normalScale:new T.Vector2(.3,.3),sheen:.85,sheenColor:new T.Color(0xc6a57a),sheenRoughness:.9}),
  gasket:new T.MeshStandardMaterial({color:0x101b1d,roughness:.98}),
  paper:new T.MeshStandardMaterial({color:0xc5c8b8,roughness:.95}),
  gold:new T.MeshPhysicalMaterial({color:0x877d71,metalness:.9,roughness:.32,clearcoat:.12}),
  white:new T.MeshPhysicalMaterial({color:0xbac0b4,roughness:.44,metalness:.08,clearcoat:.32,clearcoatRoughness:.22}),
  orange:new T.MeshStandardMaterial({color:0xbb793e,metalness:.45,roughness:.5}),
  black:new T.MeshStandardMaterial({color:0x050a0c,roughness:.65}),
  cyan:new T.MeshStandardMaterial({color:0x74d9e6,emissive:0x4ab1d1,emissiveIntensity:1.3,metalness:.1,roughness:.3}),
  warm:new T.MeshStandardMaterial({color:0xffedc6,emissive:0xffdbac,emissiveIntensity:1.2,roughness:.4}),
  green:new T.MeshStandardMaterial({color:0x70c794,emissive:0x329d6c,emissiveIntensity:.9,roughness:.5}),
  glass:new T.MeshPhysicalMaterial({color:0x91c3d5,metalness:0,roughness:.18,transparent:true,opacity:.018,specularIntensity:.15,envMapIntensity:.12,depthWrite:false,side:T.DoubleSide}),
  instrumentGlass:new T.MeshPhysicalMaterial({color:0xc8e5df,metalness:0,roughness:.045,transmission:.92,thickness:.08,ior:1.46,transparent:true,opacity:.35,depthWrite:false}),
};
export function screenTexture(title:string, sub:string, variant=0){
  const c=document.createElement('canvas'); c.width=1024;c.height=600;const x=c.getContext('2d')!;
  const ink='#c3dde3',muted='#608d9c',line='#234651',blue='#69c7df';
  x.fillStyle='#041117';x.fillRect(0,0,1024,600);
  x.strokeStyle=line;x.lineWidth=1;x.beginPath();x.moveTo(32,100);x.lineTo(992,100);x.moveTo(32,525);x.lineTo(992,525);x.moveTo(666,124);x.lineTo(666,500);x.stroke();
  x.strokeStyle=blue;x.lineWidth=1.4;x.beginPath();x.arc(47,44,12,0,Math.PI*2);x.ellipse(47,44,18,6,-.65,0,Math.PI*2);x.stroke();
  x.fillStyle=muted;x.font='16px "Segoe UI",sans-serif';x.fillText('A E T H E R   /   I N S T R U M E N T S',82,49);
  x.font='500 25px "Segoe UI",sans-serif';x.fillStyle=ink;x.fillText(title,33,83,925);
  x.fillStyle='#7fa89c';x.font='13px monospace';x.textAlign='right';x.fillText('●  NOMINAL',988,47);x.textAlign='left';
  function label(text:string,xx:number,y:number){x.font='14px monospace';x.fillStyle=muted;x.fillText(text,xx,y);}
  function metric(name:string,value:string,unit:string,yy:number){label(name,703,yy);x.fillStyle=ink;x.font='300 42px "Segoe UI",sans-serif';x.fillText(value,702,yy+46);x.fillStyle=muted;x.font='15px monospace';x.fillText(unit,873,yy+45);}
  function trace(xx:number,yy:number,w:number,h:number,seed:number){x.strokeStyle='#193842';x.lineWidth=1;for(let i=0;i<5;i++){x.beginPath();x.moveTo(xx,yy+i*h/4);x.lineTo(xx+w,yy+i*h/4);x.stroke();}x.strokeStyle=blue;x.lineWidth=1.6;x.beginPath();for(let i=0;i<=w;i++){const v=yy+h*.52+Math.sin(i*.037+seed)*h*.22+Math.sin(i*.102+seed)*h*.065;i===0?x.moveTo(xx+i,v):x.lineTo(xx+i,v);}x.stroke();}
  function dial(cx:number,cy:number,r:number,value:number){
   for(let i=0;i<72;i++){const a=i/72*Math.PI*2-Math.PI/2;x.strokeStyle=i/72<value?blue:line;x.lineWidth=i%6===0?2:1;x.beginPath();x.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);x.lineTo(cx+Math.cos(a)*(r+(i%6===0?12:5)),cy+Math.sin(a)*(r+(i%6===0?12:5)));x.stroke();}
   x.strokeStyle=line;x.lineWidth=1;x.beginPath();x.arc(cx,cy,r-18,0,Math.PI*2);x.arc(cx,cy,r-23,0,Math.PI*2);x.stroke();x.strokeStyle=blue;x.lineWidth=2.5;x.beginPath();x.arc(cx,cy,r-10,-Math.PI/2,-Math.PI/2+value*Math.PI*2);x.stroke();
  }
  if(/NAVIGATION|SOLUTION/.test(title)||variant%3===0){
   label('LOCAL CELESTIAL FRAME',38,143);const cx=339,cy=319;dial(cx,cy,138,.84);
   x.strokeStyle='#346675';x.lineWidth=1;for(let i=-2;i<=2;i++){x.beginPath();x.ellipse(cx,cy+i*25,103,Math.sqrt(1-i*i/9)*27,0,0,Math.PI*2);x.stroke();}for(let i=0;i<4;i++){x.beginPath();x.ellipse(cx,cy,103*Math.cos(i*Math.PI/8),103,0,0,Math.PI*2);x.stroke();}
   x.strokeStyle='#98dce7';x.lineWidth=1.5;x.beginPath();x.ellipse(cx,cy,165,59,-.48,0,Math.PI*2);x.stroke();
   x.fillStyle=ink;x.beginPath();x.arc(cx+141,cy-60,4,0,Math.PI*2);x.fill();label('N  +51.64°',41,199);label('SOL-03',43,440);label('LOCKED',505,463);
   metric('ORBITAL ALTITUDE','408.2','KM',151);metric('INCLINATION','51.64','DEG',274);metric('EPHEMERIS','00:14','UTC+',397);
  }else if(/SHUTTER|WINDOW/.test(title)){
   label('PANORAMIC RADIATION SHIELD',38,143);
   for(let i=0;i<5;i++){const xx=66+i*107;x.strokeStyle='#467583';x.lineWidth=1.5;x.beginPath();x.roundRect(xx,198,87,190,8);x.stroke();x.fillStyle='#0a2632';x.fillRect(xx+6,205,75,162);x.strokeStyle='#438297';x.beginPath();x.arc(xx+44,402,115,-2.04,-1.1);x.stroke();label(`0${i+1}`,xx+28,419);x.fillStyle='#69ab9c';x.fillRect(xx+28,445,30,3);}
   metric('OPTICAL TRANSMISSION','98.4','%',151);metric('WINDOW TEMPERATURE','21.2','°C',274);metric('DOSE RATE','0.02','mSv',397);
  }else if(/REACTOR|GRAVITY|LIGHTING/.test(title)){
   label(/GRAVITY/.test(title)?'INERTIAL REFERENCE FIELD':/LIGHTING/.test(title)?'CIRCADIAN LIGHTING PROFILE':'CONTAINMENT FIELD / CORE A',38,143);dial(323,304,125,.96);
   x.textAlign='center';x.fillStyle=ink;x.font='300 55px "Segoe UI",sans-serif';x.fillText(/GRAVITY/.test(title)?'1.000':/LIGHTING/.test(title)?'4200':'96.0',323,315);x.font='15px monospace';x.fillStyle=muted;x.fillText(/GRAVITY/.test(title)?'STANDARD G':/LIGHTING/.test(title)?'KELVIN':'MW / NOMINAL',323,346);x.textAlign='left';trace(92,461,475,28,variant);
   metric('PRIMARY CIRCUIT','ONLINE','',151);metric('FIELD STABILITY','99.98','%',274);metric('THERMAL LOAD','38.6','°C',397);
  }else if(/SOLAR/.test(title)){
   label('PHOTOVOLTAIC ARRAY / SUN TRACK',38,143);
   for(let a=0;a<2;a++)for(let i=0;i<6;i++)for(let j=0;j<3;j++){x.fillStyle='#163846';x.fillRect(67+a*303+i*38,220+j*53,32,46);x.strokeStyle='#548897';x.strokeRect(67+a*303+i*38,220+j*53,32,46);}
   x.strokeStyle=blue;x.lineWidth=2;x.beginPath();x.moveTo(297,277);x.lineTo(372,277);x.stroke();trace(90,432,477,42,4);
   metric('SOLAR INCIDENCE','00.18','DEG',151);metric('ARRAY OUTPUT','67.2','kW',274);metric('EFFICIENCY','32.8','%',397);
  }else{
   label('LIVE ENVIRONMENTAL TELEMETRY',38,143);
   for(let j=0;j<3;j++){label(['OXYGEN PARTIAL PRESSURE','CARBON DIOXIDE UPTAKE','PHOTON FLUX DENSITY'][j],43,188+j*101);trace(44,204+j*101,563,53,j+variant);}
   metric('OXYGEN','21.0','%',151);metric('CARBON DIOXIDE','410','PPM',274);metric('RECOVERY RATE','98.6','%',397);
  }
  label(sub,34,554);x.font='12px monospace';x.fillStyle='#315763';x.fillText('REV 07.4     SECURE LOCAL CONTROL     //     ALL CHANNELS SYNCHRONIZED',34,579);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t;
}
export function labelTexture(text:string, sub='', color='#b5c9c7'){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d')!;
 x.fillStyle='#122027';x.fillRect(0,0,1024,256);x.fillStyle=color;x.font='500 79px Arial';x.fillText(text,45,119);x.font='24px monospace';x.fillStyle='#819fa4';x.fillText(sub,48,184);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
