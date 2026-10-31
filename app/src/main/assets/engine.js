/* Standalone 3-valued digital logic engine. Supports browser and Node tests; 3- and 4-input and arithmetic combinational blocks. */
(function (root) {
 'use strict';
 const TYPES={SWITCH:{in:0,name:'Entrada'},CLOCK:{in:0,name:'Reloj'},CONST1:{in:0,name:'1 lógico'},CONST0:{in:0,name:'0 lógico'},AND:{in:2,name:'AND'},OR:{in:2,name:'OR'},XOR:{in:2,name:'XOR'},NAND:{in:2,name:'NAND'},NOR:{in:2,name:'NOR'},XNOR:{in:2,name:'XNOR'},NOT:{in:1,name:'NOT'},BUF:{in:1,name:'BUF'},LED:{in:1,name:'LED'},OUT:{in:1,name:'Salida'}};
const extras={
 AND3:{in:3,name:'AND 3'},OR3:{in:3,name:'OR 3'},XOR3:{in:3,name:'XOR 3'},NAND3:{in:3,name:'NAND 3'},NOR3:{in:3,name:'NOR 3'},XNOR3:{in:3,name:'XNOR 3'},
 AND4:{in:4,name:'AND 4'},OR4:{in:4,name:'OR 4'},XOR4:{in:4,name:'XOR 4'},NAND4:{in:4,name:'NAND 4'},NOR4:{in:4,name:'NOR 4'},XNOR4:{in:4,name:'XNOR 4'},
 MUX2:{in:3,name:'MUX 2:1'},MAJ3:{in:3,name:'Mayoría 3'},ADD_SUM:{in:3,name:'Sumador SUM'},ADD_CARRY:{in:3,name:'Sumador CARRY'},PARITY3:{in:3,name:'Paridad'},EQ:{in:2,name:'Igualdad'},IMPLIES:{in:2,name:'Implicación'},PROBE:{in:1,name:'Sonda'}
 };Object.assign(TYPES,extras);
 // Combinational logic with one explicit output pin per module; sequential blocks hold their Q state.
 Object.assign(TYPES,{AND5:{in:5,name:'AND 5'},OR5:{in:5,name:'OR 5'},XOR5:{in:5,name:'XOR 5'},NAND5:{in:5,name:'NAND 5'},NOR5:{in:5,name:'NOR 5'},XNOR5:{in:5,name:'XNOR 5'},
 AND6:{in:6,name:'AND 6'},OR6:{in:6,name:'OR 6'},XOR6:{in:6,name:'XOR 6'},NAND6:{in:6,name:'NAND 6'},NOR6:{in:6,name:'NOR 6'},XNOR6:{in:6,name:'XNOR 6'},
 DFF:{in:2,name:'Flip-flop D (D, CLK)'},TFF:{in:2,name:'Flip-flop T (T, CLK)'},JKFF:{in:3,name:'Flip-flop JK (J, K, CLK)'},SRLATCH:{in:2,name:'Latch SR (S, R)'},
 DEC2_0:{in:2,name:'Decodificador 2→4 · Y0'},DEC2_1:{in:2,name:'Decodificador 2→4 · Y1'},DEC2_2:{in:2,name:'Decodificador 2→4 · Y2'},DEC2_3:{in:2,name:'Decodificador 2→4 · Y3'},
 DEMUX0:{in:2,name:'Demultiplexor Y0 (D,S)'},DEMUX1:{in:2,name:'Demultiplexor Y1 (D,S)'},
 ENCODER4_B0:{in:4,name:'Codificador prioridad B0'},ENCODER4_B1:{in:4,name:'Codificador prioridad B1'}
 });
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
 const DEVICE_PINS={DIODE_BRIDGE:4,RELAY:5,SW_SPDT:3,OHMMETER:2,OSCILLOSCOPE:2,HALL:3,MIC:2,SCR:3,TRIAC:3,REG_7805:3,TIMER_555:8,IC_7400:14,IC_7404:14,COUNTER_4017:16,SEVEN_SEG:10,CRYSTAL:2,ANTENNA:2,PUSH_PULL:4};
 for(const [type,name] of Object.entries(electronics))TYPES[type]={in:1,name,domain:'analog',pins:DEVICE_PINS[type]||(['NPN','PNP','NMOS','PMOS','OPAMP'].includes(type)?3:['LED_RGB','TRANSFORMER'].includes(type)?4:2)};
 const PROPERTY_SCHEMAS={
  DFF:[['initial','Q inicial','',0,0,1]],TFF:[['initial','Q inicial','',0,0,1]],JKFF:[['initial','Q inicial','',0,0,1]],SRLATCH:[['initial','Q inicial','',0,0,1]],
  CLOCK:[['periodMs','Periodo','ms',1000,20,60000],['duty','Ciclo activo','%',50,1,99]],
  RESISTOR:[['resistance','Resistencia','Ω',1000,.1,1e9]], POT:[['resistance','Resistencia total','Ω',10000,1,1e9],['position','Posición','%',50,0,100]],
  LDR:[['resistance','R a 10 lux','Ω',10000,1,1e9],['illuminance','Iluminación','lux',10,.01,100000],['gamma','Exponente de luz','',.8,.1,2.5]],
  NTC:[['resistance','R a 25 °C','Ω',10000,1,1e9],['temperature','Temperatura','°C',25,-40,180],['beta','Constante B','K',3950,500,10000]],
  PTC:[['resistance','R a 25 °C','Ω',1000,1,1e9],['temperature','Temperatura','°C',25,-40,180],['coefficient','Coeficiente térmico','1/°C',.007,0,.1]],
  DIODE_FAST:[['forwardVoltage','Caída directa de referencia (1 mA)','V',.65,.1,3],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_POWER:[['forwardVoltage','Caída directa de referencia (1 mA)','V',.72,.1,3],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  DIODE_SI:[['forwardVoltage','Caída directa aproximada','V',.7,.1,5],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_GE:[['forwardVoltage','Caída directa aproximada','V',.3,.1,2],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_SCHOTTKY:[['forwardVoltage','Caída directa aproximada','V',.25,.05,3],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  LED_WHITE:[['forwardVoltage','Caída directa a 1 mA','V',3.1,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],LED_AMBER:[['forwardVoltage','Caída directa a 1 mA','V',2.05,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  LED_RGB:[['redForward','Vf rojo @ 10mA','V',1.9,.5,5],['greenForward','Vf verde @ 10mA','V',2.2,.5,5],['blueForward','Vf azul @ 10mA','V',3.0,.5,5],['commonAnode','Ánodo común (A)','boolean',false,0,1]],
  LED_RED:[['forwardVoltage','Caída directa','V',1.9,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],LED_GREEN:[['forwardVoltage','Caída directa','V',2.2,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],LED_BLUE:[['forwardVoltage','Caída directa','V',3,.2,10],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  VDC:[['voltage','Voltaje DC','V',5,-1000,1000]],BATTERY:[['voltage','Voltaje','V',9,.1,1000]],CELL:[['voltage','Voltaje','V',1.5,.1,50]],
  VAC:[['voltage','Voltaje pico','V',12,0,1000],['frequency','Frecuencia','Hz',50,.1,100000],['phase','Fase','°',0,-360,360]],
  VCC:[['voltage','Voltaje ideal (R respecto L)','V',5,-1000,1000]],
  VPULSE:[['low','Nivel bajo','V',0,-1000,1000],['high','Nivel alto','V',5,-1000,1000],['frequency','Frecuencia','Hz',2,.01,200000],['duty','Ciclo activo','%',50,1,99],['phase','Fase','°',0,-360,360]],
  VTRI:[['voltage','Amplitud pico','V',5,0,1000],['offset','Offset DC','V',0,-1000,1000],['frequency','Frecuencia','Hz',1,.01,200000],['phase','Fase','°',0,-360,360]],
  VSAW:[['voltage','Amplitud pico','V',5,0,1000],['offset','Offset DC','V',0,-1000,1000],['frequency','Frecuencia','Hz',1,.01,200000],['phase','Fase','°',0,-360,360]],
  ISOURCE:[['current','Corriente','A',.005,-100,100]],IPULSE:[['low','Corriente baja','A',0,-100,100],['high','Corriente alta','A',.01,-100,100],['frequency','Frecuencia','Hz',1,.01,200000],['duty','Ciclo activo','%',50,1,99]],CAP:[['capacitance','Capacitancia','µF',10,.001,1e6]],CAP_POL:[['capacitance','Capacitancia','µF',100,.001,1e6]],CAP_VARIABLE:[['capacitance','Capacitancia','µF',1,.001,1e6]],
  INDUCTOR:[['inductance','Inductancia','mH',10,.001,1e6]],CHOKE:[['inductance','Inductancia','mH',100,.001,1e6]],TRANSFORMER:[['ratio','Relación de espiras Np:Ns','',2,.05,100],['inductance','Inductancia primaria','mH',100,.1,1e6],['coupling','Acoplamiento k','',.995,.1,.9999],['primaryResistance','R primaria','Ω',.5,.001,1e4],['secondaryResistance','R secundaria','Ω',.25,.001,1e4]],
  BUZZER:[['resistance','Resistencia equivalente','Ω',200,1,1e6],['threshold','Umbral audible','V',3,.1,100],['toneHz','Tono buzzer','Hz',2200,30,12000]],PIEZO:[['resistance','Carga equivalente','Ω',5000,1,1e9],['gain','Intensidad de audio','%',80,0,100]],SPEAKER:[['resistance','Impedancia nominal aprox.','Ω',8,1,10000],['gain','Intensidad de audio','%',100,0,100]],
  LAMP:[['resistance','Resistencia simplificada','Ω',100,.1,1e8]],MOTOR:[['resistance','Resistencia de carga','Ω',50,.1,1e8]],FUSE:[['rating','Corriente nominal','A',1,.001,1000]],
  VOLTMETER:[['range','Rango','V',20,.1,10000]],AMMETER:[['range','Rango','A',1,.001,1000]],
  SW_ANALOG:[['closed','Cerrado','boolean',true,0,1]],PUSH:[['closed','Pulsado','boolean',false,0,1]],SW_DIP:[['closed','Cerrado','boolean',true,0,1]],SW_SPDT:[['position','Posición','',1,1,2]],
  DIODE_ZENER:[['breakdown','Voltaje Zener','V',5.1,.2,1000],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],DIODE_TVS:[['breakdown','Umbral TVS','V',12,.2,1000]],
  REG_7805:[['outputVoltage','Voltaje nominal','V',5,0,100]],TIMER_555:[['frequency','Frecuencia prevista','Hz',1,.001,1e6]],
  SOLAR:[['photoCurrent','Fotocorriente a 1000 W/m²','A',.1,0,100],['irradiance','Irradiancia','W/m²',1000,0,2000],['forwardVoltage','Caída de diodo de celda a 1 mA','V',.52,.05,2],['shuntResistance','Resistencia de fuga','Ω',10000,1,1e9]],
  PHOTODIODE:[['forwardVoltage','Caída a 1 mA','V',.65,.1,5],['photoCurrent','Fotocorriente a 1000 lux','A',.0001,0,10],['illuminance','Iluminación','lux',1000,0,100000],['reverse','Invertir ánodo/cátodo','boolean',false,0,1]],
  VARISTOR:[['breakdown','Umbral aprox.','V',12,.2,1000],['knee','Suavidad de transición','V',.5,.05,10]],
  TVS_BIDIR:[['breakdown','Umbral bilateral','V',12,.2,1000],['knee','Suavidad de transición','V',.3,.05,10]],
  NPN:[['beta','Ganancia aproximada β','',100,10,1000],['saturationCurrent','Corriente de saturación B-E','A',1e-14,1e-17,1e-10]],
  PNP:[['beta','Ganancia aproximada β','',100,10,1000],['saturationCurrent','Corriente de saturación B-E','A',1e-14,1e-17,1e-10]],
  NMOS:[['threshold','Tensión umbral Vth','V',2,.1,10],['transconductance','Parámetro KP','A/V²',.002,.000001,1],['channelLambda','Modulación de canal','1/V',.02,0,1]],
  PMOS:[['threshold','Magnitud de Vth','V',2,.1,10],['transconductance','Parámetro KP','A/V²',.002,.000001,1],['channelLambda','Modulación de canal','1/V',.02,0,1]],
  OPAMP:[['openLoopGain','Ganancia abierta idealizada','V/V',100,1,100000],['railVoltage','Riel virtual de saturación','V',12,.1,100]],
  RELAY:[['coilResistance','Resistencia bobina','Ω',120,1,1e8],['pickUpVoltage','Voltaje activación','V',5,.1,100]],
 CRYSTAL:[['frequency','Frecuencia nominal (referencia)','Hz',16000000,1,1e9],['seriesResistance','Resistencia serie','Ω',40,.01,1e6],['seriesInductance','Inductancia motional','mH',10,.001,1e7],['seriesCapacitance','Capacitancia motional','pF',.01,.00001,1000]],
 DIODE_BRIDGE:[['forwardVoltage','Caída por diodo','V',.7,.1,3]],
 SW_SPDT:[['position','Contacto seleccionado','',1,1,2]],OHMMETER:[['testCurrent','Corriente de prueba','mA',1,.001,10]],OSCILLOSCOPE:[['inputResistance','Impedancia de entrada','Ω',1000000,10000,1e12]],
 HALL:[['field','Campo magnético','mT',0,-500,500],['threshold','Umbral magnético','mT',10,-500,500],['outputResistance','Resistencia de salida','Ω',100,1,1e6]],
 MIC:[['frequency','Frecuencia acústica','Hz',440,1,20000],['amplitude','Amplitud de señal','V',.03,0,10],['outputResistance','Resistencia de salida','Ω',600,1,1e6]],
 SCR:[['gateThreshold','Umbral de compuerta','V',.7,.1,5],['gateResistance','Resistencia compuerta','Ω',1000,10,1e6],['onResistance','Resistencia conduciendo','Ω',1,.01,100],['holdingCurrent','Corriente mantenimiento','A',.01,.00001,10]],
 TRIAC:[['gateThreshold','Umbral de compuerta','V',.7,.1,5],['gateResistance','Resistencia compuerta','Ω',1000,10,1e6],['onResistance','Resistencia conduciendo','Ω',1,.01,100],['holdingCurrent','Corriente mantenimiento','A',.01,.00001,10]],
 REG_7805:[['outputVoltage','Salida nominal','V',5,1,20],['dropout','Caída mínima','V',2,.1,10],['quiescentResistance','Consumo aproximado','Ω',1000,100,1e7],['outputResistance','Resistencia de salida','Ω',.2,.01,500]],
 TIMER_555:[['frequency','Reloj astable idealizado','Hz',1,.001,100000],['duty','Ciclo activo','%',50,1,99],['outputResistance','Resistencia salida','Ω',50,1,10000]],
 IC_7400:[['outputResistance','Resistencia salidas','Ω',45,1,10000]],IC_7404:[['outputResistance','Resistencia salidas','Ω',45,1,10000]],COUNTER_4017:[['outputResistance','Resistencia salidas','Ω',75,1,10000]],
 SEVEN_SEG:[['commonAnode','Ánodo común','boolean',false,0,1],['forwardVoltage','Caída por segmento','V',2,.5,5]],
 ANTENNA:[['radiationResistance','R equivalente de radiación','Ω',73,1,1e6],['parasiticCapacitance','Capacitancia parásita','pF',10,.001,1e6]],
 PUSH_PULL:[['outputResistance','Resistencia salida','Ω',20,.1,10000]]
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
  const match=/^(AND|OR|XOR|NAND|NOR|XNOR)[3456]$/.exec(type);
  if(!match)return null;
  const gate=match[1],base=({NAND:'AND',NOR:'OR',XNOR:'XOR'})[gate]||gate;
  let out=null;
  if(base==='AND')out=inputs.includes(0)?0:allKnown(inputs)?1:null;
  if(base==='OR')out=inputs.includes(1)?1:allKnown(inputs)?0:null;
  if(base==='XOR')out=allKnown(inputs)?inputs.reduce((a,b)=>a^b,0):null;
  return ['NAND','NOR','XNOR'].includes(gate)&&isLevel(out)?1-out:out;
 }
 
 function isLevel(v){return v===1||v===0;}
 function evalGate(type, inputs, node, clockState){
   if(type==='SWITCH')return node.state===1?1:0;
   if(type==='CONST1')return 1;
   if(type==='CONST0')return 0;
   if(type==='CLOCK')return clockState?1:0;
   const a=inputs[0],b=inputs[1];
   if(/^(AND|OR|XOR|NAND|NOR|XNOR)[3456]$/.test(type))return evalMulti(type,inputs);
   if(type==='MAJ3'||type==='ADD_CARRY'){
     const ones=inputs.filter(v=>v===1).length,zeros=inputs.filter(v=>v===0).length;
     return ones>=2?1:zeros>=2?0:null;
   }
   if(type==='ADD_SUM'||type==='PARITY3')return allKnown(inputs)?inputs.reduce((x,v)=>x^v,0):null;
   if(type==='MUX2'){const sel=inputs[2];if(isLevel(sel))return inputs[sel];return a===b&&isLevel(a)?a:null;}
   const decoder=/^DEC2_([0-3])$/.exec(type);
   if(decoder)return allKnown(inputs)?Number((inputs[0]+2*inputs[1])===Number(decoder[1])):null;
   if(type==='DEMUX0'||type==='DEMUX1'){const d=inputs[0],sel=inputs[1];if(sel===null||sel===undefined)return d===0?0:null;return sel===(type==='DEMUX0'?0:1)?d:0;}
   if(type==='ENCODER4_B0'||type==='ENCODER4_B1'){
     if(inputs.some(v=>v===null||v===undefined))return null;
     const priority=[3,2,1,0].find(i=>inputs[i]===1);
     if(priority===undefined)return null;
     return type==='ENCODER4_B0'?(priority&1):((priority>>1)&1);
   }
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
 const SEQUENTIAL=new Set(['DFF','TFF','JKFF','SRLATCH']);
 /** state is optional, but must be passed back for edge-triggered circuits. No global mutable state. */
 function simulate(nodes,wires,clockState,timeMs,state){
   const index=new Map(nodes.map(n=>[n.id,n]));
   const inputLinks=new Map();let conflict=false;
   for(const w of wires){
     const dest=index.get(w.to),from=index.get(w.from);
     if(!dest||!from||TYPES[dest.type]?.domain==='analog'||TYPES[from.type]?.domain==='analog')continue;
     if(!Number.isInteger(w.input)||w.input<0||w.input>=TYPES[dest.type].in)continue;
     const key=w.to+':'+w.input;
     if(inputLinks.has(key))conflict=true;
     inputLinks.set(key,w.from);
   }
   const prior=state?.registers||{};const registers={};
   for(const n of nodes)if(SEQUENTIAL.has(n.type)){
     const old=prior[n.id];
     registers[n.id]={q:old?.q===null?null:(old?.q===1?1:old?.q===0?0:(n.props?.initial===1?1:0)),prevClock:old?.prevClock===1?1:old?.prevClock===0?0:0};
   }
   const inputsFor=(n,outs)=>Array.from({length:TYPES[n.type].in},(_,i)=>{
     const src=inputLinks.get(n.id+':'+i);return src==null?null:outs.get(src);
   });
   function settle(){
     const outs=new Map(nodes.map(n=>[n.id,SEQUENTIAL.has(n.type)?registers[n.id].q:null]));
     let stable=false;
     for(let step=0;step<Math.max(32,nodes.length*4);step++){
       let changed=false;
       for(const n of nodes){
         if(!TYPES[n.type]||TYPES[n.type].domain==='analog'||SEQUENTIAL.has(n.type))continue;
         const localClock=n.type==='CLOCK'&&Number.isFinite(timeMs)?
          ((timeMs%(n.props?.periodMs||1000))<((n.props?.periodMs||1000)*(n.props?.duty??50)/100)?1:0):clockState;
         const value=evalGate(n.type,inputsFor(n,outs),n,localClock);
         if(outs.get(n.id)!==value){outs.set(n.id,value);changed=true;}
       }
       if(!changed){stable=true;break;}
     }
     if(!stable)for(const n of nodes)if(!SEQUENTIAL.has(n.type)&&!['SWITCH','CONST1','CONST0','CLOCK'].includes(n.type))outs.set(n.id,null);
     return {outs,stable};
   }
   let result=settle(),changedState=false;
   // Update sequential elements exactly once per simulation step. Re-evaluate combinational outputs after updates.
   for(const n of nodes){
     if(!SEQUENTIAL.has(n.type))continue;
     const reg=registers[n.id],ins=inputsFor(n,result.outs);let next=reg.q;
     if(n.type==='SRLATCH'){
       const [set,reset]=ins;
       if(set===1&&reset===1)next=null; // invalid active-high SR command
       else if(set===1&&reset===0)next=1;
       else if(set===0&&reset===1)next=0;
       else if(set===null||reset===null)next=null;
     }else{
       const clk=ins[n.type==='JKFF'?2:1];
       if(clk===1&&reg.prevClock===0){
         if(n.type==='DFF')next=ins[0];
         if(n.type==='TFF')next=ins[0]===0?reg.q:ins[0]===1&&reg.q!==null?1-reg.q:null;
         if(n.type==='JKFF'){
           const [j,k]=ins;
           if(j===0&&k===0)next=reg.q;
           else if(j===1&&k===0)next=1;
           else if(j===0&&k===1)next=0;
           else if(j===1&&k===1)next=reg.q===null?null:1-reg.q;
           else next=null;
         }
       }
       reg.prevClock=clk===1?1:clk===0?0:null;
     }
     if(next!==reg.q){reg.q=next;changedState=true;}
   }
   if(changedState){const after=settle();result={outs:after.outs,stable:result.stable&&after.stable};}
   return {outs:result.outs,stable:result.stable,conflict,state:{registers}};
 }
 function validateProject(raw){
   if(!raw||raw.format!=='digital-flow-v1'||!Array.isArray(raw.nodes)||!Array.isArray(raw.wires))throw Error('Formato no compatible. Se requiere Digital Flow JSON v1.');
   if(raw.nodes.length>600||raw.wires.length>2000)throw Error('Proyecto demasiado grande.');
   const ids=new Set();
   const nodes=raw.nodes.map(n=>{
     if(!n||typeof n.id!=='string'||!/^[-_a-zA-Z0-9]{1,80}$/.test(n.id)||ids.has(n.id)||!TYPES[n.type]||!Number.isFinite(n.x)||!Number.isFinite(n.y)||Math.abs(n.x)>30000||Math.abs(n.y)>30000)throw Error('Componente inválido o repetido.');
     ids.add(n.id);return{id:n.id,type:n.type,x:n.x,y:n.y,label:String(n.label||TYPES[n.type].name).slice(0,32),state:n.state===1?1:0,props:cleanProps(n.type,n.props)};
   });
   const occupied=new Set(),edgeSet=new Set(),wires=[],byId=new Map(nodes.map(n=>[n.id,n]));
   for(const w of raw.wires){
     if(!w||!byId.has(w.from)||!byId.has(w.to))throw Error('Cable inválido.');
     const a=byId.get(w.from),b=byId.get(w.to),aa=TYPES[a.type].domain==='analog',ba=TYPES[b.type].domain==='analog';
     if(aa!==ba)throw Error('No conectes componentes analógicos a puertos digitales.');
     if(aa){
       const fromPin=Number.isInteger(w.fromPin)?w.fromPin:1;
       const toPin=Number.isInteger(w.toPin)?w.toPin:0;
       if(fromPin<0||fromPin>=TYPES[a.type].pins||toPin<0||toPin>=TYPES[b.type].pins ||(w.from===w.to&&fromPin===toPin))throw Error('Pin analógico inválido.');
       const edge=[`${w.from}:${fromPin}`,`${w.to}:${toPin}`].sort().join('|');
       if(edgeSet.has(edge))throw Error('Cable analógico duplicado.');edgeSet.add(edge);
       wires.push({id:typeof w.id==='string'&&/^[-_a-zA-Z0-9]{1,80}$/.test(w.id)?w.id:'w'+wires.length,from:w.from,to:w.to,input:0,fromPin,toPin});
     }else{
       if(['LED','OUT','PROBE'].includes(a.type)||!Number.isInteger(w.input)||w.input<0||w.input>=TYPES[b.type].in)throw Error('Cable lógico inválido.');
       const slot=w.to+':'+w.input;if(occupied.has(slot))throw Error('Dos cables en la misma entrada.');occupied.add(slot);
       wires.push({id:typeof w.id==='string'&&/^[-_a-zA-Z0-9]{1,80}$/.test(w.id)?w.id:'w'+wires.length,from:w.from,to:w.to,input:w.input});
     }
   }
   return {format:'digital-flow-v1',nodes,wires};
 }
 const api={TYPES,PROPERTY_SCHEMAS,defaultProps,cleanProps,evalGate,simulate,validateProject};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.DigitalEngine=api;
})(typeof window!=='undefined'?window:globalThis);
