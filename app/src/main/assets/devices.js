/* Patiñ Os 0.9.3 - educational MNA device extensions. NOT ngspice or manufacturer-accurate.
 * A four/five/8/10/14/16-pin network solver for demonstrative component models.
 * All currents are conventional, positive INTO their corresponding terminals.
 */
(function(root){'use strict';
const digital=root.DigitalEngine||(typeof module!=='undefined'&&module.exports?require('./engine.js'):null);
const analog=root.PatinosAnalog||(typeof module!=='undefined'&&module.exports?require('./analog.js'):null);
const rnum=(n,k,d)=>Number.isFinite(Number(n.props?.[k]))?Number(n.props[k]):d;
const DEVICE_TYPES=new Set(['DIODE_BRIDGE','RELAY','SW_SPDT','OHMMETER','OSCILLOSCOPE','HALL','MIC','SCR','TRIAC','REG_7805','TIMER_555','IC_7400','IC_7404','COUNTER_4017','SEVEN_SEG','CRYSTAL','ANTENNA','PUSH_PULL']);
const PASSIVE=new Set(['RESISTOR','POT','LDR','NTC','PTC','FUSE','SW_ANALOG','PUSH','SW_DIP','VOLTMETER','AMMETER','LAMP','BUZZER','PIEZO','SPEAKER','MOTOR']);
const CAP=new Set(['CAP','CAP_POL','CAP_VARIABLE']),IND=new Set(['INDUCTOR','CHOKE']);
const SOURCE=new Set(['VDC','BATTERY','CELL','VCC','VAC','VPULSE','VTRI','VSAW']);
const DIODES=new Set(['DIODE_SI','DIODE_GE','DIODE_SCHOTTKY','DIODE_FAST','DIODE_POWER','LED_RED','LED_GREEN','LED_BLUE','LED_WHITE','LED_AMBER','DIODE_ZENER','DIODE_TVS','PHOTODIODE']);
const TWO=new Set([...PASSIVE,...CAP,...IND,...SOURCE,...DIODES,'GND','JUNCTION','ISOURCE','IPULSE','SOLAR','VARISTOR','TVS_BIDIR']);
const ALLOWED=new Set([...TWO,...DEVICE_TYPES]);
const pinNames={DIODE_BRIDGE:['AC1','AC2','+','−'],SW_SPDT:['COM','A','B'],RELAY:['C+','C−','COM','NO','NC'],OHMMETER:['+','−'],OSCILLOSCOPE:['CH1','GND'],HALL:['VCC','GND','OUT'],MIC:['+','−'],SCR:['A','K','G'],TRIAC:['MT2','MT1','G'],REG_7805:['IN','GND','5V'],TIMER_555:['GND','TRIG','OUT','RESET','CTRL','THRES','DISCH','VCC'],IC_7400:['1A','1B','1Y','2A','2B','2Y','GND','3Y','3A','3B','4Y','4A','4B','VCC'],IC_7404:['1A','1Y','2A','2Y','3A','3Y','GND','4Y','4A','5Y','5A','6Y','6A','VCC'],COUNTER_4017:['Q5','Q1','Q0','Q2','Q6','Q7','Q3','GND','Q8','Q4','Q9','CARRY','INHIBIT','CLK','RESET','VDD'],SEVEN_SEG:['a','b','c','d','e','f','g','dp','COM1','COM2'],ANTENNA:['FEED','GND'],CRYSTAL:['X1','X2'],PUSH_PULL:['VDD','GND','IN','OUT']};
const diode=(v,drop)=>{const vt=.055,R=8,ref=.01,exp=Math.exp(Math.max(-60,Math.min(0,(v-drop)/vt))),floor=ref*Math.exp(Math.max(-60,-drop/vt));return v>drop?{i:ref+(v-drop)/(R+vt/ref),g:1/(R+vt/ref)}:{i:ref*exp-floor,g:Math.max(1e-10,ref*exp/vt)};};
const sigmoid=(z)=>1/(1+Math.exp(-Math.max(-40,Math.min(40,z))));
function solve(A,b){const N=b.length;const m=A.map((row,i)=>[...row,b[i]]);for(let k=0;k<N;k++){let piv=k;for(let j=k+1;j<N;j++)if(Math.abs(m[j][k])>Math.abs(m[piv][k]))piv=j;
 if(!Number.isFinite(m[piv][k])||Math.abs(m[piv][k])<1e-14)return null;
 [m[k],m[piv]]=[m[piv],m[k]];for(let i=k+1;i<N;i++){const f=m[i][k]/m[k][k];for(let j=k;j<=N;j++)m[i][j]-=f*m[k][j];}}
 const x=new Array(N).fill(0);for(let i=N-1;i>=0;i--){let v=m[i][N];for(let j=i+1;j<N;j++)v-=m[i][j]*x[j];x[i]=v/m[i][i];}return x.every(Number.isFinite)?x:null;}
function simulateDevices(nodes,wires,time=0,previous=null){
 const parts=nodes.filter(n=>digital.TYPES[n.type]?.domain==='analog');const readings=new Map(),warnings=[];
 const unsupported=parts.filter(n=>!ALLOWED.has(n.type));
 const failed=(message)=>{warnings.push(message);for(const n of parts)readings.set(n.id,{supported:false,voltage:null,current:null,power:null,active:false});return {readings,warnings,voltageStatus:'Dispositivos: sin solución',state:null,fault:false};};
 if(unsupported.length)return failed('Combinación de modelos aún no soportada: '+[...new Set(unsupported.map(n=>digital.TYPES[n.type]?.name||n.type))].join(', ')+'. Divide el circuito o exporta SPICE.');
 if(parts.length>90)return failed('Límite de 90 componentes eléctricos con dispositivos.');
 const sources=parts.filter(n=>SOURCE.has(n.type)),meters=parts.filter(n=>n.type==='OHMMETER');
 if(!sources.length&&!meters.length&&!parts.some(n=>['MIC','ISOURCE','IPULSE','SOLAR'].includes(n.type)))return failed('Agrega una fuente o un óhmetro a una red pasiva.');
 if(meters.length&&sources.length)return failed('Óhmetro: desconecta las fuentes antes de medir resistencia.');
 const map=new Map(parts.map(n=>[n.id,n])),parent=new Map();
 const rootOf=k=>{if(parent.get(k)!==k)parent.set(k,rootOf(parent.get(k)));return parent.get(k)};
 const join=(a,b)=>{if(parent.has(a)&&parent.has(b)){const x=rootOf(a),y=rootOf(b);if(x!==y)parent.set(x,y);}};
 for(const n of parts)for(let j=0;j<digital.TYPES[n.type].pins;j++)parent.set(n.id+':'+j,n.id+':'+j);
 for(const w of wires)if(map.has(w.from)&&map.has(w.to))join(w.from+':'+(w.fromPin??1),w.to+':'+(w.toPin??0));
 for(const n of parts)if(n.type==='GND'||n.type==='JUNCTION')join(n.id+':0',n.id+':1');
 for(const n of parts)if(n.type==='SEVEN_SEG')join(n.id+':8',n.id+':9');
 const grounds=parts.filter(n=>n.type==='GND');for(let i=1;i<grounds.length;i++)join(grounds[0].id+':0',grounds[i].id+':0');
 const p=(n,k)=>rootOf(n.id+':'+k),netKeys=[...new Set([...parent.keys()].map(rootOf))];const origin=grounds.length?p(grounds[0],0):sources.length?p(sources[0],0):meters.length?p(meters[0],1):p(parts.find(n=>['MIC','ISOURCE','IPULSE','SOLAR'].includes(n.type)),1);
 if(!grounds.length)warnings.push('Referencia 0 V virtual: coloca GND para medir contra tierra.');
 const idx=new Map(netKeys.filter(z=>z!==origin).map((z,i)=>[z,i])),N=idx.size;
 const vIdx=z=>idx.has(z)?idx.get(z):-1;
 const vv=(x,z)=>vIdx(z)>=0?x[vIdx(z)]:0, volts=(x,n,j)=>vv(x,p(n,j));
 const vs=[...sources];const size=N+vs.length;if(size>180)return failed('Sistema de ecuaciones demasiado grande.');
 const t=Math.max(0,time),key=JSON.stringify([parts.map(n=>[n.id,n.type,n.props]),wires.map(w=>[w.from,w.fromPin??1,w.to,w.toPin??0])]);
 const continuing=previous?.key===key&&Number.isFinite(previous.time)&&t>=previous.time;
 const dt=continuing?Math.max(.00005,Math.min(.05,t-previous.time)):.001;
 let memories=new Map(continuing&&previous.memory||[]);let x=continuing&&previous.solution?.length===size?previous.solution.slice():new Array(size).fill(0);
 const deviceState=new Map(continuing&&previous.deviceState||[]);
 const model=n=>{const m=deviceState.get(n.id);return m||{count:0,prevClk:0,latch:false};};
 let converged=false;
 function matrix(x0){
  const A=Array.from({length:size},()=>new Array(size).fill(0)),b=new Array(size).fill(0);
  const add=(i,j,q)=>{if(i>=0&&j>=0)A[i][j]+=q};
  const stamp=(a,c,g,i0=0)=>{const ia=vIdx(a),ic=vIdx(c);add(ia,ia,g);add(ic,ic,g);add(ia,ic,-g);add(ic,ia,-g);if(ia>=0)b[ia]-=i0;if(ic>=0)b[ic]+=i0;};
  const res=(n,a,c,R)=>stamp(p(n,a),p(n,c),1/Math.max(1e-4,R));
  const current=(n,a,c,I)=>stamp(p(n,a),p(n,c),1e-12,I);
  const volt=(n,a,c,level,conductance=1/.5)=>stamp(p(n,a),p(n,c),conductance,-conductance*level);
  const dbranch=(n,a,c,drop)=>{const an=p(n,a),ct=p(n,c),v=vv(x0,an)-vv(x0,ct),d=diode(v,drop);stamp(an,ct,d.g,d.i-d.g*v);};
  for(const n of parts){const type=n.type,pr=n.props||{};
   if(PASSIVE.has(type))res(n,0,1,analog.resistance(n));
   else if(CAP.has(type)){const g=rnum(n,'capacitance',10)*1e-6/dt,old=memories.get(n.id)?.voltage||0;stamp(p(n,0),p(n,1),g,-g*old);}
   else if(IND.has(type)){const g=dt/(Math.max(1e-9,rnum(n,'inductance',10)*1e-3)),old=memories.get(n.id)?.current||0;stamp(p(n,0),p(n,1),g,old);}
   else if(DIODES.has(type)){const reverse=pr.reverse===true;dbranch(n,reverse?1:0,reverse?0:1,rnum(n,'forwardVoltage',type==='DIODE_GE'?.3:type==='LED_BLUE'?3: .7));}
   else if(type==='DIODE_BRIDGE'){const drop=rnum(n,'forwardVoltage',.7);for(const [a,c] of [[0,2],[1,2],[3,0],[3,1]])dbranch(n,a,c,drop);}
   else if(type==='SW_SPDT'){const sel=rnum(n,'position',1);res(n,0,1,sel===1?.02:1e10);res(n,0,2,sel===2?.02:1e10);}
   else if(type==='RELAY'){
     res(n,0,1,rnum(n,'coilResistance',120));const energized=Math.abs(volts(x0,n,0)-volts(x0,n,1))>=rnum(n,'pickUpVoltage',5);
     res(n,2,3,energized?.025:1e10);res(n,2,4,energized?1e10:.025);
   }
   else if(type==='OHMMETER'){current(n,0,1,rnum(n,'testCurrent',1)*.001);}
   else if(type==='OSCILLOSCOPE')res(n,0,1,rnum(n,'inputResistance',1000000));
   else if(type==='HALL'){
     res(n,0,1,1e5);const supply=volts(x0,n,0)-volts(x0,n,1);
     const digitalField=rnum(n,'field',0)>=rnum(n,'threshold',10),out=digitalField?Math.max(0,supply-.15):Math.min(.15,supply);
     volt(n,2,1,out,1/Math.max(5,rnum(n,'outputResistance',100)));
   }
   else if(type==='MIC'){
    const level=rnum(n,'amplitude',.03)*Math.sin(2*Math.PI*rnum(n,'frequency',440)*t);volt(n,0,1,level,1/Math.max(1,rnum(n,'outputResistance',600)));
   }
   else if(type==='SCR'||type==='TRIAC'){
     const gate=volts(x0,n,2)-volts(x0,n,1),v=volts(x0,n,0)-volts(x0,n,1),prev=model(n);
     const triggered=(type==='TRIAC'?Math.abs(gate):gate)>rnum(n,'gateThreshold',.7);
     const conduction=triggered||(prev.latch&&Math.abs(v)>.03);
     const allowedPolarity=type==='TRIAC'||v>=0;
     res(n,0,1,conduction&&allowedPolarity?rnum(n,'onResistance',1):1e10);
     res(n,2,1,Math.max(10,rnum(n,'gateResistance',1000)));
   }
   else if(type==='REG_7805'){
     res(n,0,1,Math.max(500,rnum(n,'quiescentResistance',1000)));
     const vin=volts(x0,n,0)-volts(x0,n,1),target=Math.max(0,Math.min(rnum(n,'outputVoltage',5),vin-rnum(n,'dropout',2)));
     volt(n,2,1,target,1/Math.max(.2,rnum(n,'outputResistance',.2)));
   }
   else if(type==='TIMER_555'){
     const supply=Math.max(0,volts(x0,n,7)-volts(x0,n,0));res(n,7,0,8000);
     const reset=volts(x0,n,3)-volts(x0,n,0),freq=rnum(n,'frequency',1),duty=rnum(n,'duty',50)/100;
     const level=reset>=Math.max(1,supply*.3)&&t*freq%1<duty?supply-.2:.1;
     volt(n,2,0,Math.max(0,level),1/Math.max(10,rnum(n,'outputResistance',50)));
     res(n,1,0,1e8);res(n,4,0,1e8);res(n,5,0,1e8);res(n,6,0,1e8);
   }
   else if(type==='IC_7400'||type==='IC_7404'){
     const gnd=type==='IC_7400'?6:6,vc=13;
     const vdd=volts(x0,n,vc)-volts(x0,n,gnd);res(n,vc,gnd,25000);
     const groups=type==='IC_7400'?[[0,1,2],[3,4,5],[8,9,7],[11,12,10]]:[[0,1],[2,3],[4,5],[8,7],[10,9],[12,11]];
     for(const gs of groups){const input=gs.slice(0,-1),output=gs[gs.length-1];
       for(const pin of input)res(n,pin,gnd,1e7);
       const levels=input.map(pin=>volts(x0,n,pin)-volts(x0,n,gnd));
       const tr=vdd>2.5,ones=levels.every(a=>a>vdd*.6),zero=levels.some(a=>a<vdd*.3);
       const on=type==='IC_7400'?!ones:zero;
       if(tr)volt(n,output,gnd,on?Math.max(0,vdd-.3):.2,1/Math.max(10,rnum(n,'outputResistance',45)));
       else res(n,output,gnd,1e8);
     }
   }
   else if(type==='COUNTER_4017'){
     const st=model(n),vdd=volts(x0,n,15)-volts(x0,n,7);res(n,15,7,30000);
     const outs=[2,1,3,6,9,0,4,5,8,10];
     for(let k=0;k<outs.length;k++)if(vdd>3)volt(n,outs[k],7,k===st.count?vdd-.25:.1,1/Math.max(20,rnum(n,'outputResistance',75)));
     if(vdd>3)volt(n,11,7,st.count<5?vdd-.25:.1,1/75);
     for(const k of [12,13,14])res(n,k,7,1e8);
   }
   else if(type==='SEVEN_SEG'){
     const common=8,commonAnode=pr.commonAnode===true;for(let j=0;j<8;j++)dbranch(n,commonAnode?common:j,commonAnode?j:common,j===7?1.9:rnum(n,'forwardVoltage',2.0));
   }
   else if(type==='CRYSTAL'){
     const R=rnum(n,'seriesResistance',40),L=rnum(n,'seriesInductance',10)*.001,C=rnum(n,'seriesCapacitance',.01)*1e-12;
     const old=memories.get(n.id)||{current:0,capacitorVoltage:0},Z=R+L/dt+dt/C;
     stamp(p(n,0),p(n,1),1/Z,((L/dt)*old.current-old.capacitorVoltage)/Z);
   }
   else if(type==='ANTENNA'){
     res(n,0,1,rnum(n,'radiationResistance',73));const C=rnum(n,'parasiticCapacitance',10)*1e-12;
     const g=C/dt,old=memories.get(n.id)?.voltage||0;stamp(p(n,0),p(n,1),g,-g*old);
   }
   else if(type==='PUSH_PULL'){
     const vdd=volts(x0,n,0)-volts(x0,n,1),vi=volts(x0,n,2)-volts(x0,n,1);
     const high=vi>Math.max(.7,vdd*.55),level=high?Math.max(0,vdd-.2):.1;
     if(vdd>1)volt(n,3,1,level,1/Math.max(1,rnum(n,'outputResistance',20)));
     res(n,2,1,1e7);res(n,0,1,1e6);
   }
   else if(type==='SOLAR'){const g=1/Math.max(1,rnum(n,'shuntResistance',10000));stamp(p(n,0),p(n,1),g,rnum(n,'photoCurrent',.1)*rnum(n,'irradiance',1000)/1000);}
   else if(type==='ISOURCE'||type==='IPULSE'){const cur=type==='ISOURCE'?rnum(n,'current',.005):analog.sourceCurrent?.(n,t)??rnum(n,'high',.01);current(n,0,1,cur);}
   else if(type==='VARISTOR'||type==='TVS_BIDIR')res(n,0,1,Math.abs(volts(x0,n,0)-volts(x0,n,1))>rnum(n,'breakdown',12)?5:1e9);
  }
  vs.forEach((n,j)=>{const a=p(n,1),c=p(n,0),col=N+j,ia=vIdx(a),ic=vIdx(c);
   add(ia,col,1);add(ic,col,-1);add(col,ia,1);add(col,ic,-1);
   b[col]=analog.sourceVoltage(n,t);
  });
  for(let i=0;i<N;i++)A[i][i]+=1e-10;
  return {A,b};
 }
 // Electrical nonlinear iteration; limit voltage changes to avoid diode divergence.
 for(let iter=0;iter<90;iter++){
  const {A,b}=matrix(x),next=solve(A,b);if(!next)break;
  let alpha=1;for(let i=0;i<N;i++){const dv=Math.abs(next[i]-x[i]);if(dv>1)alpha=Math.min(alpha,1/dv);}
  const xx=x.map((v,i)=>v+alpha*(next[i]-v));const change=Math.max(0,...xx.map((v,i)=>Math.abs(v-x[i])));
  x=xx;if(change<1e-7){converged=true;break;}
 }
 if(!converged)return failed('No convergió la red con dispositivos: revisa referencias, conexiones y fuentes.');
 // Update history once per elapsed time step, never during Newton iterations.
 for(const n of parts){const type=n.type,v=volts(x,n,0)-volts(x,n,1),old=memories.get(n.id)||{};
  if(CAP.has(type))memories.set(n.id,{voltage:v,current:rnum(n,'capacitance',10)*1e-6/dt*(v-(old.voltage||0))});
  if(IND.has(type))memories.set(n.id,{current:(old.current||0)+dt/(rnum(n,'inductance',10)*1e-3)*v});
  if(type==='ANTENNA')memories.set(n.id,{voltage:v});
  if(type==='CRYSTAL'){const L=rnum(n,'seriesInductance',10)*.001,C=rnum(n,'seriesCapacitance',.01)*1e-12,R=rnum(n,'seriesResistance',40),z=R+L/dt+dt/C;
   const i=(v+(L/dt)*(old.current||0)-(old.capacitorVoltage||0))/z;memories.set(n.id,{current:i,capacitorVoltage:(old.capacitorVoltage||0)+dt/C*i});}
  if(type==='COUNTER_4017'){
   const vdd=volts(x,n,15)-volts(x,n,7),clk=volts(x,n,13)-volts(x,n,7),rst=volts(x,n,14)-volts(x,n,7),en=volts(x,n,12)-volts(x,n,7),st=model(n);
   const currentClk=clk>Math.max(1,vdd*.65)?1:0;
   if(rst>Math.max(1,vdd*.65))st.count=0;
   else if(vdd>=3&&currentClk&&!st.prevClk&&en<Math.max(.8,vdd*.3))st.count=(st.count+1)%10;
   st.prevClk=currentClk;deviceState.set(n.id,st);
  }
  if(type==='SCR'||type==='TRIAC'){
   const st=model(n),gate=volts(x,n,2)-volts(x,n,1),current=Math.abs(v)/Math.max(.1,rnum(n,'onResistance',1));
   st.latch=((type==='TRIAC'?Math.abs(gate):gate)>rnum(n,'gateThreshold',.7))||(st.latch&&current>rnum(n,'holdingCurrent',.01));
   deviceState.set(n.id,st);
  }
 }
 const display=(n,i,other)=>volts(x,n,i)-volts(x,n,other);
 let fault=false;
 for(const n of parts){const type=n.type,pr=n.props||{};const count=digital.TYPES[type].pins,terminals=Array.from({length:count},(_,i)=>volts(x,n,i));let pinCurrents=new Array(count).fill(0),current=0,voltage=0,channels=null;
  const transfer=(a,c,i)=>{pinCurrents[a]+=i;pinCurrents[c]-=i;};
  if(PASSIVE.has(type)||type==='ANTENNA'){voltage=display(n,0,1);current=voltage/(type==='ANTENNA'?rnum(n,'radiationResistance',73):analog.resistance(n));transfer(0,1,current);}
  else if(type==='SW_SPDT'){voltage=display(n,0,rnum(n,'position',1));current=voltage/.02;transfer(0,rnum(n,'position',1),current);}
  else if(type==='RELAY'){voltage=display(n,0,1);current=voltage/rnum(n,'coilResistance',120);transfer(0,1,current);const energized=Math.abs(voltage)>=rnum(n,'pickUpVoltage',5),dest=energized?3:4,ic=display(n,2,dest)/.025;transfer(2,dest,ic);channels={coilCurrent:current,contactCurrent:ic,energized};}
  else if(type==='DIODE_BRIDGE'){for(const [a,c] of [[0,2],[1,2],[3,0],[3,1]])transfer(a,c,diode(display(n,a,c),rnum(n,'forwardVoltage',.7)).i);voltage=display(n,2,3);current=-pinCurrents[2];}
  else if(type==='SEVEN_SEG'){let light=0;channels={};for(let j=0;j<8;j++){const an=pr.commonAnode?8:j,ca=pr.commonAnode?j:8;const i=Math.max(0,diode(display(n,an,ca),j===7?1.9:rnum(n,'forwardVoltage',2)).i);transfer(an,ca,i);channels[['a','b','c','d','e','f','g','dp'][j]]=i;light+=i;}voltage=display(n,0,8);current=light;}
  else if(type==='OHMMETER'){current=rnum(n,'testCurrent',1)*.001;voltage=display(n,0,1);channels={resistanceOhm:Math.abs(voltage/current)};transfer(0,1,current);}
  else if(type==='OSCILLOSCOPE'){voltage=display(n,0,1);current=voltage/rnum(n,'inputResistance',1e6);transfer(0,1,current);channels={channel1:voltage};}
  else if(type==='COUNTER_4017'){channels={count:model(n).count};current=0;voltage=display(n,15,7);}
  else if(['IC_7400','IC_7404','REG_7805','TIMER_555','HALL','PUSH_PULL'].includes(type)){voltage=display(n,0,1);current=0;channels={};if(type==='REG_7805')channels.outputVoltage=display(n,2,1);if(type==='HALL')channels.outputVoltage=display(n,2,1);if(type==='TIMER_555')channels.outputVoltage=display(n,2,0);if(type==='PUSH_PULL')channels.outputVoltage=display(n,3,1);}
  else if(type==='SCR'||type==='TRIAC'){voltage=display(n,0,1);current=voltage/(model(n).latch?rnum(n,'onResistance',1):1e10);transfer(0,1,current);channels={latched:model(n).latch};}
  else if(SOURCE.has(type)){const j=vs.findIndex(z=>z.id===n.id);current=-x[N+j];voltage=-display(n,0,1);transfer(1,0,current);}
  else if(type==='MIC'){voltage=display(n,0,1);current=(voltage-rnum(n,'amplitude',.03)*Math.sin(2*Math.PI*rnum(n,'frequency',440)*t))/Math.max(1,rnum(n,'outputResistance',600));transfer(0,1,current);}
  else if(type==='CRYSTAL'||CAP.has(type)||IND.has(type)){voltage=display(n,0,1);current=memories.get(n.id)?.current||0;transfer(0,1,current);}
  else if(DIODES.has(type)){voltage=display(n,0,1);current=diode(pr.reverse?-voltage:voltage,rnum(n,'forwardVoltage',.7)).i*(pr.reverse?-1:1);transfer(0,1,current);}
  else voltage=display(n,0,1);
  if(Math.abs(current)>20||Math.abs(current*voltage)>1500)fault=true;
  readings.set(n.id,{supported:true,current,voltage,power:voltage*current,active:Math.abs(current)>1e-6||(channels?.outputVoltage>1)||(channels?.resistanceOhm!==undefined),pinCurrents,channels});
 }
 if(parts.some(n=>n.type==='CRYSTAL'))warnings.push('Cristal: resonador RLC pasivo aproximado; no genera reloj sin oscilador externo.');
 if(parts.some(n=>n.type==='ANTENNA'))warnings.push('Antena: carga R/C aproximada; NO simula irradiación, ondas ni adaptación RF completa.');
 if(parts.some(n=>['REG_7805','TIMER_555','IC_7400','IC_7404','COUNTER_4017','SCR','TRIAC','RELAY','HALL','PUSH_PULL'].includes(n.type)))warnings.push('Modelos funcionales didácticos, sin tolerancias, térmica, retardos ni protección detallada de fabricante.');
 if(fault)warnings.push('Posible sobrecorriente: revisa límites y resistencias.');
 return {readings,warnings,voltageStatus:'MNA didáctico · dispositivos multipin',state:{key,time:t,memory:memories,solution:x,deviceState},fault};
}
const api={DEVICE_TYPES,pinNames,simulateDevices};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PatinosDevices=api;
})(typeof window!=='undefined'?window:globalThis);
