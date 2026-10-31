/* Patiñ Os Android GUI. SVG editor, live propagation, touch support, oscilloscope. */
(() => {
 'use strict';
 const {TYPES,PROPERTY_SCHEMAS,defaultProps,cleanProps,simulate,validateProject}=window.DigitalEngine;
 const {simulateAnalog,SUPPORTED}=window.PatinosAnalog;
 const {DEVICE_TYPES,pinNames}=window.PatinosDevices;
 const {COLORS:LED_COLORS,single:singleLedVisual,rgb:rgbLedVisual}=window.PatinosLED;
 const {parseDig}=window.PatinosDig;
 const {simulateSpice,exportNetlist,MULTI}=window.PatinosSpice;
 const $=id=>document.getElementById(id);
 const svgNS='http://www.w3.org/2000/svg';
 const board=$('board');const stage=$('stage');const nodesLayer=$('nodesLayer');const wiresLayer=$('wiresLayer');const overlay=$('overlayLayer');const fxLayer=$('fxLayer');
 let nodes=[],wires=[],seq=100,selected=null,scopeId=null,history=[],pendingWire=null,pendingInput=null,pendingPort=null,gesture=null,deleteMode=false,running=true,clockState=0,clockTime=0;
 let workspace='logic';let logicMemory={registers:{}};
 const spaces={logic:{nodes:[],wires:[],history:[],view:null},electronics:{nodes:[],wires:[],history:[],view:null}};
 let view={x:0,y:0,w:1160,h:650};let lastState={outs:new Map(),stable:true,conflict:false};let analogState={readings:new Map(),warnings:[],state:null,fault:false};let analogFaultAt=0;const trace=[];
 const categories={source:['SWITCH','CLOCK','CONST1','CONST0'],gate:['AND','OR','XOR','NOT','NAND','NOR','XNOR','BUF','AND3','OR3','XOR3','NAND3','NOR3','XNOR3','AND4','OR4','XOR4','NAND4','NOR4','XNOR4'],advanced:['MUX2','MAJ3','ADD_SUM','ADD_CARRY','PARITY3','EQ','IMPLIES'],output:['LED','OUT','PROBE']};
 Object.assign(categories,{
  passive:['RESISTOR','POT','LDR','NTC','PTC','CAP','CAP_POL','CAP_VARIABLE','INDUCTOR','CHOKE','TRANSFORMER','VARISTOR','CRYSTAL'],
  supply:['VDC','VAC','VPULSE','VTRI','VSAW','IPULSE','BATTERY','CELL','ISOURCE','GND','JUNCTION','VCC','SOLAR'],
  diode:['DIODE_SI','DIODE_GE','DIODE_FAST','DIODE_POWER','DIODE_SCHOTTKY','DIODE_ZENER','DIODE_TVS','TVS_BIDIR','DIODE_BRIDGE','LED_RED','LED_GREEN','LED_BLUE','LED_AMBER','LED_WHITE','LED_RGB','PHOTODIODE'],
  actuator:['BUZZER','PIEZO','SPEAKER','LAMP','MOTOR','RELAY','FUSE','SW_ANALOG','PUSH','SW_SPDT','SW_DIP'],
  measurement:['VOLTMETER','AMMETER','OHMMETER','OSCILLOSCOPE','HALL','MIC'],
  transistor:['NPN','PNP','NMOS','PMOS','SCR','TRIAC','OPAMP','REG_7805','TIMER_555','IC_7400','IC_7404','COUNTER_4017','SEVEN_SEG','ANTENNA','PUSH_PULL']
 });
 Object.assign(categories,{
  sequential:['DFF','TFF','JKFF','SRLATCH'],
  decoder:['DEC2_0','DEC2_1','DEC2_2','DEC2_3','DEMUX0','DEMUX1','ENCODER4_B0','ENCODER4_B1']
 });
 for(const count of [5,6])for(const gate of ['AND','OR','XOR','NAND','NOR','XNOR'])categories.gate.push(gate+count);
 const logicCategories=['source','gate','advanced','sequential','decoder','output'];
 const electronicsCategories=['passive','supply','diode','actuator','measurement','transistor'];
 const buttonTypes=Object.values(categories).flat();

 const symbols={SWITCH:'⏻',CLOCK:'▁▔▁',CONST1:'1',CONST0:'0',AND:'&',OR:'≥1',XOR:'⊕',NOT:'¬',NAND:'⊼',NOR:'⊽',XNOR:'≡',BUF:'▷',LED:'◉',OUT:'→',PROBE:'⌖',AND3:'&₃',OR3:'≥₃',XOR3:'⊕₃',NAND3:'⊼₃',NOR3:'⊽₃',XNOR3:'≡₃',AND4:'&₄',OR4:'≥₄',XOR4:'⊕₄',NAND4:'⊼₄',NOR4:'⊽₄',XNOR4:'≡₄',MUX2:'MUX',MAJ3:'≥2',ADD_SUM:'Σ',ADD_CARRY:'C',PARITY3:'P',EQ:'=',IMPLIES:'⇒'};
 const labels={SWITCH:'Entrada',CLOCK:'Reloj',CONST1:'HIGH',CONST0:'LOW',AND:'AND',OR:'OR',XOR:'XOR',NOT:'NOT',NAND:'NAND',NOR:'NOR',XNOR:'XNOR',BUF:'Buffer',LED:'LED',OUT:'Salida',PROBE:'Sonda',AND3:'AND 3',OR3:'OR 3',XOR3:'XOR 3',NAND3:'NAND 3',NOR3:'NOR 3',XNOR3:'XNOR 3',AND4:'AND 4',OR4:'OR 4',XOR4:'XOR 4',NAND4:'NAND 4',NOR4:'NOR 4',XNOR4:'XNOR 4',MUX2:'MUX 2:1',MAJ3:'Mayoría',ADD_SUM:'Suma Σ',ADD_CARRY:'Acarreo',PARITY3:'Paridad',EQ:'A = B',IMPLIES:'A ⇒ B'};
 Object.assign(symbols,{
  DFF:'D',TFF:'T',JKFF:'JK',SRLATCH:'SR',
  DEC2_0:'D0',DEC2_1:'D1',DEC2_2:'D2',DEC2_3:'D3',DEMUX0:'Y0',DEMUX1:'Y1',ENCODER4_B0:'E0',ENCODER4_B1:'E1'
 });
 Object.assign(labels,{DFF:'Flip-flop D',TFF:'Flip-flop T',JKFF:'Flip-flop JK',SRLATCH:'Latch SR',
  DEC2_0:'Decoder Y0',DEC2_1:'Decoder Y1',DEC2_2:'Decoder Y2',DEC2_3:'Decoder Y3',
  DEMUX0:'Demux Y0',DEMUX1:'Demux Y1',ENCODER4_B0:'Encoder B0',ENCODER4_B1:'Encoder B1'});
 for(const count of [5,6])for(const gate of ['AND','OR','XOR','NAND','NOR','XNOR']){symbols[gate+count]=symbols[gate]+count;labels[gate+count]=gate+' '+count;}
 const analogSymbols={RESISTOR:'▰',POT:'↗',LDR:'☀',NTC:'ϑ',PTC:'ϑ',CAP:'┃┃',CAP_POL:'┃)',CAP_VARIABLE:'↗',INDUCTOR:'∿',CHOKE:'∿',TRANSFORMER:'∿∿',VARISTOR:'V',CRYSTAL:'◇',
 VDC:'⎓',VAC:'∿',VPULSE:'▁▔▁',VTRI:'△',VSAW:'⩘',IPULSE:'↥',BATTERY:'▮',CELL:'▯',ISOURCE:'↑',GND:'⏚',JUNCTION:'●',VCC:'V+',SOLAR:'☀',DIODE_FAST:'▷|',DIODE_POWER:'▷|',TVS_BIDIR:'⇵',LED_AMBER:'◉',LED_WHITE:'◉',DIODE_SI:'▷|',DIODE_GE:'▷|',DIODE_SCHOTTKY:'▷⊢',DIODE_ZENER:'▷┤',DIODE_TVS:'▷|',DIODE_BRIDGE:'◇',LED_RED:'◉',LED_GREEN:'◉',LED_BLUE:'◉',LED_RGB:'◉',PHOTODIODE:'↙',
 BUZZER:'♫',PIEZO:'♫',SPEAKER:'◀',LAMP:'⊗',MOTOR:'Ⓜ',RELAY:'◫',FUSE:'─',SW_ANALOG:'╱',PUSH:'⎍',SW_SPDT:'⤴',SW_DIP:'╱',VOLTMETER:'Ⓥ',AMMETER:'Ⓐ',OHMMETER:'Ω',OSCILLOSCOPE:'〰',HALL:'H',MIC:'🎙',NPN:'N',PNP:'P',NMOS:'N',PMOS:'P',SCR:'S',TRIAC:'T',OPAMP:'△',REG_7805:'5V',TIMER_555:'555',IC_7400:'7400',IC_7404:'7404',COUNTER_4017:'4017',SEVEN_SEG:'8',ANTENNA:'⋔',PUSH_PULL:'⇄'};
 for(const [type,def] of Object.entries(TYPES))if(def.domain==='analog'){labels[type]=def.name;symbols[type]=analogSymbols[type]||'◇';}
 const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const makeId=()=>`n${++seq}`;const makeWireId=()=>`w${++seq}`;
 function add(type,x,y,label,st=0){const n={id:makeId(),type,x,y,label:label||labels[type],state:st,props:defaultProps(type)};nodes.push(n);return n;}
 function wire(from,to,input){wires.push({id:makeWireId(),from:from.id,to:to.id,input});}
 function demo(){
  nodes=[];wires=[];seq=100;logicMemory={registers:{}};
  if(workspace==='electronics'){
    // Simple real resistive loop in an independent electrical workspace.
    const src=add('VDC',160,300,'Fuente 9V'),r=add('RESISTOR',420,180,'Resistencia 1k'),gnd=add('GND',720,300,'Referencia');
    src.props.voltage=9;
    wires.push({id:makeWireId(),from:src.id,fromPin:1,to:r.id,toPin:0,input:0});
    wires.push({id:makeWireId(),from:r.id,fromPin:1,to:gnd.id,toPin:0,input:0});
    wires.push({id:makeWireId(),from:gnd.id,fromPin:1,to:src.id,toPin:0,input:0});
    scopeId=r.id;selected=null;pendingWire=null;pendingInput=null;trace.length=0;fitCircuit();persist();refresh();showMessage('Circuito electrónico de ejemplo: 9 V y resistencia');return;
  }
  const a=add('SWITCH',175,175,'Entrada A',1),b=add('SWITCH',175,315,'Entrada B',1),and=add('AND',465,235,'AND'),led=add('LED',765,235,'LED / Y');
  const clock=add('CLOCK',175,495,'CLK'),not=add('NOT',465,495,'NOT'),led2=add('LED',765,495,'LED / Q');
  wire(a,and,0);wire(b,and,1);wire(and,led,0);wire(clock,not,0);wire(not,led2,0);
  selected=null;pendingWire=null;pendingInput=null;scopeId=led.id;fitCircuit();trace.length=0;persist();refresh();showMessage('Ejemplo listo: toca A, B o el reloj');
 }
 function snapshot(){history.push(JSON.stringify({nodes,wires}));if(history.length>35)history.shift();}
 function undo(){if(!history.length){showMessage('Nada que deshacer');return;}const p=JSON.parse(history.pop());nodes=p.nodes;wires=p.wires;logicMemory={registers:{}};seq=Math.max(seq,...nodes.map(n=>parseInt(n.id.replace(/\D/g,''))||0),...wires.map(w=>parseInt(w.id.replace(/\D/g,''))||0));selected=null;pendingWire=null;pendingInput=null;persist();refresh();}
 function persist(){try{localStorage.setItem('patinos-v09-'+workspace,JSON.stringify({format:'digital-flow-v1',nodes,wires}));localStorage.setItem('patinos-v09-last-workspace',workspace);}catch(_){}}
 function saveSpace(){spaces[workspace]={nodes,wires,history,view,logicMemory};}
 function switchWorkspace(target,save=true){
  if(!['logic','electronics'].includes(target)||(workspace===target&&save))return;
  if(save){persist();saveSpace();}workspace=target;
  const next=spaces[target];nodes=next.nodes;wires=next.wires;history=next.history;
  view=next.view||{x:0,y:0,w:1160,h:650};logicMemory=next.logicMemory||{registers:{}};
  analogState={readings:new Map(),warnings:[],state:null,fault:false};lastState={outs:new Map(),stable:true,conflict:false};
  seq=Math.max(seq,...nodes.map(n=>Number(n.id.replace(/\D/g,''))||0),...wires.map(w=>Number(w.id.replace(/\D/g,''))||0));
  pendingWire=null;pendingPort=null;pendingInput=null;mousePreview=null;selected=null;
  lastWireMarkup=null;scopeId=nodes.find(n=>n.type==='LED'||n.type==='OUT')?.id||nodes[0]?.id||null;
  trace.length=0;importFeedback('');$('toolSearch').value='';$('toolCategory').value='all';
  $('workspaceTitle').textContent=target==='logic'?'Editor de lógica digital':'Editor de circuitos electrónicos';
  $('spiceBtn').hidden=target==='logic';
  for(const id of ['logicModeBtn','electronicsModeBtn']){
   const el=$(id),active=el.dataset.workspace===target;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));
  }
  for(const option of $('toolCategory').options){option.hidden=option.value!=='all'&&!(target==='logic'?logicCategories:electronicsCategories).includes(option.value);}
  drawTools();if(nodes.length)fitCircuit();refresh();persist();
 }
 function partitionProject(project){
   const logicNodes=project.nodes.filter(n=>TYPES[n.type].domain!=='analog');
   const electronicsNodes=project.nodes.filter(n=>TYPES[n.type].domain==='analog');
   const slice=(list)=>{const allowed=new Set(list.map(n=>n.id));return {nodes:list,wires:project.wires.filter(w=>allowed.has(w.from)&&allowed.has(w.to)),history:[],view:null,logicMemory:{registers:{}}};};
   return {logic:slice(logicNodes),electronics:slice(electronicsNodes)};
 }
 function restoreWorkspaceData(){
   const legacy=localStorage.getItem('digital-flow-autosave');
   if(legacy&&!localStorage.getItem('patinos-v09-logic')&&!localStorage.getItem('patinos-v09-electronics')){
    const parts=partitionProject(validateProject(JSON.parse(legacy)));
    for(const k of ['logic','electronics']){spaces[k]=parts[k];localStorage.setItem('patinos-v09-'+k,JSON.stringify({format:'digital-flow-v1',nodes:parts[k].nodes,wires:parts[k].wires}));}
   }
   for(const k of ['logic','electronics']){
    const str=localStorage.getItem('patinos-v09-'+k);
    if(str){const valid=validateProject(JSON.parse(str));spaces[k]={...spaces[k],nodes:valid.nodes,wires:valid.wires};}
   }
   const last=localStorage.getItem('patinos-v09-last-workspace');
   const target=last==='electronics'?'electronics':'logic';
   // Force initial mode transition while the initial workspace is empty.
   workspace=target==='logic'?'electronics':'logic';switchWorkspace(target,false);
   if(!nodes.length&&!spaces.logic.nodes.length&&!spaces.electronics.nodes.length)demo();
 }
 function fitCircuit(){
  if(!nodes.length)return;
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  let minX=Math.min(...xs)-135,maxX=Math.max(...xs)+135,minY=Math.min(...ys)-125,maxY=Math.max(...ys)+125;
  let width=Math.max(360,maxX-minX),height=Math.max(280,maxY-minY);
  const rect=stage.getBoundingClientRect();const ratio=Math.max(.48,Math.min(2.4,rect.width/Math.max(1,rect.height)));if(width/height>ratio)height=width/ratio;else width=height*ratio;
  view={x:(minX+maxX-width)/2,y:(minY+maxY-height)/2,w:width,h:height};
 }
 function importFeedback(text){$('importStatus').textContent=text;$('importStatus').hidden=!text;}
 function setProject(p){
   const v=validateProject(p), parts=partitionProject(v);
   const hasLogic=parts.logic.nodes.length>0,hasElectronics=parts.electronics.nodes.length>0;
   if(hasLogic&&hasElectronics){
     saveSpace();spaces.logic=parts.logic;spaces.electronics=parts.electronics;
     for(const k of ['logic','electronics'])localStorage.setItem('patinos-v09-'+k,JSON.stringify({format:'digital-flow-v1',nodes:parts[k].nodes,wires:parts[k].wires}));
     switchWorkspace(workspace,false);
     showMessage('Proyecto mixto separado en dos laboratorios; puedes alternar con las pestañas.');return;
   }
   const target=hasElectronics?'electronics':'logic';
   if(workspace!==target)switchWorkspace(target);
   snapshot();nodes=v.nodes;wires=v.wires;logicMemory={registers:{}};
   seq=Math.max(seq,...nodes.map(n=>Number(n.id.replace(/\D/g,''))||0),...wires.map(w=>Number(w.id.replace(/\D/g,''))||0));
   pendingWire=null;pendingInput=null;pendingPort=null;selected=null;
   scopeId=nodes.find(n=>n.type==='LED'||n.type==='OUT')?.id||nodes[0]?.id||null;
   trace.length=0;fitCircuit();persist();refresh();importFeedback(p.importNote||'');
   showMessage('Circuito abierto: '+nodes.length+' componentes / '+wires.length+' enlaces');
 }
 function newProject(){
  if((nodes.length||wires.length)&&!confirm('¿Crear un proyecto nuevo en este laboratorio? Guarda una copia antes de continuar.'))return;
  snapshot();nodes=[];wires=[];logicMemory={registers:{}};selected=null;pendingWire=null;pendingInput=null;scopeId=null;trace.length=0;
  view={x:-80,y:-80,w:850,h:700};importFeedback('');persist();refresh();showMessage('Proyecto vacío. Añade componentes desde la barra.');
 }
 function saveSpice(){
  const data=exportNetlist(nodes,wires);
  const text=data.text;
  if(window.AndroidBridge){window.AndroidBridge.saveSpice(text);return;}
  const a=document.createElement('a');const url=URL.createObjectURL(new Blob([text],{type:'text/plain'}));
  a.href=url;a.download='patin-os.cir';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  showMessage(data.unsupported.length?`SPICE exportado con ${data.unsupported.length} elementos omitidos; revisa el netlist`:'Netlist SPICE exportado (.cir)');
 }
 function exportProject(){const json=JSON.stringify({format:'digital-flow-v1',nodes,wires},null,2);
  if(window.AndroidBridge){window.AndroidBridge.saveJson(json);return;}
  const a=document.createElement('a');const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.href=url;a.download=(workspace==='logic'?'logica':'electronica')+'.patinos.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showMessage('Archivo JSON exportado');
 }
 function importProject(text){
  try{const source=text.trimStart();if(source.startsWith('<'))setProject(parseDig(text));else setProject(JSON.parse(text));}
  catch(err){const msg='No se pudo abrir el archivo: '+err.message;importFeedback(msg);showMessage(msg);}
 }
 window.importProjectFromAndroid=importProject;
 window.showMessage=showMessage;
 let toastTimer;
 function showMessage(txt){let t=$('toast');t.textContent=txt;t.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('visible'),2500);}
 function xyEvent(e){const p=board.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=board.getScreenCTM();return m?p.matrixTransform(m.inverse()):{x:0,y:0};}
 function posOutput(n){return{x:n.x+52,y:n.y};}
 function posAnalog(n,p){
  if(n.type==='TRANSFORMER'||n.type==='LED_RGB'){return [{x:n.x-60,y:n.y-24},{x:n.x-60,y:n.y+24},{x:n.x+60,y:n.y-24},{x:n.x+60,y:n.y+24}][p]||{x:n.x,y:n.y};}
  const count=TYPES[n.type].pins||2;
  if(count>=5){const half=Math.ceil(count/2),left=p<half,row=left?p:p-half,rows=left?half:count-half;
    return {x:n.x+(left?-76:76),y:n.y+(row-(rows-1)/2)*28};}
  if(count===4)return {x:n.x+(p===0||p===2?-60:60),y:n.y+(p<2?-24:24)};
  return p===0?{x:n.x-52,y:n.y+(MULTI.has(n.type)?-9:0)}:p===1?{x:n.x+52,y:n.y+(MULTI.has(n.type)?-9:0)}:{x:n.x,y:n.y+47};}

 function wireEndpoint(w,which,node){if(TYPES[node.type].domain==='analog')return posAnalog(node,which==='from'?(w.fromPin??1):(w.toPin??0));return which==='from'?posOutput(node):posInput(node,w.input);}
 function posInput(n,i){const size=TYPES[n.type].in;return{x:n.x-52,y:n.y+(i-(size-1)/2)*Math.min(25,60/Math.max(1,size-1))};} 
 const round=(x,n=10)=>Math.round(x/n)*n;
 function pinColor(v){return v===1?'#44f58b':v===0?'#969da4':'#efc36a';}
 // Standard logic-gate silhouettes, a visible diode/LED, and crisp scalable SVG symbols.
 function gateShape(n){
   const x=n.x,y=n.y,t=n.type;
   const pure=t.replace(/[3456]$/,'');
   const neg=['NAND','NOR','XNOR'].includes(pure),base=({NAND:'AND',NOR:'OR',XNOR:'XOR'})[pure]||pure;
   const L=x-37,R=x+(neg?30:38),T=y-32,B=y+32;
   let d='';let more='';
   if(base==='AND')d=`M ${L} ${T} H ${x-3} C ${x+53} ${T},${x+53} ${B},${x-3} ${B} H ${L} Z`;
   else if(base==='OR'||base==='XOR'){
     d=`M ${L} ${T} Q ${x+3} ${T},${x+40} ${y} Q ${x+3} ${B},${L} ${B} Q ${x-12} ${y},${L} ${T} Z`;
     if(base==='XOR')more=`<path d="M ${L-9} ${T} Q ${x-18} ${y},${L-9} ${B}" class="gate-line"/>`;
   }
   else if(base==='NOT'||base==='BUF')d=`M ${L} ${T} L ${x+35} ${y} L ${L} ${B} Z`;
   else d=`M ${L} ${T} H ${x+35} V ${B} H ${L} Z`;
   if(['MUX2','MAJ3','ADD_SUM','ADD_CARRY','PARITY3','EQ','IMPLIES','DFF','TFF','JKFF','SRLATCH',
       'DEC2_0','DEC2_1','DEC2_2','DEC2_3','DEMUX0','DEMUX1','ENCODER4_B0','ENCODER4_B1'].includes(t)){
     const txt=({MUX2:'MUX',MAJ3:'≥2',ADD_SUM:'Σ',ADD_CARRY:'C',PARITY3:'P',EQ:'=',IMPLIES:'⇒',DFF:'D▸',TFF:'T▸',JKFF:'JK▸',SRLATCH:'SR',DEC2_0:'D0',DEC2_1:'D1',DEC2_2:'D2',DEC2_3:'D3',DEMUX0:'Y0',DEMUX1:'Y1',ENCODER4_B0:'E0',ENCODER4_B1:'E1'})[t];
     return `<rect class="gate-body" x="${x-37}" y="${y-38}" width="74" height="76" rx="9"/><text class="gate-symbol" x="${x}" y="${y+7}">${txt}</text>`;
   }
   const bubble=neg||base==='NOT'?`<circle cx="${x+40}" cy="${y}" r="6.5" fill="#0b0c0d" stroke="#f5f5f5" stroke-width="2.6"/>`:'';
   return `<path class="gate-body" d="${d}"/>${more}${bubble}`;
 }
 function propBrief(n){const p=n.props||{};if(n.type==='CLOCK')return `${p.periodMs||1000} ms`;
   if(n.type==='LDR')return `${Math.round(p.illuminance||10)} lux · R10 ${p.resistance} Ω`;
   if(['NTC','PTC'].includes(n.type))return `${p.temperature??25} °C · R25 ${p.resistance} Ω`;
   if(n.type==='SOLAR')return `${p.irradiance??1000} W/m² · ${(p.photoCurrent||.1)*1000} mA`;
   if(n.type==='PHOTODIODE')return `${p.illuminance??1000} lux · ${(p.photoCurrent||.0001)*1000} mA`;
   if(['VPULSE','IPULSE'].includes(n.type))return `${p.frequency} Hz · ${p.duty}%`;
   if('resistance' in p)return `${Number(p.resistance).toLocaleString('es-MX')} Ω`;
   if('voltage' in p)return ['VAC','VTRI','VSAW'].includes(n.type)?`${p.voltage} Vp · ${p.frequency||50} Hz`:`${p.voltage} V`;
   if('capacitance' in p)return `${p.capacitance} µF`;
   if('inductance' in p)return `${p.inductance} mH`;
   if('forwardVoltage' in p)return `Vf ${p.forwardVoltage} V${p.reverse?' · ↶':''}`;
   if(n.type==='TRANSFORMER')return `${p.ratio}:1 · ${p.inductance} mH · k=${p.coupling}`;if(n.type==='LED_RGB')return p.commonAnode?'Ánodo común':'Cátodo común';if('frequency' in p)return `${p.frequency} Hz`;
   return TYPES[n.type]?.domain==='analog'?((SUPPORTED.has(n.type)||MULTI.has(n.type)||DEVICE_TYPES.has(n.type)||['TRANSFORMER','LED_RGB'].includes(n.type))?'Modelo educativo':'Sólo esquema'):'';
 }
 function analogShape(n,reading){
  if((TYPES[n.type].pins||2)>=5){const c=TYPES[n.type].pins;const h=Math.max(78,Math.ceil(c/2)*28+16);const x=n.x,y=n.y;const sign=n.type==='RELAY'?'RELÉ':n.type==='TIMER_555'?'555':n.type==='COUNTER_4017'?'4017':n.type==='IC_7400'?'7400':n.type==='IC_7404'?'7404':n.type;
  let inner=`<text class="component-mini" x="${x}" y="${y+5}" text-anchor="middle" style="font-size:16px">${sign}</text>`;
  if(n.type==='COUNTER_4017'){inner=`<text class="component-mini" x="${x}" y="${y-11}" text-anchor="middle" style="font-size:14px">4017</text><text class="component-mini" x="${x}" y="${y+18}" text-anchor="middle" style="font-size:11px">Q${reading?.channels?.count??'?'}</text>`;}
  if(n.type==='SEVEN_SEG'){
    const channels=reading?.channels||{},g=(i,points)=>`<polyline points="${points}" stroke="${(channels[i]||0)>.001?'#37fc8a':'#3d4143'}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`;
    inner=[g('a',`${x-17},${y-26} ${x+17},${y-26}`),g('b',`${x+20},${y-24} ${x+20},${y-2}`),g('c',`${x+20},${y+3} ${x+20},${y+24}`),g('d',`${x-17},${y+27} ${x+17},${y+27}`),g('e',`${x-20},${y+3} ${x-20},${y+24}`),g('f',`${x-20},${y-24} ${x-20},${y-2}`),g('g',`${x-16},${y} ${x+16},${y}`),`<circle cx="${x+29}" cy="${y+26}" r="3.5" fill="${(channels.dp||0)>.001?'#37fc8a':'#3d4143'}"/>`].join('');
  }
  return `<rect class="component-shell" x="${x-54}" y="${y-h/2}" width="108" height="${h}" rx="12"/>${inner}`;}

  const x=n.x,y=n.y,t=n.type,wire=`<path class="component-line" d="M ${x-39} ${y} H ${x-27} M ${x+27} ${y} H ${x+39}"/>`;
  const line=(d,other='')=>`<path class="component-line" d="${d}" ${other}/>`;
  const box=(text)=>`<rect class="component-shell" x="${x-31}" y="${y-30}" width="62" height="60" rx="8"/><text class="component-letter" x="${x}" y="${y+7}">${escapeHtml(text)}</text>`;
  const sym=(drawing)=>`<g>${wire}${drawing}</g>`;
  let core='';
  if(['RESISTOR','POT','LDR','NTC','PTC','VARISTOR'].includes(t)){
    core=sym(line(`M ${x-28} ${y} l 7 -11 l 9 22 l 9 -22 l 9 22 l 9 -22 l 7 11`));
    if(t==='POT')core+=line(`M ${x-4} ${y-26} l 12 13 m-5 -10 l 6 -4 m-1 6 l 7 2`);
    if(t==='LDR')core+=line(`M ${x-16} ${y-29} l 8 12 m 5 -18 l 8 12`);
  }
  else if(['CAP','CAP_POL','CAP_VARIABLE'].includes(t)){core=sym(line(`M ${x-6} ${y-25} v 50 M ${x+6} ${y-25} v 50`));if(t==='CAP_VARIABLE')core+=line(`M ${x-22} ${y+22} L ${x+20} ${y-22}`);if(t==='CAP_POL')core+=`<text x="${x-20}" y="${y-14}" class="component-mini">+</text>`;}
  else if(t==='TRANSFORMER'){core=`<g><path class="component-line" d="M ${x-30} ${y-32} q -18 8 0 16 q -18 8 0 16 q -18 8 0 16 q -18 8 0 16 M ${x+30} ${y-32} q 18 8 0 16 q 18 8 0 16 q 18 8 0 16 q 18 8 0 16 M ${x-6} ${y-38} V ${y+38} M ${x+6} ${y-38} V ${y+38}"/><circle cx="${x-39}" cy="${y-25}" r="3" fill="#eee"/><circle cx="${x+39}" cy="${y-25}" r="3" fill="#eee"/></g>`;}
  else if(['INDUCTOR','CHOKE'].includes(t))core=sym(line(`M ${x-26} ${y} c 0 -18 12 -18 12 0 c 0 -18 12 -18 12 0 c 0 -18 12 -18 12 0 c 0 -18 12 -18 12 0`));
  else if(t==='LED_RGB'){
    const colors=rgbLedVisual(reading);
    const circles=[['red',-17],['green',0],['blue',17]].map(([k,dx])=>{
      const v=colors.channels[k],opacity=(.2+.8*v.brightness).toFixed(3);
      return `<g data-channel="${k}" data-brightness="${v.brightness.toFixed(3)}"><circle cx="${x+dx}" cy="${y}" r="18" fill="${v.color}" opacity="${(.48*v.brightness).toFixed(3)}" filter="url(#ledBloom)"/><circle cx="${x+dx}" cy="${y}" r="9" fill="${v.color}" opacity="${opacity}"/></g>`;
    }).join('');
    core=`<rect class="component-shell" x="${x-42}" y="${y-29}" width="84" height="58" rx="12"/><circle cx="${x}" cy="${y}" r="28" fill="${colors.mixed}" opacity="${(.11*colors.brightness).toFixed(3)}"/>${circles}`;
  }
  else if(['DIODE_SI','DIODE_GE','DIODE_FAST','DIODE_POWER','DIODE_SCHOTTKY','DIODE_ZENER','DIODE_TVS','TVS_BIDIR','LED_RED','LED_GREEN','LED_BLUE','LED_AMBER','LED_WHITE','LED_RGB','PHOTODIODE'].includes(t)){
    const isLed=t.startsWith('LED_')&&t!=='LED_RGB';
    const appearance=isLed?singleLedVisual(t,reading,n.props):null;
    const bloom=isLed?`<circle cx="${x-3}" cy="${y}" r="25" fill="${appearance.color}" opacity="${appearance.haloOpacity.toFixed(3)}" filter="url(#ledBloom)" pointer-events="none"/>`:'';
    const diodeFill=isLed?` fill="${appearance.color}" fill-opacity="${appearance.bodyOpacity.toFixed(3)}"`:'';
    core=sym(`${bloom}<path class="component-line" d="M ${x-23} ${y-19} L ${x+13} ${y} L ${x-23} ${y+19} Z"${diodeFill}/>`+line(`M ${x+13} ${y-21} V ${y+21}`));
    if(isLed)core+=`<path d="M ${x+6} ${y-24} l 13 -11 m-3 0 l 4 -2 m-3 7 l 4 1 M ${x+18} ${y-16} l 13 -11" fill="none" stroke="${appearance.color}" stroke-width="2.5" opacity="${appearance.raysOpacity.toFixed(3)}"/>`;
    if(t==='DIODE_GE')core+=`<text x="${x}" y="${y+34}" class="component-mini">Ge</text>`;
    if(t==='DIODE_ZENER')core+=line(`M ${x+13} ${y-21} l 7 0 M ${x+13} ${y+21} l -7 0`);
    if(t==='DIODE_SCHOTTKY')core+=line(`M ${x+13} ${y-21} l 7 0 v 7 M ${x+13} ${y+21} h -7 v -7`);
  }
  else if(['VDC','VAC','VPULSE','VTRI','VSAW','IPULSE','BATTERY','CELL','ISOURCE','SOLAR','VCC'].includes(t)){
    core=sym(`<circle cx="${x}" cy="${y}" r="27" class="component-shell"/>`);
    core+=`<text x="${x}" y="${y+8}" class="component-letter">${['VAC','VTRI','VSAW'].includes(t)?'~':['ISOURCE','IPULSE'].includes(t)?'↑':t==='VPULSE'?'▁▔':t==='SOLAR'?'☀':t==='VDC'?'⎓':t==='VCC'?'V+':'±'}</text>`;
  }
  else if(t==='GND')core=sym(line(`M ${x} ${y-24} V ${y+13} M ${x-22} ${y+13} H ${x+22} M ${x-15} ${y+20} H ${x+15} M ${x-7} ${y+27} H ${x+7}`));
  else if(t==='JUNCTION')core=sym(`<circle cx="${x}" cy="${y}" r="9" fill="#f6f6f6"/>`);
  else if(['BUZZER','PIEZO','SPEAKER'].includes(t)){
    core=sym(`<circle cx="${x}" cy="${y}" r="27" class="component-shell ${reading?.active?'component-on':''}"/>`);
    core+=line(`M ${x-12} ${y-12} h 8 l 12 -10 v 44 l -12 -10 h -8 z`);
    if(reading?.active)core+=`<path class="sound-waves" d="M ${x+11} ${y-16} q 24 16 0 32 M ${x+19} ${y-23} q 31 23 0 46"/>`;
  }
  else if(t==='LAMP')core=sym(`<circle cx="${x}" cy="${y}" r="26" class="component-shell ${reading?.active?'component-on':''}"/>`+line(`M ${x-18} ${y-18} l 36 36 M ${x+18} ${y-18} l -36 36`));
  else if(t==='MOTOR')core=sym(`<circle cx="${x}" cy="${y}" r="26" class="component-shell"/><text x="${x}" y="${y+8}" class="component-letter">M</text>`);
  else if(t==='SW_ANALOG'||t==='PUSH'||t==='SW_SPDT'||t==='SW_DIP')core=sym(line(`M ${x-27} ${y} l 38 ${(n.props?.closed===false||t==='PUSH')?-19:0} M ${x+11} ${y} h 16`));
  else if(t==='FUSE')core=sym(`<rect x="${x-27}" y="${y-10}" width="54" height="20" class="component-shell"/>`);
  else if(t==='VOLTMETER'||t==='AMMETER'||t==='OHMMETER')core=sym(`<circle cx="${x}" cy="${y}" r="26" class="component-shell"/><text x="${x}" y="${y+8}" class="component-letter">${t==='VOLTMETER'?'V':t==='AMMETER'?'A':'Ω'}</text>`);
  else core=sym(box(({NPN:'NPN',PNP:'PNP',NMOS:'NMOS',PMOS:'PMOS',OPAMP:'OP',TIMER_555:'555',REG_7805:'7805'})[t]||t.replace(/_/g,' ').slice(0,6)));
  if(n.props?.reverse && (t.startsWith('DIODE_')||t.startsWith('LED_')))core=`<g transform="translate(${2*x} 0) scale(-1 1)">${core}</g>`;
  return core;
 }
 function nodeSvg(n,value){
   const t=n.type,count=TYPES[t].in,led=t==='LED'||t==='OUT'||t==='PROBE',source=count===0,active=value===1;
   const color=pinColor(value),title=escapeHtml(n.label);const analog=TYPES[t]?.domain==='analog',reading=analogState.readings.get(n.id);
   let body='';
   if(TYPES[t]?.domain==='analog'){body=analogShape(n,analogState.readings.get(n.id));}
   else if(t==='PROBE'){
     body=`<circle class="led-housing ${active?'lit':''}" cx="${n.x}" cy="${n.y}" r="30"/><circle cx="${n.x}" cy="${n.y}" r="15" fill="none" stroke="${color}" stroke-width="4"/><path d="M${n.x-22} ${n.y}h44 M${n.x} ${n.y-22}v44" stroke="#f0f0f0" stroke-width="2"/>`;
   }else if(led){
      // LED schematic: diode with cathode bar plus outward light-emission arrows.
      body=`<circle class="led-housing ${active?'lit':''}" cx="${n.x}" cy="${n.y}" r="32"/>
        <path d="M ${n.x-17} ${n.y-15} L ${n.x+8} ${n.y} L ${n.x-17} ${n.y+15} Z" fill="${active?'#34fb8e':'#26292b'}" stroke="#f7f7f7" stroke-width="2.6"/>
        <path d="M ${n.x+8} ${n.y-17} V ${n.y+17}" stroke="#f7f7f7" stroke-width="3"/>
        <path class="led-rays ${active?'rays-on':''}" d="M ${n.x+13} ${n.y-23} l 14 -14 m -5 1 h 6 v 6 M ${n.x+23} ${n.y-13} l 14 -14 m -5 1 h 6 v 6"/>
        <circle cx="${n.x}" cy="${n.y}" r="37" fill="none" stroke="${color}" stroke-width="1" opacity="${active?'.35':'.12'}"/>`;
   }else if(t==='SWITCH'){
      body=`<rect class="gate-body" x="${n.x-42}" y="${n.y-33}" width="84" height="66" rx="11"/>
       <rect x="${n.x-28}" y="${n.y-13}" width="56" height="25" rx="13" fill="${active?'#136439':'#27292b'}"/>
       <circle cx="${n.x+(active?15:-15)}" cy="${n.y-.5}" r="11" fill="${color}" ${active?'filter="url(#glow)"':''}/>
       <text class="gate-sublabel" x="${n.x}" y="${n.y+25}">${active?'ON · 1':'OFF · 0'}</text>`;
   }else if(t==='CLOCK'){
      body=`<rect class="gate-body" x="${n.x-42}" y="${n.y-33}" width="84" height="66" rx="10"/>
       <path d="M ${n.x-29} ${n.y+10} h9 v-24 h15 v24 h15 v-24 h15 v24 h9" fill="none" stroke="${color}" stroke-width="3.1" stroke-linejoin="round"/>`;
   }else if(t==='CONST1'||t==='CONST0'){
      body=`<rect class="gate-body" x="${n.x-40}" y="${n.y-32}" width="80" height="64" rx="9"/>
       <text class="gate-label" x="${n.x}" y="${n.y+1}" fill="${color}">${t==='CONST1'?'1':'0'}</text>`;
   }else body=gateShape(n);
   let ports='';
   if(analog){
     const countPins=TYPES[t].pins||2;
     for(let i=0;i<countPins;i++){
       const q=posAnalog(n,i),status=reading?.supported?(reading.pinCurrents?Math.abs(reading.pinCurrents[i]||0)>1e-6:reading.active?'#42ef85':'#969da4'):'#efc36a';
       const labels=pinNames[t]|| (t==='TRANSFORMER'?['P+','P−','S+','S−']:t==='LED_RGB'?['R','G','B',n.props?.commonAnode?'A':'K']:(t==='NPN'||t==='PNP')?['B','C','E']:(t==='NMOS'||t==='PMOS')?['G','D','S']:(t==='OPAMP'?['+','−','OUT']:t.startsWith('LED_')||t.startsWith('DIODE_')||t==='PHOTODIODE'?['A','K']:['−','+']));
       ports+=`<circle class="port-hit" data-kind="analog-pin" data-node="${n.id}" data-pin="${i}" cx="${q.x}" cy="${q.y}" r="19"/><circle class="port" cx="${q.x}" cy="${q.y}" r="8.5" fill="${status}"/><text class="component-mini" x="${q.x+(countPins>=5?(i<Math.ceil(countPins/2)?18:-18):i===0?-12:i===1?12:0)}" y="${q.y+(countPins>=5?4:i===2?19:-13)}" text-anchor="middle">${labels[i]}</text>`;
     }
   } else {
     for(let i=0;i<count;i++){
       const pin=posInput(n,i),driver=wires.find(w=>w.to===n.id&&w.input===i),iv=driver?lastState.outs.get(driver.from):null;
       ports+=`<line class="pin-lead" x1="${pin.x}" y1="${pin.y}" x2="${n.x-(led?32:37)}" y2="${pin.y}"/><circle class="port-hit" data-kind="in" data-node="${n.id}" data-input="${i}" cx="${pin.x}" cy="${pin.y}" r="20"/><circle class="port in" cx="${pin.x}" cy="${pin.y}" r="8.5" style="fill:${pinColor(iv)}"/>`;
     }
     if(!led)ports+=`<line class="pin-lead" x1="${n.x+43}" y1="${n.y}" x2="${n.x+52}" y2="${n.y}"/><circle class="port-hit" data-kind="out" data-node="${n.id}" cx="${n.x+52}" cy="${n.y}" r="20"/><circle class="port out" cx="${n.x+52}" cy="${n.y}" r="8.5" style="fill:${color}"/>`;
   }
   const readingText=analog?(reading?.supported&&reading?.voltage!==null?`${(reading.current*1000).toFixed(2)} mA · ${reading.voltage.toFixed(2)} V`:'sin modelo/medición'):'';
   return `<g class="node-group ${selected===n.id?'selected':''}" data-node="${n.id}" data-kind="node">
      <rect data-kind="node" data-node="${n.id}" x="${n.x-58}" y="${n.y-(analog&&(TYPES[t].pins||2)>4?126:43)}" width="116" height="${analog&&(TYPES[t].pins||2)>4?252:132}" fill="transparent" pointer-events="all"/>${body}<text class="gate-caption" x="${n.x}" y="${n.y+(analog&&(TYPES[t].pins||2)>4?135:53)}">${title}</text><text class="component-properties" x="${n.x}" y="${n.y+(analog&&(TYPES[t].pins||2)>4?150:68)}">${escapeHtml(propBrief(n))}</text>${analog?`<text class="component-reading" x="${n.x}" y="${n.y+(analog&&(TYPES[t].pins||2)>4?165:83)}">${readingText}</text>`:''}${ports}</g>`;
 }
 function wirePath(a,b){const c=Math.max(50,Math.abs(b.x-a.x)*.38);return`M ${a.x} ${a.y} C ${a.x+c} ${a.y}, ${b.x-c} ${b.y}, ${b.x} ${b.y}`;}
 // For two-terminal electrical components, positive branch current flows
 // from pin 0 (left/anode) to pin 1 (right/cathode). On voltage sources
 // the calculated current from 0 to 1 describes current delivered by +.
 // Read both attached components so reversing the *drawing direction* of a
 // wire does not reverse the physics. Show flow only when current is solved.
 function analogWireFlow(w,a,b){
   const ra=analogState.readings.get(a.id),rb=analogState.readings.get(b.id);
   if(!ra?.supported && !rb?.supported)return 0;
   const out=(r,p)=>{if(!r?.supported)return null;if(Array.isArray(r.pinCurrents))return Number.isFinite(r.pinCurrents[p])?-r.pinCurrents[p]:null;return Number.isFinite(r.current)?(p===1?1:-1)*r.current:null;};
   const ia=out(ra,w.fromPin??1),ib=out(rb,w.toPin??0);
   const threshold=1e-6;
   if(ia!==null&&Math.abs(ia)>threshold && ib!==null&&Math.abs(ib)>threshold){
     // The same net may have branches; choose the stronger endpoint if the
     // two device models disagree because of KCL splits.
     if(ia>0&&ib<0)return 1;
     if(ia<0&&ib>0)return -1;
     return Math.abs(ia)>=Math.abs(ib)?Math.sign(ia):-Math.sign(ib);
   }
   if(ia!==null&&Math.abs(ia)>threshold)return Math.sign(ia);
   if(ib!==null&&Math.abs(ib)>threshold)return -Math.sign(ib);
   return 0;
 }
 function render(){board.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);
  const nodeMap=new Map(nodes.map(n=>[n.id,n]));let html='';
  for(const w of wires){const a=nodeMap.get(w.from),b=nodeMap.get(w.to);if(!a||!b)continue;
   const ptA=wireEndpoint(w,'from',a),ptB=wireEndpoint(w,'to',b);
   const d=wirePath(ptA,ptB),analog=TYPES[a.type]?.domain==='analog';
   const flow=analog?analogWireFlow(w,a,b):lastState.outs.get(a.id)===1?1:0;
   const signal=flow===0?(analogState.readings.get(a.id)?.supported&&analog?0:analog?null:lastState.outs.get(a.id)):1;
   const motionPath=flow<0?wirePath(ptB,ptA):d;
   html+=`<g data-kind="wire" data-wire="${w.id}"><path class="wire-back ${deleteMode?'wire-delete':''}" d="${d}"/>
   <path class="${flow!==0?'wire-energized':signal===0?'wire-low':'wire-open'}" d="${d}"/>
   ${flow!==0?`<path class="flow-chevron" d="M -9 -6 L 0 0 L -9 6"><animateMotion dur="1.8s" rotate="auto" repeatCount="indefinite" path="${motionPath}"/></path>`:''}</g>`;
  }
  if(lastWireMarkup!==html){wiresLayer.innerHTML=html;lastWireMarkup=html;}
  nodesLayer.innerHTML=nodes.map(n=>nodeSvg(n,lastState.outs.get(n.id))).join('');
  if(pendingPort){const src=nodeMap.get(pendingPort.node);if(src){const a=posAnalog(src,pendingPort.pin),b=mousePreview||{x:a.x+65,y:a.y};overlay.innerHTML=`<path class="wire-preview" d="${wirePath(a,b)}"/>`;}else pendingPort=null;}
  else if(pendingWire){const src=nodeMap.get(pendingWire);if(src){const a=posOutput(src);let b=mousePreview||{x:a.x+100,y:a.y};overlay.innerHTML=`<path class="wire-preview" d="${wirePath(a,b)}"/>`;}else pendingWire=null;}
  else if(pendingInput){const target=nodeMap.get(pendingInput.node);if(target){const b=posInput(target,pendingInput.index);overlay.innerHTML=`<circle class="pending-ring" cx="${b.x}" cy="${b.y}" r="21"/>`;}else pendingInput=null;}
  else overlay.innerHTML='';
  const legend=$('signalLegend');if(legend)legend.innerHTML=workspace==='electronics'?'<span><i class="green"></i> Corriente calculada</span><span><i class="gray"></i> Sin corriente</span><span><i class="amber"></i> Sin solución</span>':'<span><i class="green"></i> HIGH (1)</span><span><i class="gray"></i> LOW (0)</span><span><i class="amber"></i> Sin señal</span>';
  const summary=$('signalSummary');if(summary){
    if(workspace==='electronics'){
      const currents=[...analogState.readings.values()].filter(r=>r?.supported&&Number.isFinite(r.current)).map(r=>Math.abs(r.current));
      const maxI=Math.max(0,...currents);
      summary.textContent=maxI>1e-6?'CORRIENTE: '+(maxI*1000).toFixed(2)+' mA':'SIN CORRIENTE';
    }else summary.innerHTML='SEÑAL LÓGICA: <b class="high-word">1 / HIGH</b>';
  }
  $('statNodes').textContent=nodes.length+' componentes';$('statWires').textContent=wires.length+' conexiones';
  $('hint').textContent=deleteMode?'Modo borrar: toca un cable o componente':pendingWire?'Arrastra o toca una entrada para conectar':pendingInput?'Toca una salida para conectar':workspace==='electronics'?'Conecta + a A y K a − usando resistencia en serie · Mantén pulsado para propiedades':'Arrastra terminal a terminal · Mantén presionado para propiedades';
 }
 let mousePreview=null,lastWireMarkup=null;
 function refresh(){lastState=simulate(nodes,wires,clockState,performance.now(),logicMemory);logicMemory=lastState.state;analogState=simulateSpice(nodes,wires,performance.now()/1000,analogState.state);render();refreshScopeSelect();drawScope();
  if(!lastState.stable)showMessage('Oscilación detectada: ciclo sin estabilizar');refreshAnalogStatus();
 }
 function refreshAnalogStatus(){const e=$('analogStatus');if(!e)return;
  const analogs=nodes.filter(n=>TYPES[n.type]?.domain==='analog');
  if(!analogs.length){e.hidden=true;return;}
  e.hidden=false;
  const selectedNode=nodes.find(n=>n.id===selected&&TYPES[n.type]?.domain==='analog');
  const report=selectedNode?analogState.readings.get(selectedNode.id):null;
  const currentText=report?.supported&&report.current!==null?` · I=${(report.current*1000).toFixed(3)} mA · V=${report.voltage.toFixed(3)} V · P=${(report.power*1000).toFixed(3)} mW`:' · modelo pendiente o sin solución';
  e.textContent=`⚡ ${analogState.voltageStatus} · ${analogs.length} piezas eléctricas${selectedNode?` · ${selectedNode.label}${currentText}`:''}${analogState.warnings.length?' · ⚠ '+analogState.warnings.join(' '):''}`;
 }
 function openProps(node){if(!node)return;
   pendingWire=null;pendingInput=null;pendingPort=null;mousePreview=null;
   const dialog=$('propsDialog'),title=$('propsTitle'),fields=$('propsFields');title.textContent=`Propiedades · ${TYPES[node.type].name}`;
   fields.replaceChildren();const makeField=(name,label,val,kind,lo,hi,unit='')=>{
     const row=document.createElement('label');row.className='property-field';
     const heading=document.createElement('span');heading.textContent=label+(unit?' ('+unit+')':'');row.appendChild(heading);
     let input;if(kind==='boolean'){input=document.createElement('select');for(const [v,txt] of [['true','Sí'],['false','No']]){const opt=new Option(txt,v);input.appendChild(opt);}input.value=String(val);}
     else{input=document.createElement('input');input.type=kind;input.value=String(val);if(kind==='number'){input.step='any';input.min=String(lo);input.max=String(hi);}input.autocomplete='off';}
     input.dataset.property=name;row.appendChild(input);fields.appendChild(row);
   };
   makeField('label','Nombre',node.label,'text',null,null);
   for(const [key,label,unit,def,min,max] of (PROPERTY_SCHEMAS[node.type]||[]))makeField(key,label,node.props?.[key]??def,unit==='boolean'?'boolean':'number',min,max,unit==='boolean'?'':unit);
   if(!PROPERTY_SCHEMAS[node.type]?.length){const hint=document.createElement('p');hint.textContent='Este componente todavía no tiene parámetros eléctricos; puedes cambiar su nombre y posición.';fields.appendChild(hint);}
   $('propsHelp').textContent=TYPES[node.type].domain==='analog'?((SUPPORTED.has(node.type)||MULTI.has(node.type)||DEVICE_TYPES.has(node.type)||['TRANSFORMER','LED_RGB'].includes(node.type))?'Modelos didácticos MNA y SPICE-lite: transistores y opamp usan aproximaciones DC; exporta .cir para comparar con ngspice. No usar para seguridad ni diseño de potencia.':'Este componente está disponible para esquemas; su comportamiento físico aún no se simula.'):'Componente lógico: modifica sus propiedades y comprueba las señales.';
   dialog.dataset.node=node.id;dialog.showModal();
 }
 $('propsForm').addEventListener('submit',e=>{e.preventDefault();const node=nodes.find(n=>n.id===$('propsDialog').dataset.node);if(!node)return;
   const form=$('propsForm');const label=form.querySelector('[data-property="label"]').value.trim().slice(0,32);
   if(!label){showMessage('El nombre no puede estar vacío');return;}
   const raw={};for(const input of form.querySelectorAll('[data-property]'))if(input.dataset.property!=='label'){
     if(input.type==='number'&&(!input.value.trim()||!input.validity.valid)){showMessage('Corrige el valor de '+input.parentElement.querySelector('span').textContent);input.focus();return;}
     raw[input.dataset.property]=input.tagName==='SELECT'?input.value==='true':Number(input.value);
   }
   snapshot();node.label=label;node.props=cleanProps(node.type,raw);
   if(['DFF','TFF','JKFF','SRLATCH'].includes(node.type))delete logicMemory.registers[node.id];
   persist();refresh();$('propsDialog').close();showMessage('✓ Propiedades guardadas');
 });
 $('propsClose').onclick=()=>$('propsDialog').close();
 $('editBtn').onclick=()=>{const node=nodes.find(n=>n.id===selected);if(node)openProps(node);else showMessage('Selecciona un componente y toca Editar');};
 function refreshScopeSelect(){const s=$('scopeSelect'),previous=s.value;
  s.innerHTML=nodes.map(n=>`<option value="${escapeHtml(n.id)}">${escapeHtml(n.label)}</option>`).join('');
  if(nodes.some(n=>n.id===scopeId))s.value=scopeId;else{scopeId=nodes[0]?.id||null;s.value=scopeId||'';}
  if(s.value!==previous)trace.length=0;
 }
 function drawScope(){
  const analog=TYPES[nodes.find(n=>n.id===scopeId)?.type]?.domain==='analog';
  const v=analog?analogState.readings.get(scopeId)?.voltage:lastState.outs.get(scopeId);
  const values=trace.length?trace:[v];const valid=values.filter(Number.isFinite);
  const maxV=analog?Math.max(1,Math.ceil(Math.max(0,...valid.map(x=>Math.abs(x))))):1;
  const minV=analog?-maxV:0;
  let out='';for(let y of [27,62,97])out+=`<line x1="0" y1="${y}" x2="920" y2="${y}" stroke="#343638" stroke-dasharray="5 7"/>`;
  for(let x=0;x<920;x+=92)out+=`<line x1="${x}" y1="3" x2="${x}" y2="113" stroke="#292b2d"/>`;
  out+=`<text x="7" y="19" fill="#44f58b" font-size="11">${analog?maxV+'V':'1'}</text><text x="7" y="111" fill="#aaaeb1" font-size="11">${analog?minV+'V':'0'}</text>`;
  const coords=[],width=894,ox=26,step=width/119;
  const plotY=val=>Number.isFinite(val)?99-71*(val-minV)/(maxV-minV):63;
  values.forEach((val,i)=>{const x=ox+(i+(120-values.length))*step,y=plotY(val);
    if(!coords.length)coords.push(`M ${x} ${y}`);else coords.push(`L ${x} ${plotY(values[i-1])} L ${x} ${y}`);
  });
  out+=`<path d="${coords.join(' ')}" stroke="#36f0ab" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
  $('scopeState').textContent=analog?(Number.isFinite(v)?`${v.toFixed(3)} V`:'SIN MODELO'):v===1?'HIGH · 1':v===0?'LOW · 0':'SIN SEÑAL';
  $('scopeLayer').innerHTML=out;
 }
 function addTool(type){
  // Place new parts in a free lane instead of stacking them under one finger.
  const category=Object.entries(categories).find(([,parts])=>parts.includes(type))?.[0];
  const xFractions=['source','supply'].includes(category)?[.20,.30,.44,.55,.70]:category==='output'?[.79,.65,.50,.37]:[.48,.58,.36,.68,.25];
  const yFractions=[.39,.60,.21,.78,.50,.29,.70];let candidate=null;
  for(const xf of xFractions){for(const yf of yFractions){
    const x=round(view.x+view.w*xf),y=round(view.y+view.h*yf);
    const dist=nodes.length?Math.min(...nodes.map(n=>Math.hypot(n.x-x,n.y-y))):Infinity;
    if(dist>135){candidate={x,y};break;}
    if(!candidate||dist>candidate.dist)candidate={x,y,dist};
  }if(candidate&&!('dist' in candidate))break;}
  const at=candidate||{x:view.x+view.w*.5,y:view.y+view.h*.5};
  if((TYPES[type].domain==='analog')!==(workspace==='electronics')){showMessage('Esta pieza pertenece al otro laboratorio');return;}
  snapshot();const n=add(type,at.x,at.y);selected=n.id;persist();refresh();showMessage(`${labels[type]} añadido · arrástralo para moverlo`);
 }
 function sparks(x,y,reason){
  // Tiny, purely cosmetic SVG particle burst: never implies a physical short circuit.
  const g=document.createElementNS(svgNS,'g');g.setAttribute('class','spark-burst');g.setAttribute('transform',`translate(${x} ${y})`);
  for(let i=0;i<9;i++){
    const c=document.createElementNS(svgNS,'circle');const theta=2*Math.PI*i/9;
    c.setAttribute('class','spark-particle');c.setAttribute('r',i%2?3:4.5);
    c.setAttribute('fill',i%3===0?'#ff6b54':i%3===1?'#ffca65':'#fffbcd');
    c.style.setProperty('--dx',`${Math.round(Math.cos(theta)*38)}px`);c.style.setProperty('--dy',`${Math.round(Math.sin(theta)*38)}px`);
    g.appendChild(c);
  }
  const flash=document.createElementNS(svgNS,'circle');flash.setAttribute('r','10');flash.setAttribute('class','spark-flash');g.appendChild(flash);
  fxLayer.appendChild(g);setTimeout(()=>g.remove(),650);
  if(reason)showMessage(reason);
 }
 function connectAnalog(from,fromPin,to,toPin){
   const a=nodes.find(n=>n.id===from),b=nodes.find(n=>n.id===to);
   if(!a||!b||TYPES[a.type]?.domain!=='analog'||TYPES[b.type]?.domain!=='analog')return false;
   if(from===to&&fromPin===toPin)return false;
   if(wires.some(w=>w.from===from&&w.to===to&&(w.fromPin??1)===fromPin&&(w.toPin??0)===toPin || w.from===to&&w.to===from&&(w.fromPin??1)===toPin&&(w.toPin??0)===fromPin))return false;
   snapshot();wires.push({id:makeWireId(),from,to,input:0,fromPin,toPin});pendingPort=null;mousePreview=null;persist();refresh();showMessage('✓ Terminales conectados');return true;
 }
 function nearestAnalogPort(x,y,ignore){
   const tolerance=Math.max(17,Math.min(55,26*view.w/Math.max(1,board.getBoundingClientRect().width)));
   let best=null,dist=tolerance;
   for(const n of nodes)if(TYPES[n.type].domain==='analog')for(let i=0;i<(TYPES[n.type].pins||2);i++){
     const q=posAnalog(n,i),d=Math.hypot(q.x-x,q.y-y);
     if(d<dist&&!(ignore?.node===n.id&&ignore.pin===i)){dist=d;best={node:n.id,pin:i};}
   }
   return best;
 }
 function connect(from,to,input){
   const a=nodes.find(n=>n.id===from),b=nodes.find(n=>n.id===to),pin=b?posInput(b,input):null;
   const fail=(message)=>{sparks(pin?.x??a?.x??0,pin?.y??a?.y??0,message);return false;};
   if(!a||!b||!TYPES[a.type]||!TYPES[b.type])return fail('Componente inválido');
   if(from===to)return fail('Conexión a sí mismo no permitida');
   if((TYPES[a.type].domain==='analog')!==(TYPES[b.type].domain==='analog'))return fail('Usa conexiones separadas para señales lógicas y eléctricas');
   if(['LED','OUT','PROBE'].includes(a.type)||input<0||input>=TYPES[b.type].in)return fail('Dirección de conexión incorrecta');
   const prev=wires.find(w=>w.to===to&&w.input===input);
   if(prev&&prev.from===from)return fail('Ese cable ya existe');
   if(prev)return fail('Entrada ocupada: borra el cable anterior o usa Deshacer');
   snapshot();wire(a,b,input);pendingWire=null;pendingInput=null;mousePreview=null;persist();refresh();showMessage('✓ Conexión realizada');return true;
 }
 function nearestPort(kind,x,y){
   const tolerance=Math.max(16,Math.min(55,26*view.w/Math.max(1,board.getBoundingClientRect().width)));
   let best=null,dist=tolerance;
   for(const n of nodes){
     const num=kind==='in'?TYPES[n.type].in:['LED','OUT','PROBE'].includes(n.type)?0:1;
     for(let i=0;i<num;i++){
       const q=kind==='in'?posInput(n,i):posOutput(n),d=Math.hypot(x-q.x,y-q.y);
       if(d<dist){dist=d;best={node:n.id,input:i};}
     }
   }
   return best;
 }
 function handlePort(t){
   const n=nodes.find(n=>n.id===t.dataset.node);if(!n)return;
   if(t.dataset.kind==='out'){
     if(pendingInput){connect(n.id,pendingInput.node,pendingInput.index);return;}
     pendingWire=n.id;mousePreview=posOutput(n);pendingInput=null;render();
   }else{
     const index=Number(t.dataset.input);
     if(pendingWire){connect(pendingWire,n.id,index);return;}
     pendingInput={node:n.id,index};pendingWire=null;render();showMessage('Ahora toca una salida');
   }
 }
 function previewWire(){
   if(!pendingWire)return;
   const n=nodes.find(n=>n.id===pendingWire);if(!n)return;
   const start=posOutput(n),end=mousePreview||start;
   overlay.innerHTML=`<path class="wire-preview" d="${wirePath(start,end)}"/><circle cx="${end.x}" cy="${end.y}" r="9" fill="#f4f4f4" opacity=".88"/>`;
 }
 function zoom(mult){const cw=view.w*mult,ch=view.h*mult;if(cw<320||cw>4500)return;
  view.x+=(view.w-cw)/2;view.y+=(view.h-ch)/2;view.w=cw;view.h=ch;render();}
 function updateRun(){running=!running;$('runBtn').innerHTML=running?'❚❚ <span>Pausar</span>':'▶ <span>Reanudar</span>';
  $('liveStatus').textContent=running?'SIMULANDO':'EN PAUSA';document.querySelector('.app').classList.toggle('paused',!running);if(running)board.unpauseAnimations();else board.pauseAnimations();document.querySelector('.live-pill i').style.background=running?'var(--hi)':'var(--warn)';showMessage(running?'Simulación reanudada':'Simulación pausada');}
 // Improved touch interaction: large hit targets, output-to-input drag or two-tap wiring.
 board.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  const t=e.target.closest('[data-kind]');const p=xyEvent(e);
  if(deleteMode){
    if(t?.dataset.kind==='wire'){snapshot();wires=wires.filter(w=>w.id!==t.dataset.wire);persist();refresh();}
    else if(t?.dataset.kind==='node'){snapshot();const id=t.dataset.node;nodes=nodes.filter(n=>n.id!==id);wires=wires.filter(w=>w.from!==id&&w.to!==id);if(scopeId===id)scopeId=null;persist();refresh();}
    e.preventDefault();return;
  }
  if(t?.dataset.kind==='analog-pin'){
    const pin={node:t.dataset.node,pin:Number(t.dataset.pin)};
    if(pendingPort){connectAnalog(pendingPort.node,pendingPort.pin,pin.node,pin.pin);pendingPort=null;e.preventDefault();return;}
    pendingPort=pin;mousePreview=p;
    gesture={mode:'analog-wire',start:pin,startX:e.clientX,startY:e.clientY,moved:false};
    board.setPointerCapture(e.pointerId);render();e.preventDefault();return;
  }
  if(t?.dataset.kind==='out'){
    const id=t.dataset.node;
    if(pendingInput){connect(id,pendingInput.node,pendingInput.index);e.preventDefault();return;}
    pendingWire=id;mousePreview=p;pendingInput=null;
    gesture={mode:'wire',from:id,startX:e.clientX,startY:e.clientY,moved:false};
    board.setPointerCapture(e.pointerId);previewWire();e.preventDefault();return;
  }
  if(t?.dataset.kind==='in'){
    handlePort(t);e.preventDefault();return;
  }
  if(t?.dataset.kind==='node'){
    const n=nodes.find(x=>x.id===t.dataset.node);if(!n)return;
    selected=n.id;
    gesture={mode:'node',id:n.id,startX:e.clientX,startY:e.clientY,startNodeX:n.x,startNodeY:n.y,moved:false,held:false,timer:null};
    const hold=gesture;hold.timer=setTimeout(()=>{if(gesture!==hold||hold.moved)return;hold.held=true;openProps(n);},550);
    board.setPointerCapture(e.pointerId);render();e.preventDefault();return;
  }
  gesture={mode:'pan',startX:e.clientX,startY:e.clientY,startView:{...view},moved:false};
  board.setPointerCapture(e.pointerId);e.preventDefault();
 });
 board.addEventListener('pointermove',e=>{
  if(!gesture)return;
  const deltaX=e.clientX-gesture.startX,deltaY=e.clientY-gesture.startY;
  const rect=board.getBoundingClientRect(),scaleX=view.w/Math.max(1,rect.width),scaleY=view.h/Math.max(1,rect.height);
  if(gesture.mode==='analog-wire'){if(Math.hypot(deltaX,deltaY)>8)gesture.moved=true;mousePreview=xyEvent(e);render();return;}
  if(gesture.mode==='wire'){
    if(Math.hypot(deltaX,deltaY)>8)gesture.moved=true;
    mousePreview=xyEvent(e);previewWire();return;
  }
  if(gesture.mode==='node'){
    const n=nodes.find(x=>x.id===gesture.id);if(!n)return;
    if(Math.hypot(deltaX,deltaY)>9){if(gesture.timer){clearTimeout(gesture.timer);gesture.timer=null;}if(!gesture.moved)snapshot();gesture.moved=true;}
    if(gesture.moved){n.x=round(gesture.startNodeX+deltaX*scaleX,2);n.y=round(gesture.startNodeY+deltaY*scaleY,2);render();}
  }else if(gesture.mode==='pan'){
    if(Math.hypot(deltaX,deltaY)>4)gesture.moved=true;
    if(gesture.moved){view.x=gesture.startView.x-deltaX*scaleX;view.y=gesture.startView.y-deltaY*scaleY;render();}
  }
 });
 function endPointer(e){
  if(!gesture)return;
  if(gesture.timer)clearTimeout(gesture.timer);
  if(gesture.held){gesture=null;return;}
  if(gesture.mode==='analog-wire'){const p=xyEvent(e),target=nearestAnalogPort(p.x,p.y,gesture.start);if(target)connectAnalog(gesture.start.node,gesture.start.pin,target.node,target.pin);else {pendingPort=gesture.start;mousePreview=null;render();}}
  else if(gesture.mode==='wire'){
    const p=xyEvent(e),target=nearestPort('in',p.x,p.y);
    if(target){connect(gesture.from,target.node,target.input);}
    else {pendingWire=gesture.from;mousePreview=null;render();if(gesture.moved)showMessage('Suelta sobre una entrada, o tócala para conectar');}
  }else if(gesture.mode==='node'){
    const n=nodes.find(x=>x.id===gesture.id);
    if(n&&!gesture.moved&&n.type==='SWITCH'){snapshot();n.state=1-n.state;showMessage(`${n.label}: ${n.state}`);}
    if(gesture.moved||n?.type==='SWITCH'){persist();refresh();}
  }
  gesture=null;
  if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);
 }
 board.addEventListener('pointerup',endPointer);
 board.addEventListener('pointercancel',()=>{pendingPort=null;if(gesture?.timer)clearTimeout(gesture.timer);gesture=null;mousePreview=null;render();});
 board.addEventListener('dblclick',e=>{const node=e.target.closest('[data-kind="node"]');if(node)openProps(nodes.find(n=>n.id===node.dataset.node));});
 board.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.88);},{passive:false});
 function drawTools(){const query=$('toolSearch').value.toLocaleLowerCase('es').trim(),cat=$('toolCategory').value;
  const allowed=new Set((workspace==='logic'?logicCategories:electronicsCategories).flatMap(c=>categories[c]));
  const types=(cat==='all'?buttonTypes:(categories[cat]||[])).filter(t=>allowed.has(t)).filter(t=>(labels[t]+' '+t).toLocaleLowerCase('es').includes(query));
  $('tools').innerHTML=types.length?types.map(t=>{const kind=TYPES[t].domain==='analog'?((SUPPORTED.has(t)||MULTI.has(t)||DEVICE_TYPES.has(t)||['TRANSFORMER','LED_RGB'].includes(t))?'Física':'Esquema'):'Lógica';return `<button class="tool" data-type="${t}" title="Añadir ${labels[t]} · ${kind}"><span class="glyph" style="${t==='LED_RGB'?'background:linear-gradient(90deg,#ff4255,#45ed77,#4489ff);background-clip:text;-webkit-background-clip:text;color:transparent':`color:${LED_COLORS[t]||'#fff'}`}">${symbols[t]}</span><span>${labels[t]}</span><small class="model-type ${kind==='Esquema'?'pending':''}">${kind}</small></button>`;}).join(''):'<span class="empty-tools">Sin resultados</span>';
 }
 $('logicModeBtn').onclick=()=>switchWorkspace('logic');$('electronicsModeBtn').onclick=()=>switchWorkspace('electronics');
 $('toolSearch').oninput=drawTools;$('toolCategory').onchange=drawTools;drawTools();
 $('tools').addEventListener('click',e=>{const t=e.target.closest('[data-type]');if(t)addTool(t.dataset.type);});
 $('newBtn').onclick=newProject;$('sampleBtn').onclick=()=>{snapshot();importFeedback('');demo();};$('undoBtn').onclick=undo;
 $('clearBtn').onclick=()=>{if(!confirm('¿Borrar todos los componentes de este laboratorio?'))return;snapshot();nodes=[];wires=[];logicMemory={registers:{}};scopeId=null;pendingWire=null;pendingInput=null;trace.length=0;persist();refresh();};
 $('deleteModeBtn').onclick=()=>{deleteMode=!deleteMode;$('deleteModeBtn').classList.toggle('on',deleteMode);pendingWire=null;pendingInput=null;refresh();};
 $('zoomInBtn').onclick=()=>zoom(.8);$('zoomOutBtn').onclick=()=>zoom(1.25);$('zoomResetBtn').onclick=()=>{fitCircuit();render();};
 $('runBtn').onclick=updateRun;$('saveBtn').onclick=exportProject;$('spiceBtn').onclick=saveSpice;
 $('loadBtn').onclick=()=>{if(window.AndroidBridge){window.AndroidBridge.openJson();return;}$('fileInput').click();};
 $('fileInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>2000000){showMessage('Archivo demasiado grande');return;}importProject(await f.text());e.target.value='';};
 $('scopeSelect').onchange=e=>{scopeId=e.target.value;trace.length=0;drawScope();};
 document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}if(e.key==='Escape'){pendingPort=null;pendingWire=null;pendingInput=null;deleteMode=false;$('deleteModeBtn').classList.remove('on');render();}});
 setInterval(()=>{
  if(!running)return;
  const now=performance.now();if(now-clockTime>=500){clockState=1-clockState;clockTime=now;}
  const nextState=simulate(nodes,wires,clockState,now,logicMemory);logicMemory=nextState.state;const nextAnalog=simulateSpice(nodes,wires,now/1000,analogState.state);const currentFingerprint=JSON.stringify([...nextAnalog.readings.values()].map(r=>[r.active,Math.round((r.current||0)*10000),Math.round((r.voltage||0)*1000)]));const priorFingerprint=JSON.stringify([...analogState.readings.values()].map(r=>[r.active,Math.round((r.current||0)*10000),Math.round((r.voltage||0)*1000)]));analogState=nextAnalog;
  const changed=nodes.some(n=>nextState.outs.get(n.id)!==lastState.outs.get(n.id));lastState=nextState;
  trace.push(TYPES[nodes.find(n=>n.id===scopeId)?.type]?.domain==='analog'?(analogState.readings.get(scopeId)?.voltage??null):(lastState.outs.get(scopeId)??null));if(trace.length>120)trace.shift();
  if((changed||currentFingerprint!==priorFingerprint)&&!gesture)render();drawScope();refreshAnalogStatus();
  if(nextAnalog.fault && now-analogFaultAt>5000){analogFaultAt=now;const n=nodes.find(n=>Math.abs(nextAnalog.readings.get(n.id)?.current||0)>20);if(n)sparks(n.x,n.y,'⚠ Posible cortocircuito/sobrecarga: revisa el circuito');}
  if(!nextState.stable && (!window.lastFaultAt || performance.now()-window.lastFaultAt>3500)){
    window.lastFaultAt=performance.now();const n=nodes.find(n=>TYPES[n.type].in>0);
    if(n)sparks(n.x,n.y,'Circuito sin estabilizar: revisa la realimentación');
  }
 },90);
 try{restoreWorkspaceData();}catch(err){console.warn('No se pudo restaurar',err);workspace='logic';spaces.logic={nodes:[],wires:[],history:[],view:null};demo();}
 
})();
