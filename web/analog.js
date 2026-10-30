/* Patiñ Os electrical core v0.6: Modified Nodal Analysis with backward-Euler
 * capacitor/inductor companions and Newton linearization of Shockley diodes.
 * Teaching tool, NOT a verified SPICE implementation. SI units internally.
 */
(function(root){
 'use strict';
 const {TYPES}=root.DigitalEngine||(typeof module!=='undefined'&&module.exports?require('./engine.js'):{TYPES:{}});
 const RSET=new Set(['RESISTOR','POT','LDR','NTC','PTC','LAMP','BUZZER','PIEZO','SPEAKER','MOTOR','FUSE','SW_ANALOG','PUSH','SW_DIP','AMMETER','VOLTMETER']);
 const IDEAL=new Set(['GND','JUNCTION']);
 const CSET=new Set(['CAP','CAP_POL','CAP_VARIABLE']);
 const LSET=new Set(['INDUCTOR','CHOKE']);
 const VSOURCE=new Set(['VDC','BATTERY','CELL','VAC']);
 const DIODES=new Set(['DIODE_SI','DIODE_GE','DIODE_SCHOTTKY','LED_RED','LED_GREEN','LED_BLUE','DIODE_ZENER']);
 const CURRENT=new Set(['ISOURCE']);
 const SUPPORTED=new Set([...RSET,...IDEAL,...CSET,...LSET,...VSOURCE,...DIODES,...CURRENT]);
 const LINEAR=new Set([...RSET,...IDEAL,...CSET,...LSET]);
 const SUPPLY=new Set(VSOURCE);
 const DIODE=new Set(DIODES);
 const number=(n,key,fallback)=>{const v=Number(n.props?.[key]);return Number.isFinite(v)?v:fallback;};
 const capF=n=>Math.max(1e-12,number(n,'capacitance',10)*1e-6);
 const indH=n=>Math.max(1e-9,number(n,'inductance',10)*1e-3);
 const reverse=n=>n.props?.reverse===true;
 function resistance(n){
   if(n.type==='AMMETER')return .001;
   if(n.type==='VOLTMETER')return 1e9;
   if(n.type==='SW_ANALOG'||n.type==='PUSH'||n.type==='SW_DIP')return n.props?.closed===true?0.01:1e12;
   if(n.type==='FUSE')return .03;
   if(n.type==='POT')return Math.max(.01,number(n,'resistance',10000)*number(n,'position',50)/100);
   return Math.max(.001,number(n,'resistance',n.type==='LAMP'?100:n.type==='MOTOR'?50:n.type==='BUZZER'?200:1000));
 }
 function sourceVoltage(n,t){return n.type==='VAC'?number(n,'voltage',12)*Math.sin(2*Math.PI*number(n,'frequency',50)*t+number(n,'phase',0)*Math.PI/180):number(n,'voltage',n.type==='CELL'?1.5:n.type==='BATTERY'?9:5);}
 function gaussian(M,rhs){
   const n=rhs.length,A=M.map((r,i)=>r.concat(rhs[i]));
   for(let i=0;i<n;i++){
     let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(A[j][i])>Math.abs(A[pivot][i]))pivot=j;
     if(!Number.isFinite(A[pivot][i])||Math.abs(A[pivot][i])<1e-16)return null;
     [A[pivot],A[i]]=[A[i],A[pivot]];
     const v=A[i][i];for(let k=i;k<=n;k++)A[i][k]/=v;
     for(let j=0;j<n;j++){if(j===i)continue;const q=A[j][i];if(Math.abs(q)<1e-30)continue;for(let k=i;k<=n;k++)A[j][k]-=q*A[i][k];}
   }
   const out=A.map(r=>r[n]);return out.every(Number.isFinite)?out:null;
 }
 function diodeIV(n,v){
   // Shockley with finite series-like upper conductance for numerical safety.
   const drop=number(n,'forwardVoltage',n.type==='DIODE_GE'?.3:.7);
   const vt=number(n,'ideality',1.8)*.02585;
   const is=.001/(Math.exp(Math.min(100,drop/vt))-1); // Vf at reference 1 mA
   const e=Math.exp(Math.min(100,Math.max(-100,v/vt)));
   const i=is*(e-1),g=Math.max(1e-12,Math.min(1e4,is*e/vt));
   if(n.type==='DIODE_ZENER'){
     const bv=number(n,'breakdown',5.1);const rev=Math.exp(Math.min(30,Math.max(-30,(-v-bv)/.06)));
     return {i:i-1e-8*(rev-1),g:g+1e-8*rev/.06};
   }
   return {i,g};
 }
 const keyOf=(nodes,wires)=>JSON.stringify([nodes.filter(n=>TYPES[n.type]?.domain==='analog').map(n=>[n.id,n.type,n.props]),wires.map(w=>[w.from,w.to,w.input])]);
 function simulateAnalog(nodes,wires,timeSeconds=0,previous=null){
   const analog=nodes.filter(n=>TYPES[n.type]?.domain==='analog');
   const readings=new Map(),warnings=[];
   if(!analog.length)return {readings,warnings,voltageStatus:'Sin componentes analógicos',state:null};
   if(analog.length>120)return {readings,warnings:['Más de 120 componentes eléctricos: divide el circuito.'],voltageStatus:'Límite de cálculo',state:null};
   const unsupported=analog.filter(n=>!SUPPORTED.has(n.type));
   if(unsupported.length)warnings.push(`${unsupported.length} componente(s) sin modelo físico: ${[...new Set(unsupported.map(n=>n.type))].slice(0,8).join(', ')}. Se excluyen del cálculo.`);
   const valid=analog.filter(n=>SUPPORTED.has(n.type)),map=new Map(analog.map(n=>[n.id,n]));
   const fallback=(status,warning)=>{
     if(warning)warnings.push(warning);
     for(const n of analog)readings.set(n.id,{supported:SUPPORTED.has(n.type),voltage:null,current:null,power:null,active:false});
     return{readings,warnings,voltageStatus:status,state:null,fault:false};
   };
   if(!valid.some(n=>VSOURCE.has(n.type)||CURRENT.has(n.type)))return fallback('Sin fuente eléctrica');
   const parent=new Map(),find=k=>{if(parent.get(k)!==k)parent.set(k,find(parent.get(k)));return parent.get(k);};
   const union=(a,b)=>{const x=find(a),y=find(b);if(x!==y)parent.set(y,x);};
   for(const n of analog){parent.set(n.id+':L',n.id+':L');parent.set(n.id+':R',n.id+':R');}
   for(const w of wires)if(map.has(w.from)&&map.has(w.to))union(w.from+':R',w.to+':L');
   for(const n of analog)if(IDEAL.has(n.type))union(n.id+':L',n.id+':R');
   const grounds=analog.filter(n=>n.type==='GND');
   for(let i=1;i<grounds.length;i++)union(grounds[0].id+':L',grounds[i].id+':L');
   const nets=[...new Set(valid.flatMap(n=>[find(n.id+':L'),find(n.id+':R')]))];
   const src=valid.find(n=>VSOURCE.has(n.type));
   const ref=grounds.length?find(grounds[0].id+':L'):src?find(src.id+':L'):nets[0];
   const other=nets.filter(n=>n!==ref),indices=new Map(other.map((n,i)=>[n,i]));
   const sources=valid.filter(n=>VSOURCE.has(n.type));
   const size=other.length+sources.length;
   if(size>180)return fallback('Circuito demasiado grande');
   const key=keyOf(nodes,wires);
   const reset=!previous||previous.key!==key||!Number.isFinite(previous.time)||timeSeconds<previous.time;
   const memories=reset?new Map():new Map(previous.memory);
   const old=reset?null:previous.solution;
   const elapsed=reset?.001:Math.max(.00001,Math.min(.20,timeSeconds-previous.time));
   const acFreq=Math.max(0,...valid.filter(n=>n.type==='VAC').map(n=>number(n,'frequency',50)));
   const transient=valid.some(n=>CSET.has(n.type)||LSET.has(n.type)||n.type==='VAC');
   const slices=transient?Math.max(1,Math.min(36,Math.ceil(elapsed/Math.min(.015,acFreq?1/(24*acFreq):.015)))):1;
   if(acFreq&&elapsed/slices*acFreq>.15)warnings.push('Frecuencia AC elevada: baja velocidad/escala temporal para resolver con precisión.');
   const dt=elapsed/slices;
   const ix=k=>indices.has(k)?indices.get(k):-1;
   const getV=(v,key)=>ix(key)===-1?0:v[ix(key)];
   const terminals=n=>[find(n.id+':L'),find(n.id+':R')];
   let solved=old&&old.length===size?old.slice():new Array(size).fill(0);
   let lastT=reset?timeSeconds-elapsed:previous.time;
   let solvedAll=true;
   const lastBranch=new Map();
   for(let step=0;step<slices;step++){
     const t=lastT+dt*(step+1);
     let x=solved.slice(),converged=false;
     for(let iteration=0;iteration<85;iteration++){
       const M=Array.from({length:size},()=>new Array(size).fill(0)),b=new Array(size).fill(0);
       const put=(i,j,z)=>{if(i>=0&&j>=0)M[i][j]+=z;};
       const stamp=(a,c,g,i0=0)=>{
         const ia=ix(a),ic=ix(c);put(ia,ia,g);put(ic,ic,g);put(ia,ic,-g);put(ic,ia,-g);
         if(ia>=0)b[ia]-=i0;if(ic>=0)b[ic]+=i0;
       };
       for(const n of valid){const [l,r]=terminals(n);
         if(RSET.has(n.type))stamp(l,r,1/resistance(n));
         if(CSET.has(n.type)){
           const cap=memories.get(n.id)||{v:0,i:0},g=capF(n)/dt;
           stamp(l,r,g,-g*cap.v);
         }
         if(LSET.has(n.type)){
           const coil=memories.get(n.id)||{v:0,i:0},g=dt/indH(n);
           stamp(l,r,g,coil.i);
         }
         if(DIODES.has(n.type)){
           const a=reverse(n)?r:l,c=reverse(n)?l:r;
           const vd=getV(x,a)-getV(x,c),d=diodeIV(n,vd);
           stamp(a,c,d.g,d.i-d.g*vd);
         }
         if(CURRENT.has(n.type))stamp(l,r,0,number(n,'current',.005));
       }
       sources.forEach((n,i)=>{const [l,r]=terminals(n),col=other.length+i,positive=ix(r),negative=ix(l);
         put(positive,col,1);put(col,positive,1);put(negative,col,-1);put(col,negative,-1);b[col]=sourceVoltage(n,t);
       });
       for(let j=0;j<other.length;j++)M[j][j]+=1e-12; // numerical reference for disconnected islands
       const nx=gaussian(M,b);if(!nx){solvedAll=false;break;}
       let fraction=1;
       for(const n of valid){if(!DIODES.has(n.type))continue;
         const [l,r]=terminals(n),a=reverse(n)?r:l,c=reverse(n)?l:r;
         const dv=(getV(nx,a)-getV(nx,c))-(getV(x,a)-getV(x,c));
         if(Math.abs(dv)>.18)fraction=Math.min(fraction,.18/Math.abs(dv));
       }
       const previousX=x;
       x=x.map((v,i)=>v+fraction*(nx[i]-v));
       let err=0;for(let i=0;i<size;i++)err=Math.max(err,Math.abs(x[i]-previousX[i]));
       if(err<1e-7){converged=true;break;}
     }
     if(!solvedAll||!converged){solvedAll=false;break;}
     solved=x;
     for(const n of valid){if(!CSET.has(n.type)&&!LSET.has(n.type))continue;
       const [l,r]=terminals(n),v=getV(solved,l)-getV(solved,r),memory=memories.get(n.id)||{v:0,i:0};
       const i=CSET.has(n.type)?capF(n)/dt*(v-memory.v):memory.i+dt/indH(n)*v;
       memories.set(n.id,{v,i});lastBranch.set(n.id,i);
     }
   }
   if(!solvedAll)return fallback('Sin convergencia','El circuito no convergió: revisa cortocircuitos, fuentes incompatibles y referencias.');
   let fault=false;
   sources.forEach((n,i)=>lastBranch.set(n.id,-solved[other.length+i]));
   for(const n of analog){
     if(!SUPPORTED.has(n.type)){readings.set(n.id,{supported:false,current:null,voltage:null,power:null,active:false});continue;}
     const [l,r]=terminals(n),v=getV(solved,l)-getV(solved,r);
     let i=0;
     if(RSET.has(n.type))i=v/resistance(n);
     else if(CSET.has(n.type)||LSET.has(n.type)||VSOURCE.has(n.type))i=lastBranch.get(n.id)||0;
     else if(CURRENT.has(n.type))i=number(n,'current',.005);
     else if(DIODES.has(n.type)){const d=diodeIV(n,reverse(n)?-v:v);i=(reverse(n)?-1:1)*d.i;}
     const power=v*i;
     const active=n.type==='BUZZER'?Math.abs(v)>=number(n,'threshold',3)&&Math.abs(i)>.00001:
       n.type==='LAMP'||n.type.startsWith('LED_')?power>.01:Math.abs(i)>1e-6;
     if(Math.abs(i)>20||Math.abs(power)>1000)fault=true;
     if(n.type==='CAP_POL' && v<-.5)warnings.push(`Capacitor polarizado ${n.label}: polaridad inversa calculada; posible daño real (no modelado).`);
     if(n.type==='FUSE'&&Math.abs(i)>number(n,'rating',1))warnings.push(`Fusible ${n.label}: corriente calculada supera su valor nominal; NO se abre automáticamente.`);
     readings.set(n.id,{supported:true,current:i,voltage:v,power,active});
   }
   if(fault)warnings.push('Posible cortocircuito o sobrecarga: corriente/potencia excesiva en el modelo ideal.');
   return {readings,warnings,voltageStatus:'MNA DC + transitorios RC/RL + diodos',state:{key,time:timeSeconds,solution:solved,memory:memories},fault};
 }
 const api={simulateAnalog,LINEAR,SUPPLY,DIODE,SUPPORTED,resistance,sourceVoltage};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.PatinosAnalog=api;
})(typeof window!=='undefined'?window:globalThis);
