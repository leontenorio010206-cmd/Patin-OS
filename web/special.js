/* Patiñ Os v0.9.2 · MNA didáctico: transformador acoplado y LED RGB */
(function(root){
"use strict";
const de=root.DigitalEngine||(typeof module!=="undefined"?require("./engine.js"):null);
const an=root.PatinosAnalog||(typeof module!=="undefined"?require("./analog.js"):null);
const val=(n,k,d)=>Number.isFinite(Number(n.props?.[k]))?Number(n.props[k]):d;
const support=new Set(["TRANSFORMER","LED_RGB","VDC","VAC","VPULSE","VTRI","VSAW","VCC","BATTERY","CELL","GND","JUNCTION","RESISTOR","POT","LDR","NTC","PTC","FUSE","SW_ANALOG","PUSH","SW_DIP","VOLTMETER","AMMETER","LAMP","MOTOR","BUZZER","PIEZO","SPEAKER","CAP","CAP_POL","CAP_VARIABLE","INDUCTOR","CHOKE","DIODE_SI","DIODE_GE","DIODE_SCHOTTKY","DIODE_FAST","DIODE_POWER","LED_RED","LED_GREEN","LED_BLUE","LED_WHITE","LED_AMBER"]);
const vsrc=new Set(["VDC","VAC","VPULSE","VTRI","VSAW","VCC","BATTERY","CELL"]);
const simpleD=new Set(["DIODE_SI","DIODE_GE","DIODE_SCHOTTKY","DIODE_FAST","DIODE_POWER","LED_RED","LED_GREEN","LED_BLUE","LED_WHITE","LED_AMBER"]);
const caps=new Set(["CAP","CAP_POL","CAP_VARIABLE"]),inds=new Set(["INDUCTOR","CHOKE"]);
function solve(M,b){const n=b.length,A=M.map((r,i)=>r.concat(b[i]));for(let k=0;k<n;k++){let j=k;for(let i=k+1;i<n;i++)if(Math.abs(A[i][k])>Math.abs(A[j][k]))j=i;if(!Number.isFinite(A[j][k])||Math.abs(A[j][k])<1e-15)return null;[A[j],A[k]]=[A[k],A[j]];for(let i=k+1;i<n;i++){const f=A[i][k]/A[k][k];for(let h=k;h<=n;h++)A[i][h]-=f*A[k][h];}}const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let v=A[i][n];for(let j=i+1;j<n;j++)v-=A[i][j]*x[j];x[i]=v/A[i][i];}return x.every(Number.isFinite)?x:null;}
function diode(v,d){const vt=.0465,r=.01,R=8,e=Math.exp(Math.max(-80,Math.min(0,(v-d)/vt)));return v<=d?{i:r*e-r*Math.exp(Math.max(-80,-d/vt)),g:Math.max(1e-10,r*e/vt)}:{i:r+(v-d)/(R+vt/r),g:1/(R+vt/r)};}
function simulateSpecial(nodes,wires,time=0,previous=null){
 const allNodes=nodes.filter(n=>de.TYPES[n.type]?.domain==="analog"),parts=allNodes.filter(n=>support.has(n.type)),unknown=allNodes.filter(n=>!support.has(n.type)),readings=new Map(),warnings=[];
 const bad=message=>{if(message)warnings.push(message);for(const n of allNodes)readings.set(n.id,{supported:false,voltage:null,current:null,power:null,active:false});return {readings,warnings,state:null,fault:false,voltageStatus:"MNA de cuatro terminales: sin solución"};};
 if(unknown.length)return bad("Modelo mixto no disponible: "+[...new Set(unknown.map(n=>n.type))].join(", ")+". No se calcularán circuitos parciales.");
 const supply=parts.find(n=>vsrc.has(n.type));if(!supply)return bad("Hace falta una fuente eléctrica.");
 const map=new Map(parts.map(n=>[n.id,n])),parent=new Map();
 const find=a=>{if(!parent.has(a))return null;if(parent.get(a)!==a)parent.set(a,find(parent.get(a)));return parent.get(a);};
 const join=(a,b)=>{const x=find(a),y=find(b);if(x!==null&&y!==null&&x!==y)parent.set(x,y);};
 for(const n of parts)for(let j=0;j<(de.TYPES[n.type].pins||2);j++)parent.set(n.id+":"+j,n.id+":"+j);
 for(const w of wires)if(map.has(w.from)&&map.has(w.to))join(w.from+":"+(w.fromPin??1),w.to+":"+(w.toPin??0));
 for(const n of parts)if(n.type==="GND"||n.type==="JUNCTION")join(n.id+":0",n.id+":1");
 const grounds=parts.filter(n=>n.type==="GND");for(let j=1;j<grounds.length;j++)join(grounds[0].id+":0",grounds[j].id+":0");
 const net=(n,j)=>find(n.id+":"+j),all=[...new Set([...parent.keys()].map(find))],ref=grounds.length?net(grounds[0],0):net(supply,0);
 if(!grounds.length)warnings.push("Referencia virtual en terminal negativo: usa GND para referencia absoluta.");
 const unknowns=all.filter(v=>v!==ref),idx=new Map(unknowns.map((a,i)=>[a,i])),ix=k=>idx.has(k)?idx.get(k):-1,p=(n,i)=>net(n,i);
 const sources=parts.filter(n=>vsrc.has(n.type)),tx=parts.filter(n=>n.type==="TRANSFORMER");
 const size=unknowns.length+sources.length+tx.length*2;if(size>160)return bad("Demasiados nodos para el motor educativo.");
 const v=(x,k)=>ix(k)<0?0:x[ix(k)],key=JSON.stringify([parts.map(n=>[n.id,n.type,n.props]),wires.map(w=>[w.from,w.fromPin??1,w.to,w.toPin??0])]);
 const continuing=previous?.key===key&&Number.isFinite(previous.time)&&time>=previous.time,elapsed=continuing?Math.max(1e-5,Math.min(.15,time-previous.time)):.001;
 const freq=Math.max(0,...parts.filter(n=>["VAC","VPULSE","VTRI","VSAW"].includes(n.type)).map(n=>val(n,"frequency",50)));
 const steps=Math.min(64,Math.max(1,Math.ceil(elapsed/Math.min(.006,freq?1/(48*freq):.006)))),dt=elapsed/steps;
 if(freq&&freq*dt>.12)warnings.push("Frecuencia alta: exactitud temporal limitada.");
 const memory=new Map(continuing&&previous.memory||[]);
 let x=continuing&&previous.solution?.length===size?previous.solution.slice():Array(size).fill(0);
 for(let step=0;step<steps;step++){
  const t=Math.max(0,time)-elapsed+(step+1)*dt;let z=x.slice(),okay=false;
  for(let iter=0;iter<90;iter++){
   const A=Array.from({length:size},()=>Array(size).fill(0)),b=Array(size).fill(0);
   const add=(i,j,q)=>{if(i>=0&&j>=0)A[i][j]+=q;};
   const stamp=(a,c,g,i0=0)=>{const ai=ix(a),ci=ix(c);add(ai,ai,g);add(ci,ci,g);add(ai,ci,-g);add(ci,ai,-g);if(ai>=0)b[ai]-=i0;if(ci>=0)b[ci]+=i0;};
   const branch=(a,c,j)=>{const ai=ix(a),ci=ix(c);add(ai,j,1);add(ci,j,-1);add(j,ai,1);add(j,ci,-1);};
   for(const n of parts){
    const a=p(n,0),c=p(n,1),vd=v(z,a)-v(z,c),type=n.type;
    if(["GND","JUNCTION","TRANSFORMER"].includes(type)||vsrc.has(type))continue;
    if(type==="LED_RGB"){
     const ca=n.props?.commonAnode===true;
     for(let j=0;j<3;j++){const aa=p(n,ca?3:j),cc=p(n,ca?j:3),uv=v(z,aa)-v(z,cc),d=diode(uv,val(n,["redForward","greenForward","blueForward"][j],[1.9,2.2,3][j]));stamp(aa,cc,d.g,d.i-d.g*uv);}
    }else if(caps.has(type)){const C=val(n,"capacitance",10)*1e-6,g=C/dt;stamp(a,c,g,-g*(memory.get(n.id)?.voltage||0));}
    else if(inds.has(type)){stamp(a,c,dt/(val(n,"inductance",10)*1e-3),memory.get(n.id)?.current||0);}
    else if(simpleD.has(type)){const aa=n.props?.reverse?c:a,cc=n.props?.reverse?a:c,uv=v(z,aa)-v(z,cc),d=diode(uv,val(n,"forwardVoltage",2));stamp(aa,cc,d.g,d.i-d.g*uv);}
    else stamp(a,c,1/an.resistance(n));
   }
   sources.forEach((n,i)=>{const col=unknowns.length+i;branch(p(n,1),p(n,0),col);b[col]=an.sourceVoltage(n,t);});
   tx.forEach((n,i)=>{const L=val(n,"inductance",100)*.001,r=val(n,"ratio",2),Ls=L/(r*r),k=Math.min(.9999,val(n,"coupling",.995)),M=k*Math.sqrt(L*Ls),Rp=val(n,"primaryResistance",.5),Rs=val(n,"secondaryResistance",.25),ip=unknowns.length+sources.length+2*i,is=ip+1,old=memory.get(n.id)||{ip:0,is:0};
    branch(p(n,0),p(n,1),ip);branch(p(n,2),p(n,3),is);add(ip,ip,-Rp-L/dt);add(is,is,-Rs-Ls/dt);add(ip,is,-M/dt);add(is,ip,-M/dt);
    b[ip]=-(L*old.ip+M*old.is)/dt;b[is]=-(Ls*old.is+M*old.ip)/dt;
   });
   for(let i=0;i<unknowns.length;i++)A[i][i]+=1e-8;
   const nx=solve(A,b);if(!nx)return bad("Matriz singular: revisa cables y fuentes.");
   let alpha=1;
   for(const n of parts)if(n.type==="LED_RGB"||simpleD.has(n.type)){const ca=n.props?.commonAnode===true,pairs=n.type==="LED_RGB"?[0,1,2].map(j=>[ca?3:j,ca?j:3]):[[n.props?.reverse?1:0,n.props?.reverse?0:1]];for(const [i,j] of pairs){const d=(v(nx,p(n,i))-v(nx,p(n,j)))-(v(z,p(n,i))-v(z,p(n,j)));if(Math.abs(d)>.18)alpha=Math.min(alpha,.18/Math.abs(d));}}
   const updated=z.map((old,j)=>old+alpha*(nx[j]-old)),err=Math.max(0,...updated.map((q,j)=>Math.abs(q-z[j])));z=updated;if(err<1e-7){okay=true;break;}
  }
  if(!okay)return bad("El circuito no convergió; revisa polaridad y cargas.");
  x=z;
  tx.forEach((n,i)=>{const j=unknowns.length+sources.length+2*i;memory.set(n.id,{ip:x[j],is:x[j+1]});});
  for(const n of parts)if(caps.has(n.type)||inds.has(n.type)){const vv=v(x,p(n,0))-v(x,p(n,1)),old=memory.get(n.id)||{};if(caps.has(n.type)){const C=val(n,"capacitance",10)*1e-6;memory.set(n.id,{voltage:vv,current:C/dt*(vv-(old.voltage||0))});}else memory.set(n.id,{current:(old.current||0)+dt/(val(n,"inductance",10)*1e-3)*vv});}
 }
 let fault=false;
 for(const n of parts){const a=p(n,0),c=p(n,1),vd=v(x,a)-v(x,c);let voltage=vd,current=0,pinCurrents=null,channels=null;
  if(n.type==="LED_RGB"){pinCurrents=[0,0,0,0];channels={};const ca=n.props?.commonAnode===true;for(const [j,name] of ["red","green","blue"].entries()){const aa=p(n,ca?3:j),cc=p(n,ca?j:3),i=Math.max(0,diode(v(x,aa)-v(x,cc),val(n,["redForward","greenForward","blueForward"][j],[1.9,2.2,3][j])).i);channels[name]=i;pinCurrents[ca?3:j]+=i;pinCurrents[ca?j:3]-=i;}current=channels.red+channels.green+channels.blue;voltage=v(x,p(n,ca?3:0))-v(x,p(n,ca?0:3));}
  else if(n.type==="TRANSFORMER"){const j=unknowns.length+sources.length+2*tx.findIndex(t=>t.id===n.id),ip=x[j],is=x[j+1];current=ip;pinCurrents=[ip,-ip,is,-is];channels={primary:ip,secondary:is,secondaryVoltage:v(x,p(n,2))-v(x,p(n,3))};}
  else if(vsrc.has(n.type)){const i=sources.findIndex(t=>t.id===n.id);current=-x[unknowns.length+i];voltage=-vd;}
  else if(caps.has(n.type)||inds.has(n.type))current=memory.get(n.id)?.current||0;
  else if(simpleD.has(n.type))current=(n.props?.reverse?-1:1)*diode(n.props?.reverse?-vd:vd,val(n,"forwardVoltage",2)).i;
  else if(n.type!=="GND"&&n.type!=="JUNCTION")current=vd/an.resistance(n);
  const power=voltage*current;if(Math.abs(current)>20||Math.abs(power)>1000)fault=true;
  readings.set(n.id,{supported:true,current,voltage,power,active:n.type==="LED_RGB"?current>1e-6:n.type==="TRANSFORMER"?Math.max(Math.abs(current),Math.abs(channels.secondary))>1e-6:Math.abs(current)>1e-6,pinCurrents,channels});
 }
 if(fault)warnings.push("Posible sobrecarga: revisa resistencias limitadoras.");
 if(tx.length)warnings.push("Transformador idealizado: sin saturación, pérdidas de hierro ni histéresis.");
 if(parts.some(n=>n.type==="LED_RGB"))warnings.push("RGB con tres diodos independientes; sin modelo óptico ni térmico.");
 return {readings,warnings,voltageStatus:"MNA transitorio · 4 terminales",state:{key,time,solution:x,memory},fault};
}
const api={simulateSpecial};if(typeof module!=="undefined"&&module.exports)module.exports=api;root.PatinosSpecial=api;
})(typeof window!=="undefined"?window:globalThis);
