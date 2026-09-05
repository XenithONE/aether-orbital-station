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
  blue:pbr('blue_metal_plate',0x819395,.6,1),
  fabric:new T.MeshPhysicalMaterial({color:0x445d61,roughness:.91,normalMap:woven,normalScale:new T.Vector2(.25,.25),sheen:.75,sheenColor:new T.Color(0x90b1ad),sheenRoughness:.9}),
  bedding:new T.MeshPhysicalMaterial({color:0x81938e,roughness:.97,normalMap:woven,normalScale:new T.Vector2(.23,.23),sheen:1,sheenColor:new T.Color(0xb9c5b9),sheenRoughness:.8}),
  blanket:new T.MeshPhysicalMaterial({color:0x8c674e,roughness:.95,normalMap:woven,normalScale:new T.Vector2(.3,.3),sheen:.85,sheenColor:new T.Color(0xc6a57a),sheenRoughness:.9}),
  gasket:new T.MeshStandardMaterial({color:0x101b1d,roughness:.98}),
  paper:new T.MeshStandardMaterial({color:0xc5c8b8,roughness:.95}),
  gold:new T.MeshPhysicalMaterial({color:0xa78241,metalness:.9,roughness:.32,clearcoat:.12}),
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
