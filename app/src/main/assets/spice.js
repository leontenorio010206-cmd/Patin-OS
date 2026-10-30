/* Patiñ Os v0.8: self-contained SPICE-style nodal engine for 3-terminal devices.
 * No external native SPICE library bundled. Educational DC nonlinear solver,
 * and exporter of netlists compatible with ngspice. Not a replacement for SPICE.
 */
(function(root){
'use strict';
const digital=root.DigitalEngine||(typeof module!=='undefined'&&module.exports?require('./engine.js'):null);
const analog=root.PatinosAnalog||(typeof module!=='undefined'&&module.exports?require('./analog.js'):null);
const MULTI=new Set(['NPN','PNP','NMOS','PMOS','OPAMP']);
const count=n=>MULTI.has(n.type)?3:2;
const rnum=(n,key,def)=>Number.isFinite(Number(n.props?.[key]))?Number(n.props[key]):def;
const pn=(w,which)=>{const k=which==='from'?'fromPin':'toPin';return Number.isInteger(w[k])?w[k]:which==='from'?1:0;};
function netsOf(nodes,wires){
 const map=new Map(nodes.map(n=>[n.id,n])),parent=new Map();
 const rootOf=a=>{if(parent.get(a)!==a)parent.set(a,rootOf(parent.get(a)));return parent.get(a);};
 const join=(a,b)=>{if(parent.has(a)&&parent.has(b))parent.set(rootOf(a),rootOf(b));};
 for(const n of nodes)for(let i=0;i<count(n);i++)parent.set(`${n.id}:${i}`,`${n.id}:${i}`);
 for(const w of wires)if(map.has(w.from)&&map.has(w.to))join(`${w.from}:${pn(w,'from')}`,`${w.to}:${pn(w,'to')}`);
 for(const n of nodes)if(['GND','JUNCTION'].includes(n.type))join(`${n.id}:0`,`${n.id}:1`);
 const grounds=nodes.filter(n=>n.type==='GND');for(let i=1;i<grounds.length;i++)join(`${grounds[0].id}:0`,`${grounds[i].id}:0`);
 return {net:(n,p)=>rootOf(`${n.id}:${p}`),all:[...new Set([...parent.keys()].map(rootOf))],grounds};
}
function solveLinear(A,b){
 const m=b.length,rows=A.map((r,i)=>r.concat(b[i]));
 for(let k=0;k<m;k++){
  let pivot=k;for(let j=k+1;j<m;j++)if(Math.abs(rows[j][k])>Math.abs(rows[pivot][k]))pivot=j;
  if(!Number.isFinite(rows[pivot][k])||Math.abs(rows[pivot][k])<1e-16)return null;
  [rows[k],rows[pivot]]=[rows[pivot],rows[k]];
  for(let j=k+1;j<m;j++){
    const f=rows[j][k]/rows[k][k];if(Math.abs(f)<1e-24)continue;
    for(let z=k;z<=m;z++)rows[j][z]-=f*rows[k][z];
  }
 }
 const x=new Array(m).fill(0);for(let k=m-1;k>=0;k--){let v=rows[k][m];for(let j=k+1;j<m;j++)v-=rows[k][j]*x[j];x[k]=v/rows[k][k];}
 return x.every(Number.isFinite)?x:null;
}
const clip=(a,lo,hi)=>Math.min(hi,Math.max(lo,a));
// Returns terminal currents. These are simplified textbook static transfer models.
function nonlinearCurrents(n,v){
 const type=n.type,vt=.026;
 if(type==='NMOS'||type==='PMOS'){
   const sign=type==='PMOS'?-1:1;
   let [vg,vd,vs]=v.map(x=>sign*x),beta=rnum(n,'transconductance',.002),threshold=rnum(n,'threshold',2),lambda=rnum(n,'channelLambda',.02);
   const u=Math.max(0,vg-vs-threshold),vds=vd-vs;
   let id=0;
   if(vds>=0&&u>0)id=beta*(vds<u?(u*vds-.5*vds*vds):.5*u*u*(1+lambda*Math.max(0,vds-u)));
   else if(vds<0&&vg-vd>threshold){const rev=vs-vd,ur=vg-vd-threshold;id=-beta*(rev<ur?(ur*rev-.5*rev*rev):.5*ur*ur*(1+lambda*Math.max(0,rev-ur)));}
   id=clip(id,-50,50)*sign;
   return [0,id,-id]; // gate, drain, source
 }
 if(type==='NPN'||type==='PNP'){
   const sign=type==='PNP'?-1:1;
   const [vb,vc,ve]=v.map(a=>a*sign),gain=rnum(n,'beta',100),is=rnum(n,'saturationCurrent',1e-14);
   const vbe=clip(vb-ve,-2,.85);const ib=clip(is*(Math.exp(vbe/(1.7*vt))-1),-1e-8,.05);
   const enabled=clip((vc-ve)/.18,0,1),ic=clip(gain*ib*enabled,-20,20);
   return [sign*ib,sign*ic,-sign*(ib+ic)]; // base, collector, emitter
 }
 return [0,0,0];
}
function simulateSpice(nodes,wires,time=0,previous=null){
 const analogNodes=nodes.filter(n=>digital.TYPES[n.type]?.domain==='analog');
 if(!analogNodes.some(n=>MULTI.has(n.type)))return analog.simulateAnalog(nodes,wires,time,previous);
 const unsupported=analogNodes.filter(n=>!analog.SUPPORTED.has(n.type)&&!MULTI.has(n.type));
 const physical=analogNodes.filter(n=>analog.SUPPORTED.has(n.type)||MULTI.has(n.type));
 const cacheKey=JSON.stringify([physical.map(n=>[n.id,n.type,n.props]),wires.map(w=>[w.from,w.fromPin??1,w.to,w.toPin??0])]);
 const timeDependent=physical.some(n=>['VAC','VPULSE','VTRI','VSAW','IPULSE'].includes(n.type));
 if(!timeDependent&&previous?.key===cacheKey&&previous.cachedReadings)return {readings:previous.cachedReadings,warnings:previous.cachedWarnings,voltageStatus:'SPICE-lite: DC almacenado en caché',state:previous,fault:previous.cachedFault};
 const warnings=[];if(unsupported.length)warnings.push(`Sin modelo físico: ${[...new Set(unsupported.map(n=>n.type))].join(', ')}.`);
 const readings=new Map();const fallback=(msg)=>{
    warnings.push(msg);for(const n of analogNodes)readings.set(n.id,{supported:false,voltage:null,current:null,power:null,active:false});
    return {readings,warnings,voltageStatus:'SPICE-lite: sin solución',state:null,fault:false};
 };
 if(physical.length>100)return fallback('Límite de 100 piezas con transistores.');
 if(!physical.some(n=>['VDC','VCC','CELL','BATTERY','VAC','VPULSE','VTRI','VSAW'].includes(n.type)))return fallback('Se necesita al menos una fuente de voltaje.');
 const {net,all,grounds}=netsOf(physical,wires);
 if(!grounds.length)warnings.push('Agrega Tierra (GND) para fijar la referencia a 0 V.');
 const supply=physical.find(n=>['VDC','VCC','CELL','BATTERY','VAC','VPULSE','VTRI','VSAW'].includes(n.type));
 const ref=grounds.length?net(grounds[0],0):net(supply,0);
 const others=all.filter(k=>k!==ref),ix=new Map(others.map((k,i)=>[k,i]));
 const sources=physical.filter(n=>['VDC','VCC','CELL','BATTERY','VAC','VPULSE','VTRI','VSAW','OPAMP'].includes(n.type));
 const size=others.length+sources.length;
 if(size>165)return fallback('Circuito demasiado grande.');
 const getV=(x,k)=>ix.has(k)?x[ix.get(k)]:0,idx=k=>ix.has(k)?ix.get(k):-1;
 const pp=(n,p)=>net(n,p);
 // Starting point: node voltages and source branch currents.
 let x=new Array(size).fill(0),converged=false;
 if(previous?.solution?.length===size)x=previous.solution.slice();
 const t=Math.max(0,time);
 let latest=null;
 for(let iter=0;iter<130;iter++){
   const M=Array.from({length:size},()=>new Array(size).fill(0)),b=new Array(size).fill(0);
   const add=(i,j,z)=>{if(i>=0&&j>=0)M[i][j]+=z;};
   const conduct=(a,c,g,i0=0)=>{
     const ia=idx(a),ic=idx(c);add(ia,ia,g);add(ic,ic,g);add(ia,ic,-g);add(ic,ia,-g);
     if(ia>=0)b[ia]-=i0;if(ic>=0)b[ic]+=i0;
   };
   const linearDevice=(terms,fun)=>{
     const volt=terms.map(k=>getV(x,k));let amps=fun(volt);
     if(!amps.every(Number.isFinite))return;
     for(let i=0;i<terms.length;i++){
       const row=idx(terms[i]);if(row<0)continue;
       let offset=amps[i];
       for(let j=0;j<terms.length;j++){
         const p=volt.slice(),h=1e-4;p[j]+=h;
         const gp=(fun(p)[i]-amps[i])/h;
         const col=idx(terms[j]);add(row,col,gp);offset-=gp*volt[j];
       }
       b[row]-=offset;
     }
   };
   for(const n of physical){const l=pp(n,0),r=pp(n,1),v=getV(x,l)-getV(x,r),type=n.type;
     if(analog.LINEAR.has(type)&&!['GND','JUNCTION'].includes(type)){
       let g=1/analog.resistance(n);
       if(['CAP','CAP_POL','CAP_VARIABLE'].includes(type))g=1e-10; // DC operating point
       if(['INDUCTOR','CHOKE'].includes(type))g=1e5; // DC inductor equivalent
       conduct(l,r,g);continue;
     }
     if(['DIODE_SI','DIODE_GE','DIODE_SCHOTTKY','DIODE_ZENER','DIODE_TVS','LED_RED','LED_GREEN','LED_BLUE','LED_WHITE','LED_AMBER','DIODE_FAST','DIODE_POWER','PHOTODIODE'].includes(type)){
       const dir=n.props?.reverse?-1:1;
       const Vf=rnum(n,'forwardVoltage',type==='DIODE_GE'?.3:.7),is=1e-3/Math.max(1e-18,Math.exp(Math.min(70,Vf/.05))-1);
       const vv=clip(dir*v,-2,1.3),exp=Math.exp(vv/.05),iv=is*(exp-1),g=clip(is*exp/.05,1e-12,1e3);
       conduct(l,r,g,dir*iv-g*v);continue;
     }
     if(type==='ISOURCE'||type==='IPULSE'){const current=type==='ISOURCE'?rnum(n,'current',.005):rnum(n,'high',.01);conduct(l,r,0,current);continue;}
     if(type==='SOLAR'){conduct(l,r,1/Math.max(1,rnum(n,'shuntResistance',1e4)),rnum(n,'photoCurrent',.1)*rnum(n,'irradiance',1000)/1000);continue;}
     if(type==='VARISTOR'||type==='TVS_BIDIR'){const knee=rnum(n,'breakdown',12);const off=Math.max(0,Math.abs(v)-knee),g=1e-8+off*.1;conduct(l,r,g);continue;}
     if(MULTI.has(type)&&type!=='OPAMP')linearDevice([pp(n,0),pp(n,1),pp(n,2)],vals=>nonlinearCurrents(n,vals));
   }
   sources.forEach((n,i)=>{
     const col=others.length+i;
     const type=n.type;
     const plus=type==='OPAMP'?pp(n,2):pp(n,1),minus=type==='OPAMP'?ref:pp(n,0);
     const ip=idx(plus),im=idx(minus);add(ip,col,1);add(col,ip,1);add(im,col,-1);add(col,im,-1);
     if(type==='OPAMP'){
       const vp=getV(x,pp(n,0)),vn=getV(x,pp(n,1));
       const gain=rnum(n,'openLoopGain',100),rail=rnum(n,'railVoltage',12);
       const arg=clip(gain*(vp-vn)/rail,-25,25),vout=rail*Math.tanh(arg),der=gain*(1-Math.tanh(arg)**2);
       add(col,idx(pp(n,0)),-der);add(col,idx(pp(n,1)),der);
       b[col]=vout-der*(vp-vn);
     }else b[col]=analog.sourceVoltage(n,t);
   });
   for(let i=0;i<others.length;i++)M[i][i]+=1e-10;
   const nx=solveLinear(M,b);if(!nx)return fallback('Matriz singular: revisa terminales, conexiones y fuentes en conflicto.');
   let alpha=1;
   for(const n of physical)if(MULTI.has(n.type)&&n.type!=='OPAMP'){
     const pin0=pp(n,0),pin2=pp(n,2);
     const step=(getV(nx,pin0)-getV(nx,pin2))-(getV(x,pin0)-getV(x,pin2));
     if(Math.abs(step)>.14)alpha=Math.min(alpha,.14/Math.abs(step));
   }
   if(alpha<.001)alpha=.001;
   const error=Math.max(...nx.map((v,i)=>Math.abs((x[i]+alpha*(v-x[i]))-x[i])));
   x=x.map((v,i)=>v+alpha*(nx[i]-v));
   if(error<1e-7){converged=true;latest=nx;break;}
 }
 if(!converged)return fallback('No convergió el punto de operación: revisa polarización y conexiones.');
 let fault=false;
 for(const n of analogNodes){
    if(unsupported.includes(n)){readings.set(n.id,{supported:false,voltage:null,current:null,power:null,active:false});continue;}
    let v=0,i=0;
    if(MULTI.has(n.type)){
      if(n.type==='OPAMP'){
        v=getV(x,pp(n,2));const k=sources.findIndex(a=>a.id===n.id);i=k>=0?x[others.length+k]:0;
      }else{const terms=[pp(n,0),pp(n,1),pp(n,2)],currents=nonlinearCurrents(n,terms.map(a=>getV(x,a)));v=getV(x,terms[1])-getV(x,terms[2]);i=currents[1];}
    }else{
      v=getV(x,pp(n,1))-getV(x,pp(n,0));
      if(analog.LINEAR.has(n.type))i=(getV(x,pp(n,0))-getV(x,pp(n,1)))/analog.resistance(n);
      else if(sources.some(s=>s.id===n.id))i=-x[others.length+sources.findIndex(s=>s.id===n.id)];
    }
    const power=v*i;
    if(Math.abs(i)>20||Math.abs(power)>1000)fault=true;
    readings.set(n.id,{supported:true,voltage:v,current:i,power,active:Math.abs(i)>1e-6});
 }
 warnings.push('SPICE-lite: transistores y amplificador usan modelos DC simplificados; los capacitores y bobinas se evalúan en régimen estacionario al mezclarlos con estos componentes.');
 if(fault)warnings.push('Posible sobrecarga en el modelo.');
 return{readings,warnings,voltageStatus:'SPICE-lite: punto de operación DC de 3 terminales',state:{key:cacheKey,solution:x,time:t,cachedReadings:readings,cachedWarnings:warnings,cachedFault:fault},fault};
}
function exportNetlist(nodes,wires){
 const physical=nodes.filter(n=>digital.TYPES[n.type]?.domain==='analog');
 const {net,grounds}=netsOf(physical,wires);
 const names=new Map(),ref=grounds.length?net(grounds[0],0):null;
 const pin=n=>i=>{const k=net(n,i);if(k===ref)return '0';if(!names.has(k))names.set(k,String(names.size+1));return names.get(k);};
 const lines=['* Patiñ Os SPICE compatible netlist - ngspice','* Modelos genericos, confirmar contra datos del fabricante'];
 let unsupported=[];
 for(const [j,n] of physical.entries()){
   const t=n.type,p=pin(n),id=j+1;
   if(['RESISTOR','POT','LDR','NTC','PTC','LAMP','BUZZER','PIEZO','SPEAKER','MOTOR','FUSE','SW_ANALOG','PUSH','SW_DIP','VOLTMETER','AMMETER'].includes(t))lines.push(`R${id} ${p(0)} ${p(1)} ${Math.max(.001,analog.resistance(n))}`);
   else if(['CAP','CAP_POL','CAP_VARIABLE'].includes(t))lines.push(`C${id} ${p(0)} ${p(1)} ${rnum(n,'capacitance',10)}u`);
   else if(['INDUCTOR','CHOKE'].includes(t))lines.push(`L${id} ${p(0)} ${p(1)} ${rnum(n,'inductance',10)}m`);
   else if(['VDC','VCC','BATTERY','CELL'].includes(t))lines.push(`V${id} ${p(1)} ${p(0)} DC ${analog.sourceVoltage(n,0)}`);
   else if(t==='VAC')lines.push(`V${id} ${p(1)} ${p(0)} SIN(0 ${rnum(n,'voltage',12)} ${rnum(n,'frequency',50)})`);
   else if(t==='ISOURCE')lines.push(`I${id} ${p(0)} ${p(1)} DC ${rnum(n,'current',.005)}`);
   else if(t==='NPN'||t==='PNP')lines.push(`Q${id} ${p(1)} ${p(0)} ${p(2)} PAT${t}`);
   else if(t==='NMOS'||t==='PMOS')lines.push(`M${id} ${p(1)} ${p(0)} ${p(2)} ${p(2)} PAT${t}`);
   else if(t==='OPAMP')lines.push(`E${id} ${p(2)} 0 ${p(0)} ${p(1)} ${rnum(n,'openLoopGain',100)}`);
   else if(t==='GND'||t==='JUNCTION'){} 
   else if(t.startsWith('DIODE_')||t.startsWith('LED_'))lines.push(`D${id} ${p(0)} ${p(1)} PATD`);
   else unsupported.push(`${n.label} (${t})`);
 }
 lines.push('.model PATNPN NPN(IS=1e-14 BF=100)','.model PATPNP PNP(IS=1e-14 BF=100)','.model PATNMOS NMOS(LEVEL=1 VTO=2 KP=0.002)','.model PATPMOS PMOS(LEVEL=1 VTO=-2 KP=0.002)','.model PATD D(IS=1e-12 N=1.8)','.op','.end');
 if(!grounds.length)unsupported.push('Sin GND: se recomienda una referencia 0');
 return {text:lines.join('\n')+'\n',unsupported};
}
const api={simulateSpice,exportNetlist,netsOf,MULTI};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PatinosSpice=api;
})(typeof window!=='undefined'?window:globalThis);
