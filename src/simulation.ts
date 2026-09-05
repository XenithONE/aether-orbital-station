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
 private warpSources:{oscillator:OscillatorNode;gain:GainNode}[]=[];
 init(){if(this.ctx)return;const ctx=new AudioContext();this.ctx=ctx;const g=ctx.createGain();g.gain.value=0;g.connect(ctx.destination);this.master=g;const h=ctx.createOscillator();h.type='sine';h.frequency.value=54;const hg=ctx.createGain();hg.gain.value=.09;h.connect(hg);hg.connect(g);h.start();this.hum=h;const h2=ctx.createOscillator();h2.frequency.value=81;const h2g=ctx.createGain();h2g.gain.value=.025;h2.connect(h2g);h2g.connect(g);h2.start();}
 mute(muted:boolean){this.init();void this.ctx!.resume();this.master!.gain.setTargetAtTime(muted?0:.35,this.ctx!.currentTime,.3);}
 beep(freq=760,time=.1){if(!this.ctx)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.7,t+time);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+time);o.connect(g);g.connect(this.master!);o.start();o.stop(t+time);}
 step(){this.beep(95,.05);}
 warp(phase:'charging'|'jumping'|'arriving'|'cancel'){
  if(!this.ctx||!this.master)return;
  const fadeTime=this.ctx.currentTime;
  for(const source of this.warpSources){source.gain.gain.cancelScheduledValues(fadeTime);source.gain.gain.setTargetAtTime(.0001,fadeTime,.04);try{source.oscillator.stop(fadeTime+.18);}catch{/* The preceding phase may already have finished. */}}
  this.warpSources=[];
  if(phase==='cancel'){this.beep(185,.25);return;}
  const ctx=this.ctx,t=ctx.currentTime,length=phase==='charging'?4:phase==='jumping'?4:1.8;
  for(let layer=0;layer<3;layer++){
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),filter=ctx.createBiquadFilter();
   oscillator.type=layer===0?'sine':'triangle';
   const initial=phase==='charging'?45+layer*23:phase==='jumping'?210+layer*105:180+layer*90;
   const final=phase==='charging'?260+layer*60:phase==='jumping'?50+layer*25:95+layer*48;
   oscillator.frequency.setValueAtTime(initial,t);oscillator.frequency.exponentialRampToValueAtTime(final,t+length);
   filter.type='lowpass';filter.frequency.setValueAtTime(phase==='jumping'?2200:600,t);filter.frequency.exponentialRampToValueAtTime(phase==='charging'?1800:250,t+length);
   gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(layer===0?.16:.035,t+.35);gain.gain.setTargetAtTime(.0001,t+length*.65,length*.12);
   oscillator.connect(filter);filter.connect(gain);gain.connect(this.master);oscillator.start(t);oscillator.stop(t+length+.2);
   this.warpSources.push({oscillator,gain});
   oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect();};
  }
 }
}
