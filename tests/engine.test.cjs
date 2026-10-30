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

test('v0.4: Multi-input gates, MUX and unknown propagation',()=>{
  assert.equal(evalGate('AND3',[1,1,1],n('g','AND3'),0),1);
  assert.equal(evalGate('NAND4',[1,1,1,1],n('g','NAND4'),0),0);
  assert.equal(evalGate('OR4',[0,null,0,1],n('g','OR4'),0),1);
  assert.equal(evalGate('XOR3',[1,1,1],n('g','XOR3'),0),1);
  assert.equal(evalGate('MUX2',[1,0,0],n('g','MUX2'),0),1);
  assert.equal(evalGate('MUX2',[1,0,1],n('g','MUX2'),0),0);
  assert.equal(evalGate('MUX2',[1,1,null],n('g','MUX2'),0),1);
});
test('v0.4: Adder SUM/CARRY, equivalence and implications',()=>{
  assert.equal(evalGate('ADD_SUM',[1,1,1],n('s','ADD_SUM'),0),1);
  assert.equal(evalGate('ADD_CARRY',[1,1,0],n('c','ADD_CARRY'),0),1);
  assert.equal(evalGate('MAJ3',[0,0,null],n('m','MAJ3'),0),0);
  assert.equal(evalGate('EQ',[0,0],n('e','EQ'),0),1);
  assert.equal(evalGate('IMPLIES',[1,0],n('i','IMPLIES'),0),0);
  assert.equal(evalGate('PROBE',[1],n('p','PROBE'),0),1);
});
test('v0.4: Expanded library and four-input project validation',()=>{
 const {TYPES}=require('../app/src/main/assets/engine.js');
 assert.equal(Object.keys(TYPES).length,34);
 const p={format:'digital-flow-v1',nodes:[n('sw','SWITCH',1),n('g','AND4'),n('led','LED')],wires:[{from:'sw',to:'g',input:3},{from:'g',to:'led',input:0}]};
 assert.equal(validateProject(p).wires.length,2);
 assert.throws(()=>validateProject({...p,wires:[{from:'sw',to:'g',input:4}]}));
});

console.log(`PASS: ${count} grupos de pruebas`);
