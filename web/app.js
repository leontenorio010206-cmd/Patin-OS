/* Patiñ Os Android GUI. SVG editor, live propagation, touch support, oscilloscope. */
(() => {
 'use strict';
 const {TYPES,simulate,validateProject}=window.DigitalEngine;
 const {parseDig}=window.PatinosDig;
 const $=id=>document.getElementById(id);
 const svgNS='http://www.w3.org/2000/svg';
 const board=$('board');const stage=$('stage');const nodesLayer=$('nodesLayer');const wiresLayer=$('wiresLayer');const overlay=$('overlayLayer');
 let nodes=[],wires=[],seq=100,selected=null,scopeId=null,history=[],pendingWire=null,gesture=null,deleteMode=false,running=true,clockState=0,clockTime=0;
 let view={x:0,y:0,w:1160,h:650};let lastState={outs:new Map(),stable:true,conflict:false};const trace=[];
 const buttonTypes=['SWITCH','CLOCK','CONST1','CONST0','AND','OR','XOR','NOT','NAND','NOR','XNOR','BUF','LED','OUT'];
 const symbols={SWITCH:'⏻',CLOCK:'◷',CONST1:'1',CONST0:'0',AND:'&',OR:'≥1',XOR:'=1',NOT:'¬',NAND:'⊼',NOR:'⊽',XNOR:'≡',BUF:'▷',LED:'◉',OUT:'→'};
 const labels={SWITCH:'Entrada',CLOCK:'Reloj',CONST1:'HIGH',CONST0:'LOW',AND:'AND',OR:'OR',XOR:'XOR',NOT:'NOT',NAND:'NAND',NOR:'NOR',XNOR:'XNOR',BUF:'Buffer',LED:'LED',OUT:'Salida'};
 const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const makeId=()=>`n${++seq}`;const makeWireId=()=>`w${++seq}`;
 function add(type,x,y,label,st=0){const n={id:makeId(),type,x,y,label:label||labels[type],state:st};nodes.push(n);return n;}
 function wire(from,to,input){wires.push({id:makeWireId(),from:from.id,to:to.id,input});}
 function demo(){
  nodes=[];wires=[];seq=100;
  const a=add('SWITCH',175,175,'Entrada A',1),b=add('SWITCH',175,315,'Entrada B',1),and=add('AND',465,235,'AND'),led=add('LED',765,235,'LED / Y');
  const clock=add('CLOCK',175,495,'CLK'),not=add('NOT',465,495,'NOT'),led2=add('LED',765,495,'LED / Q');
  wire(a,and,0);wire(b,and,1);wire(and,led,0);wire(clock,not,0);wire(not,led2,0);
  selected=null;pendingWire=null;scopeId=led.id;view={x:0,y:0,w:1160,h:650};trace.length=0;persist();refresh();showMessage('Ejemplo listo: toca A, B o el reloj');
 }
 function snapshot(){history.push(JSON.stringify({nodes,wires}));if(history.length>35)history.shift();}
 function undo(){if(!history.length){showMessage('Nada que deshacer');return;}const p=JSON.parse(history.pop());nodes=p.nodes;wires=p.wires;seq=Math.max(seq,...nodes.map(n=>parseInt(n.id.replace(/\D/g,''))||0),...wires.map(w=>parseInt(w.id.replace(/\D/g,''))||0));selected=null;pendingWire=null;persist();refresh();}
 function persist(){try{localStorage.setItem('digital-flow-autosave',JSON.stringify({format:'digital-flow-v1',nodes,wires}));}catch(_){}}
 function fitCircuit(){
  if(!nodes.length)return;
  const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);
  let minX=Math.min(...xs)-135,maxX=Math.max(...xs)+135,minY=Math.min(...ys)-125,maxY=Math.max(...ys)+125;
  let width=Math.max(360,maxX-minX),height=Math.max(280,maxY-minY);
  const ratio=1160/650;if(width/height>ratio)height=width/ratio;else width=height*ratio;
  view={x:(minX+maxX-width)/2,y:(minY+maxY-height)/2,w:width,h:height};
 }
 function importFeedback(text){$('importStatus').textContent=text;$('importStatus').hidden=!text;}
 function setProject(p){const v=validateProject(p);snapshot();nodes=v.nodes;wires=v.wires;seq=Math.max(seq,...nodes.map(n=>Number(n.id.replace(/\D/g,''))||0),...wires.map(w=>Number(w.id.replace(/\D/g,''))||0));pendingWire=null;selected=null;scopeId=nodes.find(n=>n.type==='LED'||n.type==='OUT')?.id||nodes[0]?.id||null;trace.length=0;fitCircuit();persist();refresh();importFeedback(p.importNote||'');showMessage('Circuito abierto: '+nodes.length+' componentes / '+wires.length+' enlaces');}
 function exportProject(){const json=JSON.stringify({format:'digital-flow-v1',nodes,wires},null,2);
  if(window.AndroidBridge){window.AndroidBridge.saveJson(json);return;}
  const a=document.createElement('a');const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.href=url;a.download='circuito.patinos.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showMessage('Archivo JSON exportado');
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
 function posInput(n,i){const size=TYPES[n.type].in;return{x:n.x-52,y:n.y+(size===2?(i===0?-16:16):0)};}
 const round=(x,n=10)=>Math.round(x/n)*n;
 function nodeSvg(n,value){
  const inputCount=TYPES[n.type].in,source=inputCount===0,led=n.type==='LED'||n.type==='OUT',isSwitch=n.type==='SWITCH',isClock=n.type==='CLOCK';
  const active=value===1,color=active?'#38f0a2':value===0?'#59708a':'#e2ad58';
  const title=escapeHtml(n.label),glyph=escapeHtml(symbols[n.type]||n.type);
  let port='';for(let i=0;i<inputCount;i++){const p=posInput(n,i);port+=`<circle class="port in" data-kind="in" data-node="${n.id}" data-input="${i}" cx="${p.x}" cy="${p.y}" r="9"/>`;}
  if(!led)port+=`<circle class="port out" data-kind="out" data-node="${n.id}" cx="${n.x+52}" cy="${n.y}" r="9"/>`;
  let extra='';
  if(led)extra=`<circle cx="${n.x}" cy="${n.y-5}" r="12" fill="${active?'#37f5a5':'#182a3a'}" stroke="${color}" stroke-width="2.5" ${active?'filter="url(#glow)"':''}/><text class="gate-sublabel" x="${n.x}" y="${n.y+26}">${escapeHtml(value==null?'?':value)}</text>`;
  else if(isSwitch)extra=`<rect x="${n.x-28}" y="${n.y-17}" width="56" height="27" rx="13" fill="#0a1926" stroke="#29475a"/><circle cx="${n.x+(active?15:-15)}" cy="${n.y-3.5}" r="10" fill="${color}"/><text class="gate-sublabel" x="${n.x}" y="${n.y+25}">${active?'ON · 1':'OFF · 0'}</text>`;
  else if(isClock)extra=`<path d="M ${n.x-25},${n.y+8} v-12 h15 v-13 h15 v13 h15 v-13 h10" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
  else extra=`<text class="gate-label" x="${n.x}" y="${n.y-1}">${glyph}</text>`;
  return `<g class="node-group ${selected===n.id?'selected':''}" data-node="${n.id}" data-kind="node">
   <rect class="gate-body" x="${n.x-44}" y="${n.y-34}" width="88" height="68" rx="11"/>
   <rect x="${n.x-38}" y="${n.y-28}" width="4" height="55" rx="2" fill="${color}" opacity=".9"/>
   ${extra}<text class="gate-caption" x="${n.x}" y="${n.y+51}">${title}</text>${port}</g>`;
 }
 function wirePath(a,b){const c=Math.max(50,Math.abs(b.x-a.x)*.38);return`M ${a.x} ${a.y} C ${a.x+c} ${a.y}, ${b.x-c} ${b.y}, ${b.x} ${b.y}`;}
 function render(){board.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);
  const nodeMap=new Map(nodes.map(n=>[n.id,n]));let html='';
  for(const w of wires){const a=nodeMap.get(w.from),b=nodeMap.get(w.to);if(!a||!b)continue;
   const d=wirePath(posOutput(a),posInput(b,w.input));const v=lastState.outs.get(a.id);
   html+=`<g data-kind="wire" data-wire="${w.id}"><path class="wire-back ${deleteMode?'wire-delete':''}" d="${d}"/>
   <path class="${v===1?'wire-energized':v===0?'wire-low':'wire-open'}" d="${d}"/></g>`;
  }
  wiresLayer.innerHTML=html;
  nodesLayer.innerHTML=nodes.map(n=>nodeSvg(n,lastState.outs.get(n.id))).join('');
  if(pendingWire){const src=nodeMap.get(pendingWire);if(src){const a=posOutput(src);let b=mousePreview||{x:a.x+100,y:a.y};overlay.innerHTML=`<path class="wire-preview" d="${wirePath(a,b)}"/>`;}else pendingWire=null;}
  else overlay.innerHTML='';
  $('statNodes').textContent=nodes.length+' componentes';$('statWires').textContent=wires.length+' conexiones';
  $('hint').textContent=deleteMode?'Modo borrar: toca un cable o componente':pendingWire?'Selecciona una entrada azul para conectar':'Toca interruptores para alternar 0 / 1';
 }
 let mousePreview=null;
 function refresh(){lastState=simulate(nodes,wires,clockState);render();refreshScopeSelect();drawScope();
  if(!lastState.stable)showMessage('Oscilación detectada: ciclo sin estabilizar');
 }
 function refreshScopeSelect(){const s=$('scopeSelect'),previous=s.value;
  s.innerHTML=nodes.map(n=>`<option value="${escapeHtml(n.id)}">${escapeHtml(n.label)}</option>`).join('');
  if(nodes.some(n=>n.id===scopeId))s.value=scopeId;else{scopeId=nodes[0]?.id||null;s.value=scopeId||'';}
  if(s.value!==previous)trace.length=0;
 }
 function drawScope(){const v=lastState.outs.get(scopeId);const values=trace.length?trace:[v];
  let out='';for(let y of [27,62,97])out+=`<line x1="0" y1="${y}" x2="920" y2="${y}" stroke="#25364a" stroke-dasharray="5 7"/>`;
  for(let x=0;x<920;x+=92)out+=`<line x1="${x}" y1="3" x2="${x}" y2="113" stroke="#203249"/>`;
  out+=`<text x="7" y="19" fill="#47e4af" font-size="11">1</text><text x="7" y="111" fill="#8da2b6" font-size="11">0</text>`;
  const coords=[];const width=894,ox=26,step=width/119;
  values.forEach((v,i)=>{const x=ox+(i+(120-values.length))*step,y=v===1?28:v===0?99:63;
    if(!coords.length)coords.push(`M ${x} ${y}`);else{const prevY=values[i-1]===1?28:values[i-1]===0?99:63;coords.push(`L ${x} ${prevY} L ${x} ${y}`);}
  });
  out+=`<path d="${coords.join(' ')}" stroke="#36f0ab" stroke-width="2.4" fill="none" stroke-linejoin="round"/>`;
  const last=v===1?'HIGH · 1':v===0?'LOW · 0':'SIN SEÑAL';$('scopeState').textContent=last;
  $('scopeLayer').innerHTML=out;
 }
 function addTool(type){const center={x:view.x+view.w*.50+Math.random()*30-15,y:view.y+view.h*.48+Math.random()*20-10};
  snapshot();const n=add(type,round(center.x,10),round(center.y,10));selected=n.id;persist();refresh();showMessage(`${labels[type]} añadido · arrástralo para moverlo`);
 }
 function handlePort(t){const n=nodes.find(n=>n.id===t.dataset.node);if(!n)return;
  if(t.dataset.kind==='out'){
    if(pendingWire===n.id){pendingWire=null;mousePreview=null;showMessage('Conexión cancelada');}else{pendingWire=n.id;mousePreview={x:n.x+140,y:n.y};showMessage('Ahora toca una entrada azul');}
  }else if(t.dataset.kind==='in'){
    if(!pendingWire){showMessage('Primero toca una salida verde');return;}
    const from=nodes.find(x=>x.id===pendingWire),input=Number(t.dataset.input);
    if(!from){pendingWire=null;return;}
    if(from.id===n.id) {showMessage('No se permite auto-conexión directa');return;}
    snapshot();wires=wires.filter(w=>!(w.to===n.id&&w.input===input));wire(from,n,input);pendingWire=null;mousePreview=null;persist();showMessage('Cable conectado');
  }
  refresh();
 }
 function zoom(mult){const cw=view.w*mult,ch=view.h*mult;if(cw<320||cw>4500)return;
  view.x+=(view.w-cw)/2;view.y+=(view.h-ch)/2;view.w=cw;view.h=ch;render();}
 function updateRun(){running=!running;$('runBtn').innerHTML=running?'❚❚ <span>Pausar</span>':'▶ <span>Reanudar</span>';
  $('liveStatus').textContent=running?'SIMULANDO':'EN PAUSA';document.querySelector('.live-pill i').style.background=running?'var(--hi)':'var(--warn)';showMessage(running?'Simulación reanudada':'Simulación pausada');}
 board.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  const t=e.target.closest('[data-kind]');const p=xyEvent(e);
  if(t?.dataset.kind==='out'||t?.dataset.kind==='in'){handlePort(t);e.preventDefault();return;}
  if(deleteMode){
    if(t?.dataset.kind==='wire'){snapshot();wires=wires.filter(w=>w.id!==t.dataset.wire);persist();refresh();}
    else if(t?.dataset.kind==='node'){snapshot();const id=t.dataset.node;nodes=nodes.filter(n=>n.id!==id);wires=wires.filter(w=>w.from!==id&&w.to!==id);if(scopeId===id)scopeId=null;persist();refresh();}
    e.preventDefault();return;
  }
  if(t?.dataset.kind==='node'){
    const n=nodes.find(x=>x.id===t.dataset.node);if(!n)return;
    selected=n.id;gesture={mode:'node',id:n.id,origin:p,last:p,moved:false};board.setPointerCapture(e.pointerId);render();e.preventDefault();
  }else{
    gesture={mode:'pan',origin:p,last:p,moved:false,startView:{...view}};board.setPointerCapture(e.pointerId);e.preventDefault();
  }
 });
 board.addEventListener('pointermove',e=>{
  const p=xyEvent(e);
  if(pendingWire){mousePreview=p;render();}
  if(!gesture)return;
  if(gesture.mode==='node'){
   const n=nodes.find(x=>x.id===gesture.id);if(!n)return;
   if(Math.hypot(p.x-gesture.origin.x,p.y-gesture.origin.y)>7){if(!gesture.moved)snapshot();gesture.moved=true;}
   if(gesture.moved){n.x=round(n.x+p.x-gesture.last.x,2);n.y=round(n.y+p.y-gesture.last.y,2);render();}
  }else{
   if(Math.hypot(p.x-gesture.origin.x,p.y-gesture.origin.y)>4)gesture.moved=true;
   if(gesture.moved){view.x-=p.x-gesture.last.x;view.y-=p.y-gesture.last.y;render();}
  }
  gesture.last=p;
 });
 function endPointer(e){if(!gesture)return;
  if(gesture.mode==='node'){
   const n=nodes.find(x=>x.id===gesture.id);
   if(n&&!gesture.moved&&n.type==='SWITCH'){snapshot();n.state=1-n.state;showMessage(`${n.label}: ${n.state}`);}
   if(gesture.moved||n?.type==='SWITCH'){persist();refresh();}
  }
  gesture=null;
  if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);
 }
 board.addEventListener('pointerup',endPointer);board.addEventListener('pointercancel',()=>{gesture=null;});
 board.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY>0?1.12:.88);},{passive:false});
 $('tools').innerHTML=buttonTypes.map(t=>`<button class="tool" data-type="${t}" title="Añadir ${labels[t]}"><span class="glyph">${symbols[t]}</span><span>${labels[t]}</span></button>`).join('');
 $('tools').addEventListener('click',e=>{const t=e.target.closest('[data-type]');if(t)addTool(t.dataset.type);});
 $('sampleBtn').onclick=()=>{snapshot();importFeedback('');demo();};$('undoBtn').onclick=undo;
 $('clearBtn').onclick=()=>{if(!confirm('¿Borrar todos los componentes?'))return;snapshot();nodes=[];wires=[];scopeId=null;trace.length=0;persist();refresh();};
 $('deleteModeBtn').onclick=()=>{deleteMode=!deleteMode;$('deleteModeBtn').classList.toggle('on',deleteMode);pendingWire=null;refresh();};
 $('zoomInBtn').onclick=()=>zoom(.8);$('zoomOutBtn').onclick=()=>zoom(1.25);$('zoomResetBtn').onclick=()=>{view={x:0,y:0,w:1160,h:650};render();};
 $('runBtn').onclick=updateRun;$('saveBtn').onclick=exportProject;
 $('loadBtn').onclick=()=>{if(window.AndroidBridge){window.AndroidBridge.openJson();return;}$('fileInput').click();};
 $('fileInput').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>2000000){showMessage('Archivo demasiado grande');return;}importProject(await f.text());e.target.value='';};
 $('scopeSelect').onchange=e=>{scopeId=e.target.value;trace.length=0;drawScope();};
 document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}if(e.key==='Escape'){pendingWire=null;deleteMode=false;$('deleteModeBtn').classList.remove('on');render();}});
 setInterval(()=>{
  if(!running)return;
  const now=performance.now();if(now-clockTime>=500){clockState=1-clockState;clockTime=now;}
  lastState=simulate(nodes,wires,clockState);
  trace.push(lastState.outs.get(scopeId)??null);if(trace.length>120)trace.shift();
  render();drawScope();
 },90);
 try {let raw=localStorage.getItem('digital-flow-autosave');if(raw){const p=validateProject(JSON.parse(raw));nodes=p.nodes;wires=p.wires;seq=Math.max(100,...nodes.map(n=>parseInt(n.id.replace(/\D/g,''))||0),...wires.map(w=>parseInt(w.id.replace(/\D/g,''))||0));scopeId=nodes.find(n=>n.type==='LED')?.id||nodes[0]?.id||null;refresh();}else demo();}
 catch(_){demo();}
})();
