/* Standalone 3-valued digital logic engine. Supports browser and Node tests; 3- and 4-input and arithmetic combinational blocks. */
(function (root) {
 'use strict';
 const TYPES={SWITCH:{in:0,name:'Entrada'},CLOCK:{in:0,name:'Reloj'},CONST1:{in:0,name:'1 lógico'},CONST0:{in:0,name:'0 lógico'},AND:{in:2,name:'AND'},OR:{in:2,name:'OR'},XOR:{in:2,name:'XOR'},NAND:{in:2,name:'NAND'},NOR:{in:2,name:'NOR'},XNOR:{in:2,name:'XNOR'},NOT:{in:1,name:'NOT'},BUF:{in:1,name:'BUF'},LED:{in:1,name:'LED'},OUT:{in:1,name:'Salida'}};
const extras={
 AND3:{in:3,name:'AND 3'},OR3:{in:3,name:'OR 3'},XOR3:{in:3,name:'XOR 3'},NAND3:{in:3,name:'NAND 3'},NOR3:{in:3,name:'NOR 3'},XNOR3:{in:3,name:'XNOR 3'},
 AND4:{in:4,name:'AND 4'},OR4:{in:4,name:'OR 4'},XOR4:{in:4,name:'XOR 4'},NAND4:{in:4,name:'NAND 4'},NOR4:{in:4,name:'NOR 4'},XNOR4:{in:4,name:'XNOR 4'},
 MUX2:{in:3,name:'MUX 2:1'},MAJ3:{in:3,name:'Mayoría 3'},ADD_SUM:{in:3,name:'Sumador SUM'},ADD_CARRY:{in:3,name:'Sumador CARRY'},PARITY3:{in:3,name:'Paridad'},EQ:{in:2,name:'Igualdad'},IMPLIES:{in:2,name:'Implicación'},PROBE:{in:1,name:'Sonda'}
 };Object.assign(TYPES,extras);
 function allKnown(a){return a.every(isLevel);}
 function evalMulti(type,inputs){
  const match=/^(AND|OR|XOR|NAND|NOR|XNOR)[34]$/.exec(type);
  if(!match)return null;
  const gate=match[1],base=gate.startsWith('N')?gate.slice(1):gate;
  let out=null;
  if(base==='AND')out=inputs.includes(0)?0:allKnown(inputs)?1:null;
  if(base==='OR')out=inputs.includes(1)?1:allKnown(inputs)?0:null;
  if(base==='XOR')out=allKnown(inputs)?inputs.reduce((a,b)=>a^b,0):null;
  return gate.startsWith('N')&&isLevel(out)?1-out:out;
 }
 
 function isLevel(v){return v===1||v===0;}
 function evalGate(type, inputs, node, clockState){
   if(type==='SWITCH')return node.state===1?1:0;
   if(type==='CONST1')return 1;
   if(type==='CONST0')return 0;
   if(type==='CLOCK')return clockState?1:0;
   const a=inputs[0],b=inputs[1];
   if(/^(AND|OR|XOR|NAND|NOR|XNOR)[34]$/.test(type))return evalMulti(type,inputs);
   if(type==='MAJ3'||type==='ADD_CARRY'){
     const ones=inputs.filter(v=>v===1).length,zeros=inputs.filter(v=>v===0).length;
     return ones>=2?1:zeros>=2?0:null;
   }
   if(type==='ADD_SUM'||type==='PARITY3')return allKnown(inputs)?inputs.reduce((x,v)=>x^v,0):null;
   if(type==='MUX2'){const sel=inputs[2];if(isLevel(sel))return inputs[sel];return a===b&&isLevel(a)?a:null;}
   if(type==='EQ')return isLevel(a)&&isLevel(b)?Number(a===b):null;
   if(type==='IMPLIES')return evalGate('OR',[isLevel(a)?1-a:null,b],node,clockState);
 
   switch(type){
    case 'BUF':case 'LED':case 'OUT':case 'PROBE':return a;
    case 'NOT':return isLevel(a)?1-a:null;
    case 'AND':return a===0||b===0?0:(a===1&&b===1?1:null);
    case 'OR':return a===1||b===1?1:(a===0&&b===0?0:null);
    case 'NAND':{let x=evalGate('AND',inputs,node,clockState);return isLevel(x)?1-x:null;}
    case 'NOR':{let x=evalGate('OR',inputs,node,clockState);return isLevel(x)?1-x:null;}
    case 'XOR':return isLevel(a)&&isLevel(b)?a^b:null;
    case 'XNOR':return isLevel(a)&&isLevel(b)?1-(a^b):null;
    default:return null;
   }
 }
 function simulate(nodes,wires,clockState){
   const index=new Map(nodes.map(n=>[n.id,n]));const outs=new Map(nodes.map(n=>[n.id,null]));
   const inputLinks=new Map();let conflict=false;
   for(const w of wires){
     if(!index.has(w.from)||!index.has(w.to)||!TYPES[index.get(w.to).type])continue;
     let n=index.get(w.to);if(w.input<0||w.input>=TYPES[n.type].in)continue;
     const key=w.to+':'+w.input;
     if(inputLinks.has(key))conflict=true;
     inputLinks.set(key,w.from);
   }
   let stable=false;
   for(let step=0;step<Math.max(32,nodes.length*4);step++){
     let changed=false;
     for(const n of nodes){
       if(!TYPES[n.type])continue;
       const ins=Array.from({length:TYPES[n.type].in},(_,i)=>{
         const src=inputLinks.get(n.id+':'+i);return src==null?null:outs.get(src);
       });
       const value=evalGate(n.type,ins,n,clockState);
       if(outs.get(n.id)!==value){outs.set(n.id,value);changed=true;}
     }
     if(!changed){stable=true;break;}
   }
   if(!stable){for(const n of nodes)if(!['SWITCH','CONST1','CONST0','CLOCK'].includes(n.type))outs.set(n.id,null);}
   return {outs,stable,conflict};
 }
 function validateProject(raw){
   if(!raw||raw.format!=='digital-flow-v1'||!Array.isArray(raw.nodes)||!Array.isArray(raw.wires))throw Error('Formato no compatible. Se requiere Digital Flow JSON v1.');
   if(raw.nodes.length>600||raw.wires.length>2000)throw Error('Proyecto demasiado grande.');
   const ids=new Set();
   const nodes=raw.nodes.map(n=>{
     if(!n||typeof n.id!=='string'||!/^[-_a-zA-Z0-9]{1,80}$/.test(n.id)||ids.has(n.id)||!TYPES[n.type]||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>30000||Math.abs(n.y)>30000)throw Error('Componente inválido o repetido.');
     ids.add(n.id);return{id:n.id,type:n.type,x:n.x,y:n.y,label:String(n.label||TYPES[n.type].name).slice(0,32),state:n.state===1?1:0};
   });
   const occupied=new Set();const wires=[];
   for(const w of raw.wires){
     if(!w||!ids.has(w.from)||!ids.has(w.to)||['LED','OUT','PROBE'].includes(nodes.find(n=>n.id===w.from).type)||!Number.isInteger(w.input)||w.input<0||w.input>=TYPES[nodes.find(n=>n.id===w.to).type].in)throw Error('Cable inválido.');
     const slot=w.to+':'+w.input;if(occupied.has(slot))throw Error('Dos cables en la misma entrada.');occupied.add(slot);
     wires.push({id:typeof w.id==='string'&&/^[-_a-zA-Z0-9]{1,80}$/.test(w.id)?w.id:'w'+wires.length,from:w.from,to:w.to,input:w.input});
   }
   return {format:'digital-flow-v1',nodes,wires};
 }
 const api={TYPES,evalGate,simulate,validateProject};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.DigitalEngine=api;
})(typeof window!=='undefined'?window:globalThis);
