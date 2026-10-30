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
 assert.equal(Object.keys(TYPES).length,99);
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
 assert.ok(solved.warnings.some(w=>w.includes('modo esquema')));
 assert.equal(solved.readings.get('cap').supported,false);
 const {validateProject}=require('../app/src/main/assets/engine.js');
 assert.throws(()=>validateProject({format:'digital-flow-v1',nodes:[n('sw','SWITCH'),n('res','RESISTOR')],wires:[{from:'sw',to:'res',input:0}]}),/analógicos/);
});

console.log(`PASS: ${count} grupos de pruebas`);
