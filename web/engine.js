/* Standalone 3-valued digital logic engine. All functions support browser and Node tests. */
(function (root) {
 'use strict';
 const TYPES={SWITCH:{in:0,name:'Entrada'},CLOCK:{in:0,name:'Reloj'},CONST1:{in:0,name:'1 lógico'},CONST0:{in:0,name:'0 lógico'},AND:{in:2,name:'AND'},OR:{in:2,name:'OR'},XOR:{in:2,name:'XOR'},NAND:{in:2,name:'NAND'},NOR:{in:2,name:'NOR'},XNOR:{in:2,name:'XNOR'},NOT:{in:1,name:'NOT'},BUF:{in:1,name:'BUF'},LED:{in:1,name:'LED'},OUT:{in:1,name:'Salida'}};
 function isLevel(v){return v===1||v===0;}
 function evalGate(type, inputs, node, clockState){
   if(type==='SWITCH')return node.state===1?1:0;
   if(type==='CONST1')return 1;
   if(type==='CONST0')return 0;
   if(type==='CLOCK')return clockState?1:0;
   const a=inputs[0],b=inputs[1];
   switch(type){
    case 'BUF':case 'LED':case 'OUT':return a;
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
     if(!w||!ids.has(w.from)||!ids.has(w.to)||['LED','OUT'].includes(nodes.find(n=>n.id===w.from).type)||!Number.isInteger(w.input)||w.input<0||w.input>=TYPES[nodes.find(n=>n.id===w.to).type].in)throw Error('Cable inválido.');
     const slot=w.to+':'+w.input;if(occupied.has(slot))throw Error('Dos cables en la misma entrada.');occupied.add(slot);
     wires.push({id:typeof w.id==='string'&&/^[-_a-zA-Z0-9]{1,80}$/.test(w.id)?w.id:'w'+wires.length,from:w.from,to:w.to,input:w.input});
   }
   return {format:'digital-flow-v1',nodes,wires};
 }
 const api={TYPES,evalGate,simulate,validateProject};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.DigitalEngine=api;
})(typeof window!=='undefined'?window:globalThis);
