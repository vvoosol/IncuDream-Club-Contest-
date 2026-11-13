const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const tabs=await fetch('http://127.0.0.1:9223/json').then(r=>r.json());
 const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0,pending=new Map(),errors=[];
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const run=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const assert=(ok,msg)=>{if(!ok)throw Error(msg);console.log('PASS '+msg);};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1080,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:pathToFileURL(path.join(root,'과학자RPG-1단계.html')).href});await sleep(800);
 assert(await run("mode==='title' && document.querySelector('#start')!==null"),'Standalone HTML opens title');
 assert(await run("Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0)"),'Embedded character images load offline');
 await run("document.querySelector('#start').click()");await sleep(50);
 assert(await run("mode==='play' && enemies.length===60 && state.player.hp===100"),'Doan starts with 60 enemies and 100 HP');
 await run("mode='pause'");
 // Hide a manually paused scene only for controlled simulation.
 assert(await run("(()=>{const x=state.player.x;keys.add('d');update(.1);keys.clear();return state.player.x>x+12&&state.player.x<x+15})()"),'WASD movement uses original 160 × .85 speed');
 assert(await run("(()=>{const p=state.player;p.x=2*T+12;p.y=30*T;move(p,-100,0);return p.x===2*T+12})()"),'Walls stop player movement');
 await run("start();mode='pause'");
 assert(await run("(()=>{const before=state.stats.damage,idx=loot.findIndex(l=>l.id==='notebook');mode='play';pack(idx);mode='pause';return state.bag.length===1&&state.stats.damage>before&&loot.every(l=>l.id!=='notebook')})()"),'Nearby pickup occupies bag and applies damage bonus');
 assert(await run("(()=>{const p=state.player;const old=state.kills;enemies=[{id:100,x:p.x+40,y:p.y,hp:32,max:32,r:12,type:'slime',awake:true,timer:10,wind:0,flash:0}];target=enemies[0];state.stats.damage=1;attackRuler(1);return enemies[0].hp===0&&state.kills===old+1&&gems.length>0})()"),'Original ruler attack kills target and drops science');
 assert(await run("(()=>{enemies=[{id:101,x:state.player.x+40,y:state.player.y,hp:999,max:999,r:12,type:'slime',awake:true,timer:10,wind:0,flash:0}];target=enemies[0];mode='play';gainExp(24/1.3);return mode==='research'&&state.level===2&&document.querySelectorAll('[data-choice]').length===3})()"),'Original science growth opens three research choices');
 let freeze=await run('activeTime');await sleep(200);assert((await run('activeTime'))===freeze,'Research freezes simulation');
 await run("document.querySelector('[data-choice]').click();mode='pause'");
 assert(await run("(()=>{const c=chests[0];state.player.x=c.x;state.player.y=c.y;mode='play';interact();const n=loot.length;interact();mode='pause';return c.opened&&loot.length===n})()"),'Treasure cannot be opened twice');
 assert(await run("(()=>{start();mode='pause';updateFlow();return gridFlow[Math.floor(stairs.y/T)*MW+Math.floor(stairs.x/T)]<9999})()"),'All rooms and stairs are connected');
 await run("mode='play';showMap()");assert(await run("mode==='map'&&!!document.querySelector('#bigmap')"),'Expanded map opens and pauses combat');await run('resume();pause()');assert(await run("mode==='pause'"),'Pause menu stops play');
 await run('resume();state.player.x=stairs.x;state.player.y=stairs.y;interact()');assert(await run("mode==='result'&&document.querySelector('.dialog').textContent.includes('계단을 발견')"),'Finding stairs completes stage 1');
 await run('start();mode="pause";state.player.x=9*T;state.player.y=32*T;camera.x=state.player.x-W/2;camera.y=state.player.y-H*.58;updateUI();draw()');
 let shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'test-results','desktop.png'),Buffer.from(shot.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});await sleep(100);
 assert(await run("(()=>{const r=document.querySelector('#game').getBoundingClientRect();return r.width<=innerWidth+.1&&r.height<=innerHeight+.1&&Math.abs(r.width/r.height-9/16)<.002})()"),'Mobile fits 9:16 without clipping');
 shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'test-results','mobile.png'),Buffer.from(shot.data,'base64'));
 // Touch input through CDP verifies actual pointer event path.
 await run('resume();state.player.x=8*T;state.player.y=33*T;updateUI()');
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:140,y:230,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:175,y:230,id:1}]});
 assert(await run('walkInput.x>.5'),'Touch joystick receives pointer drag');await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert(await run('walkInput.x===0&&stickPointer===null'),'Touch release clears movement');
 assert(errors.length===0,'No uncaught browser runtime exceptions');
 fs.writeFileSync(path.join(root,'test-results','checks.json'),JSON.stringify({passed:true,errors,date:new Date().toISOString()},null,2));
 await send('Browser.close');ws.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;process.exit(1)});
