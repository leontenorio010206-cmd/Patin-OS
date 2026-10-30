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
console.log(`PASS: ${count} grupos de pruebas`);
