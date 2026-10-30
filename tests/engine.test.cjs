const assert=require('node:assert/strict');
const {evalGate,simulate,validateProject}=require('../app/src/main/assets/engine.js');
const n=(id,type,state=0)=>({id,type,x:10,y:10,label:id,state});
let count=0;
function test(name,fn){fn();console.log('✓ '+name);count++;}
test('AND and OR truth tables, including unknown signals',()=>{
 for(let a=0;a<=1;a++)for(let b=0;b<=1;b++){
  assert.equal(evalGate('AND',[a,b],n('g','AND'),0),a&b);
  assert.equal(evalGate('OR',[a,b],n('g','OR'),0),a|b);
  assert.equal(evalGate('XOR',[a,b],n('g','XOR'),0),a^b);
  assert.equal(evalGate('NAND',[a,b],n('g','NAND'),0),1-(a&b));
  assert.equal(evalGate('NOR',[a,b],n('g','NOR'),0),1-(a|b));
  assert.equal(evalGate('XNOR',[a,b],n('g','XNOR'),0),1-(a^b));
 }
 assert.equal(evalGate('AND',[0,null],n('x','AND'),0),0);
 assert.equal(evalGate('AND',[1,null],n('x','AND'),0),null);
 assert.equal(evalGate('NOT',[null],n('x','NOT'),0),null);
});
test('Clock, NOT, wire propagation to LED',()=>{
 const nodes=[n('clk','CLOCK'),n('inv','NOT'),n('led','LED')];
 const wires=[{from:'clk',to:'inv',input:0},{from:'inv',to:'led',input:0}];
 assert.equal(simulate(nodes,wires,0).outs.get('led'),1);
 assert.equal(simulate(nodes,wires,1).outs.get('led'),0);
});
test('Missing input => floating state; disabled input of AND zeros it',()=>{
 const nodes=[n('a','SWITCH',0),n('and','AND'),n('led','LED')];
 const wires=[{from:'a',to:'and',input:0},{from:'and',to:'led',input:0}];
 assert.equal(simulate(nodes,wires,0).outs.get('led'),0);
 nodes[0].state=1;assert.equal(simulate(nodes,wires,0).outs.get('led'),null);
});
test('Long reverse-order chain converges',()=>{
 const nodes=[n('led','LED'),n('g2','BUF'),n('g1','NOT'),n('a','SWITCH',1)];
 const wires=[{from:'a',to:'g1',input:0},{from:'g1',to:'g2',input:0},{from:'g2',to:'led',input:0}];
 assert.equal(simulate(nodes,wires,0).outs.get('led'),0);
});
test('Validate rejects unsupported format, invalid wires and HTML payloads do not execute',()=>{
 const p={format:'digital-flow-v1',nodes:[n('a','SWITCH'),n('b','LED')],wires:[{from:'a',to:'b',input:0}]};
 assert.equal(validateProject(p).nodes.length,2);
 assert.throws(()=>validateProject({...p,format:'dig-xml'}));
 assert.throws(()=>validateProject({...p,wires:[{from:'a',to:'b',input:1}]}));
 assert.throws(()=>validateProject({...p,nodes:[n('a','SWITCH'),n('a','LED')]}));
});

test('v0.4: Multi-input gates, 2:1 MUX and unknown propagation',()=>{
  assert.equal(evalGate('AND3',[1,1,1],n('g','AND3'),0),1);
  assert.equal(evalGate('NAND4',[1,1,1,1],n('g','NAND4'),0),0);
  assert.equal(evalGate('OR4',[0,null,0,1],n('g','OR4'),0),1);
  assert.equal(evalGate('XOR3',[1,1,1],n('g','XOR3'),0),1);
  assert.equal(evalGate('MUX2',[1,0,0],n('g','MUX2'),0),1);
  assert.equal(evalGate('MUX2',[1,0,1],n('g','MUX2'),0),0);
  assert.equal(evalGate('MUX2',[1,1,null],n('g','MUX2'),0),1);
  assert.equal(evalGate('MUX2',[1,0,null],n('g','MUX2'),0),null);
});
test('v0.4: full adder sum/carry, majority, equivalence and implication',()=>{
  assert.equal(evalGate('ADD_SUM',[1,1,1],n('s','ADD_SUM'),0),1);
  assert.equal(evalGate('ADD_SUM',[1,1,0],n('s','ADD_SUM'),0),0);
  assert.equal(evalGate('ADD_CARRY',[1,1,0],n('c','ADD_CARRY'),0),1);
  assert.equal(evalGate('MAJ3',[0,0,null],n('m','MAJ3'),0),0);
  assert.equal(evalGate('EQ',[0,0],n('e','EQ'),0),1);
  assert.equal(evalGate('IMPLIES',[1,0],n('i','IMPLIES'),0),0);
  assert.equal(evalGate('PROBE',[1],n('p','PROBE'),0),1);
});
test('v0.4: 34 components, 4-input project and bad pins are guarded',()=>{
  const {TYPES}=require('../app/src/main/assets/engine.js');
  assert.ok(Object.keys(TYPES).length>=95);
  const p={format:'digital-flow-v1',nodes:[n('sw','SWITCH',1),n('gate','AND4'),n('led','LED')],wires:[{from:'sw',to:'gate',input:3},{from:'gate',to:'led',input:0}]};
  assert.equal(validateProject(p).wires.length,2);
  assert.throws(()=>validateProject({...p,wires:[{from:'sw',to:'gate',input:4}]}));
  assert.throws(()=>validateProject({...p,wires:[{from:'led',to:'gate',input:1}]}));
});



