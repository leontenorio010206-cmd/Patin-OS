'use strict';
const assert=require('node:assert/strict');
const {TYPES,validateProject,defaultProps}=require('../web/engine.js');
const {simulateSpice,exportNetlist,netsOf}=require('../web/spice.js');
let count=0;
function test(label,fn){fn();console.log('✓',label);count++}
const n=(id,type,props={})=>({id,type,label:id,x:0,y:0,state:0,props:{...defaultProps(type),...props}});
const w=(from,fp,to,tp)=>({from,to,input:0,fromPin:fp,toPin:tp});
// 5V -> 1k -> collector NPN; emitter 0; 5V -> 10k -> base; source low is OFF.
const transistor=(type='NPN',sourceVoltage=5)=>{
 const src=n('src','VDC',{voltage:sourceVoltage}),res=n('res','RESISTOR',{resistance:1000}),trans=n('q',type),ground=n('gnd','GND');
 const base=n('base','RESISTOR',{resistance:10000});
 const nodes=[src,res,trans,base,ground];
 const wires=[w('src',1,'res',0),w('res',1,'q',1),w('src',1,'base',0),w('base',1,'q',0),w('q',2,'gnd',0),w('src',0,'gnd',1)];
 return {nodes,wires};
};
test('All multi-terminal pin counts correct',()=>{
 for(const t of ['NPN','PNP','NMOS','PMOS','OPAMP'])assert.equal(TYPES[t].pins,3);
 assert.equal(TYPES.RESISTOR.pins,2);
});
test('Old analog projects are upgraded with fromPin/toPin defaults',()=>{
 const raw={format:'digital-flow-v1',nodes:[n('s','VDC'),n('r','RESISTOR')],wires:[{from:'s',to:'r',input:0}]};
 const p=validateProject(raw);assert.deepEqual([p.wires[0].fromPin,p.wires[0].toPin],[1,0]);
});
test('3 independent terminal pairs and 3-terminal connectivity survive JSON',()=>{
 const p={format:'digital-flow-v1',...transistor()};
 const x=validateProject(JSON.parse(JSON.stringify(p)));
 assert.equal(x.wires.length,6);assert.equal(x.wires.filter(w=>w.to==='q'||w.from==='q').length,3);
 const net=netsOf(x.nodes,x.wires);
 const q=x.nodes.find(n=>n.id==='q');assert.notEqual(net.net(q,0),net.net(q,1));assert.notEqual(net.net(q,0),net.net(q,2));
});
test('Multiple wires may join the same analog pin',()=>{
 const p={format:'digital-flow-v1',nodes:[n('q','NPN'),n('r','RESISTOR'),n('g','GND')],wires:[w('r',1,'q',0),w('g',1,'q',0)]};
 assert.equal(validateProject(p).wires.length,2);
});
test('Reject pins out of range and duplicate analog edges',()=>{
 const p={format:'digital-flow-v1',nodes:[n('q','NPN'),n('r','RESISTOR')],wires:[w('r',1,'q',3)]};
 assert.throws(()=>validateProject(p));p.wires=[w('r',1,'q',2),w('r',1,'q',2)];assert.throws(()=>validateProject(p));
});
test('Passive circuits still delegate to existing transient engine',()=>{
 const nodes=[n('s','VDC',{voltage:5}),n('r','RESISTOR',{resistance:1000})];
 const a=simulateSpice(nodes,[w('s',1,'r',0),w('r',1,'s',0)]);
 assert.ok(Math.abs(a.readings.get('r').current-.005)<1e-5);
});
test('NPN simplified operating point: base injects current, collector conducts',()=>{
 const p=transistor();const a=simulateSpice(p.nodes,p.wires);
 if(!a.readings.get('q')?.supported)console.log(a.warnings);
 assert.ok(a.readings.get('q').supported);const iq=a.readings.get('q').current;
 assert.ok(iq>.0001 && iq<.006,'Ic='+iq);
});
test('NPN no base drive: transistor is OFF',()=>{
 const p=transistor();p.wires=p.wires.filter(w=>w.from!=='base'&&w.to!=='base');
 const a=simulateSpice(p.nodes,p.wires);assert.ok(a.readings.get('q').supported);
 assert.ok(Math.abs(a.readings.get('q').current)<.00005);
});
test('MOSFET resistive load, Vgs > threshold conducts',()=>{
 const p=transistor('NMOS');const a=simulateSpice(p.nodes,p.wires);
 if(!a.readings.get('q')?.supported)console.log(a.warnings);
 assert.ok(a.readings.get('q').supported);
 assert.ok(a.readings.get('q').current>.00005);
});
test('ngspice netlist export uses correct transistor terminal order and ground',()=>{
 const p=transistor(),{text,unsupported}=exportNetlist(p.nodes,p.wires);
 assert.equal(unsupported.length,0);assert.match(text,/Q3 \d+ \d+ 0 PATNPN/);
 assert.match(text,/\.model PATNPN NPN/);assert.match(text,/\.op\n\.end/);
});
test('Export leaves unmodeled devices out and reports them',()=>{
 const c={nodes:[n('n','TIMER_555'),n('g','GND')],wires:[]};
 const r=exportNetlist(c.nodes,c.wires);assert.ok(r.unsupported.some(x=>x.includes('555')));
});
console.log(`\n${count} SPICE-lite tests passed`);
// Extra symmetrical models, virtual rail and DC cache behavior.
test('PMOS responds to negative supply and remains finite',()=>{
 const p=transistor('PMOS',-5),result=simulateSpice(p.nodes,p.wires);
 assert.ok(result.readings.get('q').supported);
 assert.ok(Number.isFinite(result.readings.get('q').current));
});
test('Opamp open-loop gain saturates output in its virtual rails',()=>{
 const nodes=[n('v','VDC',{voltage:1}),n('op','OPAMP',{openLoopGain:10,railVoltage:12}),n('r','RESISTOR',{resistance:1000}),n('g','GND')];
 const wires=[w('v',1,'op',0),w('v',0,'g',0),w('op',2,'r',0),w('r',1,'g',1),w('op',1,'g',1)];
 const result=simulateSpice(nodes,wires);
 assert.ok(result.readings.get('op').supported);
 assert.ok(result.readings.get('op').voltage>7 && result.readings.get('op').voltage<12.1);
});
test('DC model caches stable solution until components or wires change',()=>{
 const p=transistor('NMOS');const a=simulateSpice(p.nodes,p.wires,1);
 assert.ok(a.state?.key);const b=simulateSpice(p.nodes,p.wires,1.1,a.state);
 assert.match(b.voltageStatus,/caché/);
 p.nodes[0].props.voltage=12;const c=simulateSpice(p.nodes,p.wires,1.2,b.state);
 assert.doesNotMatch(c.voltageStatus,/caché/);
});
