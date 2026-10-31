'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let total=0;
const test=(name,fn)=>{fn();console.log('PASS',name);total++};
test('Android assets match browser assets exactly, avoiding old UI in the APK',()=>{
 for(const name of ['app.js','analog.js','engine.js','devices.js','dig.js','special.js','spice.js','sound.js','leds.js','style.css','index.html'])
  assert.equal(read('web/'+name),read('app/src/main/assets/'+name),name);
});
test('versionCode v1 increments and build release minifies',()=>{
 const b=read('app/build.gradle');assert.match(b,/versionCode\s+18/);assert.match(b,/versionName\s+'1\.0\.0'/);
 assert.match(b,/release\s*\{[^}]*minifyEnabled true/);
 assert.match(b,/PATINOS_KEYSTORE_PATH/);
});
test('app allows Android split screen but requires user tap to enable audio',()=>{
 assert.match(read('app/src/main/AndroidManifest.xml'),/resizeableActivity="true"/);
 assert.match(read('app/src/main/java/com/patinos/simulator/MainActivity.java'),/setMediaPlaybackRequiresUserGesture\(true\)/);
 assert.doesNotMatch(read('app/src/main/AndroidManifest.xml'),/android\.permission\.INTERNET/);
});
test('simulator skips invisible work and separates digital from analog engines',()=>{
 const s=read('web/app.js');
 assert.match(s,/!running\|\|document\.hidden/);
 assert.match(s,/workspace==='logic'\?simulate\(/);
 assert.match(s,/workspace==='electronics'\?simulateSpice\(/);
});
test('project format and LED current model remain backwards compatible',()=>{
 const engine=require('../web/engine.js');
 const saved={format:'digital-flow-v1',nodes:[{id:'a',type:'SWITCH',x:100,y:100,label:'A',state:1},{id:'led',type:'LED',x:200,y:100,label:'LED'}],wires:[{id:'w1',from:'a',to:'led',input:0}]};
 const project=engine.validateProject(saved);assert.equal(project.nodes.length,2);
 assert.equal(engine.simulate(project.nodes,project.wires,1).outs.get('led'),1);
});
console.log(`PASS ${total} v0.9.6 release-readiness checks`);