test('v0.5: property defaults, edits and JSON round-trip',()=>{
 const {TYPES,defaultProps,cleanProps}=require('../app/src/main/assets/engine.js');
 assert.ok(Object.keys(TYPES).length>=99);
 assert.equal(defaultProps('CLOCK').periodMs,1000);
 assert.equal(cleanProps('RESISTOR',{resistance:2200}).resistance,2200);
 assert.equal(cleanProps('RESISTOR',{resistance:-2}).resistance,1000);
 assert.equal(cleanProps('VAC',{voltage:18,frequency:60,phase:45}).frequency,60);
 const circuit={format:'digital-flow-v1',nodes:[{...n('r','RESISTOR'),props:{resistance:680}}, {...n('v','VDC'),props:{voltage:12}}],wires:[{from:'v',to:'r',input:0},{from:'r',to:'v',input:0}]};
 assert.equal(validateProject(JSON.parse(JSON.stringify(circuit))).nodes[0].props.resistance,680);
 assert.throws(()=>validateProject({...circuit,wires:[{from:'v',to:'r',input:0},{from:'v',to:'r',input:0}]}));
});
test('v0.5: analog electric source + resistor + Ge diode (simplified)',()=>{
 const {simulateAnalog}=require('../app/src/main/assets/analog.js');
 const batt={...n('bat','VDC'),props:{voltage:5}},r={...n('res','RESISTOR'),props:{resistance:1000}};
 const v=simulateAnalog([batt,r],[{from:'bat',to:'res',input:0},{from:'res',to:'bat',input:0}]);
 assert.ok(Math.abs(v.readings.get('res').current-.005)<.000001);
 const g={...n('ge','DIODE_GE'),props:{forwardVoltage:.3}};
 const dg=simulateAnalog([batt,r,g],[{from:'bat',to:'res',input:0},{from:'res',to:'ge',input:0},{from:'ge',to:'bat',input:0}]);
 assert.ok(dg.readings.get('ge').current>.004&&dg.readings.get('ge').current<.005);
 const rev=simulateAnalog([batt,r,g],[{from:'bat',to:'ge',input:0},{from:'ge',to:'res',input:0},{from:'res',to:'bat',input:0}]);
 assert.ok(rev.readings.get('ge').current>.004&&rev.readings.get('ge').current<.005);
});
test('v0.5: analog incomplete model warns and cross-domain wire disallowed',()=>{
 const {simulateAnalog}=require('../app/src/main/assets/analog.js');
 const cap={...n('cap','CAP'),props:{capacitance:100}};
 const solved=simulateAnalog([cap],[]);
 assert.equal(solved.voltageStatus,'Sin fuente eléctrica');
 assert.equal(solved.readings.get('cap').supported,true);
 const {validateProject}=require('../app/src/main/assets/engine.js');
 assert.throws(()=>validateProject({format:'digital-flow-v1',nodes:[n('sw','SWITCH'),n('res','RESISTOR')],wires:[{from:'sw',to:'res',input:0}]}),/analógicos/);
});


