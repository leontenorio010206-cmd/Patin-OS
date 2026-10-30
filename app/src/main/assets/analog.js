/* Patiñ Os: small, deliberately bounded DC / instantaneous-source analog solver.
   NOT SPICE: no transient capacitors/inductors, semiconductor physics or thermal effects. */
(function(root){
 'use strict';
 const {TYPES}=root.DigitalEngine;
 const LINEAR=new Set(['RESISTOR','POT','LDR','NTC','PTC','LAMP','BUZZER','PIEZO','SPEAKER','MOTOR','FUSE','SW_ANALOG','AMMETER','VOLTMETER','GND','JUNCTION']);
 const SUPPLY=new Set(['VDC','BATTERY','CELL','VAC']);
 const DIODE=new Set(['DIODE_SI','DIODE_GE','DIODE_SCHOTTKY','LED_RED','LED_GREEN','LED_BLUE']);
 const CURRENT=new Set(['ISOURCE']);
 const SUPPORTED=new Set([...LINEAR,...SUPPLY,...DIODE,...CURRENT]);
 const val=(n,k,d)=>{let v=Number(n.props?.[k]);return Number.isFinite(v)?v:d;};
 function resistance(n){
  if(n.type==='GND'||n.type==='JUNCTION'||n.type==='AMMETER')return .001;
  if(n.type==='VOLTMETER')return 1e9;
  if(n.type==='SW_ANALOG')return n.props?.closed===false?1e10:.1;
  if(n.type==='FUSE')return .1;
  if(n.type==='POT')return Math.max(.1,val(n,'resistance',10000)*val(n,'position',50)/100);
  return Math.max(.1,val(n,'resistance',n.type==='LAMP'?100:n.type==='BUZZER'?200:1000));
 }
 function supplyVoltage(n,seconds){
  if(n.type==='VAC')return val(n,'voltage',12)*Math.sin(2*Math.PI*val(n,'frequency',50)*seconds+val(n,'phase',0)*Math.PI/180);
  return val(n,'voltage',n.type==='CELL'?1.5:n.type==='BATTERY'?9:5);
 }
 function solveLinear(M,b){
   const N=b.length,A=M.map((r,i)=>[...r,b[i]]);
   for(let col=0;col<N;col++){
     let pivot=col;for(let i=col+1;i<N;i++)if(Math.abs(A[i][col])>Math.abs(A[pivot][col]))pivot=i;
     if(Math.abs(A[pivot][col])<1e-15)return null;
     [A[col],A[pivot]]=[A[pivot],A[col]];
     const d=A[col][col];for(let k=col;k<=N;k++)A[col][k]/=d;
     for(let row=0;row<N;row++){if(row===col)continue;const f=A[row][col];if(!f)continue;for(let k=col;k<=N;k++)A[row][k]-=f*A[col][k];}
   }
   return A.map(r=>r[N]);
 }
 function simulateAnalog(nodes,wires,timeSeconds=0){
   const analog=nodes.filter(n=>TYPES[n.type]?.domain==='analog');
   const readings=new Map();const warnings=[];
   if(!analog.length)return {readings,warnings,voltageStatus:'Sin componentes analógicos'};
   if(analog.length>140)return {readings,warnings:['Circuito analógico demasiado grande (máximo 140 piezas).'],voltageStatus:'Límite de cálculo'};
   const map=new Map(analog.map(n=>[n.id,n]));
   const parent=new Map();const get=(v)=>{if(parent.get(v)!==v)parent.set(v,get(parent.get(v)));return parent.get(v);};
   const join=(a,b)=>{let x=get(a),y=get(b);if(x!==y)parent.set(y,x);};
   for(const n of analog){parent.set(n.id+':L',n.id+':L');parent.set(n.id+':R',n.id+':R');}
   for(const w of wires){if(map.has(w.from)&&map.has(w.to))join(w.from+':R',w.to+':L');}
   // Schematic reference and junction are two-terminal ideal connections.
   for(const n of analog)if(n.type==='GND'||n.type==='JUNCTION')join(n.id+':L',n.id+':R');
   const supported=analog.filter(n=>SUPPORTED.has(n.type));
   const pending=analog.filter(n=>!SUPPORTED.has(n.type));
   if(pending.length)warnings.push(`${pending.length} pieza(s) en modo esquema, sin modelo de simulación: ${[...new Set(pending.map(n=>n.type))].slice(0,5).join(', ')}.`);
   if(!supported.some(n=>SUPPLY.has(n.type)||CURRENT.has(n.type))){
     for(const n of analog)readings.set(n.id,{supported:SUPPORTED.has(n.type),current:null,voltage:null,active:false});
     return {readings,warnings,voltageStatus:'Sin fuente eléctrica'};
   }
   const allNets=[...new Set(supported.flatMap(n=>[get(n.id+':L'),get(n.id+':R')]))];
   const source=supported.find(n=>SUPPLY.has(n.type));
   const ref=source?get(source.id+':L'):allNets[0];
   const nets=allNets.filter(x=>x!==ref);const netIdx=new Map(nets.map((x,i)=>[x,i]));
   const sources=supported.filter(n=>SUPPLY.has(n.type));const size=nets.length+sources.length;
   if(size>320)return{readings,warnings:['Demasiados nodos para el cálculo.'],voltageStatus:'Límite de nodos'};
   const index=n=>netIdx.get(n)??-1;const voltageOf=(x,net)=>index(net)<0?0:x[index(net)];
   const diodes=supported.filter(n=>DIODE.has(n.type));const on=new Map(diodes.map(n=>[n.id,false]));
   let solution=null,converged=false;
   for(let iteration=0;iteration<22;iteration++){
     const M=Array.from({length:size},()=>new Array(size).fill(0)),b=new Array(size).fill(0);
     const add=(i,j,v)=>{if(i>=0&&j>=0)M[i][j]+=v;};
     const stampR=(left,right,r,offset=0)=>{
       const a=index(left),c=index(right),g=1/Math.max(.001,r);
       add(a,a,g);add(c,c,g);add(a,c,-g);add(c,a,-g);
       // branch current left->right: g*(Vleft - Vright - offset)
       if(a>=0)b[a]+=g*offset;if(c>=0)b[c]-=g*offset;
     };
     for(const n of supported){const l=get(n.id+':L'),r=get(n.id+':R');
       if(LINEAR.has(n.type))stampR(l,r,resistance(n));
       if(DIODE.has(n.type))stampR(l,r,on.get(n.id)?10:1e10,on.get(n.id)?val(n,'forwardVoltage',.7):0);
       if(CURRENT.has(n.type)){const I=val(n,'current',.005),a=index(l),c=index(r);if(a>=0)b[a]-=I;if(c>=0)b[c]+=I;}
     }
     sources.forEach((n,i)=>{const l=get(n.id+':L'),r=get(n.id+':R'),col=nets.length+i,plus=index(r),minus=index(l);
       add(plus,col,1);add(col,plus,1);add(minus,col,-1);add(col,minus,-1);b[col]=supplyVoltage(n,timeSeconds);
     });
     // reference bias for otherwise floating nets; 1 TΩ prevents singular matrices.
     for(let i=0;i<nets.length;i++)M[i][i]+=1e-12;
     solution=solveLinear(M,b);
     if(!solution||solution.some(v=>!Number.isFinite(v))){solution=null;break;}
     let changed=false;
     for(const n of diodes){const va=voltageOf(solution,get(n.id+':L')),vc=voltageOf(solution,get(n.id+':R'));
       const threshold=val(n,'forwardVoltage',.7);const next=(va-vc)>=threshold-1e-5;
       if(next!==on.get(n.id)){on.set(n.id,next);changed=true;}
     }
     if(!changed){converged=true;break;}
   }
   if(!solution||!converged){warnings.push('No convergió el cálculo eléctrico. Revisa fuentes enfrentadas y conexiones.');for(const n of analog)readings.set(n.id,{supported:SUPPORTED.has(n.type),current:null,voltage:null,active:false});return{readings,warnings,voltageStatus:'Sin convergencia'};}
   let tooHigh=false;
   const sourceIdx=new Map(sources.map((n,i)=>[n.id,nets.length+i]));
   for(const n of analog){if(!SUPPORTED.has(n.type)){readings.set(n.id,{supported:false,current:null,voltage:null,active:false});continue;}
     const l=get(n.id+':L'),r=get(n.id+':R'),vl=voltageOf(solution,l),vr=voltageOf(solution,r);let I=0;
     if(LINEAR.has(n.type))I=(vl-vr)/resistance(n);
     if(DIODE.has(n.type)){const onNow=on.get(n.id);I=onNow?(vl-vr-val(n,'forwardVoltage',.7))/Math.max(.001,val(n,'onResistance',10)):(vl-vr)/1e10;}
     if(CURRENT.has(n.type))I=val(n,'current',.005);
     if(SUPPLY.has(n.type))I=-solution[sourceIdx.get(n.id)];
     // Milliamps of activity never imply safe power or real-world component survival.
     const power=Math.abs((vl-vr)*I);if(power>1e5||Math.abs(I)>500)tooHigh=true;
     const lit=n.type==='BUZZER'?Math.abs(vr-vl)>=val(n,'threshold',3)&&Math.abs(I)>1e-6:n.type==='LAMP'?power>.05:Math.abs(I)>1e-6;
     readings.set(n.id,{supported:true,current:I,voltage:vr-vl,active:lit,power});
   }
   if(tooHigh)warnings.push('Valores extremos calculados: comprueba conexiones y resistencias.');
   return{readings,warnings,voltageStatus:'DC / instante AC aproximado'};
 }
 const api={simulateAnalog,LINEAR,SUPPLY,DIODE,SUPPORTED};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.PatinosAnalog=api;
})(typeof window!=='undefined'?window:globalThis);
