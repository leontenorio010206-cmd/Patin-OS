'use strict';
const assert=require('node:assert/strict');
const {simulateSpice}=require('../web/spice.js');
const {TYPES,validateProject,cleanProps}=require('../web/engine.js');
const {sourceFor,soundPlan,collectPlans,AudioController}=require('../web/sound.js');
const part=(id,type,props={})=>({id,type,x:100,y:100,label:id,state:0,props});
const link=(a,ap,b,bp)=>({id:`w${a}${ap}${b}${bp}`,from:a,fromPin:ap,to:b,toPin:bp,input:bp});
let count=0;function test(name,fn){fn();++count;console.log('PASS',name);}
const dc=[part('v','VDC',{voltage:5}),part('bz','BUZZER',{resistance:200,threshold:3,toneHz:1800})];
const wiresDC=[link('v',1,'bz',0),link('bz',1,'v',0)];
const ac=[part('v','VAC',{voltage:5,frequency:440,phase:0}),part('sp','SPEAKER',{resistance:8,gain:80})];
const wiresAC=[link('v',1,'sp',0),link('sp',1,'v',0)];
const pz=[part('v','VAC',{voltage:3,frequency:1500,phase:0}),part('pz','PIEZO',{resistance:5000,gain:40})];
const wiresPiezo=[link('v',1,'pz',0),link('pz',1,'v',0)];
const buzzer=()=>simulateSpice(dc,wiresDC,.02);
test('schema components have new adjustable sound properties',()=>{
 assert(TYPES.BUZZER&&TYPES.PIEZO&&TYPES.SPEAKER);
 assert.equal(cleanProps('BUZZER',{toneHz:950,threshold:4}).toneHz,950);
 assert.equal(cleanProps('PIEZO',{gain:65}).gain,65);
});
test('active buzzer with DC produces audible frequency controlled by user',()=>{
 const s=buzzer();assert.equal(s.readings.get('bz').supported,true);
 const plan=collectPlans(dc,wiresDC,s.readings).get('bz');assert(plan,JSON.stringify(s.warnings));
 assert.equal(plan.frequency,1800);assert.equal(plan.wave,'square');assert(plan.level>0);
});
test('buzzer stays silent below voltage threshold',()=>{
 assert.equal(soundPlan(dc[1],{supported:true,current:.001,voltage:2},null),null);
});
test('no sound for unknown or unsupported electrical solution',()=>{
 assert.equal(soundPlan(dc[1],{supported:false,current:1,voltage:99},null),null);
 assert.equal(soundPlan(dc[1],{supported:true,current:0,voltage:5},null),null);
});
test('passive speaker cannot sing from DC supply',()=>{
 const src=part('v','VDC',{voltage:6}),speaker=part('sp','SPEAKER',{resistance:8});
 const arr=[src,speaker],w=[link('v',1,'sp',0),link('sp',1,'v',0)],s=simulateSpice(arr,w,.1);
 assert.equal(collectPlans(arr,w,s.readings).size,0);
});
test('connected AC drives speaker at source frequency',()=>{
 const s=simulateSpice(ac,wiresAC,.0003);
 assert.equal(sourceFor(ac[1],ac,wiresAC).type,'VAC');
 const plan=collectPlans(ac,wiresAC,s.readings).get('sp');assert(plan,JSON.stringify(s.warnings));
 assert.equal(plan.frequency,440);assert.equal(plan.wave,'sine');
});
test('connected AC drives piezo at signal frequency',()=>{
 const s=simulateSpice(pz,wiresPiezo,.0001);
 const plan=collectPlans(pz,wiresPiezo,s.readings).get('pz');assert(plan,JSON.stringify(s.warnings));
 assert.equal(plan.frequency,1500);
});
test('audio range excludes sub-audible sources',()=>{
 const speaker=part('s','SPEAKER',{resistance:8});
 assert.equal(soundPlan(speaker,{supported:true,current:1,voltage:1},part('ac','VAC',{frequency:4})),null);
});
test('disconnected AC source does not trigger speaker',()=>{
 const stranger=part('ac','VAC',{frequency:440}),speaker=part('sp','SPEAKER');
 assert.equal(sourceFor(speaker,[stranger,speaker],[]),null);
});
test('user can select audio volume 0 to 100 safely',()=>{
 const c=new AudioController();c.setVolume(500);assert.equal(c.volume,1);c.setVolume(-100);assert.equal(c.volume,0);
});
test('preserves original saved project format',()=>{
 const p=validateProject({format:'digital-flow-v1',nodes:dc,wires:wiresDC});assert.equal(p.nodes.length,2);
});
class AudioParameter{constructor(){this.value=0;}setTargetAtTime(value){this.value=value;}}
class FakeAudioContext{
 constructor(){this.state='suspended';this.currentTime=1;this.destination={};this.oscs=[];}
 createGain(){return {gain:new AudioParameter(),connect(){},disconnect(){}};}
 createOscillator(){const o={frequency:new AudioParameter(),type:'sine',started:false,stopped:false,connect(){},disconnect(){},start(){o.started=true;},stop(){o.stopped=true;}};this.oscs.push(o);return o;}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}
}
(async()=>{
 const a=new AudioController(FakeAudioContext);await a.enable();
 test('WebAudio starts after explicit user activation',()=>assert.equal(a.enabled,true));
 a.update(dc,wiresDC,buzzer().readings);
 test('WebAudio creates active voice with configured oscillator',()=>{
  assert.equal(a.voices.size,1);assert.equal([...a.voices.values()][0].osc.type,'square');
 });
 a.update([],[],new Map());
 test('WebAudio shuts down voices on pause or workspace switch',()=>assert.equal(a.voices.size,0));
 a.update(dc,wiresDC,buzzer().readings);a.stop();
 test('mute stops all oscillators and suspends context',()=>{assert.equal(a.voices.size,0);assert.equal(a.enabled,false);});
 console.log(`PASS: ${count} pruebas de audio v0.9.5`);
})().catch(e=>{console.error(e);process.exit(1);});
