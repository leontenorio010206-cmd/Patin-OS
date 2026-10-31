'use strict';
const assert=require('node:assert/strict');
const {TYPES,defaultProps,validateProject}=require('../web/engine.js');
const {simulateSpice}=require('../web/spice.js');
const {pinNames,DEVICE_TYPES}=require('../web/devices.js');
let seq=0,ok=0;
const n=(type,p={})=>({id:'x'+(++seq),type,x:0,y:0,label:type,props:{...defaultProps(type),...p}});
const wire=(a,i,b,j)=>({id:'w'+(++seq),from:a.id,fromPin:i,to:b.id,toPin:j,input:0});
const run=(nodes,wires,t=.01,prior)=>simulateSpice(nodes,wires,t,prior);
function test(label,fn){fn();++ok;console.log('✓ '+label);}
function base(volt=12){const s=n('VDC',{voltage:volt});return{s,nodes:[s],wires:[]};}
function connect(ctx,a,i,b,j){ctx.wires.push(wire(a,i,b,j));}
const approx=(v,ref,tol=.15)=>assert.ok(Number.isFinite(v)&&Math.abs(v-ref)<tol,`got ${v} vs ${ref}`);
const read=(result,node)=>{const x=result.readings.get(node.id);assert.equal(x?.supported,true,JSON.stringify(result.warnings));return x;};
test('Catalog: 18 formerly schematic parts have explicit independent terminals and properties',()=>{
 const expected={DIODE_BRIDGE:4,RELAY:5,SW_SPDT:3,OHMMETER:2,OSCILLOSCOPE:2,HALL:3,MIC:2,SCR:3,TRIAC:3,REG_7805:3,TIMER_555:8,IC_7400:14,IC_7404:14,COUNTER_4017:16,SEVEN_SEG:10,CRYSTAL:2,ANTENNA:2,PUSH_PULL:4};
 assert.equal(Object.keys(expected).length,18);
 for(const [type,pins]of Object.entries(expected)){assert.equal(TYPES[type].pins,pins,type);assert.ok(DEVICE_TYPES.has(type));assert.equal(pinNames[type].length,pins,type);}
});
test('SPDT: COM switches conduction between contacts',()=>{
 for(const position of [1,2]){
  const c=base(10),sw=n('SW_SPDT',{position}),r1=n('RESISTOR',{resistance:1000}),r2=n('RESISTOR',{resistance:1000});
  c.nodes.push(sw,r1,r2);connect(c,c.s,1,sw,0);connect(c,sw,1,r1,0);connect(c,sw,2,r2,0);connect(c,r1,1,c.s,0);connect(c,r2,1,c.s,0);
  const v=run(c.nodes,c.wires);approx(Math.abs(read(v,position===1?r1:r2).current),.01,.0001);assert.ok(Math.abs(read(v,position===2?r1:r2).current)<.00002);
 }
});
test('Bridge rectifier: AC pin pair delivers DC across load',()=>{
 for(const voltage of [8,-8]){
  const c=base(voltage),bridge=n('DIODE_BRIDGE'),r=n('RESISTOR',{resistance:1000});c.nodes.push(bridge,r);
  connect(c,c.s,1,bridge,0);connect(c,c.s,0,bridge,1);connect(c,bridge,2,r,0);connect(c,bridge,3,r,1);
  const out=run(c.nodes,c.wires);const rr=read(out,r);assert.ok(rr.current>.005,JSON.stringify(out.warnings)+':'+rr.current);
 }
});
test('Relay coil activates NO and isolates NC at 12V',()=>{
 const c=base(12),sw=n('RELAY',{coilResistance:120,pickUpVoltage:5}),r=n('RESISTOR',{resistance:1000});c.nodes.push(sw,r);
 connect(c,c.s,1,sw,0);connect(c,c.s,0,sw,1);connect(c,c.s,1,sw,2);connect(c,sw,3,r,0);connect(c,r,1,c.s,0);
 const out=run(c.nodes,c.wires);assert.equal(read(out,sw).channels.energized,true);approx(Math.abs(read(out,r).current),.012,.0002);
});
test('Ohmmeter measures passive network with no active source',()=>{
 const m=n('OHMMETER'),r=n('RESISTOR',{resistance:2200});const w=[wire(m,0,r,0),wire(m,1,r,1)];const out=run([m,r],w);
 approx(read(out,m).channels.resistanceOhm,2200,2);
});
test('Ohmmeter refuses powered circuits',()=>{
 const m=n('OHMMETER'),s=n('VDC');const out=run([m,s],[wire(m,0,s,0)]);
 assert.equal(out.readings.get(m.id)?.supported,false);assert.match(out.warnings.join(' '),/desconecta/);
});
test('Oscilloscope senses voltage as high impedance input',()=>{
 const c=base(5),scope=n('OSCILLOSCOPE');c.nodes.push(scope);connect(c,scope,0,c.s,1);connect(c,scope,1,c.s,0);
 const out=run(c.nodes,c.wires);approx(read(out,scope).channels.channel1,5,.001);
});
test('Hall effect device changes output with magnetic field parameter',()=>{
 const c=base(5),hall=n('HALL',{field:20,threshold:10}),r=n('RESISTOR',{resistance:10000});c.nodes.push(hall,r);connect(c,c.s,1,hall,0);connect(c,c.s,0,hall,1);connect(c,hall,2,r,0);connect(c,r,1,c.s,0);
 const a=run(c.nodes,c.wires);assert.ok(read(a,hall).channels.outputVoltage>4);
 hall.props.field=0;const b=run(c.nodes,c.wires);assert.ok(read(b,hall).channels.outputVoltage<.3);
});
test('7805 approximate output under 12V supply and load',()=>{
 const c=base(12),reg=n('REG_7805'),r=n('RESISTOR',{resistance:1000});c.nodes.push(reg,r);connect(c,c.s,1,reg,0);connect(c,c.s,0,reg,1);connect(c,reg,2,r,0);connect(c,r,1,c.s,0);
 const out=run(c.nodes,c.wires);approx(read(out,reg).channels.outputVoltage,5,.05);
});
test('7400 4x NAND powered produces LOW from two high inputs',()=>{
 const c=base(5),ic=n('IC_7400'),r=n('RESISTOR',{resistance:1000});c.nodes.push(ic,r);
 connect(c,c.s,1,ic,13);connect(c,c.s,0,ic,6);connect(c,c.s,1,ic,0);connect(c,c.s,1,ic,1);connect(c,ic,2,r,0);connect(c,r,1,c.s,0);
 const out=run(c.nodes,c.wires);const rr=read(out,r);assert.ok(rr.voltage<.5,'NAND low V='+rr.voltage);
});
test('7400 powered produces HIGH with LOW on one input',()=>{
 const c=base(5),ic=n('IC_7400'),r=n('RESISTOR',{resistance:1000});c.nodes.push(ic,r);
 connect(c,c.s,1,ic,13);connect(c,c.s,0,ic,6);connect(c,c.s,1,ic,0);connect(c,c.s,0,ic,1);connect(c,ic,2,r,0);connect(c,r,1,c.s,0);
 const out=run(c.nodes,c.wires);assert.ok(read(out,r).voltage>4,'NAND high '+read(out,r).voltage);
});
test('7404 inverter is LOW when powered input HIGH',()=>{
 const c=base(5),ic=n('IC_7404'),r=n('RESISTOR',{resistance:1000});c.nodes.push(ic,r);
 connect(c,c.s,1,ic,13);connect(c,c.s,0,ic,6);connect(c,c.s,1,ic,0);connect(c,ic,1,r,0);connect(c,r,1,c.s,0);
 const out=run(c.nodes,c.wires);assert.ok(read(out,r).voltage<.5);
});
test('555 astable outputs HIGH at quarter-period and LOW after duty',()=>{
 const c=base(5),chip=n('TIMER_555',{frequency:10,duty:50}),r=n('RESISTOR',{resistance:1000});c.nodes.push(chip,r);
 connect(c,c.s,1,chip,7);connect(c,c.s,0,chip,0);connect(c,c.s,1,chip,3);connect(c,chip,2,r,0);connect(c,r,1,c.s,0);
 const a=run(c.nodes,c.wires,.025),b=run(c.nodes,c.wires,.075);assert.ok(read(a,r).voltage>4,read(a,r).voltage+'');assert.ok(read(b,r).voltage<.3,read(b,r).voltage+'');
});
test('4017 decade counter advances on clock rising edge',()=>{
 const c=base(5),counter=n('COUNTER_4017');const clk=n('VPULSE',{high:5,low:0,frequency:5,duty:50});const r=n('RESISTOR',{resistance:1000});c.nodes.push(counter,clk,r);
 connect(c,c.s,1,counter,15);connect(c,c.s,0,counter,7);connect(c,clk,1,counter,13);connect(c,clk,0,c.s,0);connect(c,c.s,0,counter,12);connect(c,c.s,0,counter,14);connect(c,counter,2,r,0);connect(c,r,1,c.s,0);
 let a=run(c.nodes,c.wires,.01),b=run(c.nodes,c.wires,.12,a.state),d=run(c.nodes,c.wires,.21,b.state);
 assert.equal(read(d,counter).channels.count,2,JSON.stringify(d.warnings));
});
test('7 segment common cathode lights driven segment',()=>{
 const c=base(5),seg=n('SEVEN_SEG'),r=n('RESISTOR',{resistance:220});c.nodes.push(seg,r);connect(c,c.s,1,r,0);connect(c,r,1,seg,0);connect(c,seg,8,c.s,0);
 const out=run(c.nodes,c.wires);assert.ok(read(out,seg).channels.a>.001);
});
test('Push-pull driver follows high/low input voltage',()=>{
 const c=base(5),drv=n('PUSH_PULL'),r=n('RESISTOR',{resistance:1000});c.nodes.push(drv,r);connect(c,c.s,1,drv,0);connect(c,c.s,0,drv,1);connect(c,c.s,1,drv,2);connect(c,drv,3,r,0);connect(c,r,1,c.s,0);
 const a=run(c.nodes,c.wires);assert.ok(read(a,drv).channels.outputVoltage>4);
});
test('Crystal is passive and has frequency/physical RLC parameters',()=>{
 const props=defaultProps('CRYSTAL');assert.ok(props.seriesResistance>0&&props.seriesInductance>0&&props.seriesCapacitance>0);
 const c=base(1),q=n('CRYSTAL');c.nodes.push(q);connect(c,c.s,1,q,0);connect(c,q,1,c.s,0);
 const result=run(c.nodes,c.wires);assert.equal(read(result,q).supported,true);
 assert.match(result.warnings.join(' '),/resonador/);
});
test('Antenna is a passive RF approximation not a transmitter',()=>{
 const c=base(5),a=n('ANTENNA');c.nodes.push(a);connect(c,c.s,1,a,0);connect(c,a,1,c.s,0);
 const result=run(c.nodes,c.wires);approx(read(result,a).current,5/73,.002);assert.match(result.warnings.join(' '),/NO simula irradiación/);
});
test('Validates project with 16-pin component and connections',()=>{
 const c=n('COUNTER_4017'),r=n('RESISTOR');const raw={format:'digital-flow-v1',nodes:[c,r],wires:[wire(c,15,r,0)]};assert.equal(validateProject(raw).wires[0].fromPin,15);
});
test('Mic modeled as waveform source with finite output resistance',()=>{
 const mic=n('MIC',{amplitude:.1,frequency:10}),r=n('RESISTOR',{resistance:1000});const out=run([mic,r],[wire(mic,0,r,0),wire(mic,1,r,1)],.025);
 assert.ok(read(out,r).voltage>.03,read(out,r).voltage);
});
test('SCR gate trigger switches anode cathode conduction',()=>{
 const c=base(5),scr=n('SCR',{gateThreshold:.7}),load=n('RESISTOR',{resistance:220}),gate=n('RESISTOR',{resistance:1000});c.nodes.push(scr,load,gate);
 connect(c,c.s,1,load,0);connect(c,load,1,scr,0);connect(c,scr,1,c.s,0);connect(c,c.s,1,gate,0);connect(c,gate,1,scr,2);
 const out=run(c.nodes,c.wires);assert.ok(Math.abs(read(out,load).current)>.005,read(out,load).current);
});
test('TRIAC can trigger under negative supply with negative gate',()=>{
 const c=base(-5),triac=n('TRIAC'),load=n('RESISTOR',{resistance:220}),gate=n('RESISTOR',{resistance:1000});c.nodes.push(triac,load,gate);
 connect(c,c.s,1,load,0);connect(c,load,1,triac,0);connect(c,triac,1,c.s,0);connect(c,c.s,1,gate,0);connect(c,gate,1,triac,2);
 const out=run(c.nodes,c.wires);assert.ok(Math.abs(read(out,load).current)>.005,read(out,load).current);
});
console.log(`PASS ${ok} test groups v0.9.3`);
