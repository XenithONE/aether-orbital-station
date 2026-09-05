import * as T from 'three/webgpu';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mats as M,asset,labelTexture} from './materials';
import type {Interaction,ColliderBox} from './interior';
import type {Simulation} from './simulation';

/** Blender-authored companion and its observation-room charging perch. */
export function createSurveyDrone(){
  const group=new T.Group();group.name='Survey drone and dock';
  const dock=new T.Group();dock.position.set(-5.6,0,-.1);group.add(dock);
  const pedestal=new T.Mesh(new T.CylinderGeometry(.39,.48,.78,32),M.dark);pedestal.position.y=.39;pedestal.castShadow=pedestal.receiveShadow=true;dock.add(pedestal);
  const plate=new T.Mesh(new T.CylinderGeometry(.46,.46,.065,48),M.trim);plate.position.y=.8;plate.receiveShadow=true;dock.add(plate);
  const ring=new T.Mesh(new T.TorusGeometry(.4,.014,8,64),M.cyan);ring.position.y=.84;ring.rotation.x=-Math.PI/2;dock.add(ring);
  const screen=new T.Mesh(new T.PlaneGeometry(.52,.13),new T.MeshBasicMaterial({map:labelTexture('MILO / 07','SURVEY COMPANION'),toneMapped:false}));screen.position.set(0,.61,.426);dock.add(screen);
  const button=new T.Mesh(new T.BoxGeometry(.12,.045,.13),M.green.clone());button.position.set(0,.87,.32);dock.add(button);
  const drone=new T.Group();drone.position.set(-5.6,1.2,-.1);group.add(drone);
  const beamMat=new T.MeshBasicMaterial({color:0x84ebed,transparent:true,opacity:.025,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide});
  const beam=new T.Mesh(new T.ConeGeometry(.43,1.5,32,1,true),beamMat);beam.position.set(0,-1.12,0);drone.add(beam);beam.visible=false;
  const interaction:Interaction={id:'drone',name:'MILO 観測ドローン',detail:'観測飛行を開始 / ドックに戻す',position:new T.Vector3(-5.6,1.04,.43),mesh:button,key:'drone'};
  const collider:ColliderBox={p:[-5.6,.43,-.1],s:[.9,.86,.9]};
  let model:T.Object3D|undefined,flight=0;
  const target=new T.Vector3();
  return {group,interaction,collider,
    async load(){const gltf=await new GLTFLoader().loadAsync(asset('survey-drone.glb'));model=gltf.scene;model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});drone.add(model);},
    update(dt:number,sim:Simulation,time:number){
      flight=T.MathUtils.damp(flight,sim.drone?1:0,1.4,dt);
      target.set(-3.3+Math.sin(time*.26)*1.8,2.65+Math.sin(time*.9)*.13,-1.1+Math.cos(time*.26)*1.6);
      drone.position.lerpVectors(new T.Vector3(-5.6,1.17,-.1),target,flight);
      if(model){model.rotation.y=flight*(Math.sin(time*.26)*.6+.2);model.rotation.z=Math.sin(time*.7)*.045*flight;}
      beam.visible=flight>.8;beamMat.opacity=.017+Math.sin(time*1.7)*.007;
      (button.material as T.MeshStandardMaterial).color.setHex(sim.drone?0x86e7d0:0xc5915b);
    },
    getState:()=>({active:flight>.1,position:drone.position.toArray(),loaded:!!model})
  };
}
