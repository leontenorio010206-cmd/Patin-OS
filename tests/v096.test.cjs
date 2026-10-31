'use strict';
const assert=require('node:assert/strict');
const {validateProject,simulate}=require('../app/src/main/assets/engine.js');
let count=0;const test=(name,fn)=>{fn();console.log('PASS',name);count++};
test('antiguos proyectos siguen siendo compatibles',()=>{
 const p=validateProject({format:'digital-flow-v1',nodes:[{id:'a',type:'SWITCH',x:50,y:50,label:'Entrada',state:1},{id:'led',type:'LED',x:250,y:50,label:'LED'}],wires:[{id:'w',from:'a',to:'led',input:0}]});
 assert.equal(p.nodes.length,2);assert.equal(simulate(p.nodes,p.wires,1).outs.get('led'),1);
});
test('los dos laboratorios ejecutan motores independientes',()=>{
 const fs=require('node:fs'),s=fs.readFileSync('app/src/main/assets/app.js','utf8');
 assert.match(s,/workspace==='logic'\?simulate\(/);assert.match(s,/workspace==='electronics'\?simulateSpice\(/);assert.match(s,/!running\|\|document\.hidden/);
});
test('la versión y firma de lanzamiento están preparadas',()=>{
 const fs=require('node:fs'),s=fs.readFileSync('app/build.gradle','utf8');
 assert.match(s,/versionCode 16/);assert.match(s,/PATINOS_KEYSTORE_PATH/);
});
console.log('PASS: '+count+' comprobaciones v0.9.6');
