'use strict';
// Stage 3: four scientists, imported combat, evolution and extensible square bag.
const $=id=>document.getElementById(id), canvas=$('world'), ctx=canvas.getContext('2d');
const W=540,H=416,T=32,MW=64,MH=44, keys=new Set();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let state, mode='title', last=0, activeTime=0, elapsed=0, uiClock=0, toastClock=0, target=null, walkInput={x:0,y:0}, stickPointer=null, stickOrigin=null;
const playerImg=new Image(); playerImg.src='assets/characters/default.png';
const portraitPaths={default:'assets/characters/default.png',newton:'assets/characters/newton.png',faraday:'assets/characters/faraday.png',mendel:'assets/characters/mendel.png'};
const rooms=[{x:2,y:25,w:15,h:15,name:'격리실 A',kind:'start'},{x:23,y:25,w:16,h:15,name:'표본 연구실',kind:'combat'},{x:23,y:4,w:16,h:15,name:'에너지 제어실',kind:'combat'},{x:46,y:4,w:15,h:15,name:'하향 계단실',kind:'exit'}];
let tiles=[], visited=new Set(), explored=new Set(), exitDiscovered=false, enemies=[], gems=[], loot=[], effects=[], shots=[], props=[], chests=[], camera={x:0,y:0}, gridFlow=[], flowTime=0;
const itemDefs={
  notebook:{name:'연구 수첩',w:2,h:2,color:'#bd83ee',effect:'공격력 +20%',damage:.2,icon:'book'},
  cell:{name:'에너지 셀',w:1,h:2,color:'#6cdddf',effect:'공격 쿨타임 -8%',cooldown:.08,icon:'cell'},
  boots:{name:'실험 장화',w:2,h:1,color:'#8ba8d5',effect:'이동속도 +12',speed:12,icon:'boots'},
  ring:{name:'관측 렌즈',w:1,h:1,color:'#d9b15f',effect:'공격력 +7%',damage:.07,icon:'ring'},
  coat:{name:'강화 연구복',w:2,h:2,color:'#bd83ee',effect:'최대 체력 +25',hp:25,icon:'coat'},
  coil:{name:'유도 코일',w:2,h:2,cells:[[0,0],[0,1],[1,1]],color:'#7bd8ae',effect:'공격력 +12% · 쿨타임 -5%',damage:.12,cooldown:.05,icon:'coil'}
};
function icon(name){
 if(name==='coil')return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 8v39h39" fill="none" stroke="#1c2934" stroke-width="17"/><path d="M14 8v39h39" fill="none" stroke="#8fd9c3" stroke-width="12"/><path d="M6 12h16M6 20h16M6 28h16M6 36h16M24 39v16M33 39v16M42 39v16M51 39v16" stroke="#c8995b" stroke-width="5"/><path d="M12 6v42h43" fill="none" stroke="#edf9c6" stroke-width="2"/></svg>';
 const shapes={book:'<path fill="#63265c" stroke="#df9b62" stroke-width="3" d="M12 9 40 5 51 44 22 51 10 43Z"/><path stroke="#f5d28b" stroke-width="3" d="m18 14 23-4M21 43l23-5"/><g fill="none" stroke="#ffd987" stroke-width="1.5"><ellipse cx="31" cy="27" rx="13" ry="5" transform="rotate(-40 31 27)"/><ellipse cx="31" cy="27" rx="13" ry="5" transform="rotate(40 31 27)"/><ellipse cx="31" cy="27" rx="5" ry="13"/></g>',cell:'<path fill="#16334b" stroke="#b0afb8" stroke-width="3" d="M21 8h20v42H21z"/><path fill="#64e9ed" d="M25 17h12v24H25z"/><path stroke="#fff3b0" stroke-width="4" d="M19 12h24M19 46h24"/><path stroke="#e5ffff" stroke-width="2" d="M29 20v17"/>',ring:'<circle cx="31" cy="31" r="17" fill="#806138" stroke="#d8b36b" stroke-width="5"/><path d="m31 10 11 13-11 12-11-12Z" fill="#82eeee" stroke="#dafbfa" stroke-width="2"/>',coat:'<path fill="#bfcad8" stroke="#444c65" stroke-width="2" d="m20 8-11 8-5 21 10 3 6-17-3 31h28l-3-31 6 17 10-3-5-21-11-8-11 9Z"/><path fill="#f3f2ee" d="m21 10 10 8 10-8-5 41H25Z"/><path stroke="#627086" stroke-width="2" d="M31 21v31M18 35h8M37 35h8"/>',boots:'<path fill="#7c543a" stroke="#c9a26e" stroke-width="2" d="M12 11h14v24l6 7v8H8v-9l4-7Zm25 0h14v24l6 7v8H33v-9l4-7Z"/><path stroke="#5ddde2" stroke-width="4" d="M8 47h24m1 0h24"/><path stroke="#f4d8a4" stroke-width="2" d="M14 19h10m-10 7h10m15-7h10m-10 7h10"/>',ruler:'<path d="m10 44 33-35 11 11-33 35Z" fill="#d8b26b" stroke="#fce5a2" stroke-width="2"/><path d="m19 36 6 6m0-13 6 6m0-13 6 6m0-13 6 6" stroke="#6b4e30" stroke-width="2"/>'};
 return `<svg viewBox="0 0 64 64" aria-hidden="true">${shapes[name]||shapes.book}</svg>`;
}
function resize(){document.documentElement.style.setProperty('--scale',Math.min(innerWidth/540,innerHeight/960));}addEventListener('resize',resize);resize();
function show(content){cancelItemDrag();hideTooltip();$('modal').innerHTML=`<div class="dialog">${content}</div>`; resetInput();}
function resetInput(){keys.clear();walkInput={x:0,y:0};stickPointer=null;$('stick').style.display='none';}
function title(){renderCharacterSelect();}
function carve(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)tiles[yy*MW+xx]=1;}
function makeDungeon(){
 tiles=Array(MW*MH).fill(0); visited=new Set([0]);explored=new Set();exitDiscovered=false;enemies=[];gems=[];loot=[];effects=[];shots=[];props=[];chests=[];gridFlow=[];flowTime=0;target=null;
 rooms.forEach(r=>carve(r.x,r.y,r.w,r.h));carve(17,31,6,3);carve(30,19,3,6);carve(39,10,7,3);
 rooms.forEach((r,ri)=>{
  [[r.x+3,r.y+4],[r.x+r.w-4,r.y+r.h-4]].forEach(([x,y])=>{tiles[y*MW+x]=2;props.push({type:'pillar',x:x*T+16,y:y*T+16});});
  props.push({type:'tank',x:(r.x+1.5)*T,y:(r.y+1.7)*T},{type:'console',x:(r.x+r.w-2.5)*T,y:(r.y+1.5)*T});
  for(let i=0;i<(ri===0?12:16);i++){
   let x,y;do{x=(r.x+1.5+Math.random()*(r.w-3))*T;y=(r.y+2+Math.random()*(r.h-3))*T;}while(!open(x,y,15)||(ri===0&&Math.hypot(x-8*T,y-33*T)<145));
   enemies.push({x,y,hp:(i%5===0?48:32)*(1+(state.floor-1)*.25),max:(i%5===0?48:32)*(1+(state.floor-1)*.25),r:12,type:i%5===0?'drone':'slime',awake:false,timer:Math.random(),wind:0,room:ri,flash:0,id:enemies.length,ax:0,ay:0});
  }
  if(ri===1||ri===2){const rare=ri===2,hp=32*(1+(state.floor-1)*.25)*(rare?10:2);chests.push({type:'chest',x:(r.x+r.w/2)*T,y:(r.y+4)*T,opened:false,room:ri,hp,max:hp,r:19,radius:19,rare});}
 });
 loot.push({id:'notebook',x:8*T+25,y:33*T+18},{id:'cell',x:8*T-27,y:33*T+30},{id:'coil',x:8*T+4,y:33*T+42});
}
function start(characterId=selectedCharacter){
 if(!playableCharacters.includes(characterId))characterId=selectedCharacter;
 selectedCharacter=characterId;playerImg.src=portraitPaths[characterId];$('portrait').src=playerImg.src;

 state={floor:1,stairsWait:0,character:characterId,bagSize:{cols:5,rows:4},bagExpansions:[],player:{x:8*T,y:33*T,hp:100,r:11,inv:0,facingX:1,facingY:0,stillTime:0},stats:{damage:1,cooldown:1,speed:0,pickup:45,maxHp:100,expBonus:state?.character==='default'?.3:0,projectiles:0},weapons:[{id:characters[characterId].startWeapon,level:1,cd:0}],passives:{},bag:[],xp:0,need:24,level:1,kills:0,slashes:[],lastWeapon:null,lastMendelChoice:null,evolvedBases:[],funds:0,projectiles:[],areas:[],falls:[],particles:[],plants:[],notebookAngle:0,avatarItemStats:{}};
 Object.defineProperty(state,'enemies',{get:()=>combatTargets()});Object.defineProperty(state,'gems',{get:()=>gems});
 activeTime=0;elapsed=0;cancelItemDrag();hideTooltip();makeDungeon();enemies.forEach(e=>e.radius=e.r);recalc();mode='play';$('modal').innerHTML='';$('pause-panel').hidden=true;$('map-panel').hidden=true;syncPauseButton();resetInput();camera={x:state.player.x-W/2,y:state.player.y-H/2};discover();updateUI();toast('주변 장비를 가방으로 드래그해 보세요');
}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('on');toastClock=3;}
function tile(x,y){const tx=Math.floor(x/T),ty=Math.floor(y/T);return tx<0||ty<0||tx>=MW||ty>=MH?0:tiles[ty*MW+tx];}
function open(x,y,r=10){return [[-r,-r],[r,-r],[-r,r],[r,r]].every(([dx,dy])=>tile(x+dx,y+dy)===1);}
function move(e,dx,dy){if(open(e.x+dx,e.y,e.r))e.x+=dx;if(open(e.x,e.y+dy,e.r))e.y+=dy;}
function los(a,b){const d=dist(a,b),n=Math.ceil(d/10);for(let i=1;i<n;i++)if(tile(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n)!==1)return false;return true;}
function roomAt(p){return rooms.findIndex(r=>p.x>=r.x*T&&p.x<(r.x+r.w)*T&&p.y>=r.y*T&&p.y<(r.y+r.h)*T);}
function updateFlow(){gridFlow=Array(MW*MH).fill(9999);let start=Math.floor(state.player.y/T)*MW+Math.floor(state.player.x/T),q=[start];gridFlow[start]=0;for(let i=0;i<q.length;i++){const c=q[i];for(const n of [c-1,c+1,c-MW,c+MW])if(n>=0&&n<tiles.length&&tiles[n]===1&&gridFlow[n]>gridFlow[c]+1){gridFlow[n]=gridFlow[c]+1;q.push(n);}}}
function recalc(healGrowth=false){const s={damage:1,cooldown:1,speed:0,pickup:45,maxHp:100,expBonus:state?.character==='default'?.3:0,projectiles:0};for(const [id,level] of Object.entries(state.passives)){const def=passiveDefs.find(d=>d.id===id);for(let i=1;i<=level;i++)def.apply(s,i);}for(const item of state.bag){const d=itemDefs[item.id];s.damage+=d.damage||0;s.cooldown-=d.cooldown||0;s.speed+=d.speed||0;s.maxHp+=d.hp||0;}const old=state.stats.maxHp;state.stats=s;if(healGrowth&&s.maxHp>old)state.player.hp+=s.maxHp-old;state.player.hp=Math.min(state.player.hp,s.maxHp);}
// Adapter for the original attackRuler; the source function remains unchanged.
function applyLavoisierPassive(n){return n;}
function getAimDirection(){const t=findTarget();return t?Math.atan2(t.y-state.player.y,t.x-state.player.x):Math.atan2(state.player.facingY,state.player.facingX);}
function hitLineEnemies(x,y,dir,length,width,damage,knock,source){for(const e of combatTargets()){if(e.hp<=0)continue;const dx=e.x-x,dy=e.y-y,along=dx*Math.cos(dir)+dy*Math.sin(dir),across=Math.abs(-dx*Math.sin(dir)+dy*Math.cos(dir));if(along>=-e.r&&along<=length+e.r&&across<width/2+e.r&&los({x,y},e))hitEnemy(e,damage,knock,Math.cos(dir),Math.sin(dir),source);}}
function hit(e,damage,source){if(e.type==='chest'){damageChest(e,damage);return;}if(e.hp<=0)return;e.hp-=damage;e.flash=.12;e.awake=true;effects.push({kind:'text',x:e.x,y:e.y-15,text:Math.round(damage),life:.65,max:.65,color:'#fff2b3'});if(e.hp<=0){if(source==='exam_cheatsheet')state.pendingScience=(state.pendingScience||0)+Math.ceil((e.type==='drone'?12:7)*.3);state.kills++;gems.push({x:e.x,y:e.y,value:(e.type==='drone'?12:7)});for(let i=0;i<7;i++)effects.push({kind:'spark',x:e.x,y:e.y,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.35,max:.35,color:e.type==='drone'?'#fba15c':'#9dde60'});if(Math.random()<.13){const ids=Object.keys(itemDefs);loot.push({id:ids[Math.floor(Math.random()*ids.length)],x:e.x,y:e.y});}if(Math.random()<.08)state.player.hp=Math.min(state.stats.maxHp,state.player.hp+5);}}
function gainExp(value){state.xp+=value*(1+state.stats.expBonus);if(state.xp>=state.need&&mode==='play')levelUp();}
function levelUp(){state.xp-=state.need;state.need=Math.floor(state.need*1.22+12);state.level++;openResearch();}
function hurt(value){const p=state.player;if(p.inv>0)return;p.hp=Math.max(0,p.hp-value);p.inv=.7;effects.push({kind:'text',x:p.x,y:p.y-30,text:'−'+value,life:.8,max:.8,color:'#ff7b92'});if(p.hp<=0)finish(false);}
const stairs={x:55*T,y:8*T};
function damageChest(c,damage){if(c.opened||c.hp<=0)return;c.hp=Math.max(0,c.hp-damage);effects.push({kind:'text',x:c.x,y:c.y-20,text:Math.round(damage),life:.5,max:.5,color:'#ffda9b'});if(c.hp<=0){c.opened=true;const ids=c.rare?['coat','notebook','coil']:['boots','ring','cell'];ids.forEach((id,i)=>loot.push({id,x:c.x+(i-1)*18,y:c.y+18}));toast(c.rare?'고급 보급 상자 파괴 · 희귀 장비 발견':'보급 상자를 부쉈습니다');updateUI();}}
function updateStairs(dt){const near=dist(state.player,stairs)<=25;if(!near){if(state.stairsWait>0){state.stairsWait=0;$('stairs-status').hidden=true;}return;}state.stairsWait+=dt;$('stairs-status').hidden=false;$('stairs-status').textContent=`${Math.max(0,3-state.stairsWait).toFixed(1)}초 뒤에 다음 층으로 이동합니다`;
 if(state.stairsWait>=3){cancelItemDrag();hideTooltip();state.floor++;state.stairsWait=0;$('stairs-status').hidden=true;state.projectiles=[];state.areas=[];state.falls=[];state.plants=[];state.particles=[];state.slashes=[];makeDungeon();enemies.forEach(e=>e.radius=e.r);state.player.x=8*T;state.player.y=33*T;camera={x:state.player.x-W/2,y:state.player.y-H*.58};discover();updateUI();toast(`지하 연구소 B${state.floor}F 도착`);}}
