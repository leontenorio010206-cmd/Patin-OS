const assert=require('node:assert/strict');
const {TYPES,evalGate,simulate,defaultProps,validateProject}=require('../web/engine.js');
let checks=0;
function eq(a,b,m){assert.deepEqual(a,b,m);checks++;}
const n=(id,type)=>({id,type,x:100,y:200,label:id,state:0,props:defaultProps(type)});
const w=(from,to,input)=>({from,to,input});
for(const size of [5,6])for(const op of ['AND','OR','XOR','NAND','NOR','XNOR'])for(let mask=0;mask<2**size;mask++){
  let bits=Array.from({length:size},(_,i)=>(mask>>i)&1);
  const a=+bits.every(Boolean),o=+bits.some(Boolean),x=bits.reduce((v,b)=>v^b,0);
  eq(evalGate(op+size,bits,n('g',op+size),0),{AND:a,OR:o,XOR:x,NAND:1-a,NOR:1-o,XNOR:1-x}[op],op+size+': '+mask);
}
for(let i=0;i<4;i++)for(let a=0;a<4;a++)eq(evalGate('DEC2_'+i,[a&1,a>>1],n('x','DEC2_'+i),0),+(a===i));
for(let bit=0;bit<2;bit++)for(let select=0;select<2;select++){
 eq(evalGate('DEMUX0',[bit,select],n('x','DEMUX0'),0),select===0?bit:0);
 eq(evalGate('DEMUX1',[bit,select],n('x','DEMUX1'),0),select===1?bit:0);
}
for(let i=0;i<4;i++){const pins=[0,0,0,0];pins[i]=1;eq(evalGate('ENCODER4_B0',pins,n('x','ENCODER4_B0'),0),i&1);eq(evalGate('ENCODER4_B1',pins,n('x','ENCODER4_B1'),0),(i>>1)&1);}
function stream(type,pins,vals){
 const ins=pins.map((_,i)=>n('i'+i,'SWITCH'));const q=n('q',type);let mem;const outs=[];
 for(const val of vals){ins.forEach((p,i)=>p.state=val[i]);const r=simulate([...ins,q],pins.map((_,i)=>w('i'+i,'q',i)),0,undefined,mem);mem=r.state;outs.push(r.outs.get('q'));eq(r.stable,true,type+' stable');}
 return outs;
}
eq(stream('DFF',['D','CLK'],[[0,0],[1,1],[0,1],[0,0],[0,1]]),[0,1,1,1,0]);
eq(stream('TFF',['T','CLK'],[[1,0],[1,1],[1,1],[1,0],[1,1]]),[0,1,1,1,0]);
eq(stream('JKFF',['J','K','CLK'],[[1,0,0],[1,0,1],[0,1,0],[0,1,1],[1,1,0],[1,1,1]]),[0,1,1,0,0,1]);
eq(stream('SRLATCH',['S','R'],[[1,0],[0,0],[0,1],[1,1]]),[1,1,0,null]);
eq(!!defaultProps('SOLAR').irradiance,true,'solar defaults');eq(!!defaultProps('VARISTOR').knee,true,'varistor defaults');
eq(validateProject({format:'digital-flow-v1',nodes:[n('i','SWITCH'),n('d','DFF')],wires:[w('i','d',0)]}).nodes.length,2);
console.log('Patiñ Os v0.9 digital: '+checks+' checks passed');