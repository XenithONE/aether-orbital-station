import * as T from 'three';
import { asset } from './materials';
export function createCosmos(scene:T.Scene){
 const group=new T.Group();scene.add(group);
 const planetResolution=matchMedia('(pointer: coarse)').matches?'2k':'8k';
 const tex=new T.TextureLoader();const day=tex.load(asset(`${planetResolution}_earth_daymap.jpg`));day.colorSpace=T.SRGBColorSpace;day.anisotropy=8;
 const night=tex.load(asset('earth_night.png'));night.colorSpace=T.SRGBColorSpace;
 const sunDirection=new T.Vector3(-.55,.55,.65).normalize();
 const mat=new T.ShaderMaterial({uniforms:{dayMap:{value:day},nightMap:{value:night},sunDirection:{value:sunDirection}},vertexShader:`varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D dayMap;uniform sampler2D nightMap;uniform vec3 sunDirection;varying vec2 vUv;varying vec3 vN;void main(){float s=dot(normalize(vN),sunDirection);vec3 day=texture2D(dayMap,vUv).rgb;vec3 night=texture2D(nightMap,vUv).rgb;float l=smoothstep(-.1,.25,s);vec3 c=day*(.14+max(s,0.)*1.1)*l+night*vec3(1.1,.79,.47)*(1.-l)*1.6;gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`.replace(';#include',';\n#include')});
 const earth=new T.Mesh(new T.SphereGeometry(1400,128,96),mat);earth.position.set(0,-1300,-1500);earth.rotation.y=3.9;earth.rotation.z=.4;group.add(earth);
 const cloudMap=tex.load(asset(`${planetResolution}_earth_clouds.jpg`));cloudMap.anisotropy=8;
 const clouds=new T.Mesh(new T.SphereGeometry(1403,128,96),new T.MeshStandardMaterial({alphaMap:cloudMap,transparent:true,opacity:.87,depthWrite:false,color:0xffffff,roughness:1}));clouds.position.copy(earth.position);clouds.rotation.copy(earth.rotation);group.add(clouds);
 const atmosphere=new T.Mesh(new T.SphereGeometry(1420,128,96),new T.ShaderMaterial({uniforms:{light:{value:sunDirection}},vertexShader:`varying vec3 vN;varying vec3 vP;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 p=modelMatrix*vec4(position,1.);vP=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`varying vec3 vN;varying vec3 vP;uniform vec3 light;void main(){vec3 V=normalize(cameraPosition-vP);float rim=pow(1.-max(0.,dot(V,normalize(vN))),4.5);float sun=.32+.68*max(dot(vN,light),0.);gl_FragColor=vec4(vec3(.12,.48,1.)*sun,rim*.62);}`,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));atmosphere.position.copy(earth.position);group.add(atmosphere);
 let seed=124;const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const positions=[],colors=[];
 for(let i=0;i<6500;i++){const a=rand()*Math.PI*2,y=rand()*2-1,s=Math.sqrt(1-y*y),r=6500;positions.push(r*s*Math.cos(a),r*y,r*s*Math.sin(a));const c=new T.Color().setHSL(.53+rand()*.13,.08+rand()*.22,.38+rand()*.5);colors.push(c.r,c.g,c.b);}
 const starsGeo=new T.BufferGeometry();starsGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));starsGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const stars=new T.Points(starsGeo,new T.PointsMaterial({size:2.5,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.82}));group.add(stars);
 // Distant navigation beacons and a small moon.
 const moon=new T.Mesh(new T.SphereGeometry(31,32,24),new T.MeshStandardMaterial({color:0x898e93,roughness:1}));moon.position.set(1800,1300,-4500);group.add(moon);
 const milkyMap=tex.load(asset('2k_stars_milky_way.jpg'));milkyMap.colorSpace=T.SRGBColorSpace;
 const milky=new T.Mesh(new T.SphereGeometry(8000,64,32),new T.MeshBasicMaterial({map:milkyMap,side:T.BackSide,color:0x5d667b}));milky.rotation.set(.35,.4,.7);group.add(milky);
 function setView(interior:boolean){for(const obj of [earth,clouds,atmosphere]){obj.position.set(0,interior?-1000:-2100,interior?-1650:-850);obj.scale.setScalar(interior?1:1.25);}}
 setView(false);
 return {earth,clouds,setView,update(dt:number,speed:number){earth.rotation.y+=dt*.00045*speed;clouds.rotation.y+=dt*.00055*speed;}};
}
