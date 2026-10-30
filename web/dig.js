/* Patiños .dig importer, deliberately conservative: supported simple, unrotated Digital gates only.
   Works in browser/Android WebView. Does not execute or modify the source .dig file.
   Source format: https://github.com/hneemann/Digital (GPL-3.0).
*/
(function(root){
'use strict';
const MAP=Object.freeze({In:'SWITCH',Out:'OUT',And:'AND',Or:'OR',XOr:'XOR',NAnd:'NAND',NOr:'NOR',NXOr:'XNOR',Not:'NOT'});
const INFO=Object.freeze({SWITCH:{inputs:[],output:[0,0]},OUT:{inputs:[[0,0]]},AND:{inputs:[[0,0],[0,40]],output:[60,20]},OR:{inputs:[[0,0],[0,40]],output:[60,20]},XOR:{inputs:[[0,0],[0,40]],output:[60,20]},NAND:{inputs:[[0,0],[0,40]],output:[80,20]},NOR:{inputs:[[0,0],[0,40]],output:[80,20]},XNOR:{inputs:[[0,0],[0,40]],output:[80,20]},NOT:{inputs:[[0,0]],output:[60,0]}});
const MAX_BYTES=2_000_000, MAX_ELEMENTS=600, MAX_SEGMENTS=1500;
const child=(p,name)=>Array.from(p.children).find(e=>e.tagName===name)||null;
const children=(p,name)=>Array.from(p?.children||[]).filter(e=>e.tagName===name);
const content=(p,name)=>child(p,name)?.textContent?.trim()||'';
function point(e){const x=Number(e?.getAttribute('x')),y=Number(e?.getAttribute('y'));if(!e||!e.hasAttribute('x')||!e.hasAttribute('y')||!Number.isInteger(x)||!Number.isInteger(y)||Math.abs(x)>30000||Math.abs(y)>30000)throw Error('Coordenadas .dig inválidas');return {x,y};}
function attributes(e){const a={};for(const ent of children(child(e,'elementAttributes'),'entry')){
 const key=content(ent,'string');if(key){const arr=children(ent,'string');if(arr.length>1)a[key]=arr[1].textContent.trim();else a[key]=Array.from(ent.children).slice(1)[0]?.textContent?.trim()||'';}
 }return a;}
function onSegment(p,s){const a=s.a,b=s.b;
 if(a.x===b.x&&p.x===a.x)return p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);
 if(a.y===b.y&&p.y===a.y)return p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x);
 return (p.x===a.x&&p.y===a.y)||(p.x===b.x&&p.y===b.y); // Digital diagonal wires connect at endpoints.
}
function connected(a,b){return onSegment(a.a,b)||onSegment(a.b,b)||onSegment(b.a,a)||onSegment(b.b,a);}
function parseDig(xml){
 if(typeof xml!=='string'||xml.length>MAX_BYTES)throw Error('Archivo .dig demasiado grande');
 if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('DTD y entidades XML no admitidas');
 if(typeof DOMParser==='undefined')throw Error('Se necesita un navegador con parser XML');
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length||doc.documentElement.tagName!=='circuit')throw Error('XML de Digital inválido');
 const visual=child(doc.documentElement,'visualElements');const wireRoot=child(doc.documentElement,'wires');
 if(!visual||!wireRoot)throw Error('Este archivo no contiene un circuito Digital estándar');
 const elements=children(visual,'visualElement'),rawWires=children(wireRoot,'wire');
 if(elements.length>MAX_ELEMENTS||rawWires.length>MAX_SEGMENTS)throw Error('Circuito fuera de límites para Patiños');
 const ignored=new Set(['Testcase','Text','Rectangle','Ellipse','Polygon','Line','Graphic','Probe']);
 const unsupported=new Set(),pins=[],nodes=[];
 for(const el of elements){
  const name=content(el,'elementName'),type=MAP[name];if(ignored.has(name))continue;
  if(!type){unsupported.add(name||'(sin nombre)');continue;}
  const attr=attributes(el),pos=point(child(el,'pos'));
  if(attr.rotation&&attr.rotation!=='0')unsupported.add(name+' (rotado)');
  if(attr.Inputs&&attr.Inputs!=='2')unsupported.add(name+' ('+attr.Inputs+' entradas)');
  if(attr.Bits&&attr.Bits!=='1')unsupported.add(name+' ('+attr.Bits+' bits)');
  for(const key of Object.keys(attr))if(!['Label','rotation','wideShape','Inputs','Bits'].includes(key))unsupported.add(name+' (atributo '+key+')');
  if(type==='NOT'&&attr.wideShape!=='true')unsupported.add('Not (forma no ancha)');
  const id='n'+(nodes.length+1),label=String(attr.Label||name).slice(0,32);
  const n={id,type,x:pos.x*2+100,y:pos.y*2+100,label,state:type==='SWITCH'?0:0};nodes.push(n);
  const spec=INFO[type];spec.inputs.forEach((offset,i)=>pins.push({id,input:i,role:'sink',pos:{x:pos.x+offset[0],y:pos.y+offset[1]}}));
  if(spec.output)pins.push({id,role:'driver',pos:{x:pos.x+spec.output[0],y:pos.y+spec.output[1]}});
 }
 if(unsupported.size)throw Error('Importación detenida. Elementos no compatibles: '+[...unsupported].slice(0,8).join(', ')+(unsupported.size>8?'…':''));
 if(!nodes.length)throw Error('No se encontraron componentes simulables compatibles');
 const segments=rawWires.map(w=>({a:point(child(w,'p1')),b:point(child(w,'p2'))}));
 const parent=segments.map((_,i)=>i);const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const union=(a,b)=>{const x=find(a),y=find(b);if(x!==y)parent[x]=y;};
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++)if(connected(segments[i],segments[j]))union(i,j);
 // A pin exactly on a wire segment connects to that net. Intersections alone do not join nets.
 const pinNets=new Map();
 for(const pin of pins){const roots=new Set();segments.forEach((s,i)=>{if(onSegment(pin.pos,s))roots.add(find(i));});
  if(roots.size>1){const indices=[...roots];for(let j=1;j<indices.length;j++)union(indices[0],indices[j]);}
  pinNets.set(pin,roots.size?[...roots][0]:'point:'+pin.pos.x+':'+pin.pos.y);
 }
 // Union operations during pin mapping might have merged roots.
 const nets=new Map();for(const [p,net] of pinNets){const key=typeof net==='number'?find(net):net;const arr=nets.get(key)||[];arr.push(p);nets.set(key,arr);}
 // Unwired pins that coincide with a segment-connected pin are intentionally kept on same net.
 const byPoint=new Map();for(const [p,net] of pinNets){const key=p.pos.x+':'+p.pos.y;const arr=byPoint.get(key)||[];arr.push(p);byPoint.set(key,arr);}
 for(const same of byPoint.values())if(same.length>1){const all=same.flatMap(p=>[...nets.entries()].filter(([,items])=>items.includes(p)).map(([id])=>id));
  const first=all[0];for(const other of all.slice(1))if(other!==first&&nets.has(other)){nets.get(first).push(...nets.get(other));nets.delete(other);}
 }
 const wires=[],usedSlots=new Set();
 for(const items of nets.values()){
  const drivers=items.filter(p=>p.role==='driver');const sinks=items.filter(p=>p.role==='sink');
  if(drivers.length>1)throw Error('Hay varias salidas conectadas a la misma red. No se importó por seguridad.');
  if(!drivers.length)continue;
  for(const sink of sinks){const slot=sink.id+':'+sink.input;if(usedSlots.has(slot))throw Error('Entrada duplicada en archivo .dig');usedSlots.add(slot);
   if(drivers[0].id!==sink.id)wires.push({id:'w'+(wires.length+1),from:drivers[0].id,to:sink.id,input:sink.input});
  }
 }
 return {format:'digital-flow-v1',nodes,wires,source:'Digital .dig',importNote:'Importación limitada a puertas básicas sin rotación. Al guardar se exporta JSON de Patiños.',stats:{elements:nodes.length,wires:wires.length,segments:segments.length}};
}
const api={parseDig};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PatinosDig=api;
})(typeof window!=='undefined'?window:globalThis);
