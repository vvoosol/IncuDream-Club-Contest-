'use strict';
const playableCharacters=['default','newton','faraday','mendel'];
let selectedCharacter='default';
const implementedSkills=new Set('ruler steel_ruler ball iron_ball chalk chalk_machine ammonia chem_warfare notebook exam_cheatsheet flask flammable_material apple gravity laser prism current lightning magnet magnetic_storm pea segregation_law planting pure_cross'.split(' '));
const characterNames={default:'정도안',newton:'뉴턴',faraday:'패러데이',mendel:'멘델'};
const innateText={default:'학생 · 과학력 +30% · 직전 무기 재등장 가중치 증가',newton:'F = ma · 이동 중 피해 +10%, 이동 방향 공격 +20%, 역방향 -30%, 1초 정지 후 -10%',faraday:'전자기 유도 · 1.05초 안에 이동 효과를 두 번 받는 적에게 추가 감전',mendel:'우성 유전 · 직전 선택한 무기나 패시브가 강화 가능하면 다음 선택지에 보장'};
function characterLabel(){return characterNames[state?.character||selectedCharacter];}
function skillDef(id){return weaponDefs.find(d=>d.id===id);}
function skillIcon(id){
 if(['ruler','steel_ruler'].includes(id))return icon('ruler');
 if(['notebook','exam_cheatsheet'].includes(id))return icon('book');
 if(['flask','flammable_material','ammonia','chem_warfare'].includes(id))return icon('cell');
 const shape=({
 apple:'<path d="M32 19c-20-13-28 6-21 24 7 17 13 9 21 10 9-1 16 7 22-11 5-17-7-33-22-23" fill="#ed6566" stroke="#ffaaa1" stroke-width="2"/><path d="M31 21V9m1 5c4-10 15-11 17-7-2 7-9 10-17 7" stroke="#9adf91" stroke-width="4" fill="#73ba6d"/>',
 laser:'<path d="M7 49 29 27" stroke="#aebcd4" stroke-width="13"/><path d="m24 31 34-25" stroke="#ff7d90" stroke-width="8"/><path d="m24 31 34-25" stroke="#fff5e9" stroke-width="2"/>',
 current:'<path d="m37 4-24 31h17l-3 25 25-34H35Z" fill="#7ee7e8" stroke="#e2ffff" stroke-width="2"/>',
 magnet:'<path d="M15 8v27a17 17 0 0 0 34 0V8" fill="none" stroke="#ad7bb5" stroke-width="13"/><path d="M15 8v13" stroke="#f07684" stroke-width="13"/><path d="M49 8v13" stroke="#6cd6ea" stroke-width="13"/>',
 pea:'<path d="M9 43Q16 9 53 13 49 51 9 43" fill="#386b44" stroke="#b0e088" stroke-width="3"/><circle cx="22" cy="34" r="8" fill="#a3d96f"/><circle cx="34" cy="27" r="8" fill="#a3d96f"/><circle cx="46" cy="21" r="7" fill="#a3d96f"/>',
 planting:'<path d="M20 35h27l-5 22H25Z" fill="#b28061" stroke="#e4b888" stroke-width="2"/><path d="M33 40V13" stroke="#8ddd8c" stroke-width="4"/><path d="M33 28Q7 28 14 12q19-3 19 16m0-5q0-19 20-18 2 19-20 18" fill="#75bd76" stroke="#b4ed98" stroke-width="2"/>',
 ball:'<circle cx="32" cy="32" r="24" fill="#7aa6de" stroke="#d8edff" stroke-width="3"/><path d="M9 24q23 15 46 0M22 9q15 23 0 46" stroke="#526586" stroke-width="4" fill="none"/>'
 })[({gravity:'apple',prism:'laser',lightning:'current',magnetic_storm:'magnet',segregation_law:'pea',pure_cross:'planting',iron_ball:'ball',chalk:'laser',chalk_machine:'laser'})[id]||id]||'';
 return `<svg viewBox="0 0 64 64" aria-hidden="true">${shape}</svg>`;
}
function renderCharacterSelect(){
 mode='title';show(`<div class="eyebrow">SCIENTIST RPG · PLAYTEST 03 / 05</div><h2>연구원을 선택하세요</h2><div class="character-picker">${playableCharacters.map(id=>`<button data-character="${id}" class="${selectedCharacter===id?'selected':''}"><img src="${portraitPaths[id]}" alt="">${characterNames[id]}</button>`).join('')}</div><img class="hero" src="${portraitPaths[selectedCharacter]}" alt="${characterNames[selectedCharacter]}"><div class="character-info"><b>${characterNames[selectedCharacter]} · ${characters[selectedCharacter].title}</b><br>시작 기술: ${skillDef(characters[selectedCharacter].startWeapon).name}<br><span class="cyan">${innateText[selectedCharacter]}</span></div><button class="primary" id="start">연구소 진입 →</button><p>이동: WASD / 방향키 / 전투 화면 드래그<br>자동 공격 · 레벨업 연구 3개 중 선택<br>장비는 드래그하거나 더블클릭하여 획득<br>상자는 공격으로 파괴 · 계단 옆에서 3초 대기</p><span class="badge">공용 기술 + 전용 기술 · 6개 기술 슬롯 · 무기 진화</span>`);
 document.querySelectorAll('[data-character]').forEach(b=>b.onclick=()=>{selectedCharacter=b.dataset.character;renderCharacterSelect();});$('start').onclick=()=>start(selectedCharacter);syncPauseButton();
}
function availableWeapons(){return weaponDefs.filter(d=>implementedSkills.has(d.id)&&!d.evolved&&(!d.character||d.character===state.character));}
function researchCandidates(){
 const choices=[];
 for(const d of availableWeapons()){
  const owned=state.weapons.find(w=>w.id===d.id);
  if(state.evolvedBases.includes(d.id))continue;
  if(owned){if(owned.level<d.max)choices.push({type:'weapon',id:d.id,level:owned.level+1});}
  else if(state.weapons.length<6)choices.push({type:'weapon',id:d.id,level:1});
 }
 for(const d of passiveDefs)if((state.passives[d.id]||0)<d.max)choices.push({type:'passive',id:d.id,level:(state.passives[d.id]||0)+1});
 for(const w of state.weapons){const d=skillDef(w.id);if(!d.evolved&&w.level>=d.max&&d.evolvesTo&&implementedSkills.has(d.evolvesTo)&&state.passives[d.evolvesWith]>=1&&!state.weapons.some(v=>v.id===d.evolvesTo))choices.push({type:'evolution',id:d.evolvesTo,base:d.id,level:1});}
 return choices;
}
function researchChoices(){
 const pool=researchCandidates(),result=[];
 const take=c=>{result.push(c);pool.splice(pool.indexOf(c),1);};
 const evolutions=pool.filter(c=>c.type==='evolution');if(evolutions.length)take(evolutions[Math.floor(Math.random()*evolutions.length)]);
 if(state.character==='mendel'&&state.lastMendelChoice){const c=pool.find(c=>c.type===state.lastMendelChoice.type&&c.id===state.lastMendelChoice.id);if(c&&result.length<3)take(c);}
 const normal=()=>pool.filter(c=>c.type!=='evolution');
 while(result.length<3&&normal().length){const candidates=normal(),weights=candidates.map(c=>{let w=c.type==='weapon'&&skillDef(c.id).character===state.character?2:1;if(state.character==='default'&&c.type==='weapon'&&c.id===state.lastWeapon)w*=1.1;return w;});let r=Math.random()*weights.reduce((a,b)=>a+b,0),i=0;for(;i<weights.length-1;i++){r-=weights[i];if(r<=0)break;}take(candidates[i]);}
 while(result.length<3)result.push({type:'funds',id:'funds',level:1});return result;
}
function choiceDetails(c){
 if(c.type==='funds')return{name:'연구비 +100',description:'모든 연구가 완료되었습니다. 이번 탐험 연구비를 획득합니다.',tag:'연구비'};
 if(c.type==='passive'){const d=passiveDefs.find(d=>d.id===c.id);return{name:d.name,description:passiveSummary(c.id,c.level),tag:`패시브 · Lv.${c.level} / 3`};}
 const d=skillDef(c.id);if(c.type==='evolution')return{name:d.name,description:d.description+' · '+skillDef(c.base).name+'을 대체합니다.',tag:'무기 진화 · 완성'};
 return{name:d.name,description:c.level===1?d.description:weaponUpgradeDescriptions[c.id]?.[c.level]||d.description,tag:`${c.level===1?'새 기술':'기술 강화'} · Lv.${c.level} / 5`};
}
function openResearch(){
 mode='research';$('map-panel').hidden=true;$('pause-panel').hidden=true;const choices=researchChoices();
 show(`<div class="eyebrow">RESEARCH BREAKTHROUGH</div><h2>연구 성과 · Lv.${state.level}</h2><p>${characterLabel()} · 기술 ${state.weapons.length} / 6<br>하나를 선택하세요. 선택하는 동안 전투가 멈춥니다.</p>${choices.map((c,i)=>{const d=choiceDetails(c);return `<button class="choice ${c.type==='evolution'?'evolution':''}" data-choice="${i}"><em>${d.tag}</em><b>${d.name}</b><small>${d.description}</small></button>`;}).join('')}`);
 document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{applyResearch(choices[+b.dataset.choice]);mode='play';$('modal').innerHTML='';updateUI();if(state.xp>=state.need)levelUp();});updateUI();
}
function applyResearch(c){
 const candidates=researchCandidates();if(c.type!=='funds'&&!candidates.some(d=>d.type===c.type&&d.id===c.id))return false;
 if(c.type==='weapon'){const w=state.weapons.find(w=>w.id===c.id);if(w)w.level++;else state.weapons.push({id:c.id,level:1,cd:.12});}
 if(c.type==='passive')state.passives[c.id]=(state.passives[c.id]||0)+1;
 if(c.type==='evolution'){const i=state.weapons.findIndex(w=>w.id===c.base);state.weapons[i]={id:c.id,level:1,cd:.12};state.evolvedBases.push(c.base);if(['pure_cross','planting'].includes(c.id))state.plants=[];}
 if(c.type==='funds')state.funds+=100;
 state.lastWeapon=c.type==='weapon'?c.id:null;state.lastMendelChoice=['weapon','passive'].includes(c.type)?{type:c.type,id:c.id}:null;
 recalc(c.type==='passive'&&c.id==='nightStudy');toast(choiceDetails(c).name+' 연구 완료');return true;
}
function passiveSummary(id,n){return({instinct:`공격력 +${n*15}%`,focus:`무기 쿨타임 -${n*10}%`,steps:`기본 이동속도 +${n*18}`,tidy:`획득 반경 +${n*28}${n>1?' · 과학력 +'+(n===2?10:30)+'%':''}`,nightStudy:`최대 체력 +${n*20} · 선택 시 체력 +20`,repeat:`투사체 +${n}`})[id]||'';}
function updatePausePanel(){
 if(!state)return;$('pause-level').textContent=`Lv.${state.level} ${characterLabel()}`;
 $('skill-list').innerHTML=state.weapons.map(w=>{const d=skillDef(w.id);return `<div class="skill-row ${d.evolved?'evolved':''}"><span class="skill-icon">${skillIcon(w.id)}</span><div><b>${d.name} <em>${d.evolved?'진화 완성':`Lv.${w.level} / 5`}</em></b><small>${d.description}${d.baseCooldown?' · '+getWeaponCooldown(d,w.level).toFixed(2)+'초':''}</small></div></div>`;}).join('')+`<div class="skill-row innate"><span class="skill-dot">◎</span><div><b>${characterLabel()} <em>고유 특성</em></b><small>${innateText[state.character]}</small></div></div>`+Object.entries(state.passives).map(([id,n])=>`<div class="skill-row"><span class="skill-dot">✧</span><div><b>${passiveDefs.find(d=>d.id===id).name}<em>Lv.${n} / 3</em></b><small>${passiveSummary(id,n)}</small></div></div>`).join('');
}
// Source-compatible helpers for the imported attacks.
const rand=(a,b)=>a+Math.random()*(b-a),lerp=(a,b,t)=>a+(b-a)*t;
function getEffectDuration(v){return v;}function getProjectileSpeedMultiplier(){return 1;}function getAttackSizeMultiplier(){return 1;}function getAvatarOrbitSpeedMultiplier(){return 1;}function getElementBonus(){return 0;}function getSummonDurationMultiplier(){return 1;}function getSummonPowerMultiplier(){return 1;}function updateTelescopeAllyMagnify(){}function triggerSuperpositionNotebook(){}function sweepDeadEnemies(){}function addScreenShake(){}
function applyCombatChance(chance,cap){return Math.min(cap,chance);}
function isNewtonCharacter(){return state.character==='newton';}function isPlayerMoving(){return !!state.player.moving;}function getMovementDirection(){return{x:state.player.facingX,y:state.player.facingY};}
function combatTargets(){return [...enemies,...chests.filter(c=>!c.opened)];}
function findTargetFrom(x,y){const p={x,y};return combatTargets().filter(e=>e.hp>0&&dist(p,e)<340&&los(p,e)).sort((a,b)=>dist(a,p)-dist(b,p))[0]||null;}
function findTarget(){if(target?.hp>0&&dist(target,state.player)<340&&los(state.player,target))return target;return findTargetFrom(state.player.x,state.player.y);}
function visibleLineLength(x,y,dir,length){for(let d=0;d<length;d+=6)if(tile(x+Math.cos(dir)*d,y+Math.sin(dir)*d)!==1)return d;return length;}
function hitEnemy(e,damage,knock=0,dx=0,dy=0,source=''){
 if(e.hp<=0)return;if(['ammonia','chem_warfare','notebook','exam_cheatsheet'].includes(source)&&!los(state.player,e))return;
 hit(e,damage,source);if(e.hp<=0||e.type==='chest')return;
 if(knock>0){const n=Math.hypot(dx,dy)||1;move(e,dx/n*knock,dy/n*knock);induce(e,knock);}
}
function induce(e,power){if(state.character!=='faraday'||e.hp<=0||power<=0)return;e.emTimer=1.05;e.emMoves=(e.emMoves||0)+1;if(e.emMoves>=2&&(e.emCooldown||0)<=0){e.emCooldown=.1;hit(e,Math.min(14,3.5+power*.18)*state.stats.damage,'induction');state.particles.push({kind:'electric',x:e.x,y:e.y,radius:18,life:.2,maxLife:.2});}}
function hitFirstLineEnemy(x,y,dir,length,width,damage,knock,source){const p={x,y},hits=combatTargets().filter(e=>e.hp>0&&los(p,e)).map(e=>({e,along:(e.x-x)*Math.cos(dir)+(e.y-y)*Math.sin(dir),side:Math.abs(-(e.x-x)*Math.sin(dir)+(e.y-y)*Math.cos(dir))})).filter(h=>h.along>=0&&h.along<length+h.e.r&&h.side<width+h.e.r).sort((a,b)=>a.along-b.along);if(!hits.length)return null;const e=hits[0].e;hitEnemy(e,damage,knock,Math.cos(dir),Math.sin(dir),source);return{x:e.x,y:e.y,enemy:e};}
function chainElectricDamage(start,damage,range,jumps,source,heavy=false,includeStart=true){let current=start;const hitSet=new Set([start]);if(includeStart)hitEnemy(start,damage,heavy?7:4,start.x-state.player.x,start.y-state.player.y,source);for(let i=0;i<jumps;i++){const next=combatTargets().filter(e=>e.hp>0&&!hitSet.has(e)&&dist(current,e)<range&&los(current,e)).sort((a,b)=>dist(current,a)-dist(current,b))[0];if(!next)break;hitSet.add(next);state.particles.push({kind:'electric_arc',x:current.x,y:current.y,x2:next.x,y2:next.y,life:.18,maxLife:.18});hitEnemy(next,damage*Math.pow(heavy?.82:.72,i+1),heavy?8:4,next.x-current.x,next.y-current.y,source);current=next;}}
function areaHit(a,damage,knock=0,source=''){for(const e of combatTargets())if(e.hp>0&&dist(a,e)<a.radius+e.r&&los(a,e))hitEnemy(e,damage,knock,e.x-a.x,e.y-a.y,source);}
function safeLanding(obj){if(open(obj.x,obj.y,8))return;const targetPos=findTarget()||state.player;for(let i=0;i<40;i++){const a=i*2.399,r=8*Math.sqrt(i);const x=targetPos.x+Math.cos(a)*r,y=targetPos.y+Math.sin(a)*r;if(open(x,y,8)){obj.x=x;obj.y=y;return;}}obj.x=state.player.x;obj.y=state.player.y;}
function updateSkills(dt){
 for(const w of state.weapons){const d=skillDef(w.id);if(!implementedSkills.has(w.id))continue;if(['notebook','exam_cheatsheet'].includes(w.id))continue;w.cd=(w.cd||0)-dt;const t=findTarget();if(!t&&!['planting','pure_cross'].includes(w.id))continue;const range=w.id==='ruler'?(w.level>=3?98:78):w.id==='steel_ruler'?148:340;if(t&&dist(t,state.player)>range)continue;if(w.cd<=0){const counts=[state.areas.length,state.falls.length,state.plants.length];d.attack(w.level);w.cd=Math.max(.05,getWeaponCooldown(d,w.level));for(const [list,i]of [[state.areas,counts[0]],[state.falls,counts[1]],[state.plants,counts[2]]])for(const o of list.slice(i))safeLanding(o);}}
 updateNotebook(dt);updatePlantTurrets(dt);updateSkillProjectiles(dt);updateSkillAreas(dt);
 for(const f of state.falls){f.life-=dt;if(f.life<=0&&!f.done){f.done=true;if(f.pull)for(const e of combatTargets())if(e.hp>0&&dist(f,e)<f.radius+35&&los(f,e)){const d=dist(f,e)||1;move(e,(f.x-e.x)/d*22,(f.y-e.y)/d*22);}areaHit(f,f.damage,f.knock,f.source);state.particles.push({kind:'impact',x:f.x,y:f.y,radius:f.radius,life:.4,maxLife:.4});}}
 state.falls=state.falls.filter(f=>f.life>0);for(const p of state.particles){p.life-=dt;if(p.kind==='text')p.y-=20*dt;}state.particles=state.particles.filter(p=>p.life>0).slice(-240);
}
function updateSkillProjectiles(dt){
 for(const p of [...state.projectiles]){
  p.life-=dt;if(p.life<=0)continue;const steps=Math.max(1,Math.ceil(Math.hypot(p.vx,p.vy)*dt/7));
  for(let i=0;i<steps&&p.life>0;i++){
   const dx=p.vx*dt/steps,dy=p.vy*dt/steps,nx=p.x+dx,ny=p.y+dy;
   if(!open(nx,ny,p.radius)){
    if(p.bounces>0){if(!open(nx,p.y,p.radius))p.vx*=-1;if(!open(p.x,ny,p.radius))p.vy*=-1;p.bounces--;p.hit.clear();if(p.kind==='iron_ball')p.power=(p.power||1)+.14;}else p.life=0;continue;
   }p.x=nx;p.y=ny;
   for(const e of combatTargets()){
    if(e.hp<=0||p.hit.has(e)||dist(p,e)>p.radius+e.r)continue;p.hit.add(e);const source=p.source||p.kind;hitEnemy(e,p.damage*(p.power||1),p.knock||0,p.vx,p.vy,source);
    if(p.splash){for(const other of combatTargets())if(other!==e&&other.hp>0&&dist(e,other)<p.splash+other.r&&los(e,other))hitEnemy(other,p.damage*.48,0,0,0,source);state.particles.push({kind:'dust',x:p.x,y:p.y,radius:p.splash,life:.22,maxLife:.22});}
    if(p.kind==='current')chainElectricDamage(e,p.chainDamage,p.chainRange,p.chainCount,'current',false,false);
    if(p.kind.includes('pea')&&state.projectiles.length<600)splitPeaProjectile(p);
    if(p.bounces>0){const a=Math.atan2(p.y-e.y,p.x-e.x),speed=Math.hypot(p.vx,p.vy);p.vx=Math.cos(a)*speed;p.vy=Math.sin(a)*speed;p.bounces--;if(p.kind==='iron_ball')p.power=(p.power||1)+.14;break;}
    if((p.pierce||0)>0)p.pierce--;else{p.life=0;break;}
   }
  }
 }state.projectiles=state.projectiles.filter(p=>p.life>0).slice(-600);
}
function updateSkillAreas(dt){
 for(const a of state.areas){
  a.life-=dt;a.tick-=dt;
  if(a.kind==='magnetic_storm'){const nx=a.x+a.vx*dt,ny=a.y+a.vy*dt;if(tile(nx,ny)===1){a.x=nx;a.y=ny;}else a.life=0;a.radius=lerp(58,a.maxRadius,1-Math.max(0,a.life)/a.maxLife);}
  if(a.tick<=0&&a.life>0){
   if(a.kind==='afterglow'){a.tick=.12;hitLineEnemies(a.x-Math.cos(a.dir)*a.length*.5,a.y-Math.sin(a.dir)*a.length*.5,a.dir,a.length,a.width,a.damage,0,'laser');}
   else if(a.kind==='magnetic_field'){
    a.tick=.03;for(const e of combatTargets()){const dx=e.x-a.x,dy=e.y-a.y,d=Math.hypot(dx,dy)||1,diff=Math.atan2(Math.sin(Math.atan2(dy,dx)-a.dir),Math.cos(Math.atan2(dy,dx)-a.dir));if(e.hp<=0||d>a.length||Math.abs(diff)>a.width||!los(a,e))continue;const along=dx*Math.cos(a.dir)+dy*Math.sin(a.dir),tx=a.x+Math.cos(a.dir)*along,ty=a.y+Math.sin(a.dir)*along,n=Math.hypot(tx-e.x,ty-e.y)||1;move(e,(tx-e.x)/n*Math.min(a.force,n),(ty-e.y)/n*Math.min(a.force,n));induce(e,a.force);hitEnemy(e,a.damage,0,0,0,'magnet');}
    for(const g of gems)if(dist(a,g)<220&&los(a,g)){const d=dist(g,state.player)||1;g.x+=(state.player.x-g.x)/d*14;g.y+=(state.player.y-g.y)/d*14;}
   }else if(a.kind==='magnetic_storm'){
    a.tick=.05;for(const e of combatTargets())if(e.hp>0&&dist(e,a)<a.radius+e.r&&los(a,e)){const d=dist(e,a)||1;move(e,(a.x-e.x)/d*Math.min(a.force,d),(a.y-e.y)/d*Math.min(a.force,d));induce(e,a.force);hitEnemy(e,a.damage,0,0,0,'magnetic_storm');}
   }else{a.tick=.35;areaHit(a,a.damage,0,a.kind);}
  }
  if(a.life<=0&&a.kind==='flammable'&&!a.exploded){a.exploded=true;areaHit(a,a.explosionDamage,12,'flammable_material');state.particles.push({kind:'explosion',x:a.x,y:a.y,radius:a.radius+15,life:.4,maxLife:.4});}
 }state.areas=state.areas.filter(a=>a.life>0);
}
function drawSkillWorld(){
 const p=state.player;
 for(const a of state.areas){if(a.kind==='afterglow')continue;const r=a.kind==='magnetic_field'?140:a.radius||30,color=a.kind.includes('magnetic')?'#6edee0':a.kind==='flammable'?'#edaa5f':'#b17bdb';ctx.save();ctx.globalAlpha=.14;ellipse(a.x,a.y,r,r*.65,color);ctx.globalAlpha=.55;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(a.x,a.y,r,r*.65,0,0,Math.PI*2);ctx.stroke();if(a.kind==='magnetic_field'){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+Math.cos(a.dir)*180,a.y+Math.sin(a.dir)*180);ctx.stroke();}ctx.restore();}
 const aura=state.weapons.find(w=>['ammonia','chem_warfare'].includes(w.id));if(aura){let r=aura.id==='chem_warfare'?88:aura.level>=4?86:aura.level>=2?68:50;ctx.save();ctx.globalAlpha=.1;ellipse(p.x,p.y,r,r,'#91ce8a');ctx.globalAlpha=.35;ctx.strokeStyle='#9bdc9a';ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
 for(const f of state.falls){const t=f.life/f.maxLife;ctx.strokeStyle='#eab96b';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(f.x,f.y,f.radius,f.radius*.65,0,0,Math.PI*2);ctx.stroke();ellipse(f.x,f.y-8-t*f.height,f.kind==='gravity'?17:11,f.kind==='gravity'?18:12,'#ee7c75');rect(f.x-1,f.y-23-t*f.height,3,8,'#7cc077');}
 for(const plant of state.plants){const x=plant.x,y=plant.y;rect(x-10,y,20,13,'#916a4b');rect(x-12,y-2,24,5,'#cf9d72');ctx.strokeStyle='#88d183';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-(plant.grown?26:10));ctx.stroke();ellipse(x+5,y-(plant.grown?24:8),8,5,'#8ecf79');if(!plant.grown){rect(x-16,y+18,32,3,'#252431');rect(x-16,y+18,32*plant.grow/plant.growTime,3,'#b6e0a0');if(dist(p,plant)<125){ctx.font='9px sans-serif';ctx.fillStyle='#cfdeb9';ctx.textAlign='center';ctx.fillText('가까이 서서 성장',x,y-25);}}}
 const note=state.weapons.find(w=>['notebook','exam_cheatsheet'].includes(w.id));if(note){const evolved=note.id==='exam_cheatsheet',count=evolved?4+state.stats.projectiles:1+(note.level>=2?1:0)+(note.level>=5?1:0)+state.stats.projectiles,r=evolved?96:note.level>=3?88:74;for(let i=0;i<count;i++){const a=state.notebookAngle+i*Math.PI*2/count,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;rect(x-7,y-9,14,18,evolved?'#e1b566':'#b38cc9');rect(x-4,y-6,2,12,'#5a3f74');}}
 for(const pr of state.projectiles){const color=pr.kind.includes('pea')?'#a8e37d':pr.kind.includes('ball')?'#b9d3ed':pr.kind==='current'?'#83eff7':'#faf0d8';ellipse(pr.x,pr.y,pr.radius,pr.radius,color);}
 for(const fx of state.particles){ctx.save();ctx.globalAlpha=Math.max(0,fx.life/(fx.maxLife||.5));if(fx.kind==='electric_arc'){ctx.strokeStyle='#9af4ff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(fx.x,fx.y);ctx.lineTo((fx.x+fx.x2)/2+8,(fx.y+fx.y2)/2-8);ctx.lineTo(fx.x2,fx.y2);ctx.stroke();}else if(fx.kind==='text'){ctx.font='bold 10px sans-serif';ctx.fillStyle=fx.color||'#d8f9e7';ctx.textAlign='center';ctx.fillText(fx.text,fx.x,fx.y);}else{ctx.strokeStyle=fx.kind.includes('electric')?'#84e9ee':fx.kind==='explosion'?'#f4b377':'#c2d3a8';ctx.lineWidth=2;ctx.beginPath();ctx.arc(fx.x,fx.y,(fx.radius||12)*(1-fx.life/(fx.maxLife||.5)*.4),0,Math.PI*2);ctx.stroke();}ctx.restore();}
}
function drawHeldTool(x,y){ctx.save();ctx.translate(x+8,y-6);ctx.rotate(getAimDirection()-.7);if(state.character==='default'){rect(0,-2,22,4,'#e4c68c');rect(3,-2,2,3,'#67503b');rect(10,-2,2,3,'#67503b');}else if(state.character==='newton'){ellipse(12,0,7,7,'#e9746d');rect(12,-10,2,5,'#84bf6a');}else if(state.character==='faraday'){rect(0,-2,20,4,'#929db5');rect(15,-5,7,10,'#74dbe7');rect(17,-4,2,8,'#dafdff');}else{rect(0,-2,18,4,'#c5a471');ellipse(19,0,6,5,'#a9df80');}ctx.restore();}
