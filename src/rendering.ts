import * as T from 'three/webgpu';
import { pass, mrt, normalView, packNormalToRGB, unpackRGBToNormal, sample, screenUV, builtinAOContext, uniform, mix, vec3, vec4, dot, max } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao } from 'three/addons/tsl/display/GTAONode.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { asset } from './materials';

/** One rendering path for both WebGPU and the automatic WebGL 2 backend. */
export async function createRendering(canvas:HTMLCanvasElement, scene:T.Scene, camera:T.PerspectiveCamera) {
  const renderer = new T.WebGPURenderer({canvas, antialias:true, samples:4, alpha:false, forceWebGL:new URLSearchParams(location.search).get('backend')==='webgl'});
  await renderer.init();
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMappingExposure=1.03;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.info.autoReset=false;
  const backend=(renderer.backend as unknown as {isWebGPUBackend?:boolean}).isWebGPUBackend?'webgpu':'webgl2';

  const pmrem=new T.PMREMGenerator(renderer);
  const room=new RoomEnvironment();
  let environment=pmrem.fromScene(room,.04);room.dispose();
  scene.environment=environment.texture;
  let environmentSource='built-in studio';
  try {
    const hdr=await new HDRLoader().loadAsync(asset('studio_small_09_1k.hdr'));
    hdr.mapping=T.EquirectangularReflectionMapping;
    const next=pmrem.fromEquirectangular(hdr);hdr.dispose();environment.dispose();environment=next;
    scene.environment=environment.texture;environmentSource='Poly Haven / Studio Small 09';
  } catch(e) { console.warn('HDRI unavailable: using the built-in studio.',e); }
  pmrem.dispose();

  // AO is applied to indirect illumination, rather than darkening emissive lights and the sky.
  const normals=pass(scene,camera);normals.transparent=false;
  normals.setMRT(mrt({output:packNormalToRGB(normalView)}));
  normals.getTexture('output').type=T.UnsignedByteType;
  const normalNode=sample(uv=>unpackRGBToNormal(normals.getTextureNode().sample(uv)));
  const occlusion=ao(normals.getTextureNode('depth'),normalNode,camera);
  occlusion.resolutionScale=.5;occlusion.samples.value=12;occlusion.radius.value=.48;occlusion.thickness.value=.75;
  const aoAmount=uniform(.82);
  const detailed=pass(scene,camera);
  detailed.contextNode=builtinAOContext(mix(1,occlusion.getTextureNode().sample(screenUV).r,aoAmount));
  const simple=pass(scene,camera);
  const base=detailed.getTextureNode('output'), simpleBase=simple.getTextureNode('output');
  const glow=bloom(base,.19,.5,1.25),simpleGlow=bloom(simpleBase,.17,.5,1.25);
  const saturation=uniform(1.04);
  const grade=(rgb:typeof base)=>{
    const monochrome=vec3(dot(rgb.rgb,vec3(.2126,.7152,.0722)));
    return vec4(max(mix(monochrome,rgb.rgb,saturation),vec3(0)),1);
  };
  const outputs={high:grade(base.add(glow) as typeof base),medium:grade(simpleBase.add(simpleGlow) as typeof base),low:grade(simpleBase)};
  const pipeline=new T.RenderPipeline(renderer,outputs.high);
  let quality:'high'|'medium'|'low'='high';
  function resize(){renderer.setPixelRatio(Math.min(devicePixelRatio,quality==='high'?1.5:quality==='medium'?1.15:1));renderer.setSize(innerWidth,innerHeight);}
  function setQuality(next:string){quality=next==='low'?'low':next==='medium'?'medium':'high';renderer.shadowMap.enabled=quality!=='low';pipeline.outputNode=outputs[quality];pipeline.needsUpdate=true;resize();}
  resize();
  return {renderer,backend,environmentSource,pipeline,resize,setQuality,
    setView(inside:boolean){occlusion.radius.value=inside?.48:2.7;aoAmount.value=inside?.82:.5;},
    setWarp(amount:number){glow.strength.value=.19+amount*.28;simpleGlow.strength.value=.17+amount*.2;},
    render(){renderer.info.reset();pipeline.render();}
  };
}
