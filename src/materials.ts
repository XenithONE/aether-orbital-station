import * as T from 'three';
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
  return new T.MeshStandardMaterial({color,metalness,roughness:.7,map:texture(`${name}_diffuse.jpg`,repeat,true),normalMap:texture(`${name}_nor_gl.jpg`,repeat),normalScale:new T.Vector2(.4,.4),roughnessMap:texture(`${name}_rough.jpg`,repeat)});
}
export const mats={
  hull:new T.MeshStandardMaterial({color:0xa9b2b0,metalness:.32,roughness:.7,normalMap:texture('metal_plate_02_nor_gl.jpg',5),normalScale:new T.Vector2(.065,.065)}),
  dark:new T.MeshStandardMaterial({color:0x182730,metalness:.72,roughness:.4}),
  trim:new T.MeshStandardMaterial({color:0x63747b,metalness:.9,roughness:.28}),
  floor:pbr('metal_plate',0x80999e,.65,2),
  blue:pbr('blue_metal_plate',0x819395,.6,1),
  fabric:new T.MeshStandardMaterial({color:0x5b7375,roughness:.95,normalMap:texture('metal_plate_02_nor_gl.jpg',4),normalScale:new T.Vector2(.2,.2)}),
  white:new T.MeshStandardMaterial({color:0xd1cfbf,roughness:.65,metalness:.15}),
  orange:new T.MeshStandardMaterial({color:0xbb793e,metalness:.45,roughness:.5}),
  black:new T.MeshStandardMaterial({color:0x050a0c,roughness:.65}),
  cyan:new T.MeshStandardMaterial({color:0x74d9e6,emissive:0x4ab1d1,emissiveIntensity:2.4,metalness:.1,roughness:.3}),
  warm:new T.MeshStandardMaterial({color:0xffedc6,emissive:0xffdbac,emissiveIntensity:2,roughness:.4}),
  green:new T.MeshStandardMaterial({color:0x70c794,emissive:0x329d6c,emissiveIntensity:1.7,roughness:.5}),
  glass:new T.MeshPhysicalMaterial({color:0x91c3d5,metalness:0,roughness:.18,transparent:true,opacity:.018,specularIntensity:.15,envMapIntensity:.12,depthWrite:false,side:T.DoubleSide}),
};
export function screenTexture(title:string, sub:string, variant=0){
  const c=document.createElement('canvas'); c.width=512;c.height=320;const x=c.getContext('2d')!;
  x.fillStyle='#06181d';x.fillRect(0,0,512,320);x.strokeStyle='#24444b';x.lineWidth=1;
  for(let i=0;i<512;i+=32){x.beginPath();x.moveTo(i,65);x.lineTo(i,285);x.stroke();}
  for(let i=65;i<285;i+=32){x.beginPath();x.moveTo(0,i);x.lineTo(512,i);x.stroke();}
  x.fillStyle='#91dbd6';x.font='bold 23px monospace';x.fillText(title,24,39);
  x.fillStyle='#51767d';x.font='12px monospace';x.fillText('AETHER  /  SYSTEMS INTERFACE',24,61);
  x.fillStyle='#92b7bd';x.font='15px monospace';x.fillText(sub,24,299);
  if(variant%3===0){
    x.strokeStyle='#8bded2';x.lineWidth=2;x.beginPath();x.ellipse(258,168,117,75,-.28,0,Math.PI*2);x.stroke();
    x.beginPath();x.ellipse(258,168,75,75,0,0,Math.PI*2);x.stroke();
    x.fillStyle='#ffcc88';x.beginPath();x.arc(360,124,5,0,7);x.fill();
    x.fillStyle='#73afbb';x.font='12px monospace';x.fillText('ALT  408.2 KM',26,107);x.fillText('INC  51.6 DEG',335,259);
  } else if(variant%3===1){
    for(let i=0;i<6;i++){x.fillStyle='#416069';x.fillRect(30,93+i*27,270,9);x.fillStyle=i===4?'#d4ac70':'#7ccfc1';x.fillRect(30,93+i*27,100+((i*41)%160),9);x.font='14px monospace';x.fillText(`${[98,72,94,86,61,99][i]} %`,355,102+i*27);}
  } else{
    for(let j=0;j<3;j++){x.strokeStyle=['#76ccc3','#d5b282','#718daa'][j];x.beginPath();for(let i=0;i<455;i++){const y=120+j*43+Math.sin(i*.04+j*2)*14+Math.sin(i*.16)*4;if(i===0)x.moveTo(27+i,y);else x.lineTo(27+i,y);}x.stroke();}
  }
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;
}
export function labelTexture(text:string, sub='', color='#b5c9c7'){
 const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d')!;
 x.fillStyle='#122027';x.fillRect(0,0,1024,256);x.fillStyle=color;x.font='500 79px Arial';x.fillText(text,45,119);x.font='24px monospace';x.fillStyle='#819fa4';x.fillText(sub,48,184);
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