function finish(win){mode='result';show(`<div class="eyebrow">${win?'EXPLORATION COMPLETE':'EXPERIMENT ENDED'}</div><h2>${win?'계단을 발견했습니다':'실험이 종료되었습니다'}</h2><p>${win?'정도안이 첫 지하 연구 구역을 돌파했습니다.<br>3단계 플레이 테스트 완료!':'적의 공격 예고에서 벗어나세요.<br>가방에 장비를 넣으면 능력이 상승합니다.'}</p><div class="result-grid"><div><b>${state.kills}</b>실험체 처치</div><div><b>${state.level}</b>연구 레벨</div><div><b>${visited.size} / 4</b>연구실 탐험</div></div><p>탐험 시간 ${timeText(activeTime)} · 남은 체력 ${Math.ceil(state.player.hp)}<br>이번 테스트는 B1F까지 플레이할 수 있습니다.</p><button class="primary" id="retry">다시 탐험하기</button><button class="secondary" id="totitle">캐릭터 화면</button>`);$('retry').onclick=start;$('totitle').onclick=title;}
function timeText(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
function syncPauseButton(){$('pause').textContent=mode==='pause'?'▶':'⏸';$('pause').setAttribute('aria-pressed',String(mode==='pause'));$('pause').setAttribute('aria-label',mode==='pause'?'탐험 계속':'일시정지');$('pause').disabled=!['play','pause'].includes(mode);}
function pause(){if(!['play','pause'].includes(mode))return;cancelItemDrag();hideTooltip();if(mode==='pause'){resume();return;}mode='pause';resetInput();$('map-panel').hidden=true;$('pause-panel').hidden=false;syncPauseButton();updatePausePanel();updateUI();}
function resume(){if(mode!=='pause')return;cancelItemDrag();hideTooltip();mode='play';$('pause-panel').hidden=true;syncPauseButton();resetInput();}
function showMap(){if(!['play','pause'].includes(mode))return;$('map-panel').hidden=!$('map-panel').hidden;if(!$('map-panel').hidden)drawMap($('bigmap'));}
function discover(){const p=state.player;let x0=Math.floor(p.x/T),y0=Math.floor(p.y/T);for(let y=y0-6;y<=y0+6;y++)for(let x=x0-6;x<=x0+6;x++){if(x<0||y<0||x>=MW||y>=MH||tiles[y*MW+x]===0)continue;const pos={x:(x+.5)*T,y:(y+.5)*T};if(dist(p,pos)<200&&los(p,pos))explored.add(y*MW+x);}for(const c of chests)if(dist(p,c)<220&&los(p,c))c.discovered=true;if(dist(p,stairs)<220&&los(p,stairs))exitDiscovered=true;}
function update(dt){
 const p=state.player;activeTime+=dt;elapsed+=dt;p.inv=Math.max(0,p.inv-dt);let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+walkInput.x,dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+walkInput.y;let norm=Math.max(1,Math.hypot(dx,dy));move(p,dx/norm*(160+state.stats.speed)*.85*dt,dy/norm*(160+state.stats.speed)*.85*dt);
 const ri=roomAt(p);if(ri>=0){if(!visited.has(ri)){visited.add(ri);toast(rooms[ri].name+' 발견');}$('room').textContent=rooms[ri].name;}$('objective').textContent=exitDiscovered?'발견한 하향 계단으로 이동하세요':ri===1?'북쪽 통로를 따라 에너지 제어실로 이동하세요':ri===2?'동쪽 통로에서 하향 계단을 찾으세요':'동쪽 연구실을 지나 하향 계단을 찾으세요';
 flowTime-=dt;if(flowTime<=0){updateFlow();flowTime=.4;}
 if(!target||target.hp<=0||dist(p,target)>120||!los(p,target))target=enemies.filter(e=>e.hp>0&&dist(p,e)<110&&los(p,e)).sort((a,b)=>dist(p,a)-dist(p,b))[0]||null;
 p.moving=Math.hypot(dx,dy)>.1;if(p.moving){p.facingX=dx/norm;p.facingY=dy/norm;p.stillTime=0;}else p.stillTime+=dt;updateSkills(dt);if(state.pendingScience>0){const bonus=state.pendingScience;state.pendingScience=0;gainExp(bonus);}if(mode!=='play')return;
 for(const e of enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.slowTimer=Math.max(0,(e.slowTimer||0)-dt);e.emTimer=Math.max(0,(e.emTimer||0)-dt);e.emCooldown=Math.max(0,(e.emCooldown||0)-dt);if(e.emTimer<=0)e.emMoves=0;const d=dist(e,p);if(!e.awake&&d<220&&los(e,p))e.awake=true;if(!e.awake)continue;
  if(e.wind>0){e.wind-=dt;if(e.wind<=0){if(e.type==='drone'){const a=Math.atan2(e.ay-e.y,e.ax-e.x);shots.push({x:e.x,y:e.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,life:3});}else{effects.push({kind:'ring',x:e.x,y:e.y,r:38,life:.2,max:.2,color:'#f27b64'});if(dist(e,p)<43&&los(e,p))hurt(12);}e.timer=e.type==='drone'?2.4:1.25;}continue;}
  e.timer-=dt;if((e.type==='drone'?d<220&&los(e,p):d<39)&&e.timer<=0){e.wind=e.type==='drone'?.8:.6;e.ax=p.x;e.ay=p.y;continue;}
  if(d>(e.type==='drone'?145:26)){
   let tx=p.x,ty=p.y;if(!los(e,p)){const cell=Math.floor(e.y/T)*MW+Math.floor(e.x/T);let best=cell;for(const n of [cell-1,cell+1,cell-MW,cell+MW])if(gridFlow[n]<gridFlow[best])best=n;if(best!==cell){tx=(best%MW+.5)*T;ty=(Math.floor(best/MW)+.5)*T;}}
   let ex=tx-e.x,ey=ty-e.y,n=Math.hypot(ex,ey)||1;move(e,ex/n*(e.type==='drone'?33:44)*(e.slowTimer>0?.5:1)*dt,ey/n*(e.type==='drone'?33:44)*(e.slowTimer>0?.5:1)*dt);
  }
 }
 // Light separation prevents stacked enemies while preserving narrow corridors.
 for(let i=0;i<enemies.length;i++){const a=enemies[i];if(a.hp<=0||!a.awake)continue;for(let j=i+1;j<enemies.length;j++){const b=enemies[j];if(b.hp<=0)continue;const d=dist(a,b);if(d>0&&d<22){const f=(22-d)*.5;move(a,(a.x-b.x)/d*f,(a.y-b.y)/d*f);move(b,(b.x-a.x)/d*f,(b.y-a.y)/d*f);}}}
 for(const s of shots){s.life-=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;if(tile(s.x,s.y)!==1)s.life=0;if(s.life>0&&dist(s,p)<16){hurt(9);s.life=0;}}shots=shots.filter(s=>s.life>0);
 for(let i=gems.length-1;i>=0;i--){const g=gems[i],d=dist(g,p);if(d<state.stats.pickup+20&&los(g,p)){const n=d||1;g.x+=(p.x-g.x)/n*230*dt;g.y+=(p.y-g.y)/n*230*dt;}if(dist(g,p)<16){gems.splice(i,1);if(g.kind==='heal_pea'){p.hp=Math.min(state.stats.maxHp,p.hp+g.value);}else gainExp(g.value);if(mode!=='play')break;}}
 for(const s of state.slashes)s.life-=dt;state.slashes=state.slashes.filter(s=>s.life>0);for(const e of effects){e.life-=dt;if(e.kind==='spark'){e.x+=e.vx*dt;e.y+=e.vy*dt;}if(e.kind==='text')e.y-=22*dt;}effects=effects.filter(e=>e.life>0);
 camera.x+=(p.x-W/2-camera.x)*Math.min(1,dt*12);camera.y+=(p.y-H*.58-camera.y)*Math.min(1,dt*12);
 updateStairs(dt);
 uiClock-=dt;if(uiClock<=0){discover();updateUI();uiClock=.15;}
}
function updateUI(){
 if(!state)return;const p=state.player;
 $('level').textContent=`Lv.${state.level} ${characterLabel()}`;$('floor').textContent=`지하 연구소 B${state.floor}F`;$('map-panel').querySelector('h2').textContent=`연구소 B${state.floor}F`;
 $('hp').textContent=`${Math.ceil(p.hp)} / ${state.stats.maxHp}`;
 $('hpfill').style.width=p.hp/state.stats.maxHp*100+'%';
 $('xpfill').style.width=state.xp/state.need*100+'%';
 $('science').textContent=`과학력 ${Math.floor(state.xp)} / ${state.need}`;
 $('killcount').textContent=`처치 ${state.kills}`;
 $('timer').textContent=timeText(activeTime);
 $('damageStat').textContent='공격 '+state.stats.damage.toFixed(2)+'배';
 $('speedStat').textContent='이동 '+Math.round((160+state.stats.speed)*.85);
 $('bagcount').textContent=state.bag.reduce((n,b)=>n+itemCells(b.id).length,0)+' / '+(bagSize().cols*bagSize().rows);
 const labels=Object.entries(state.passives).map(([id,n])=>passiveDefs.find(d=>d.id===id).name+' '+n);
 $('researches').textContent=state.weapons.map(w=>weaponDefs.find(d=>d.id===w.id).name+' '+(weaponDefs.find(d=>d.id===w.id).evolved?'진화':'Lv.'+w.level)).join(' · ');$('scienceBonus').textContent='과학력 +'+Math.round(state.stats.expBonus*100)+'%';
 updateInventory();syncPauseButton();if(mode==='pause')updatePausePanel();
 drawMap($('minimap'));if(!$('map-panel').hidden)drawMap($('bigmap'));
}
function drawMap(c){if(!state)return;const g=c.getContext('2d'),scale=Math.min((c.width-8)/(MW*T),(c.height-8)/(MH*T)),ox=(c.width-MW*T*scale)/2,oy=(c.height-MH*T*scale)/2;g.fillStyle='#10121d';g.fillRect(0,0,c.width,c.height);for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){if(tiles[y*MW+x]===0)continue;g.fillStyle=explored.has(y*MW+x)?'#8b879b':'#353344';g.fillRect(ox+x*T*scale,oy+y*T*scale,T*scale+.3,T*scale+.3);}for(const chest of chests)if(chest.discovered&&!chest.opened){g.fillStyle='#eebd69';g.fillRect(ox+chest.x*scale-2,oy+chest.y*scale-2,4,4);}if(exitDiscovered){g.fillStyle='#76dedd';g.fillRect(ox+stairs.x*scale-2,oy+stairs.y*scale-2,5,5);}g.fillStyle='#ffdc79';g.beginPath();g.arc(ox+state.player.x*scale,oy+state.player.y*scale,c.width>200?4:2.5,0,Math.PI*2);g.fill();}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function draw(){
 ctx.imageSmoothingEnabled=false;ctx.fillStyle='#0b0c14';ctx.fillRect(0,0,W,H);if(!state)return;ctx.save();ctx.translate(-Math.floor(camera.x),-Math.floor(camera.y));
 const sx=Math.max(0,Math.floor(camera.x/T)-1),sy=Math.max(0,Math.floor(camera.y/T)-2),ex=Math.min(MW,Math.ceil((camera.x+W)/T)+1),ey=Math.min(MH,Math.ceil((camera.y+H)/T)+2);
 for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++){const v=tiles[y*MW+x],px=x*T,py=y*T,n=(x*71+y*37)%13;if(v===1){rect(px,py,32,32,['#484655','#454352','#424451','#494754'][n%4]);rect(px,py,32,2,'#252632');rect(px,py,2,32,'#2d2d3c');rect(px+3,py+3,27,1,'#66607166');rect(px+29,py+5,1,25,'#25253266');if(n<3){rect(px+7,py+12,8,1,'#33343f');rect(px+14,py+13,1,6,'#33343f');}if(n===6)rect(px+21,py+8,2,2,'#7c74805c');}
  else if(v===0){const neighbors=[[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>tiles[(y+dy)*MW+x+dx]===1);if(neighbors){rect(px,py,32,32,'#302c43');rect(px+2,py+2,28,10,n%2?'#51475f':'#484157');rect(px+2,py+14,28,15,'#3f384e');rect(px+3,py+3,26,2,'#75627c66');rect(px,py+30,32,2,'#161724');if(tiles[(y+1)*MW+x]===1){rect(px,py+28,32,7,'#5b4e67');rect(px,py+35,32,9,'#11142055');}}}
 }
 for(const r of rooms){let lx=(r.x+1)*T,ly=(r.y+1)*T;glow(lx,ly,110,'#d78e3535');rect(lx-9,ly-12,18,23,'#352329');rect(lx-6,ly-9,12,17,'#b97d3c');rect(lx-3,ly-7,6,13,'#ffe3a2');rect(lx-10,ly+11,20,4,'#161521');}
 const exitSeen=exitDiscovered;if(exitSeen){glow(stairs.x,stairs.y,70,'#52ddd12c');for(let i=0;i<5;i++){rect(stairs.x-21+i*4,stairs.y-21+i*8,42-i*8,7,i%2?'#75738d':'#55566d');}rect(stairs.x-25,stairs.y+24,50,3,'#7ae2df');ctx.fillStyle='#b9ffec';ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillText(`B${state.floor+1}F ↓`,stairs.x,stairs.y-29);}
 for(const prop of props){const x=prop.x,y=prop.y;if(x<camera.x-70||x>camera.x+W+70||y<camera.y-80||y>camera.y+H+80)continue;if(prop.type==='tank'){glow(x,y,65,'#b345de25');ellipse(x,y+28,28,10,'#0b0c1888');rect(x-21,y-36,42,64,'#181c2a');rect(x-16,y-27,32,47,'#7632a7');rect(x-12,y-23,24,40,'#b158e766');rect(x-11,y-22,3,39,'#edb8ff');ellipse(x,y-33,23,10,'#2e2f40');ellipse(x,y-36,19,7,'#545366');ellipse(x,y+24,23,9,'#272b3b');rect(x-15,y+25,30,5,'#6a7382');for(let i=0;i<6;i++){const yy=y-18+i*6;rect(x+Math.sin(elapsed*2+i)*7-2,yy,4,2,'#f4bfff');}}
  if(prop.type==='pillar'){ellipse(x,y+23,25,9,'#0b0b1688');rect(x-20,y-18,40,44,'#191d2a');rect(x-15,y-18,30,39,'#515062');rect(x-10,y-16,4,36,'#6d6578');rect(x+8,y-16,6,36,'#343748');rect(x-22,y+18,44,9,'#292b3d');rect(x-23,y-29,46,17,'#6c6579');rect(x-19,y-26,38,3,'#9890a1');rect(x-23,y-15,46,5,'#252737');}
  if(prop.type==='console'){rect(x-30,y-21,60,45,'#171c28');rect(x-27,y-18,34,27,'#56636c');rect(x-24,y-15,28,20,'#173f3a');ctx.strokeStyle='#73ce97';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-22,y-4);for(let i=0;i<8;i++)ctx.lineTo(x-22+i*3,y-4-Math.sin(i*4)*6);ctx.stroke();rect(x+12,y-16,13,34,'#3b424f');rect(x+15,y-11,6,3,'#90df85');rect(x+15,y-3,6,3,'#90df85');rect(x-23,y+14,5,3,'#79c6a1');rect(x-12,y+14,5,3,'#79c6a1');}}
 for(const c of chests){glow(c.x,c.y,45,c.opened?'#9f643310':'#e9b94b30');rect(c.x-19,c.y-13,38,30,'#35222e');rect(c.x-16,c.y-11,32,23,c.opened?'#533b36':'#8a5436');rect(c.x-17,c.y-12,34,5,'#dab260');rect(c.x-17,c.y+8,34,4,'#dab260');rect(c.x-13,c.y-9,4,20,'#d3a14b');rect(c.x+9,c.y-9,4,20,'#d3a14b');rect(c.x-3,c.y-1,6,7,c.opened?'#241e28':'#fff2b0');if(!c.opened){rect(c.x-23,c.y+23,46,5,'#15121c');rect(c.x-22,c.y+24,44*c.hp/c.max,3,c.rare?'#ce8df2':'#edbf75');ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillStyle=c.rare?'#dcb2ff':'#e5c596';ctx.fillText(c.rare?'희귀 보급 · HP ×10':'보급 상자 · HP ×2',c.x,c.y-20);}}
 for(const g of gems){glow(g.x,g.y,12,'#62dddb19');ctx.fillStyle='#78e1d8';ctx.beginPath();ctx.moveTo(g.x,g.y-5);ctx.lineTo(g.x+4,g.y);ctx.lineTo(g.x,g.y+5);ctx.lineTo(g.x-4,g.y);ctx.fill();}
 for(const l of loot){const d=itemDefs[l.id];glow(l.x,l.y,25,d.color+'40');ellipse(l.x,l.y+3,9,4,'#151125');rect(l.x-7,l.y-6,14,12,d.color);rect(l.x-4,l.y-3,8,6,'#f8e4ad');if(Math.sin(elapsed*3+l.x)>0)rect(l.x+10,l.y-12,2,4,'#ffe1a1');}
 const actors=[...enemies.filter(e=>e.hp>0),{...state.player,type:'player'}].sort((a,b)=>a.y-b.y);
 for(const e of actors){const x=e.x,y=e.y;if(x<camera.x-40||x>camera.x+W+40||y<camera.y-60||y>camera.y+H+50)continue;ellipse(x,y+8,e.type==='player'?17:16,6,'#10101b77');if(e.type==='player'){
   ctx.strokeStyle=state.player.inv>0?'#ff7e91':'#80d4e2';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y+7,18,7,0,0,Math.PI*2);ctx.stroke();if(state.player.inv<=0||Math.floor(elapsed*14)%2===0){if(playerImg.complete&&playerImg.naturalWidth)ctx.drawImage(playerImg,x-19,y-53,38,63);else{rect(x-9,y-22,18,26,'#d4def1');rect(x-7,y-35,14,14,'#e8c59b');}}drawHeldTool(x,y);
  }else{
   if(e.wind>0){ctx.strokeStyle='#ff715f';ctx.lineWidth=2;ctx.fillStyle='#ee574022';ctx.beginPath();ctx.arc(x,y,38,0,Math.PI*2);ctx.fill();ctx.stroke();if(e.type==='drone'){ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(e.ax,e.ay);ctx.stroke();ctx.setLineDash([]);}}
   const bob=Math.sin(elapsed*5+e.id)*2;if(e.type==='slime'){ellipse(x,y-2+bob,15,12,e.flash>0?'#fff0b6':'#2b5128');ellipse(x,y-5+bob,12,10,e.flash>0?'#fff0b6':'#70b84b');rect(x-9,y-10+bob,6,3,'#c0e58a');rect(x-5,y-5+bob,3,4,'#172a29');rect(x+4,y-5+bob,3,4,'#172a29');rect(x-1,y+1+bob,3,2,'#335334');}else{ctx.strokeStyle='#191a27';ctx.lineWidth=5;for(const s of [-1,1]){ctx.beginPath();ctx.moveTo(x+s*10,y-9);ctx.lineTo(x+s*19,y-13);ctx.lineTo(x+s*23,y+7);ctx.stroke();ctx.strokeStyle='#7c788d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+s*10,y-10);ctx.lineTo(x+s*18,y-13);ctx.lineTo(x+s*22,y+3);ctx.stroke();}ellipse(x,y-6+bob,13,12,e.flash>0?'#fff0b6':'#444758');ellipse(x,y-10+bob,10,5,'#69687b');glow(x,y-4+bob,17,'#ff64464d');ellipse(x,y-4+bob,5,5,'#ff624f');ellipse(x,y-5+bob,2,2,'#ffe3a1');}
   if(e.hp<e.max||e.wind>0){rect(x-15,y+15,30,4,'#15121c');rect(x-14,y+16,28*Math.max(0,e.hp/e.max),2,'#e06477');}if(!e.awake&&dist(e,state.player)<270){ctx.fillStyle='#c3b7d0';ctx.font='9px sans-serif';ctx.fillText('z',x+13,y-20);}
  }
 }
 drawSkillWorld();
 for(const s of state.slashes){ctx.globalAlpha=Math.max(0,s.life/s.maxLife);ctx.strokeStyle=s.color;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x+Math.cos(s.dir)*visibleLineLength(s.x,s.y,s.dir,s.length),s.y+Math.sin(s.dir)*visibleLineLength(s.x,s.y,s.dir,s.length));ctx.stroke();ctx.strokeStyle='#fffce9';ctx.lineWidth=2;ctx.stroke();}ctx.globalAlpha=1;
 for(const s of shots){glow(s.x,s.y,12,'#fb7c5366');ellipse(s.x,s.y,4,4,'#ffbc79');}
 for(const e of effects){ctx.globalAlpha=Math.max(0,e.life/e.max);if(e.kind==='text'){ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.strokeStyle='#17131f';ctx.lineWidth=3;ctx.strokeText(e.text,e.x,e.y);ctx.fillStyle=e.color;ctx.fillText(e.text,e.x,e.y);}else if(e.kind==='spark'){rect(e.x,e.y,3,3,e.color);}else if(e.kind==='ring'){ctx.strokeStyle=e.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.r*(1-e.life/e.max),0,Math.PI*2);ctx.stroke();}}ctx.globalAlpha=1;ctx.restore();
 const vignette=ctx.createRadialGradient(W/2,H/2,130,W/2,H/2,340);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#080913b0');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
}
function frame(now){const dt=Math.min(.04,(now-last)/1000||.016);last=now;if(mode==='play')update(dt);if(toastClock>0){toastClock-=dt;if(toastClock<=0)$('toast').classList.remove('on');}draw();requestAnimationFrame(frame);}
$('pause').onclick=pause;$('map').onclick=showMap;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();if(e.repeat)return;if(k==='escape'){$('map-panel').hidden=true;cancelItemDrag();hideTooltip();return;}if(k==='m')showMap();if(mode==='play')keys.add(k);});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>{resetInput();cancelItemDrag();hideTooltip();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();cancelItemDrag();hideTooltip();}});
$('closemap').onclick=()=>{$('map-panel').hidden=true;};
canvas.addEventListener('pointerdown',e=>{if(mode!=='play'||stickPointer!==null)return;stickPointer=e.pointerId;canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect();stickOrigin={x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};$('stick').style.cssText=`display:block;left:${stickOrigin.x-43}px;top:${stickOrigin.y-43}px`;});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==stickPointer||mode!=='play')return;const r=canvas.getBoundingClientRect();let x=(e.clientX-r.left)*W/r.width-stickOrigin.x,y=(e.clientY-r.top)*H/r.height-stickOrigin.y,n=Math.max(32,Math.hypot(x,y));walkInput={x:x/n,y:y/n};$('stick').firstElementChild.style.transform=`translate(${walkInput.x*23}px,${walkInput.y*23}px)`;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{if(e.pointerId===stickPointer){stickPointer=null;walkInput={x:0,y:0};$('stick').style.display='none';}});
// Initialization follows inventory.js so shared UI helpers are ready.