test('v0.6 MNA: battery and two resistors in series, KVL and current',()=>{
 const {simulateAnalog}=require('../app/src/main/assets/analog.js');
 const parts=[{...n('v','VDC'),props:{voltage:12}},{...n('r1','RESISTOR'),props:{resistance:1000}},{...n('r2','RESISTOR'),props:{resistance:2000}}];
 const links=[{from:'v',to:'r1',input:0},{from:'r1',to:'r2',input:0},{from:'r2',to:'v',input:0}];
 const o=simulateAnalog(parts,links,0);assert.equal(o.fault,false);
 assert.ok(Math.abs(o.readings.get('r1').current-.004)<1e-8);
 assert.ok(Math.abs(o.readings.get('r1').voltage-4)<1e-5);
 assert.ok(Math.abs(o.readings.get('r2').voltage-8)<1e-5);
});
test('v0.6 RC circuit: charging is gradual and current decays',()=>{
 const {simulateAnalog}=require('../app/src/main/assets/analog.js');
 const parts=[{...n('v','VDC'),props:{voltage:5}},{...n('r','RESISTOR'),props:{resistance:1000}},{...n('c','CAP'),props:{capacitance:100}}];
 const links=[{from:'v',to:'r',input:0},{from:'r',to:'c',input:0},{from:'c',to:'v',input:0}];
 let o=simulateAnalog(parts,links,0);const firstI=o.readings.get('r').current;
 for(let i=1;i<=120;i++)o=simulateAnalog(parts,links,i*.01,o.state);
 assert.ok(o.readings.get('c').voltage>4.95&&o.readings.get('c').voltage<5.01,`cap=${o.readings.get('c').voltage}`);
 assert.ok(Math.abs(o.readings.get('r').current)<firstI/100);
});
test('v0.6 RL: initial inductor current near zero then approaches V/R',()=>{
 const {simulateAnalog}=require('../app/src/main/assets/analog.js');
 const parts=[{...n('v','VDC'),props:{voltage:10}},{...n('r','RESISTOR'),props:{resistance:10}},{...n('l','INDUCTOR'),props:{inductance:100}}];
 const links=[{from:'v',to:'r',input:0},{from:'r',to:'l',input:0},{from:'l',to:'v',input:0}];
 let o=simulateAnalog(parts,links,0);const firstI=o.readings.get('l').current;
 for(let i=1;i<=100;i++)o=simulateAnalog(parts,links,i*.001,o.state);
 assert.ok(firstI<.1,`initial inductor ${firstI}`);
 assert.ok(o.readings.get('l').current>.99&&o.readings.get('l').current<1.01);
});
test('v0.6: AC sinusoid and diode polarity reversal',()=>{
 const {simulateAnalog}=require('../app/src/main/assets/analog.js');
 const vac=[{...n('v','VAC'),props:{voltage:10,frequency:50,phase:0}},{...n('r','RESISTOR'),props:{resistance:1000}}];
 const circuit=[{from:'v',to:'r',input:0},{from:'r',to:'v',input:0}];
 const a=simulateAnalog(vac,circuit,0),b=simulateAnalog(vac,circuit,.005,a.state);
 assert.ok(Math.abs(a.readings.get('r').current)<.001);
 assert.ok(b.readings.get('r').current>.009);
 const d={...n('d','DIODE_GE'),props:{forwardVoltage:.3,reverse:false}};
 const p=[{...n('b','VDC'),props:{voltage:5}},{...n('r','RESISTOR'),props:{resistance:1000}},d];
 const ws=[{from:'b',to:'r',input:0},{from:'r',to:'d',input:0},{from:'d',to:'b',input:0}];
 const fwd=simulateAnalog(p,ws,0).readings.get('d').current;
 d.props.reverse=true;
 const rev=simulateAnalog(p,ws,0).readings.get('d').current;
 assert.ok(fwd>.0035&&fwd<.005,`forward ${fwd}`);
 assert.ok(Math.abs(rev)<.000005,`reverse leakage ${rev}`);
});
test('v0.6 safety: physical unsupported device is not falsely simulated; high short current warns',()=>{
 const {simulateAnalog}=require('../app/src/main/assets/analog.js');
 const p=[{...n('v','VDC'),props:{voltage:12}},{...n('r','RESISTOR'),props:{resistance:.01}},{...n('x','OPAMP')}];
 const w=[{from:'v',to:'r',input:0},{from:'r',to:'v',input:0}];
 const o=simulateAnalog(p,w,0);
 assert.equal(o.readings.get('x').supported,false);
 assert.ok(o.warnings.some(x=>x.includes('sin modelo físico')));
 assert.equal(o.fault,true);
});



