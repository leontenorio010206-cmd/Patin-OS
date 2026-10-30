/* Standalone 3-valued digital logic engine. Supports browser and Node tests; 3- and 4-input and arithmetic combinational blocks. */
(function (root) {
 'use strict';
 const TYPES={SWITCH:{in:0,name:'Entrada'},CLOCK:{in:0,name:'Reloj'},CONST1:{in:0,name:'1 lógico'},CONST0:{in:0,name:'0 lógico'},AND:{in:2,name:'AND'},OR:{in:2,name:'OR'},XOR:{in:2,name:'XOR'},NAND:{in:2,name:'NAND'},NOR:{in:2,name:'NOR'},XNOR:{in:2,name:'XNOR'},NOT:{in:1,name:'NOT'},BUF:{in:1,name:'BUF'},LED:{in:1,name:'LED'},OUT:{in:1,name:'Salida'}};
const extras={
 AND3:{in:3,name:'AND 3'},OR3:{in:3,name:'OR 3'},XOR3:{in:3,name:'XOR 3'},NAND3:{in:3,name:'NAND 3'},NOR3:{in:3,name:'NOR 3'},XNOR3:{in:3,name:'XNOR 3'},
 AND4:{in:4,name:'AND 4'},OR4:{in:4,name:'OR 4'},XOR4:{in:4,name:'XOR 4'},NAND4:{in:4,name:'NAND 4'},NOR4:{in:4,name:'NOR 4'},XNOR4:{in:4,name:'XNOR 4'},
 MUX2:{in:3,name:'MUX 2:1'},MAJ3:{in:3,name:'Mayoría 3'},ADD_SUM:{in:3,name:'Sumador SUM'},ADD_CARRY:{in:3,name:'Sumador CARRY'},PARITY3:{in:3,name:'Paridad'},EQ:{in:2,name:'Igualdad'},IMPLIES:{in:2,name:'Implicación'},PROBE:{in:1,name:'Sonda'}
 };Object.assign(TYPES,extras);
 const electronics={
 RESISTOR:'Resistencia',POT:'Potenciómetro',LDR:'Fotoresistencia',NTC:'Termistor NTC',PTC:'Termistor PTC',
 DIODE_FAST:'Diodo rápido',DIODE_POWER:'Diodo rectificador 1N400x',DIODE_SI:'Diodo silicio',DIODE_GE:'Diodo germanio',DIODE_SCHOTTKY:'Diodo Schottky',DIODE_ZENER:'Diodo Zener',DIODE_TVS:'Diodo TVS',DIODE_BRIDGE:'Puente rectificador',
 LED_WHITE:'LED blanco',LED_AMBER:'LED ámbar',TVS_BIDIR:'TVS bidireccional',LED_RED:'LED rojo',LED_GREEN:'LED verde',LED_BLUE:'LED azul',LED_RGB:'LED RGB',PHOTODIODE:'Fotodiodo',
 VDC:'Fuente DC',VAC:'Fuente AC',VPULSE:'Fuente de pulso',VTRI:'Fuente triangular',VSAW:'Fuente diente de sierra',IPULSE:'Corriente pulsada',BATTERY:'Batería',CELL:'Pila',ISOURCE:'Fuente de corriente',GND:'Tierra',JUNCTION:'Unión',VCC:'VCC',
 CAP:'Capacitor',CAP_POL:'Electrolítico',CAP_VARIABLE:'Capacitor variable',INDUCTOR:'Inductor',CHOKE:'Choque',TRANSFORMER:'Transformador',
 BUZZER:'Buzzer',PIEZO:'Piezoeléctrico',SPEAKER:'Altavoz',LAMP:'Lámpara',MOTOR:'Motor DC',RELAY:'Relé',FUSE:'Fusible',
 SW_ANALOG:'Interruptor eléctrico',PUSH:'Pulsador',SW_SPDT:'Conmutador',SW_DIP:'DIP switch',
 VOLTMETER:'Voltímetro',AMMETER:'Amperímetro',OHMMETER:'Óhmetro',OSCILLOSCOPE:'Osciloscopio',
 NPN:'Transistor NPN',PNP:'Transistor PNP',NMOS:'MOSFET N',PMOS:'MOSFET P',SCR:'Tiristor SCR',TRIAC:'Triac',OPAMP:'Amplificador operacional',
 REG_7805:'Regulador 7805',TIMER_555:'Temporizador 555',IC_7400:'CI 7400',IC_7404:'CI 7404',COUNTER_4017:'Contador 4017',
 SEVEN_SEG:'Display 7 segmentos',CRYSTAL:'Cristal',ANTENNA:'Antena',SOLAR:'Celda solar',VARISTOR:'Varistor',HALL:'Sensor Hall',MIC:'Micrófono',PUSH_PULL:'Driver push-pull'
 };
 for(const [type,name] of Object.entries(electronics))TYPES[type]={in:1,name,domain:'analog'};
 const PROPERTY_SCHEMAS={
  CLOCK:[['periodMs','Periodo','ms',1000,20,60000],['duty','Ciclo activo','%',50,1,99]],
  RESISTOR:[['resistance','Resistencia','Ω',1000,.1,1e9]], POT:[['resistance','Resistencia total','Ω',10000,1,1e9],['position','Posición','%',50,0,100]],
  LDR:[['resistance','R a 10 lux','Ω',10000,1,1e9],['illuminance','Iluminación','lux',10,.01,100000],['gamma','Exponente de luz','',.8,.1,2.5]],
  NTC:[['resistance','R a 25 °C','Ω',10000,1,1e9],['temperature','Temperatura','°C',25,-40,180],['beta','Constante B','K',3950,500,10000]],
  PTC:[['resistance','R a 25 °C','Ω',1000,1,1e9],['temperature','Temperatura','°C',25,-40,180],['coefficient','Coeficiente térmico','1/°C',.007,0,.1]],
  DIODE_FAST:[['forwardVoltage','Caída directa de referencia (1 mA)','V',.65,.1,3],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_POWER:[['forwardVoltage','Caída directa de referencia (1 mA)','V',.72,.1,3],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  DIODE_SI:[['forwardVoltage','Caída directa aproximada','V',.7,.1,5],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_GE:[['forwardVoltage','Caída directa aproximada','V',.3,.1,2],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_SCHOTTKY:[['forwardVoltage','Caída directa aproximada','V',.25,.05,3],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  LED_WHITE:[['forwardVoltage','Caída directa a 1 mA','V',3.1,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],LED_AMBER:[['forwardVoltage','Caída directa a 1 mA','V',2.05,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  LED_RED:[['forwardVoltage','Caída directa','V',1.9,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],LED_GREEN:[['forwardVoltage','Caída directa','V',2.2,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],LED_BLUE:[['forwardVoltage','Caída directa','V',3,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  VDC:[['voltage','Voltaje DC','V',5,-1000,1000]],BATTERY:[['voltage','Voltaje','V',9,.1,1000]],CELL:[['voltage','Voltaje','V',1.5,.1,50]],
  VAC:[['voltage','Voltaje pico','V',12,0,1000],['frequency','Frecuencia','Hz',50,.1,100000],['phase','Fase','°',0,-360,360]],
  VCC:[['voltage','Voltaje ideal (R respecto L)','V',5,-1000,1000]],
  VPULSE:[['low','Nivel bajo','V',0,-1000,1000],['high','Nivel alto','V',5,-1000,1000],['frequency','Frecuencia','Hz',2,.01,200000],['duty','Ciclo activo','%',50,1,99],['phase','Fase','°',0,-360,360]],
  VTRI:[['voltage','Amplitud pico','V',5,0,1000],['offset','Offset DC','V',0,-1000,1000],['frequency','Frecuencia','Hz',1,.01,200000],['phase','Fase','°',0,-360,360]],
  VSAW:[['voltage','Amplitud pico','V',5,0,1000],['offset','Offset DC','V',0,-1000,1000],['frequency','Frecuencia','Hz',1,.01,200000],['phase','Fase','°',0,-360,360]],
  ISOURCE:[['current','Corriente','A',.005,-100,100]],IPULSE:[['low','Corriente baja','A',0,-100,100],['high','Corriente alta','A',.01,-100,100],['frequency','Frecuencia','Hz',1,.01,200000],['duty','Ciclo activo','%',50,1,99]],CAP:[['capacitance','Capacitancia','µF',10,.001,1e6]],CAP_POL:[['capacitance','Capacitancia','µF',100,.001,1e6]],CAP_VARIABLE:[['capacitance','Capacitancia','µF',1,.001,1e6]],
  INDUCTOR:[['inductance','Inductancia','mH',10,.001,1e6]],CHOKE:[['inductance','Inductancia','mH',100,.001,1e6]],TRANSFORMER:[['ratio','Relación (Np:Ns)','',2,.01,1000]],
  BUZZER:[['resistance','Resistencia equivalente','Ω',200,1,1e6],['threshold','Umbral visual','V',3,.1,100]],PIEZO:[['resistance','Carga equivalente','Ω',5000,1,1e9]],SPEAKER:[['resistance','Impedancia nominal aprox.','Ω',8,1,10000]],
  LAMP:[['resistance','Resistencia simplificada','Ω',100,.1,1e8]],MOTOR:[['resistance','Resistencia de carga','Ω',50,.1,1e8]],FUSE:[['rating','Corriente nominal','A',1,.001,1000]],
  VOLTMETER:[['range','Rango','V',20,.1,10000]],AMMETER:[['range','Rango','A',1,.001,1000]],
  SW_ANALOG:[['closed','Cerrado','boolean',true,0,1]],PUSH:[['closed','Pulsado','boolean',false,0,1]],SW_DIP:[['closed','Cerrado','boolean',true,0,1]],SW_SPDT:[['position','Posición','',1,1,2]],
  DIODE_ZENER:[['breakdown','Voltaje Zener','V',5.1,.2,1000],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_TVS:[['breakdown','Umbral TVS','V',12,.2,1000]],
  REG_7805:[['outputVoltage','Voltaje nominal','V',5,0,100]],TIMER_555:[['frequency','Frecuencia prevista','Hz',1,.001,1e6]],
  SOLAR:[['photoCurrent','Fotocorriente a 1000 W/m²','A',.1,0,100],['irradiance','Irradiancia','W/m²',1000,0,2000],['forwardVoltage','Caída de diodo de celda a 1 mA','V',.52,.05,2],['shuntResistance','Resistencia de fuga','Ω',10000,1,1e9]],
  PHOTODIODE:[['forwardVoltage','Caída a 1 mA','V',.65,.1,5],['photoCurrent','Fotocorriente a 1000 lux','A',.0001,0,10],['illuminance','Iluminación','lux',1000,0,100000],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  VARISTOR:[['breakdown','Umbral aprox.','V',12,.2,1000],['knee','Suavidad de transición','V',.5,.05,10]],
  TVS_BIDIR:[['breakdown','Umbral bilateral','V',12,.2,1000],['knee','Suavidad de transición','V',.3,.05,10]],
  RELAY:[['coilResistance','Resistencia bobina','Ω',120,1,1e8]],SOLAR:[['voltage','Voc nominal','V',6,0,1000]],VARISTOR:[['breakdown','Voltaje nominal','V',275,1,1e5]],CRYSTAL:[['frequency','Frecuencia','Hz',16000000,1,1e9]]
 };
 function defaultProps(type){return Object.fromEntries((PROPERTY_SCHEMAS[type]||[]).map(([key,,unit,def])=>[key,def]));}
 function cleanProps(type,value){const schema=PROPERTY_SCHEMAS[type]||[];const result=defaultProps(type);
  for(const [key,,unit,def,min,max] of schema){if(!value||!(key in value))continue;
   if(unit==='boolean'){if(typeof value[key]==='boolean')result[key]=value[key];continue;}
   const raw=Number(value[key]);if(Number.isFinite(raw)&&raw>=min&&raw<=max)result[key]=raw;
  }return result;
 }

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
 function simulate(nodes,wires,clockState,timeMs){
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
       const localClock=n.type==='CLOCK'&&Number.isFinite(timeMs)?((timeMs%((n.props?.periodMs)||1000))<(((n.props?.periodMs)||1000)*((n.props?.duty)||50)/100)?1:0):clockState;
       const value=evalGate(n.type,ins,n,localClock);
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
     ids.add(n.id);return{id:n.id,type:n.type,x:n.x,y:n.y,label:String(n.label||TYPES[n.type].name).slice(0,32),state:n.state===1?1:0,props:cleanProps(n.type,n.props)};
   });
   const occupied=new Set();const wires=[];
   for(const w of raw.wires){
     if(!w||!ids.has(w.from)||!ids.has(w.to)||['LED','OUT','PROBE'].includes(nodes.find(n=>n.id===w.from).type)||!Number.isInteger(w.input)||w.input<0||w.input>=TYPES[nodes.find(n=>n.id===w.to).type].in)throw Error('Cable inválido.');
     if((TYPES[nodes.find(n=>n.id===w.from).type].domain==='analog') !== (TYPES[nodes.find(n=>n.id===w.to).type].domain==='analog'))throw Error('No conectes componentes analógicos a puertos digitales.');
     const slot=w.to+':'+w.input;if(occupied.has(slot))throw Error('Dos cables en la misma entrada.');occupied.add(slot);
     wires.push({id:typeof w.id==='string'&&/^[-_a-zA-Z0-9]{1,80}$/.test(w.id)?w.id:'w'+wires.length,from:w.from,to:w.to,input:w.input});
   }
   return {format:'digital-flow-v1',nodes,wires};
 }
 const api={TYPES,PROPERTY_SCHEMAS,defaultProps,cleanProps,evalGate,simulate,validateProject};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.DigitalEngine=api;
})(typeof window!=='undefined'?window:globalThis);
