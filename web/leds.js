/* Patiñ Os v0.9.4 — simulated current controls LED color and light intensity. */
(function(root){
 'use strict';
 const COLORS=Object.freeze({LED_RED:'#ff4255',LED_GREEN:'#45ed77',LED_BLUE:'#4489ff',LED_AMBER:'#ffb331',LED_WHITE:'#f5f6ff'});
 const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
 function brightnessFromCurrent(amps){
  if(!Number.isFinite(amps)||amps<=.000010)return 0;
  return clamp(Math.pow((amps-.000010)/.01999,.65),0,1);
 }
 function single(type,reading,props){
  const color=COLORS[type]||'#fff';
  const forward=reading?.supported===true&&Number.isFinite(reading.current)?(props?.reverse?-reading.current:reading.current):0;
  const brightness=brightnessFromCurrent(forward);
  return {color,brightness,lit:brightness>0,haloOpacity:.47*brightness,bodyOpacity:.12+.88*brightness,raysOpacity:.18+.82*brightness};
 }
 function rgb(reading){
  const ch=reading?.supported===true?reading.channels||{}:{};
  const levels={red:brightnessFromCurrent(ch.red||0),green:brightnessFromCurrent(ch.green||0),blue:brightnessFromCurrent(ch.blue||0)};
  const channels={red:{color:COLORS.LED_RED,brightness:levels.red},green:{color:COLORS.LED_GREEN,brightness:levels.green},blue:{color:COLORS.LED_BLUE,brightness:levels.blue}};
  const hex=n=>clamp(Math.round(n),0,255).toString(16).padStart(2,'0');
  const mixed='#'+hex(255*levels.red+32*levels.green+25*levels.blue)+hex(42*levels.red+235*levels.green+45*levels.blue)+hex(62*levels.red+65*levels.green+255*levels.blue);
  return {channels,mixed,brightness:Math.max(...Object.values(levels))};
 }
 const api=Object.freeze({COLORS,brightnessFromCurrent,single,rgb});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.PatinosLED=api;
})(typeof window!=='undefined'?window:globalThis);