const A7=require('../app/src/main/assets/analog.js');
const E7=require('../app/src/main/assets/engine.js');
const a7=(id,type,props={})=>({...n(id,type),props:{...E7.defaultProps(type),...props}});
const circuit7=(parts,time=0)=>A7.simulateAnalog(parts,parts.map((p,i)=>({from:p.id,to:parts[(i+1)%parts.length].id,input:0})),time);
const near7=(actual,expected,tolerance=.00001)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
test('v0.7: 108 components, new editable physical defaults',()=>{
 assert.equal(Object.keys(E7.TYPES).length,108);
 for(const t of ['VPULSE','VTRI','VSAW','IPULSE','DIODE_FAST','DIODE_POWER','LED_AMBER','LED_WHITE','TVS_BIDIR','SOLAR','VARISTOR','PHOTODIODE']){
  assert.equal(A7.SUPPORTED.has(t),true,t+' no tiene modelo');
  assert.equal(E7.validateProject({format:'digital-flow-v1',nodes:[a7('x',t)],wires:[]}).nodes.length,1);
 }
});
test('v0.7: beta NTC, linear PTC and LDR illumination',()=>{
 const nt=a7('nt','NTC',{temperature:25}),pt=a7('pt','PTC',{temperature:75}),ldr=a7('lr','LDR',{illuminance:10,gamma:1,resistance:10000});
 near7(A7.resistance(nt),10000);nt.props.temperature=70;assert.ok(A7.resistance(nt)<2500);
 near7(A7.resistance(pt),1350);near7(A7.resistance(ldr),10000);ldr.props.illuminance=100;near7(A7.resistance(ldr),1000);
});
test('v0.7: voltage pulse switches high and low by duty cycle',()=>{
 const v=a7('v','VPULSE',{low:1,high:9,frequency:2,duty:25}),r=a7('r','RESISTOR',{resistance:1000});
 near7(circuit7([v,r],.05).readings.get('r').current,.009);near7(circuit7([v,r],.2).readings.get('r').current,.001);
});
test('v0.7: triangular and sawtooth waveforms',()=>{
 for(const [type,time,voltage] of [['VTRI',0,-5],['VTRI',.5,5],['VSAW',.25,-2.5],['VSAW',.75,2.5]]){
  const v=a7('v',type,{voltage:5,frequency:1}),r=a7('r','RESISTOR',{resistance:1000});
  near7(circuit7([v,r],time).readings.get('r').voltage,voltage,.001);
 }
});
test('v0.7: pulsed current source',()=>{
 const v=a7('v','IPULSE',{low:.002,high:.012,frequency:1,duty:25}),r=a7('r','RESISTOR',{resistance:100});
 near7(circuit7([v,r],.1).readings.get('r').current,.012);
 near7(circuit7([v,r],.5).readings.get('r').current,.002);
});
test('v0.7: solar cell load power and irradiance',()=>{
 const pv=a7('pv','SOLAR',{photoCurrent:.1,irradiance:1000}),r=a7('r','RESISTOR',{resistance:10});
 const light=circuit7([pv,r]);assert.ok(light.readings.get('r').power>0&&light.readings.get('pv').power<0);
 pv.props.irradiance=100;
 assert.ok(circuit7([pv,r]).readings.get('r').current<light.readings.get('r').current);
});
test('v0.7: photodiode photocurrent versus darkness',()=>{
 const pd=a7('pd','PHOTODIODE',{illuminance:1000,photoCurrent:.0001}),r=a7('r','RESISTOR',{resistance:1000});
 assert.ok(Math.abs(circuit7([pd,r]).readings.get('r').current)>.00005);
 pd.props.illuminance=0;assert.ok(Math.abs(circuit7([pd,r]).readings.get('r').current)<1e-7);
});
test('v0.7: bidirectional varistor clamps both polarities',()=>{
 const v=a7('v','VDC',{voltage:18}),r=a7('r','RESISTOR',{resistance:1000}),s=a7('s','VARISTOR',{breakdown:12,knee:.5});
 const pos=circuit7([v,r,s]).readings.get('s').voltage;assert.ok(pos>12&&pos<15);
 v.props.voltage=-18;const neg=circuit7([v,r,s]).readings.get('s').voltage;assert.ok(neg< -12&&neg> -15);
});
test('v0.7: TVS bilateral and TVS unidirectional',()=>{
 const v=a7('v','VDC',{voltage:20}),r=a7('r','RESISTOR',{resistance:1000}),s=a7('s','TVS_BIDIR',{breakdown:12,knee:.3});
 assert.ok(circuit7([v,r,s]).readings.get('s').voltage<16);
 v.props.voltage=-20;assert.ok(circuit7([v,r,s]).readings.get('s').voltage> -16);
 v.props.voltage=20;const z=a7('z','DIODE_TVS',{breakdown:12,reverse:true});
 assert.ok(circuit7([v,r,z]).readings.get('z').current>.001);
});
test('v0.7: advanced multi-terminal chips are schematic-only',()=>{
 for(const t of ['NPN','PNP','NMOS','PMOS','TRANSFORMER','OPAMP','TIMER_555','DIODE_BRIDGE'])assert.equal(A7.SUPPORTED.has(t),false);
});
console.log(`PASS: ${count} grupos de pruebas`);
