/* Patiñ Os v0.9.5: local Web Audio output for electrical actuators.
   Audio is an audible approximation, NOT an electroacoustic SPICE model.
   Explicit user activation required; no files, network, mic permission or autoplay.
*/
(function(root){
 'use strict';
 const SOUND_TYPES=new Set(['BUZZER','PIEZO','SPEAKER']);
 const MODULATED=new Set(['VAC','VPULSE','VTRI','VSAW']);
 const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
 const nprop=(n,k,def)=>Number.isFinite(Number(n?.props?.[k]))?Number(n.props[k]):def;
 function sourceFor(node,nodes,wires){
   // Walk the connected electrical COMPONENTS, not just the drawn position.
   // We use connectivity only to select the audible driving frequency.
   const index=new Map(nodes.map(n=>[n.id,n]));
   const adjacency=new Map(nodes.map(n=>[n.id,[]]));
   for(const w of wires){if(adjacency.has(w.from)&&adjacency.has(w.to)){
     adjacency.get(w.from).push(w.to);adjacency.get(w.to).push(w.from);
   }}
   const queue=[node.id],visited=new Set(queue),sources=[];
   for(let i=0;i<queue.length;i++){
     const id=queue[i],item=index.get(id);
     if(item&&MODULATED.has(item.type))sources.push(item);
     for(const other of adjacency.get(id)||[])if(!visited.has(other)){visited.add(other);queue.push(other);}
   }
   return sources[0]||null;
 }
 function soundPlan(node,reading,source){
   if(!SOUND_TYPES.has(node?.type)||reading?.supported!==true)return null;
   const current=Math.abs(Number(reading.current));
   const voltage=Math.abs(Number(reading.voltage));
   if(!Number.isFinite(current)||!Number.isFinite(voltage))return null;
   const isBuzzer=node.type==='BUZZER';
   // Active buzzers oscillate internally from a sustained DC supply; passive
   // speakers/piezos cannot emit a continuous tone from steady DC alone.
   if(isBuzzer){
     if(voltage<nprop(node,'threshold',3)||current<.00001)return null;
     return {frequency:clamp(nprop(node,'toneHz',2200),30,12000),wave:'square',
       level:clamp((voltage/5)*Math.sqrt(current/.015),.025,.35),type:node.type};
   }
   if(!source||current<.000001)return null;
   const frequency=nprop(source,'frequency',0);
   if(!(frequency>=20&&frequency<=16000))return null;
   const wave=source.type==='VPULSE'?'square':source.type==='VTRI'?'triangle':source.type==='VSAW'?'sawtooth':'sine';
   const gain=nprop(node,'gain',100)/100;
   // Nominal speaker/piezo volume is intentionally limited to protect hearing.
   const level=clamp(Math.sqrt(current/.02)*gain,0,.28);
   return level>.001?{frequency,wave,level,type:node.type}:null;
 }
 function collectPlans(nodes,wires,readings){
   const plans=new Map();let count=0;
   for(const node of nodes){
     if(!SOUND_TYPES.has(node.type))continue;
     if(++count>12)break; // bounded polyphony on mobile
     const source=node.type==='BUZZER'?null:sourceFor(node,nodes,wires);
     const plan=soundPlan(node,readings?.get(node.id),source);
     if(plan)plans.set(node.id,plan);
   }
   return plans;
 }
 class AudioController{
   constructor(AudioContextCtor){
     this.AudioContextCtor=AudioContextCtor||root.AudioContext||root.webkitAudioContext;
     this.context=null;this.master=null;this.voices=new Map();this.enabled=false;this.volume=.25;
   }
   async enable(){
     if(!this.AudioContextCtor)throw Error('Web Audio no disponible en este dispositivo');
     if(!this.context){
       this.context=new this.AudioContextCtor();
       this.master=this.context.createGain();this.master.gain.value=this.volume;
       this.master.connect(this.context.destination);
     }
     await this.context.resume();
     if(this.context.state!=='running')throw Error('Android bloqueó el audio: toca el botón otra vez');
     this.enabled=true;
   }
   setVolume(v){
     this.volume=clamp(Number(v)/100,0,1);
     if(this.master&&this.context)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.025);
   }
   stop(){
     this.enabled=false;
     for(const id of [...this.voices.keys()])this.remove(id);
     if(this.context?.state==='running')this.context.suspend().catch(()=>{});
   }
   remove(id){
     const item=this.voices.get(id);if(!item)return;
     try{item.osc.stop();}catch(_){}
     try{item.osc.disconnect();item.gain.disconnect();}catch(_){}
     this.voices.delete(id);
   }
   update(nodes,wires,readings){
     if(!this.enabled||!this.context||this.context.state!=='running')return;
     const plans=collectPlans(nodes,wires,readings);
     const byId=new Map(nodes.map(n=>[n.id,n]));
     for(const id of [...this.voices.keys()])if(!plans.has(id)){
       const voice=this.voices.get(id),node=byId.get(id);
       // At AC zero-crossings the slower MNA display can sample zero current.
       // Hold the last audible state briefly, instead of starting/stopping a
       // 440 Hz oscillator ten times each second (aliasing/stuttering).
       const crossing=node&&node.type!=='BUZZER'&&sourceFor(node,nodes,wires)
         &&this.context.currentTime-voice.lastPositive<.5;
       if(!crossing)this.remove(id);
     }
     for(const [id,plan] of plans){
       let voice=this.voices.get(id);
       if(!voice){
         const osc=this.context.createOscillator(),gain=this.context.createGain();
         gain.gain.value=0;osc.connect(gain);gain.connect(this.master);osc.start();
         voice={osc,gain,lastPositive:this.context.currentTime,level:0};this.voices.set(id,voice);
       }
       voice.osc.type=plan.wave;
       voice.lastPositive=this.context.currentTime;
       voice.level=Math.max(plan.level,voice.level*.91);
       voice.osc.frequency.setTargetAtTime(plan.frequency,this.context.currentTime,.015);
       voice.gain.gain.setTargetAtTime(voice.level,this.context.currentTime,.11);
     }
   }
 }
 const api={SOUND_TYPES,sourceFor,soundPlan,collectPlans,AudioController};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.PatinosSound=api;
})(typeof window!=='undefined'?window:globalThis);
