import {WARP_DURATIONS} from './warp';
export type SystemKey='shutters'|'lights'|'solar'|'reactor'|'gravity'|'beacon'|'biosphere'|'orrery'|'drone';
export class Simulation{
 shutters=false;lights=true;solar=true;reactor=true;gravity=true;beacon=false;biosphere=false;orrery=false;drone=false;
 elapsed=0;power=96;visits=new Set<string>(['observatory']);actions=new Set<string>();speed=1;muted=true;
 toggle(key:SystemKey){this[key]=!this[key];this.actions.add(key);this.save();return this[key];}
 update(dt:number){this.elapsed+=dt*this.speed;const target=this.reactor?96:(this.solar?67:18);this.power+=(target-this.power)*Math.min(dt*.16,1);}
 save(){try{localStorage.setItem('aether-exploration',JSON.stringify({visits:[...this.visits],actions:[...this.actions]}));}catch{/* Private browsing may disable storage. */}}
 load(){try{const d=JSON.parse(localStorage.getItem('aether-exploration')||'{}');if(Array.isArray(d.visits))this.visits=new Set(d.visits);if(Array.isArray(d.actions))this.actions=new Set(d.actions);}catch{/* Invalid save is harmless. */}}
}
export class StationAudio{
 ctx?:AudioContext;master?:GainNode;hum?:OscillatorNode;
 private warpSources:{source:AudioScheduledSourceNode;gain:GainNode}[]=[];
 private warpNoise?:AudioBuffer;
 init(){if(this.ctx)return;const ctx=new AudioContext();this.ctx=ctx;const g=ctx.createGain();g.gain.value=0;g.connect(ctx.destination);this.master=g;const h=ctx.createOscillator();h.type='sine';h.frequency.value=54;const hg=ctx.createGain();hg.gain.value=.09;h.connect(hg);hg.connect(g);h.start();this.hum=h;const h2=ctx.createOscillator();h2.frequency.value=81;const h2g=ctx.createGain();h2g.gain.value=.025;h2.connect(h2g);h2g.connect(g);h2.start();}
 mute(muted:boolean){this.init();void this.ctx!.resume();this.master!.gain.setTargetAtTime(muted?0:.35,this.ctx!.currentTime,.3);}
 beep(freq=760,time=.1){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.7,t+time);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+time);o.connect(g);g.connect(this.master!);o.start();o.stop(t+time);}
 step(){this.beep(95,.05);}
 warp(phase:'charging'|'jumping'|'arriving'|'cancel'){
  if(!this.ctx||!this.master)return;
  const ctx=this.ctx,t=ctx.currentTime;
  for(const voice of this.warpSources){voice.gain.gain.cancelAndHoldAtTime(t);voice.gain.gain.setTargetAtTime(.0001,t,.06);try{voice.source.stop(t+.3);}catch{/* Completed voices have already disconnected. */}}
  this.warpSources=[];
  if(phase==='cancel'){this.beep(185,.3);return;}
  const length=WARP_DURATIONS[phase];
  const register=(source:AudioScheduledSourceNode,gain:GainNode,nodes:AudioNode[],seconds=length,delay=0)=>{
   gain.connect(this.master!);const voice={source,gain};this.warpSources.push(voice);
   source.start(t+delay);source.stop(t+delay+seconds+.12);
   source.onended=()=>{for(const node of nodes)node.disconnect();gain.disconnect();this.warpSources=this.warpSources.filter(v=>v!==voice);};
  };
  const tone=(from:number,to:number,peak:number,type:OscillatorType='sine',seconds=length,delay=0,pan=0)=>{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter(),stereo=ctx.createStereoPanner();
   oscillator.type=type;oscillator.frequency.setValueAtTime(from,t+delay);oscillator.frequency.exponentialRampToValueAtTime(to,t+delay+seconds);
   filter.type='lowpass';filter.frequency.value=phase==='charging'?1900:1100;stereo.pan.value=pan;
   const attack=phase==='jumping'?Math.min(.25,seconds*.2):Math.min(.7,seconds*.23);
   gain.gain.setValueAtTime(.0001,t+delay);gain.gain.exponentialRampToValueAtTime(peak,t+delay+attack);
   gain.gain.setValueAtTime(peak*(phase==='charging'?.86:.7),t+delay+seconds*.57);
   gain.gain.exponentialRampToValueAtTime(.0001,t+delay+seconds);
   oscillator.connect(filter);filter.connect(stereo);stereo.connect(gain);register(oscillator,gain,[oscillator,filter,stereo],seconds,delay);
  };
  if(!this.warpNoise){
   this.warpNoise=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate);const data=this.warpNoise.getChannelData(0);let seed=48271,low=0;
   for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;const white=seed/1073741823.5-1;low=.96*low+.04*white;data[i]=low*2.5;}
  }
  const noise=ctx.createBufferSource(),noiseGain=ctx.createGain(),band=ctx.createBiquadFilter();noise.buffer=this.warpNoise;noise.loop=true;
  band.type='bandpass';band.Q.value=.55;band.frequency.setValueAtTime(phase==='charging'?180:phase==='jumping'?1250:650,t);band.frequency.exponentialRampToValueAtTime(phase==='charging'?1800:phase==='jumping'?760:140,t+length);
  noiseGain.gain.setValueAtTime(.0001,t);noiseGain.gain.exponentialRampToValueAtTime(phase==='charging'?.17:phase==='jumping'?.23:.09,t+(phase==='charging'?length*.7:.6));noiseGain.gain.exponentialRampToValueAtTime(.0001,t+length);
  noise.connect(band);band.connect(noiseGain);register(noise,noiseGain,[noise,band]);
  if(phase==='charging'){
   tone(44,154,.105,'sine');tone(111,650,.025,'triangle',length,0,-.28);tone(113,658,.025,'triangle',length,0,.28);tone(55,220,.028,'sine',length);
  }else if(phase==='jumping'){
   tone(57,28,.2,'sine',1.35);tone(72,82,.065,'sine');tone(109,123,.017,'triangle',length,0,-.22);tone(110,124,.017,'triangle',length,0,.22);
  }else{
   tone(82,55,.075,'sine',3.1);tone(145.2,146.83,.043,'sine',3.5,.2,-.2);tone(217.5,220,.03,'sine',3.4,.35,.2);tone(290.4,293.66,.02,'sine',3.1,.5);
  }
 }
}
