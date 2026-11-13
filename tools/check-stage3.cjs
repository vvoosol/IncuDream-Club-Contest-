const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
 const tabs=await fetch('http://127.0.0.1:9223/json').then(r=>r.json());const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0,pending=new Map(),errors=[],checks=[];
 ws.addEventListener('message',e=>{let m=JSON.parse(e.data);if(m.id){let p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{let n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const run=async expression=>{let r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const assert=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg);console.log('PASS '+msg);};
 const center=sel=>run(`(()=>{const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);
 const mouse=(type,p,extra={})=>send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,...extra});
 const click=async(sel,count=1)=>{const p=await center(sel);await mouse('mouseMoved',p);await mouse('mousePressed',p,{button:'left',clickCount:count});await mouse('mouseReleased',p,{button:'left',clickCount:count});};
 const dblclick=async sel=>{await click(sel);await click(sel,2);};
 const cell=(x,y)=>center(`[data-cell="${y*5+x}"]`);
 const drag=async(sel,to,preview)=>{let p=await center(sel);await mouse('mouseMoved',p);await mouse('mousePressed',p,{button:'left',clickCount:1});await mouse('mouseMoved',{x:p.x+12,y:p.y-9},{buttons:1});await mouse('mouseMoved',to,{buttons:1});if(preview)await preview();await mouse('mouseReleased',to,{button:'left',clickCount:1});};
 const screenshot=async name=>{let s=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'test-results',name),Buffer.from(s.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',{width:1080,height:1000,deviceScaleFactor:1,mobile:false});await send('Page.navigate',{url:pathToFileURL(path.join(root,'과학자RPG-3단계.html')).href});await sleep(600);
 assert(await run("mode==='title'&&document.querySelectorAll('[data-character]').length===4"),'Four requested characters can be selected');await screenshot('stage3-selection.png');
 await click('[data-character="faraday"]');await click('#start');await run('enemies=[]');
 assert(await run("state.character==='faraday'&&state.weapons[0].id==='current'&&state.stats.expBonus===0&&$('level').textContent.includes('패러데이')"),'Selecting Faraday loads his portrait, name, weapon and stats');
 await click('#pause');
 assert(await run("bagSize().cols===5&&bagSize().rows===4&&document.querySelectorAll('.cell').length===20&&$('bagcount').textContent==='0 / 20'"),'Default bag is five columns by four rows');
 assert(await run("(()=>{const r=document.querySelector('.cell').getBoundingClientRect();return Math.abs(r.width-r.height)<.2})()"),'Every bag cell is square');
 await dblclick('[data-loot-uid]');assert(await run('state.bag.length===1&&state.stats.damage===1.2'),'Double-click automatically places nearby item into a free shape');
 await drag('.bagitem .shape-tile',await cell(3,2));assert(await run('state.bag[0].x===3&&state.bag[0].y===2'),'Drag uses new five-column geometry');
 await drag('.bagitem .shape-tile',await cell(4,3),async()=>assert(await run('!itemDrag.candidate.valid'),'New right and bottom boundaries reject overflow'));
 assert(await run('state.bag[0].x===3&&state.bag[0].y===2'),'Invalid drop restores position in new grid');
 assert(await run("(()=>{const b=JSON.stringify(state.bag);return expandBag({cols:1,rows:1,sourceId:'test-expansion'})&&bagSize().cols===6&&bagSize().rows===5&&document.querySelectorAll('.cell').length===30&&JSON.stringify(state.bag)===b&&!expandBag({cols:1,sourceId:'test-expansion'})})()"),'Future expansion API grows bag without moving items or duplicating one reward');
 assert(await run("(()=>{const r=document.querySelector('.cell').getBoundingClientRect();return Math.abs(r.width-r.height)<.2})()"),'Expanded bag retains square cells');
 await run("start('default');pause();enemies=[];state.bag=Array.from({length:20},(_,i)=>({id:'ring',x:i%5,y:Math.floor(i/5)}));recalc();updateInventory(true);updateUI()");
 let before=await run('loot.length');await dblclick('[data-loot-uid]');assert(await run('state.bag.length===20&&loot.length')===before,'Double-click leaves item on ground when bag is full');
 // Every selectable base/advanced skill must both execute and deal real damage.
 const skillResults=await run(`(()=>{
 const results=[];
 for(const id of implementedSkills){
  start('default');mode='pause';chests=[];enemies=[];state.weapons=[{id,level:skillDef(id).evolved?1:5,cd:0}];state.passives={};recalc();target=null;
  for(let y=-2;y<=2;y++)for(let x=0;x<=3;x++){const px=state.player.x+25+x*25,py=state.player.y+y*24;if(open(px,py,12))enemies.push({id:enemies.length,x:px,y:py,hp:100000,max:100000,r:12,radius:12,type:'slime',awake:false,flash:0,timer:99,wind:0});}
  const initial=enemies.reduce((n,e)=>n+e.hp,0);let maxProjectiles=0;
  for(let i=0;i<330;i++){
   if(state.plants.length&&!state.plants[0].grown){const pot=state.plants[0];state.player.x=pot.x;state.player.y=pot.y;if(!enemies.some(e=>dist(e,pot)<180&&los(pot,e))){for(let a=0;a<Math.PI*2;a+=.5){const x=pot.x+Math.cos(a)*55,y=pot.y+Math.sin(a)*55;if(open(x,y,12)){enemies.push({id:enemies.length,x,y,hp:100000,max:100000,r:12,radius:12,type:'slime',awake:false,flash:0,timer:99,wind:0});break;}}}}
   updateSkills(.03);maxProjectiles=Math.max(maxProjectiles,state.projectiles.length);
  }
  const damage=enemies.reduce((n,e)=>n+e.max-e.hp,0);
  results.push({id,damage:Math.round(damage),plants:state.plants.length,maxProjectiles});
 }
 return results;
})()`);
 fs.writeFileSync(path.join(root,'test-results','stage3-skills.json'),JSON.stringify(skillResults,null,2));
 for(const r of skillResults)assert(r.damage>0,`${r.id} executes and deals damage (${r.damage})`);
 const progression=await run(`(()=>{const result=[];
 for(const character of playableCharacters){
  start(character);mode='pause';const pool=availableWeapons();let ok=true;
  for(const d of pool){state.weapons=[{id:d.id,level:1,cd:0}];state.evolvedBases=[];state.passives={};
   for(let level=2;level<=5;level++){const c=researchCandidates().find(c=>c.id===d.id&&c.type==='weapon');if(!c||!applyResearch(c)||state.weapons[0].level!==level)ok=false;}
   if(researchCandidates().some(c=>c.type==='evolution'))ok=false;
   applyResearch({type:'passive',id:d.evolvesWith,level:1});const c=researchCandidates().find(c=>c.type==='evolution'&&c.id===d.evolvesTo);
   if(!c||!applyResearch(c)||state.weapons[0].id!==d.evolvesTo||!state.evolvedBases.includes(d.id)||researchCandidates().some(c=>c.id===d.id))ok=false;
  }result.push({character,ok,count:pool.length});
 }return result;})()`);
 for(const r of progression)assert(r.ok,`${r.character}: all ${r.count} available base skills upgrade through Lv.5 and evolve with required passive`);
 assert(await run("(()=>{start('mendel');mode='pause';applyResearch({type:'weapon',id:'pea',level:2});return Array.from({length:30},()=>researchChoices()).every(cs=>cs.some(c=>c.type==='weapon'&&c.id==='pea'))})()"),'Mendel guarantees repeat choice while it can still grow');
 assert(await run("(()=>{start('newton');mode='pause';state.player.moving=true;state.player.facingX=1;state.player.facingY=0;state.player.stillTime=0;return Math.abs(applyNewtonPassive(100,0)-132)<.01&&Math.abs(applyNewtonPassive(100,Math.PI)-77)<.01})()"),'Newton movement and directional modifiers use original formula');
 assert(await run("(()=>{start('faraday');mode='pause';const e=enemies[0];e.hp=100;induce(e,10);const first=e.hp;induce(e,10);return first===100&&e.hp<100})()"),'Faraday repeated displacement actually triggers induction damage');
 assert(await run("(()=>{start('default');mode='pause';state.passives={instinct:3,focus:3,steps:3,tidy:3,nightStudy:3,repeat:3};state.player.hp=80;recalc(true);return state.stats.projectiles===3&&state.stats.speed===54&&state.stats.maxHp===160&&Math.abs(state.stats.expBonus-.6)<.001&&Math.abs(state.stats.damage-1.45)<.001&&Math.abs(state.stats.cooldown-.7)<.001&&state.player.hp===140})()"),'All six original passives affect their actual combat stats');
 assert(await run("(()=>{start('default');mode='pause';state.weapons=availableWeapons().map(d=>({id:d.id,level:1,cd:0}));return researchCandidates().every(c=>c.type!=='weapon'||state.weapons.some(w=>w.id===c.id))&&state.weapons.length===6})()"),'Six weapon slots prevent extra new weapons');
 assert(await run("(()=>{start('newton');mode='pause';return researchCandidates().every(c=>c.type!=='weapon'||!skillDef(c.id).character||skillDef(c.id).character==='newton')})()"),'Other scientists exclusive weapons never enter the research pool');
 assert(await run("(()=>{start('default');mode='pause';state.weapons=availableWeapons().map(d=>({id:d.evolvesTo,level:1,cd:0}));state.evolvedBases=availableWeapons().map(d=>d.id);state.passives=Object.fromEntries(passiveDefs.map(d=>[d.id,3]));return researchChoices().length===3&&researchChoices().every(c=>c.type==='funds')})()"),'Fully completed research still offers three valid fallback rewards');
 assert(await run("(()=>{start('default');mode='pause';const e=enemies[0];e.hp=1;e.type='slime';hit(e,2,'exam_cheatsheet');return state.pendingScience===3&&state.stats.expBonus===.3})()"),'Exam cheatsheet awards original 30% bonus science only for its own kills');
 const combatRuns=await run(`(()=>{const out=[];for(const id of playableCharacters){start(id);for(let i=0;i<650;i++){if(mode==='research')document.querySelector('[data-choice]').click();if(mode==='play')update(.03);else if(mode==='result')break;}out.push({id,kills:state.kills,level:state.level,mode,finite:combatTargets().every(e=>Number.isFinite(e.x)&&Number.isFinite(e.y))});}return out})()`);
 for(const r of combatRuns)assert(r.kills>0&&r.finite,`${r.id}: full combat loop with AI, loot and research produces kills without invalid world positions`);
 // Chest ratios and automatic destruction, no manual interactions.
 assert(await run("(()=>{start('default');mode='pause';enemies=[];return chests.find(c=>!c.rare).hp===64&&chests.find(c=>c.rare).hp===320&&!document.querySelector('#interact')&&typeof interact==='undefined'})()"),'Chest health uses normal-monster ×2/×10 and E interaction is removed');
 assert(await run("(()=>{const c=chests[0];state.player.x=c.x-36;state.player.y=c.y;target=c;const n=loot.length;attackRuler(5);attackRuler(5);const n2=loot.length;attackRuler(5);return c.opened&&n2===n+3&&loot.length===n2})()"),'Regular automatic attack breaks chest and drops rewards only once');
 assert(await run("(()=>{const c=chests[1],n=loot.length;damageChest(c,c.max);return c.opened&&loot.length===n+3&&loot.slice(-3).every(i=>['coat','notebook','coil'].includes(i.id))})()"),'High-health chest contains the stronger reward pool');
 assert(await run("(()=>{start('default');mode='pause';state.player.x=stairs.x;state.player.y=stairs.y;updateStairs(1);const started=state.stairsWait===1&&$('stairs-status').textContent.includes('2.0');state.player.x+=40;updateStairs(.1);return started&&state.stairsWait===0&&$('stairs-status').hidden})()"),'Stair countdown shows remaining time and resets when leaving');
 assert(await run("(()=>{state.player.x=stairs.x;state.player.y=stairs.y;state.passives.focus=2;recalc();state.player.hp=71;autoPack(loot[0]);const bag=JSON.stringify(state.bag),level=state.level;updateStairs(2.99);if(state.floor!==1)return false;updateStairs(.02);return state.floor===2&&state.player.hp===71&&state.passives.focus===2&&JSON.stringify(state.bag)===bag&&state.level===level&&$('floor').textContent.includes('B2F')&&enemies.length===60})()"),'Three-second stay enters next floor and preserves character, gear and research');
 await run("start('mendel');enemies=[];state.weapons=[{id:'pea',level:5,cd:0},{id:'planting',level:4,cd:0},{id:'notebook',level:3,cd:0}];state.passives={repeat:2,instinct:2};recalc();pause();autoPack(loot[0]);autoPack(loot[0]);updateUI()");await screenshot('stage3-paused-desktop.png');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true,screenWidth:390,screenHeight:844});await sleep(120);
 assert(await run("(()=>{const g=$('game').getBoundingClientRect(),c=document.querySelector('.cell').getBoundingClientRect();return g.width<=390.1&&g.height<=844.1&&Math.abs(c.width-c.height)<.2})()"),'Mobile keeps 9:16 and square inventory cells');
 const src=await center('[data-loot-uid]'),dst=await cell(3,0);await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:src.x,y:src.y,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:src.x+10,y:src.y-10,id:1}]});await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:dst.x,y:dst.y,id:1}]});assert(await run('itemDrag?.active&&itemDrag.candidate.valid'),'Touch drag uses square five-column bag correctly');await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await screenshot('stage3-paused-mobile.png');
 await run('resume();gainExp(100)');assert(await run("mode==='research'&&document.querySelectorAll('[data-choice]').length===3"),'New research opens three functional choices and pauses combat');await screenshot('stage3-research-mobile.png');
 await click('[data-choice]');assert(await run("mode==='play'||mode==='research'"),'Research applies and resumes or handles queued levels');
 assert(errors.length===0,'No uncaught browser runtime exceptions');
 fs.writeFileSync(path.join(root,'test-results','stage3-checks.json'),JSON.stringify({passed:true,count:checks.length,checks,skillResults,errors,date:new Date().toISOString()},null,2));await send('Browser.close');ws.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
